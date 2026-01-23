# BeeTrader Dashboard

## 概述

BeeTrader Dashboard 是一个实时监控面板，用于展示和追踪 BeeTrader 交易系统的关键指标和数据。

## 功能模块

Dashboard 统计并展示以下 5 个 Supabase 数据表的信息：

### 1. 钱包管理 (wallets)
- **总钱包数**: 监控的钱包总数量
- **总体量**: 所有钱包的总资产价值（USD）
- **平均体量**: 单个钱包的平均资产价值
- **钱包类型分布**: 按类型统计钱包数量
- **最近添加的钱包**: 显示最新录入的钱包信息

### 2. 交易者分析 (trader_analysis)
- **总分析数**: 已分析的交易者总数
- **巨鲸数量**: 识别出的巨鲸交易者数量
- **Smart Money**: 优质交易者数量
- **有效信号**: 可跟踪的交易者总数
- **交易者类型分布**: HEDGER、MARKET_MAKER、WHALE、TRADER 等
- **信号强度分布**: HIGH、MEDIUM、LOW 信号统计

### 3. 仓位事件监控 (wallet_state_event)
- **总事件数**: 所有仓位变化事件总数
- **今日事件**: 当天捕获的事件数量
- **开仓/平仓事件**: 按类型统计事件数量
- **事件类型分布**: OPEN、CLOSE、INCREASE、DECREASE、FLIP
- **最近事件**: 实时显示最新的仓位变化

### 4. 追踪任务 (wallet_tracker_task)
- **总追踪任务**: 所有钱包监控任务数量
- **运行中任务**: 正在执行的任务数量
- **总检查次数**: 累计检查次数
- **成功率**: 检查成功的百分比
- **任务状态分布**: pending、running、stopped、error、deleted
- **追踪统计**: 成功/失败检查数、总事件数等

### 5. 回测任务 (backtest_tracker_tasks)
- **总回测任务**: 所有回测追踪任务数量
- **运行中任务**: 正在执行的回测数量
- **已完成任务**: 完成的回测数量
- **完成率**: 任务完成百分比
- **回测汇总**: 累计测试资金、平均杠杆、累计追踪次数、平均追踪间隔/时长
- **最近的回测任务**: 显示最新的回测任务详情

## 页面结构

Dashboard 采用标签页（Tabs）设计，包含以下视图：

1. **总览 (Overview)**: 综合展示钱包管理、交易者分析和仓位事件的核心指标
2. **回测任务 (Backtest)**: 回测任务的详细统计
3. **交易者分析 (Analysis)**: 交易者画像和信号分析
4. **仓位事件 (Events)**: 实时仓位变化事件监控
5. **追踪任务 (Tracker)**: 钱包追踪任务管理
6. **钱包管理 (Wallets)**: 监控钱包的详细信息

## 数据刷新

- **钱包管理**: 60秒自动刷新
- **交易者分析**: 60秒自动刷新
- **仓位事件**: 10秒自动刷新（最频繁）
- **追踪任务**: 30秒自动刷新
- **回测任务**: 30秒自动刷新

## 技术实现

### 技术栈
- React + TypeScript
- TanStack Query (数据获取和缓存)
- Supabase (后端数据库)
- Shadcn UI (UI 组件库)
- Tailwind CSS (样式)

### 关键文件

```
src/features/beetrader/dashboard/
├── index.tsx                          # 主 Dashboard 组件
├── hooks/
│   └── use-dashboard-stats.ts        # 数据获取 Hook
└── components/
    ├── stats-card.tsx                # 统计卡片组件
    ├── backtest-section.tsx          # 回测任务展示
    ├── trader-analysis-section.tsx   # 交易者分析展示
    ├── wallet-event-section.tsx      # 仓位事件展示
    ├── tracker-task-section.tsx      # 追踪任务展示
    └── wallets-section.tsx           # 钱包管理展示
```

### 路由配置

- **路径**: `/beetrader/dashboard`
- **默认重定向**: BeeTrader 首页现在默认跳转到 Dashboard

## 使用方法

1. 导航到侧边栏的 "Trading" → "BeeTrader" → "仪表盘"
2. 或直接访问 `/beetrader/dashboard`
3. 点击不同的标签页查看各模块的详细统计
4. 点击右上角的"刷新数据"按钮手动刷新所有数据

## 未来改进

- [ ] 添加数据导出功能
- [ ] 增加自定义时间范围筛选
- [ ] 支持数据可视化图表（趋势图、饼图等）
- [ ] 添加实时告警和通知
- [ ] 支持自定义 Dashboard 布局
