import type { KolDailyPoint, KolPerformanceRecord, KolStats } from './types'

export function aggregateByKol(records: KolPerformanceRecord[]): KolStats[] {
  const map = new Map<string, KolStats & { _pnlSum: number; _pnlCount: number }>()
  for (const r of records) {
    const key = r.kol_name
    if (!map.has(key)) {
      map.set(key, {
        kol_name: key,
        total: 0,
        win: 0,
        loss: 0,
        breakeven: 0,
        win_rate: 0,
        avg_pnl_pct: null,
        _pnlSum: 0,
        _pnlCount: 0,
      })
    }
    const s = map.get(key)!
    s.total += 1
    if (r.outcome === 'win') s.win += 1
    else if (r.outcome === 'loss') s.loss += 1
    else s.breakeven += 1
    if (r.pnl_pct != null) {
      s._pnlSum += Number(r.pnl_pct)
      s._pnlCount += 1
    }
  }

  return Array.from(map.values())
    .map((s) => {
      const decided = s.win + s.loss
      return {
        kol_name: s.kol_name,
        total: s.total,
        win: s.win,
        loss: s.loss,
        breakeven: s.breakeven,
        win_rate: decided > 0 ? s.win / decided : 0,
        avg_pnl_pct: s._pnlCount > 0 ? s._pnlSum / s._pnlCount : null,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export function buildKolDailySeries(
  records: KolPerformanceRecord[],
  kolName: string
): KolDailyPoint[] {
  const byDate = new Map<string, { win: number; loss: number; total: number }>()
  for (const r of records) {
    if (r.kol_name !== kolName) continue
    if (!byDate.has(r.date)) byDate.set(r.date, { win: 0, loss: 0, total: 0 })
    const d = byDate.get(r.date)!
    d.total += 1
    if (r.outcome === 'win') d.win += 1
    else if (r.outcome === 'loss') d.loss += 1
  }

  return Array.from(byDate.entries())
    .map(([date, v]) => {
      const decided = v.win + v.loss
      return {
        date,
        win_rate: decided > 0 ? v.win / decided : 0,
        total: v.total,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function overallStats(records: KolPerformanceRecord[]) {
  let win = 0
  let loss = 0
  let breakeven = 0
  let pnlSum = 0
  let pnlCount = 0
  for (const r of records) {
    if (r.outcome === 'win') win += 1
    else if (r.outcome === 'loss') loss += 1
    else breakeven += 1
    if (r.pnl_pct != null) {
      pnlSum += Number(r.pnl_pct)
      pnlCount += 1
    }
  }
  const decided = win + loss
  return {
    total: records.length,
    win,
    loss,
    breakeven,
    win_rate: decided > 0 ? win / decided : 0,
    avg_pnl_pct: pnlCount > 0 ? pnlSum / pnlCount : null,
  }
}
