import { useState, useMemo } from 'react'
import type { FireParams } from '../types'
import {
  calculateFireSummary,
  runSimulation,
} from '../utils/calculations'

const defaultParams: FireParams = {
  currentAge: 30,
  targetRetirementAge: 50,
  currentAssets: 500000,
  monthlyInvestment: 8000,
  monthlyIncome: 20000,
  salaryGrowthRate: 0.03,
  nominalReturnRate: 0.06,
  inflationRate: 0.03,
  swr: 0.04,
  safetyBuffer: 0.1,
  annualRetirementExpenses: 200000,
  guaranteedIncome: 30000,
  oneTimeWindfall: 0,
}

export function useFireCalculator() {
  const [params, setParams] = useState<FireParams>(defaultParams)

  const summary = useMemo(() => {
    const s = calculateFireSummary(params)
    const simulationData = runSimulation(params, s)
    const fireYearSim = simulationData.find((d) => d.isFire)
    s.fireAgeSim = fireYearSim ? fireYearSim.age : Infinity
    return s
  }, [params])

  const simulationData = useMemo(() => {
    return runSimulation(params, summary)
  }, [params, summary])

  const updateParam = <K extends keyof FireParams>(
    key: K,
    value: FireParams[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  return {
    params,
    summary,
    simulationData,
    updateParam,
    setParams,
  }
}
