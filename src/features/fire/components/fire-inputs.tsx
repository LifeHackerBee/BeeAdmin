import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import type { FireParams } from '../types'
import { Home, Building2, Plane, Globe } from 'lucide-react'

type FireInputsProps = {
  params: FireParams
  onParamChange: <K extends keyof FireParams>(key: K, value: FireParams[K]) => void
}

const firePlans = [
  {
    name: '归园田居',
    value: 80000,
    icon: Home,
    breakdown: [
      { label: '住房/维护', amount: 12000 },
      { label: '饮食/交通', amount: 36000 },
      { label: '医疗/娱乐', amount: 22000 },
      { label: '应急杂项', amount: 10000 },
    ],
  },
  {
    name: '都市生活',
    value: 200000,
    icon: Building2,
    breakdown: [
      { label: '住房开销', amount: 60000 },
      { label: '饮食/交通', amount: 60000 },
      { label: '医疗/购物', amount: 30000 },
      { label: '娱乐/应急', amount: 50000 },
    ],
  },
  {
    name: '海外旅居',
    value: 250000,
    icon: Plane,
    breakdown: [
      { label: '住房/饮食', amount: 120000 },
      { label: '交通/签证', amount: 25000 },
      { label: '国际医保', amount: 25000 },
      { label: '旅行/应急', amount: 80000 },
    ],
  },
  {
    name: '环游世界',
    value: 400000,
    icon: Globe,
    breakdown: [
      { label: '住宿/饮食', amount: 230000 },
      { label: '跨国交通', amount: 60000 },
      { label: '活动门票', amount: 50000 },
      { label: '保险/应急', amount: 60000 },
    ],
  },
]

export function FireInputs({ params, onParamChange }: FireInputsProps) {
  const selectedPlan = firePlans.find((p) => p.value === params.annualRetirementExpenses)

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>核心参数</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='currentAge'>当前年龄</Label>
              <Input
                id='currentAge'
                type='number'
                value={params.currentAge}
                onChange={(e) =>
                  onParamChange('currentAge', parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='targetRetirementAge'>目标退休年龄</Label>
              <Input
                id='targetRetirementAge'
                type='number'
                value={params.targetRetirementAge}
                onChange={(e) =>
                  onParamChange(
                    'targetRetirementAge',
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='currentAssets'>当前可投资资产 (元)</Label>
              <Input
                id='currentAssets'
                type='number'
                value={params.currentAssets}
                onChange={(e) =>
                  onParamChange('currentAssets', parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='monthlyInvestment'>每月投资额 (元)</Label>
              <Input
                id='monthlyInvestment'
                type='number'
                value={params.monthlyInvestment}
                onChange={(e) =>
                  onParamChange(
                    'monthlyInvestment',
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='monthlyIncome'>每月税后收入 (元)</Label>
              <Input
                id='monthlyIncome'
                type='number'
                value={params.monthlyIncome}
                onChange={(e) =>
                  onParamChange('monthlyIncome', parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='guaranteedIncome'>退休后每年保障收入 (元)</Label>
              <Input
                id='guaranteedIncome'
                type='number'
                value={params.guaranteedIncome}
                onChange={(e) =>
                  onParamChange(
                    'guaranteedIncome',
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='oneTimeWindfall'>退休时一次性额外资金 (元)</Label>
              <Input
                id='oneTimeWindfall'
                type='number'
                value={params.oneTimeWindfall}
                onChange={(e) =>
                  onParamChange(
                    'oneTimeWindfall',
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
          </div>

          <div className='space-y-4 border-t pt-4'>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='salaryGrowthRate'>
                  年化薪资增长率 ({(params.salaryGrowthRate * 100).toFixed(1)}%)
                </Label>
                <Input
                  id='salaryGrowthRate'
                  type='number'
                  className='w-28 text-center'
                  step='0.5'
                  min='0'
                  max='15'
                  value={params.salaryGrowthRate * 100}
                  onChange={(e) =>
                    onParamChange(
                      'salaryGrowthRate',
                      (parseFloat(e.target.value) || 0) / 100
                    )
                  }
                />
              </div>
              <Slider
                value={[params.salaryGrowthRate * 100]}
                onValueChange={([value]) =>
                  onParamChange('salaryGrowthRate', value / 100)
                }
                min={0}
                max={15}
                step={0.5}
              />
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='nominalReturnRate'>
                  年化名义收益率 ({(params.nominalReturnRate * 100).toFixed(1)}%)
                </Label>
                <Input
                  id='nominalReturnRate'
                  type='number'
                  className='w-28 text-center'
                  step='0.5'
                  min='0'
                  max='20'
                  value={params.nominalReturnRate * 100}
                  onChange={(e) =>
                    onParamChange(
                      'nominalReturnRate',
                      (parseFloat(e.target.value) || 0) / 100
                    )
                  }
                />
              </div>
              <Slider
                value={[params.nominalReturnRate * 100]}
                onValueChange={([value]) =>
                  onParamChange('nominalReturnRate', value / 100)
                }
                min={0}
                max={20}
                step={0.5}
              />
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='inflationRate'>
                  年化通胀率 ({(params.inflationRate * 100).toFixed(1)}%)
                </Label>
                <Input
                  id='inflationRate'
                  type='number'
                  className='w-28 text-center'
                  step='0.5'
                  min='0'
                  max='10'
                  value={params.inflationRate * 100}
                  onChange={(e) =>
                    onParamChange(
                      'inflationRate',
                      (parseFloat(e.target.value) || 0) / 100
                    )
                  }
                />
              </div>
              <Slider
                value={[params.inflationRate * 100]}
                onValueChange={([value]) =>
                  onParamChange('inflationRate', value / 100)
                }
                min={0}
                max={10}
                step={0.5}
              />
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='swr'>
                  安全提款率 SWR ({(params.swr * 100).toFixed(1)}%)
                </Label>
                <Input
                  id='swr'
                  type='number'
                  className='w-28 text-center'
                  step='0.1'
                  min='1'
                  max='10'
                  value={params.swr * 100}
                  onChange={(e) =>
                    onParamChange('swr', (parseFloat(e.target.value) || 0) / 100)
                  }
                />
              </div>
              <Slider
                value={[params.swr * 100]}
                onValueChange={([value]) => onParamChange('swr', value / 100)}
                min={1}
                max={10}
                step={0.1}
              />
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='safetyBuffer'>
                  安全缓冲比例 ({(params.safetyBuffer * 100).toFixed(0)}%)
                </Label>
                <Input
                  id='safetyBuffer'
                  type='number'
                  className='w-28 text-center'
                  step='1'
                  min='0'
                  max='50'
                  value={params.safetyBuffer * 100}
                  onChange={(e) =>
                    onParamChange(
                      'safetyBuffer',
                      (parseFloat(e.target.value) || 0) / 100
                    )
                  }
                />
              </div>
              <Slider
                value={[params.safetyBuffer * 100]}
                onValueChange={([value]) =>
                  onParamChange('safetyBuffer', value / 100)
                }
                min={0}
                max={50}
                step={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FIRE 后的生活预算 (年开支, 今天币值)</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {firePlans.map((plan) => {
              const Icon = plan.icon
              const isActive = selectedPlan?.value === plan.value
              return (
                <div
                  key={plan.value}
                  onClick={() =>
                    onParamChange('annualRetirementExpenses', plan.value)
                  }
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:-translate-y-1 ${
                    isActive
                      ? 'border-sky-400 bg-slate-800 shadow-lg shadow-sky-400/20'
                      : 'border-slate-700 bg-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className='flex items-start gap-4'>
                    <div className='shrink-0 text-sky-400'>
                      <Icon className='h-8 w-8' />
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-semibold text-white'>{plan.name}</h3>
                      <p className='text-lg font-bold text-sky-300'>
                        ¥ {plan.value.toLocaleString('zh-CN')} / 年
                      </p>
                      <ul className='mt-2 space-y-1 text-xs text-muted-foreground'>
                        {plan.breakdown.map((item) => (
                          <li key={item.label}>
                            <b>{item.label}:</b>{' '}
                            {item.amount.toLocaleString('zh-CN')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className='space-y-2'>
            <Label htmlFor='annualRetirementExpenses'>
              自定义或选择上方计划 (元/年)
            </Label>
            <Input
              id='annualRetirementExpenses'
              type='number'
              value={params.annualRetirementExpenses}
              onChange={(e) =>
                onParamChange(
                  'annualRetirementExpenses',
                  parseFloat(e.target.value) || 0
                )
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
