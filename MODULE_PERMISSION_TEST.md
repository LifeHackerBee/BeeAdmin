# 模块权限测试指南

## 🎯 测试目标

验证用户 `xmandongdong@hotmail.com` 只能访问 BeeTrader 模块。

## ✅ 已配置的权限

**用户邮箱**: `xmandongdong@hotmail.com`

**允许的模块**:
- `beetrader`
- `beetrader.tracker`
- `beetrader.backtest`
- `beetrader.analyzer`
- `beetrader.events`
- `beetrader.market`
- `beetrader.candles`
- `beetrader.signals`
- `beetrader.strategies`
- `beetrader.macroscopic`
- `beetrader.whale-wallet-manage`
- `beetrader.monitor-observation`

**不允许访问的模块**:
- ❌ `beeai`
- ❌ `finance`
- ❌ `fire`
- ❌ `monitoring`
- ❌ `apps`
- ❌ `users`

## 🧪 测试步骤

### 1. 重新构建前端（必需）

因为修改了前端代码，需要重新构建：

```bash
cd BeeAdmin
pnpm run build

# 或者使用 Docker
cd ..
docker-compose up -d --build bee-admin
```

### 2. 清除浏览器缓存

1. 打开浏览器开发者工具（F12）
2. 右键点击刷新按钮，选择"清空缓存并硬性重新加载"
3. 或者使用无痕模式打开

### 3. 登录测试账号

使用 `xmandongdong@hotmail.com` 登录

### 4. 验证侧边栏菜单

**应该看到的菜单**:
- ✅ Dashboard（根路径，所有人可见）
- ✅ BeeTrader（及其所有子菜单）
  - 巨鲸监控中心
  - 市场观察
  - 信号模块
  - 交易策略库
  - 回测模块
  - Trader 分析
- ✅ Settings（设置，所有人可见）
- ✅ Help Center（帮助中心，所有人可见）

**不应该看到的菜单**:
- ❌ Apps
- ❌ BeeAI
- ❌ Users
- ❌ FIRE 计算器
- ❌ 财务管理（Finance）
- ❌ 后台任务（Monitoring）

### 5. 测试直接访问 URL

在浏览器地址栏输入以下 URL，验证访问控制：

**应该可以访问**:
- ✅ `/beetrader/tracker` - 应该能正常访问
- ✅ `/beetrader/backtest` - 应该能正常访问
- ✅ `/beetrader/analyzer` - 应该能正常访问

**应该被拦截**:
- ❌ `/beeai` - 应该显示"权限不足"
- ❌ `/finance/expenses` - 应该显示"权限不足"
- ❌ `/fire` - 应该显示"权限不足"

### 6. 在控制台验证权限数据

打开浏览器控制台（F12），运行：

```javascript
// 查看用户信息
console.log(useAuthStore.getState().auth.user)

// 应该看到：
// {
//   id: "87046b3c-348b-4ffa-8032-e44a56e9c168",
//   email: "xmandongdong@hotmail.com",
//   roles: ["user"],
//   allowedModules: ["beetrader", "beetrader.tracker", ...],
//   ...
// }
```

## 🔧 如果权限不生效

### 问题 1: 侧边栏仍然显示所有菜单

**原因**: 前端代码未重新构建

**解决方案**:
```bash
cd BeeAdmin
pnpm run build
# 或
docker-compose up -d --build bee-admin
```

### 问题 2: 用户数据中没有 allowedModules

**原因**: 用户需要重新登录

**解决方案**:
1. 退出登录
2. 清除浏览器缓存
3. 重新登录

### 问题 3: 数据库权限未正确设置

**验证 SQL**:
```sql
SELECT 
  u.email,
  p.roles,
  p.allowed_modules,
  public.has_module_access(p.id, 'beetrader') as can_beetrader,
  public.has_module_access(p.id, 'beeai') as can_beeai
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'xmandongdong@hotmail.com';
```

**期望结果**:
- `can_beetrader`: true
- `can_beeai`: false

### 问题 4: 某些页面没有权限保护

**原因**: 页面没有使用 ModuleGuard

**解决方案**: 为需要保护的页面添加 ModuleGuard

```tsx
import { ModuleGuard } from '@/components/rbac/module-guard'
import { BeeAdminModules } from '@/lib/rbac'

export function MyPage() {
  return (
    <ModuleGuard module={BeeAdminModules.BEETRADER}>
      <PageContent />
    </ModuleGuard>
  )
}
```

## 📊 测试检查清单

- [ ] 重新构建前端
- [ ] 清除浏览器缓存
- [ ] 使用测试账号登录
- [ ] 验证侧边栏只显示 BeeTrader 相关菜单
- [ ] 验证无法访问 BeeAI 页面
- [ ] 验证无法访问 Finance 页面
- [ ] 在控制台确认 allowedModules 正确
- [ ] 测试直接输入 URL 访问被拦截

## 🎉 预期结果

测试账号登录后：
- ✅ 侧边栏只显示 Dashboard、BeeTrader、Settings、Help Center
- ✅ 可以正常访问所有 BeeTrader 子页面
- ✅ 无法访问 BeeAI、Finance 等其他模块
- ✅ 直接访问其他模块 URL 会被拦截

---

如有问题，请检查：
1. 前端代码是否重新构建
2. 用户是否重新登录
3. 数据库权限配置是否正确
