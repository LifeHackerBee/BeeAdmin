import type { FireParams, FireSummary, SimulationData } from '../types'

/**
 * 计算 PMT（每期付款额）
 */
export function PMT(rate: number, nper: number, pv: number, fv = 0): number {
  if (rate === 0) return -(pv + fv) / nper
  const pvif = Math.pow(1 + rate, nper)
  let pmt = (rate / (pvif - 1)) * -(pv * pvif + fv)
  return pmt
}

/**
 * 计算 FIRE 摘要信息
 */
export function calculateFireSummary(params: FireParams): FireSummary {
  const realAnnualReturn =
    (1 + params.nominalReturnRate) / (1 + params.inflationRate) - 1
  const realMonthlyReturn = Math.pow(1 + realAnnualReturn, 1 / 12) - 1
  const adjustedNetExpenses = Math.max(
    0,
    params.annualRetirementExpenses * (1 + params.safetyBuffer) -
      params.guaranteedIncome
  )
  const fireTargetAssets =
    params.swr > 0 ? adjustedNetExpenses / params.swr : 0
  const targetAssetsNetWindfall = Math.max(
    0,
    fireTargetAssets - params.oneTimeWindfall
  )
  const currentSavingsRate =
    params.monthlyIncome > 0
      ? params.monthlyInvestment / params.monthlyIncome
      : 0
  const investmentNeededForTarget = Math.abs(
    PMT(
      realMonthlyReturn,
      (params.targetRetirementAge - params.currentAge) * 12,
      -params.currentAssets,
      targetAssetsNetWindfall
    )
  )

  return {
    realAnnualReturn,
    realMonthlyReturn,
    adjustedNetExpenses,
    fireTargetAssets,
    targetAssetsNetWindfall,
    currentSavingsRate,
    investmentNeededForTarget,
    fireAgeSim: 0, // 将在模拟中计算
  }
}

/**
 * 运行资产增长模拟
 */
export function runSimulation(
  params: FireParams,
  summary: FireSummary
): SimulationData[] {
  const simulationData: SimulationData[] = []
  let currentSimAssets = params.currentAssets
  let annualIncome = params.monthlyIncome * 12
  let reachedFire = false

  for (let age = params.currentAge; age <= 90; age++) {
    const isFire = currentSimAssets >= summary.targetAssetsNetWindfall
    if (isFire && !reachedFire) {
      reachedFire = true
    }

    const annualInvestment = reachedFire
      ? 0
      : annualIncome * summary.currentSavingsRate
    const investmentReturn = currentSimAssets * summary.realAnnualReturn
    const netCashFlow = annualInvestment + investmentReturn

    simulationData.push({
      age,
      assets: currentSimAssets,
      isFire,
    })

    currentSimAssets += netCashFlow

    if (!reachedFire) {
      annualIncome *= 1 + params.salaryGrowthRate
    }
  }

  return simulationData
}

/**
 * 格式化货币
 */
export function formatCurrency(num: number): string {
  if (isNaN(num) || !isFinite(num)) return 'N/A'
  return '¥ ' + num.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

/**
 * 格式化百分比
 */
export function formatPercent(num: number): string {
  if (isNaN(num) || !isFinite(num)) return 'N/A'
  return (num * 100).toFixed(2) + '%'
}

/**
 * 格式化年龄
 */
export function formatAge(num: number): string {
  if (isNaN(num) || !isFinite(num)) return 'N/A'
  const years = Math.floor(num)
  const months = Math.round((num - years) * 12)
  return `${years}岁 ${months}月`
}
