import type {
  AnalysisResult,
  KolAnalysis,
  KolMvpRecord,
  ParsedLine,
  ParseSummary,
} from './types'

const ORGS = new Set([
  'wwg',
  'unityacademy',
  'unityacedemy',
  '斗兽场',
  '加密大漂亮',
  'chartchampion',
  'thelab',
  'chroma',
])

const KNOWN_MEMBERS: Record<string, string> = {
  johnny: 'wwg',
  woods: 'wwg',
  eliz: 'wwg',
  wwds: 'wwg',
  muzzagin: 'wwg',
  tareeq: 'wwg',
  neil: 'unityacademy',
  sveezy: 'unityacademy',
  prestige: 'unityacademy',
  caleb: 'unityacademy',
  ajmal: 'unityacademy',
  soul: 'unityacademy',
  badillusion: 'unityacademy',
  sherlock: 'unityacademy',
  scient: 'unityacademy',
  tradercash: '斗兽场',
  tradergauls: '斗兽场',
  tradertitan: '斗兽场',
  daniel: 'chartchampion',
  ken: 'thelab',
  moritz: 'thelab',
  jonzi: 'chroma',
  tim: 'chroma',
  nick: '加密大漂亮',
  mark: '加密大漂亮',
}

const ALIAS: Record<string, string> = {
  '三马': '三马哥',
  '币圈所长课堂': '所长',
  '币圈所长': '所长',
  '比特币军长': '军长',
  '比特币峰哥': '峰哥',
  jaysoncasper: 'jayson',
  jaysoncaper: 'jayson',
  dainel: 'daniel',
  vivi: 'vivian',
  mack: 'mark',
  nurseneil: 'neil',
  neilnurse: 'neil',
  nurse: 'neil',
  '大漂亮金牌nick': 'nick',
  '大漂亮分析师nick': 'nick',
  '加密大漂亮分析师': '加密大漂亮',
  '加密大漂亮金牌mark': 'mark',
  unityacedemy: 'unityacademy',
  tradergaul: 'tradergauls',
  traderguals: 'tradergauls',
  tradegauls: 'tradergauls',
}

const SKIP_TAGS = new Set(['聚合群'])

const ASSET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'BTC', re: /比特币|btc|\$btc/i },
  { name: 'ETH', re: /以太坊?|以太币|eth|\$eth/i },
  {
    name: '山寨币',
    re: /(?:SOL|DOGE|狗狗币|ZEC|BCH|XRP|HYPE|FARTCOIN|PUMP|ZRO|MINA|NEAR|SUI|CRV|ACE|ROSE|DUSK|LIT|RIVER|BEAT|INIT|ASTER|QUAI|ICNT|ZEN|BR|IMX|FET|AVAX|ATOM|QNT|AAVE|ENA|WLD|ICP|XMR|1INCH|NOM|CYS|MERL|JELLYJELLY|VVV|PIPPIN|KITE|ARC|EPIC|LIGHT|WIFI|BNB|DASH|XAUT|H\b|\$\w{2,})/i,
  },
  { name: '黄金/白银', re: /黄金|白银|XAU|XAUUSD|gold|silver/i },
]

const TAG_RE = /#([\w一-鿿]+)/g
const LINE_PREFIX_RE = /^\d+→\s*/
const DATE_HEADER_RE = /(\d{6})/

function normalizeName(name: string): string {
  const n = name.toLowerCase().trim()
  return ALIAS[n] ?? n
}

function withOrg(name: string): { name: string; org: string | null } {
  const org = KNOWN_MEMBERS[name] ?? null
  return { name, org }
}

function parseDate(header: string): string | null {
  const m = header.match(DATE_HEADER_RE)
  if (!m) return null
  const d = m[1]
  const yy = d.slice(0, 2)
  const mm = d.slice(2, 4)
  const dd = d.slice(4, 6)
  const year = Number(yy) >= 70 ? `19${yy}` : `20${yy}`
  const dt = new Date(`${year}-${mm}-${dd}`)
  if (Number.isNaN(dt.getTime())) return null
  return `${year}-${mm}-${dd}`
}

function detectDirection(line: string): 'long' | 'short' | null {
  if (/做多|多单|接多|抄底|做反弹|看涨|买入/.test(line)) return 'long'
  if (/做空|空单|看空|看跌/.test(line)) return 'short'
  return null
}

function detectAssets(line: string): string[] {
  const found: string[] = []
  for (const { name, re } of ASSET_PATTERNS) {
    if (re.test(line)) found.push(name)
  }
  return found.length ? found : ['其他']
}

function extractAnalystsFromLine(
  line: string
): { name: string; org: string | null }[] {
  const tags: string[] = []
  for (const m of line.matchAll(TAG_RE)) tags.push(m[1])
  if (!tags.length) return []

  const filtered = tags.filter((t) => !SKIP_TAGS.has(t))
  if (!filtered.length) return []

  const tagsNorm = filtered.map((t) => normalizeName(t))
  const out: { name: string; org: string | null }[] = []

  for (let i = 0; i < tagsNorm.length; i++) {
    const tag = tagsNorm[i]
    if (ORGS.has(tag)) {
      const orgName = tag
      if (i + 1 < tagsNorm.length && !ORGS.has(tagsNorm[i + 1])) {
        out.push({ name: tagsNorm[i + 1], org: orgName })
        i += 1
        continue
      }
      if (orgName === '加密大漂亮') {
        const m = line.match(/(?:金牌|分析师)+\s*([a-zA-Z]+)/i)
        if (m) {
          out.push({ name: normalizeName(m[1]), org: orgName })
          continue
        }
      }
    } else {
      out.push(withOrg(tag))
    }
  }
  return out
}

export function parseKolLog(text: string): ParseSummary {
  const lines = text.split(/\r?\n/)
  const records: ParsedLine[] = []
  const dateSet = new Set<string>()
  const recordsByKol = new Map<string, number>()
  let currentDate: string | null = null
  let parsedLineCount = 0

  for (const rawLine of lines) {
    const line = rawLine.replace(LINE_PREFIX_RE, '').trim()
    if (!line) continue

    if (line.includes('聚合群') && line.includes('MVP')) {
      const d = parseDate(line)
      if (d) {
        currentDate = d
        dateSet.add(d)
      }
      continue
    }

    const analysts = extractAnalystsFromLine(line)
    if (!analysts.length) continue

    const direction = detectDirection(line)
    const assets = detectAssets(line)

    for (const { name, org } of analysts) {
      records.push({
        date: currentDate,
        kol_name: name,
        org,
        direction,
        assets,
        raw_line: line,
      })
      const key = displayName(name, org)
      recordsByKol.set(key, (recordsByKol.get(key) ?? 0) + 1)
    }
    parsedLineCount += 1
  }

  return {
    totalLines: lines.length,
    parsedLines: parsedLineCount,
    dates: Array.from(dateSet).sort(),
    uniqueKols: recordsByKol.size,
    recordsByKol,
    records,
  }
}

export function displayName(name: string, org: string | null): string {
  return org ? `${name} (${org})` : name
}

export function analyzeRecords(records: KolMvpRecord[]): AnalysisResult {
  const dateSet = new Set<string>()
  for (const r of records) dateSet.add(r.date)
  const allDates = Array.from(dateSet).sort()
  const totalDays = allDates.length
  const earliest = allDates[0] ?? null
  const latest = allDates[allDates.length - 1] ?? null

  let cutoff: string | null = null
  const recentDates = new Set<string>()
  if (latest) {
    const dt = new Date(latest)
    dt.setUTCDate(dt.getUTCDate() - 30)
    cutoff = dt.toISOString().slice(0, 10)
    for (const d of allDates) if (d >= cutoff) recentDates.add(d)
  }
  const recentDays = recentDates.size
  const earlierDays = totalDays - recentDays

  type Acc = {
    name: string
    org: string | null
    dateSet: Set<string>
    long: number
    short: number
    assetCounts: Map<string, number>
  }
  const byKol = new Map<string, Acc>()
  const keyOf = (name: string, org: string | null) => `${name}__${org ?? ''}`

  for (const r of records) {
    const k = keyOf(r.kol_name, r.org)
    let a = byKol.get(k)
    if (!a) {
      a = {
        name: r.kol_name,
        org: r.org,
        dateSet: new Set(),
        long: 0,
        short: 0,
        assetCounts: new Map(),
      }
      byKol.set(k, a)
    }
    a.dateSet.add(r.date)
    if (r.direction === 'long') a.long += 1
    else if (r.direction === 'short') a.short += 1
    for (const asset of r.assets || []) {
      a.assetCounts.set(asset, (a.assetCounts.get(asset) ?? 0) + 1)
    }
  }

  const results: KolAnalysis[] = []
  for (const a of byKol.values()) {
    const dates = a.dateSet
    const mvp = dates.size
    const attendance = totalDays ? mvp / totalDays : 0
    let recent = 0
    for (const d of dates) if (recentDates.has(d)) recent += 1
    const earlier = mvp - recent
    const recentDensity = recentDays ? recent / recentDays : 0
    const earlierDensity = earlierDays ? earlier / earlierDays : 0
    const trendDiff = recentDensity - earlierDensity

    const totalDir = a.long + a.short
    let bias = '-'
    if (totalDir > 0) {
      const longPct = a.long / totalDir
      if (longPct > 0.65) bias = `偏多 (${Math.round(longPct * 100)}%)`
      else if (longPct < 0.35) bias = `偏空 (${Math.round((1 - longPct) * 100)}%)`
      else bias = '多空均衡'
    }

    const topAssets = Array.from(a.assetCounts.entries())
      .map(([asset, count]) => ({ asset, count }))
      .sort((x, y) => y.count - x.count)

    let streak = 0
    for (let i = allDates.length - 1; i >= 0; i--) {
      if (dates.has(allDates[i])) streak += 1
      else break
    }

    results.push({
      name: a.name,
      org: a.org,
      display: displayName(a.name, a.org),
      mvp,
      dateSet: dates,
      attendance,
      recent,
      earlier,
      recentDensity,
      earlierDensity,
      trendDiff,
      long: a.long,
      short: a.short,
      bias,
      topAssets,
      streak,
    })
  }

  results.sort((a, b) => b.mvp - a.mvp)

  return {
    totalDays,
    earliestDate: earliest,
    latestDate: latest,
    recentCutoff: cutoff,
    recentDays,
    earlierDays,
    results,
  }
}

export function exportCsv(analysis: AnalysisResult): string {
  const headers = [
    '排名',
    'KOL',
    'MVP次数',
    '出勤天数',
    '总交易日',
    '出勤率',
    '近30天MVP',
    '更早MVP',
    '连胜天数',
    '做多次数',
    '做空次数',
    '多空偏好',
    '主要品种',
    '首次出现',
    '最后出现',
  ]
  const lines: string[] = [headers.join(',')]
  analysis.results.forEach((r, idx) => {
    const sortedDates = Array.from(r.dateSet).sort()
    const row = [
      idx + 1,
      r.display,
      r.mvp,
      r.dateSet.size,
      analysis.totalDays,
      `${(r.attendance * 100).toFixed(2)}%`,
      r.recent,
      r.earlier,
      r.streak,
      r.long,
      r.short,
      r.bias,
      r.topAssets.slice(0, 3).map((a) => a.asset).join(' / '),
      sortedDates[0] ?? '',
      sortedDates[sortedDates.length - 1] ?? '',
    ]
    lines.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
  })
  return '﻿' + lines.join('\n')
}
