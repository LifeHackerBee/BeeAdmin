import * as LucideIcons from 'lucide-react'
import { Tag } from 'lucide-react'
import { type ExpenseCategory } from '../data/category-schema'

// 动态获取图标组件
export function getIconComponent(iconName?: string | null) {
  if (!iconName) return Tag
  const IconComponent = (LucideIcons as Record<string, any>)[iconName]
  return IconComponent || Tag
}

// 将数据库中的 ExpenseCategory 转换为带图标的格式（用于下拉选择等场景）
export function categoryToOption(category: ExpenseCategory) {
  const IconComponent = getIconComponent(category.icon_name)
  return {
    label: category.label,
    value: category.value,
    icon: IconComponent,
  }
}

// 将数据库中的 ExpenseCategory 数组转换为选项数组
export function categoriesToOptions(categories: ExpenseCategory[]) {
  return categories.map(categoryToOption)
}

