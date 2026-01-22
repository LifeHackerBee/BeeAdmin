# BeeAdmin 权限管理系统

## 概述

BeeAdmin 现在支持基于角色的访问控制 (RBAC) 和模块级权限管理。权限数据存储在 Supabase 的 `profiles` 表中。

## 数据库架构

### profiles 表

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 基本信息
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  
  -- 权限和角色
  roles TEXT[] NOT NULL DEFAULT ARRAY['user']::TEXT[],
  custom_permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  allowed_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- 状态
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  
  -- 元数据
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

### 字段说明

- **roles**: 用户角色数组，可选值：`admin`, `manager`, `user`, `guest`
- **custom_permissions**: 自定义权限列表，补充角色权限
- **allowed_modules**: 允许访问的模块列表（空数组表示允许访问所有模块）
- **is_active**: 用户是否激活
- **is_verified**: 用户邮箱是否已验证

## 权限级别

### 1. 角色 (Roles)

系统预定义了 4 种角色：

- **admin**: 管理员，拥有所有权限
- **manager**: 经理，拥有大部分权限
- **user**: 普通用户，拥有基本权限
- **guest**: 访客，只读权限

### 2. 模块权限 (Module Access)

BeeAdmin 支持细粒度的模块权限控制。模块列表定义在 `src/lib/rbac.ts` 中：

```typescript
export const BeeAdminModules = {
  BEETRADER: 'beetrader',
  BEETRADER_TRACKER: 'beetrader.tracker',
  BEETRADER_BACKTEST: 'beetrader.backtest',
  BEEAI: 'beeai',
  FINANCE: 'finance',
  FINANCE_EXPENSES: 'finance.expenses',
  // ... 更多模块
}
```

**模块权限规则**：
- 管理员 (`admin`) 拥有所有模块权限
- `allowed_modules` 为空数组 = 允许访问所有模块
- 支持父模块匹配：如果允许 `beetrader`，则也允许 `beetrader.tracker`

## 使用方法

### 1. 在组件中使用 useRBAC Hook

```tsx
import { useRBAC } from '@/hooks/use-rbac'
import { BeeAdminModules } from '@/lib/rbac'

function MyComponent() {
  const { 
    roles,                    // 用户角色列表
    allowedModules,          // 用户允许的模块列表
    hasPermission,           // 检查权限
    hasRole,                 // 检查角色
    isAdmin,                 // 是否管理员
    hasModuleAccess,         // 检查模块权限
    getAccessibleModules     // 获取可访问的模块列表
  } = useRBAC()

  // 检查角色
  if (isAdmin()) {
    return <AdminPanel />
  }

  // 检查模块权限
  if (hasModuleAccess(BeeAdminModules.BEETRADER_TRACKER)) {
    return <TrackerContent />
  }

  return <NoAccess />
}
```

### 2. 使用 ModuleGuard 组件保护内容

```tsx
import { ModuleGuard } from '@/components/rbac/module-guard'
import { BeeAdminModules } from '@/lib/rbac'

export function TrackerPage() {
  return (
    <ModuleGuard module={BeeAdminModules.BEETRADER_TRACKER}>
      <TrackerContent />
    </ModuleGuard>
  )
}

// 自定义无权限提示
export function TrackerPageCustom() {
  return (
    <ModuleGuard 
      module={BeeAdminModules.BEETRADER_TRACKER}
      fallback={<div>您需要 Tracker 模块权限才能访问此页面</div>}
    >
      <TrackerContent />
    </ModuleGuard>
  )
}
```

### 3. 使用 RoleGuard 组件保护内容（基于角色）

```tsx
import { RoleGuard } from '@/components/rbac/role-guard'

export function AdminPage() {
  return (
    <RoleGuard roles={['admin']}>
      <AdminContent />
    </RoleGuard>
  )
}

export function ManagerOrAdminPage() {
  return (
    <RoleGuard roles={['admin', 'manager']}>
      <ManagerContent />
    </RoleGuard>
  )
}
```

## 数据库操作

### 1. 查询用户权限

```sql
-- 获取用户的完整 profile
SELECT * FROM public.get_user_profile('user-uuid-here');

-- 检查用户是否有模块权限
SELECT public.has_module_access('user-uuid-here', 'beetrader.tracker');
```

### 2. 更新用户权限（管理员操作）

```sql
-- 更新用户角色
SELECT public.admin_update_user_roles(
  'user-uuid-here',
  ARRAY['manager', 'user']::TEXT[]
);

-- 更新用户模块权限
SELECT public.admin_update_user_modules(
  'user-uuid-here',
  ARRAY['beetrader', 'beeai']::TEXT[]
);
```

### 3. 直接更新（需要管理员权限）

```sql
-- 更新用户角色和模块权限
UPDATE public.profiles
SET 
  roles = ARRAY['manager', 'user']::TEXT[],
  allowed_modules = ARRAY['beetrader', 'finance']::TEXT[],
  updated_at = NOW()
WHERE id = 'user-uuid-here';
```

### 4. 批量授予权限

```sql
-- 给所有已验证用户授予 beetrader 模块权限
UPDATE public.profiles
SET 
  allowed_modules = array_append(allowed_modules, 'beetrader'),
  updated_at = NOW()
WHERE is_verified = true
  AND NOT ('beetrader' = ANY(allowed_modules));
```

## 示例场景

### 场景 1: 新用户注册

当用户注册时，会自动创建 profile 记录（通过触发器）：
- 默认角色：`['user']`
- 默认模块权限：`[]`（允许访问所有模块）
- 状态：根据邮箱验证状态设置

### 场景 2: 限制用户只能访问特定模块

```sql
-- 限制用户只能访问 finance 模块
UPDATE public.profiles
SET 
  allowed_modules = ARRAY['finance']::TEXT[],
  updated_at = NOW()
WHERE id = 'user-uuid-here';
```

现在该用户只能访问：
- `finance`
- `finance.expenses`
- `finance.assets`
- 等所有 `finance.*` 子模块

### 场景 3: 授予用户多个模块权限

```sql
-- 授予用户访问 beetrader 和 beeai 模块
UPDATE public.profiles
SET 
  allowed_modules = ARRAY['beetrader', 'beeai']::TEXT[],
  updated_at = NOW()
WHERE id = 'user-uuid-here';
```

### 场景 4: 提升用户为管理员

```sql
-- 提升用户为管理员（拥有所有权限）
UPDATE public.profiles
SET 
  roles = ARRAY['admin', 'user']::TEXT[],
  updated_at = NOW()
WHERE id = 'user-uuid-here';
```

## RLS (行级安全) 策略

profiles 表启用了 RLS，策略如下：

- **用户可以查看自己的 profile**
- **用户可以更新自己的 profile**（但不能修改 `roles` 和 `allowed_modules`）
- **管理员可以查看/更新/插入/删除所有 profiles**

## 前端权限检查流程

1. 用户登录后，从 `auth.users` 和 `profiles` 表获取用户信息
2. 用户信息存储在 `authStore` 中，包含角色和模块权限
3. 组件通过 `useRBAC` hook 检查权限
4. `ModuleGuard` 或条件渲染控制内容显示
5. 最后登录时间自动更新（通过 `update_last_login` 函数）

## 注意事项

1. **管理员拥有所有权限**：`admin` 角色的用户可以访问所有模块，忽略 `allowed_modules` 设置
2. **空数组的含义**：`allowed_modules = []` 表示允许访问所有模块（针对非管理员用户）
3. **父模块匹配**：允许 `beetrader` 会自动允许所有 `beetrader.*` 子模块
4. **角色验证**：`roles` 数组必须包含至少一个有效角色（`admin`, `manager`, `user`, `guest`）
5. **触发器自动创建**：新用户注册时会自动创建 profile 记录

## 故障排除

### 问题：用户无法访问某个模块

检查清单：
1. 检查用户的 `is_active` 是否为 `true`
2. 检查用户的角色是否包含必要的角色
3. 检查 `allowed_modules` 是否为空或包含该模块
4. 检查浏览器控制台是否有权限错误

```sql
-- 调试 SQL
SELECT 
  id,
  full_name,
  roles,
  allowed_modules,
  is_active,
  is_verified
FROM public.profiles
WHERE id = 'user-uuid-here';
```

### 问题：前端显示的权限信息不正确

1. 清除浏览器缓存和 localStorage
2. 重新登录
3. 检查 `authStore` 中的用户信息是否正确

```javascript
// 在浏览器控制台运行
console.log(useAuthStore.getState().auth.user)
```

## 扩展

如果需要添加新的模块，请：

1. 在 `src/lib/rbac.ts` 的 `BeeAdminModules` 中添加新模块
2. 更新相关页面，使用 `ModuleGuard` 保护
3. 更新本文档，添加新模块的说明

## 参考

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [RBAC (Role-Based Access Control)](https://en.wikipedia.org/wiki/Role-based_access_control)
