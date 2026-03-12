// ─── 市场深度分析 — 支持的币种 ────────────────────────────────────────────────

export interface CoinDef {
  /** 传给 Hyperliquid API 的标识符 */
  value: string
  /** 下拉菜单中显示的名称 */
  label: string
}

export const COINS: CoinDef[] = [
  { value: 'BTC', label: 'BTC' },
  { value: 'ETH', label: 'ETH' },
  { value: 'SOL', label: 'SOL' },
  { value: 'xyz:BRENTOIL', label: '布伦特原油' },
  { value: 'xyz:GOLD', label: '黄金' },
]

const LABEL_MAP = new Map(COINS.map((c) => [c.value, c.label]))

/** 根据 API coin 值返回可读的显示名称 */
export function coinLabel(coin: string): string {
  return LABEL_MAP.get(coin) ?? coin
}
