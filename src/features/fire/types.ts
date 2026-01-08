export interface FireParams {
  currentAge: number
  targetRetirementAge: number
  currentAssets: number
  monthlyInvestment: number
  monthlyIncome: number
  salaryGrowthRate: number // 0-1
  nominalReturnRate: number // 0-1
  inflationRate: number // 0-1
  swr: number // 0-1
  safetyBuffer: number // 0-1
  annualRetirementExpenses: number
  guaranteedIncome: number
  oneTimeWindfall: number
}

export interface FireSummary {
  realAnnualReturn: number
  realMonthlyReturn: number
  adjustedNetExpenses: number
  fireTargetAssets: number
  targetAssetsNetWindfall: number
  currentSavingsRate: number
  investmentNeededForTarget: number
  fireAgeSim: number
}

export interface SimulationData {
  age: number
  assets: number
  isFire: boolean
}

export interface FirePlan {
  name: string
  value: number
  description: string
  breakdown: {
    label: string
    amount: number
  }[]
}
