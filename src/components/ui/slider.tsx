import * as React from 'react'
import { cn } from '@/lib/utils'

type SliderProps = {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
}: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseFloat(e.target.value)])
  }

  return (
    <input
      type='range'
      min={min}
      max={max}
      step={step}
      value={value[0] ?? min}
      onChange={handleChange}
      className={cn(
        'h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-600',
        'focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2',
        '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900',
        '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sky-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-900 [&::-moz-range-thumb]:border-none',
        className
      )}
    />
  )
}
