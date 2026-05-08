export type KolDirection = 'long' | 'short'

export type KolMvpRecord = {
  id: number
  user_id: string | null
  date: string
  kol_name: string
  org: string | null
  direction: KolDirection | null
  assets: string[]
  raw_line: string | null
  source_batch: string | null
  created_at?: string
  updated_at?: string
}

export type KolMvpInsert = {
  date: string
  kol_name: string
  org: string | null
  direction: KolDirection | null
  assets: string[]
  raw_line: string | null
  source_batch: string | null
}

export type ParsedLine = {
  date: string | null
  kol_name: string
  org: string | null
  direction: KolDirection | null
  assets: string[]
  raw_line: string
}

export type ParseSummary = {
  totalLines: number
  parsedLines: number
  dates: string[]
  uniqueKols: number
  recordsByKol: Map<string, number>
  records: ParsedLine[]
}

export type KolAnalysis = {
  name: string
  org: string | null
  display: string
  mvp: number
  dateSet: Set<string>
  attendance: number
  recent: number
  earlier: number
  recentDensity: number
  earlierDensity: number
  trendDiff: number
  long: number
  short: number
  bias: string
  topAssets: { asset: string; count: number }[]
  streak: number
}

export type AnalysisResult = {
  totalDays: number
  earliestDate: string | null
  latestDate: string | null
  recentCutoff: string | null
  recentDays: number
  earlierDays: number
  results: KolAnalysis[]
}
