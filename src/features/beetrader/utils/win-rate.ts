/**
 * 胜率计算（基于 round trip：开仓→完全平仓为一笔交易）
 * 与 Python _aggregate_round_trips + calculate_win_rate 逻辑一致
 * 巨鲸常分多笔小额平仓，若按单笔 fill 计算胜率会严重失真
 */

export type FillLike = {
  time?: number
  closedPnl?: string
  coin?: string
  startPosition?: string
  sz?: string
  px?: string
  dir?: string
  [key: string]: unknown
}

const MIN_VOLUME_USD = 100.0
const WIN_RATE_TARGET = 1000

/**
 * 将逐笔 fills 聚合为按币种的完整 round trip（开仓→完全平仓）
 * 过滤交易金额低于 min_volume_usd 的 round trip（避免微额交易干扰胜率）
 * 返回 [(pnl, end_timestamp), ...] 按时间排序
 */
export function aggregateRoundTrips(
  fills: FillLike[],
  minVolumeUsd: number = MIN_VOLUME_USD
): Array<[number, number]> {
  const byCoin: Record<string, FillLike[]> = {}
  for (const f of fills) {
    if (f && typeof f === 'object') {
      const coin = String(f.coin ?? '')
      if (!byCoin[coin]) byCoin[coin] = []
      byCoin[coin].push(f)
    }
  }

  const roundTrips: Array<[number, number]> = []

  for (const coinFills of Object.values(byCoin)) {
    coinFills.sort((a, b) => (a.time ?? 0) - (b.time ?? 0))

    let currentPnl = 0
    let currentVolume = 0
    let currentEndTime = 0
    let inRoundTrip = false

    for (const fill of coinFills) {
      const startPos = parseFloat(String(fill.startPosition ?? '0')) || 0
      const cpnl = parseFloat(String(fill.closedPnl ?? '0')) || 0

      if (Math.abs(startPos) < 1e-9) {
        if (
          inRoundTrip &&
          Math.abs(currentPnl) > 1e-9 &&
          currentVolume >= minVolumeUsd
        ) {
          roundTrips.push([currentPnl, currentEndTime])
        }
        currentPnl = 0
        currentVolume = 0
        currentEndTime = 0
        inRoundTrip = true
      }

      try {
        const sz = parseFloat(String(fill.sz ?? '0')) || 0
        const px = parseFloat(String(fill.px ?? '0')) || 0
        currentVolume += Math.abs(sz) * px
      } catch {
        // ignore
      }

      currentPnl += cpnl
      if (cpnl !== 0) {
        currentEndTime = fill.time ?? 0
      }
    }

    const last = coinFills[coinFills.length - 1]
    if (
      inRoundTrip &&
      Math.abs(currentPnl) > 1e-9 &&
      currentVolume >= minVolumeUsd &&
      coinFills.length > 0 &&
      last
    ) {
      const lastStart = parseFloat(String(last.startPosition ?? '0')) || 0
      const lastSz = parseFloat(String(last.sz ?? '0')) || 0
      const dir = String(last.dir ?? '')
      const isFullClose =
        dir.includes('Close') &&
        lastStart > 0 &&
        Math.abs(lastStart - lastSz) / lastStart < 1e-6
      if (isFullClose) {
        roundTrips.push([currentPnl, last.time ?? 0])
      }
    }
  }

  roundTrips.sort((a, b) => a[1] - b[1])
  return roundTrips
}

export interface WinRateResult {
  winRate: number
  recentTrades: number
  winCount: number
  lossCount: number
}

/**
 * 计算最近 round trip 胜率
 * 胜率 = round trip PnL > 0 的次数 / 总 round trip 次数
 */
export function calculateWinRateFromFills(
  fills: FillLike[],
  recentN: number = WIN_RATE_TARGET
): WinRateResult | null {
  const roundTrips = aggregateRoundTrips(fills)
  if (roundTrips.length === 0) return null

  const recent = roundTrips.slice(-recentN)
  const wins = recent.filter(([pnl]) => pnl > 0).length
  const losses = recent.length - wins
  const winRate = Math.round((wins / recent.length) * 10000) / 100

  return {
    winRate,
    recentTrades: recent.length,
    winCount: wins,
    lossCount: losses,
  }
}
