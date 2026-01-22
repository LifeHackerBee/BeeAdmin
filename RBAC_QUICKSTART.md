# BeeAdmin 权限系统 - 快速入门

## 🎯 已完成的工作

### 1. 数据库层

✅ 创建了 `profiles` 表，用于扩展用户权限管理  
✅ 实现了 RLS（行级安全）策略  
✅ 创建了辅助函数：
  - `get_user_profile()` - 获取用户完整信息
  - `has_module_access()` - 检查模块权限
  - `update_last_login()` - 更新最后登录时间
  - `admin_update_user_roles()` - 管理员更新用户角色
  - `admin_update_user_modules()` - 管理员更新模块权限

✅ 设置了自动触发器，新用户注册时自动创建 profile

### 2. 前端层

✅ 更新了 `auth-store.ts`，从 profiles 表读取权限信息  
✅ 扩展了 `rbac.ts`，添加了模块权限检查功能  
✅ 更新了 `use-rbac.ts` hook，支持模块权限检查  
✅ 创建了 `ModuleGuard` 组件，用于保护需要权限的内容  
✅ 创建了用户权限管理相关的 hooks 和组件  
✅ 在 Tracker 页面添加了权限检查示例

## 🚀 快速测试

### 1. 测试管理员权限

在 Supabase SQL Editor 中运行：

```sql
-- 将当前用户提升为管理员
UPDATE public.profiles
SET roles = ARRAY['admin', 'user']::TEXT[]
WHERE id = auth.uid();
```

### 2. 测试模块权限限制

```sql
-- 限制用户只能访问 beetrader 模块
UPDATE public.profiles
SET 
  roles = ARRAY['user']::TEXT[],
  allowed_modules = ARRAY['beetrader']::TEXT[]
WHERE id = auth.uid();
```

### 3. 验证权限检查

```sql
-- 检查当前用户的权限
SELECT * FROM public.get_user_profile(auth.uid());

-- 检查是否有特定模块权限
SELECT 
  public.has_module_access(auth.uid(), 'beetrader.tracker') as has_tracker,
  public.has_module_access(auth.uid(), 'beeai') as has_beeai;
```

## 📝 使用示例

### 在组件中使用权限检查

```tsx
import { useRBAC } from '@/hooks/use-rbac'
import { BeeAdminModules } from '@/lib/rbac'

function MyComponent() {
  const { hasModuleAccess, isAdmin } = useRBAC()

  if (isAdmin()) {
    return <AdminView />
  }

  if (hasModuleAccess(BeeAdminModules.BEETRADER_TRACKER)) {
    return <TrackerView />
  }

  return <NoAccessView />
}
```

### 使用 ModuleGuard 保护页面

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
```

## 🔧 常用操作

### 查看所有用户权限

```sql
SELECT 
  p.id,
  u.email,
  p.full_name,
  p.roles,
  p.allowed_modules,
  p.is_active,
  p.last_login_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC;
```

### 批量授予权限

```sql
-- 给所有已验证用户授予 beetrader 模块权限
UPDATE public.profiles
SET allowed_modules = array_append(allowed_modules, 'beetrader')
WHERE is_verified = true
  AND NOT ('beetrader' = ANY(allowed_modules));
```

### 重置用户权限（允许访问所有模块）

```sql
UPDATE public.profiles
SET allowed_modules = ARRAY[]::TEXT[]
WHERE id = 'USER_ID_HERE';
```

## 📂 文件位置

- **数据库迁移**: `supabase/migrations/create_profiles_table_v2.sql`
- **测试脚本**: `supabase/test_scripts/test_profiles_permissions.sql`
- **前端 Store**: `BeeAdmin/src/stores/auth-store.ts`
- **RBAC 库**: `BeeAdmin/src/lib/rbac.ts`
- **权限 Hook**: `BeeAdmin/src/hooks/use-rbac.ts`
- **权限守卫**: `BeeAdmin/src/components/rbac/module-guard.tsx`
- **详细文档**: `BeeAdmin/RBAC_GUIDE.md`

## ⚠️ 注意事项

1. **管理员权限**: `admin` 角色的用户拥有所有权限，无视 `allowed_modules` 设置
2. **空数组含义**: `allowed_modules = []` 表示允许访问所有模块
3. **父模块匹配**: 允许 `beetrader` 会自动允许所有 `beetrader.*` 子模块
4. **至少一个角色**: 用户必须至少有一个有效角色（`admin`, `manager`, `user`, `guest`）

## 🐛 故障排除

### 问题：前端显示没有权限

1. 检查用户的 `is_active` 状态
2. 检查 `allowed_modules` 是否正确配置
3. 清除浏览器缓存并重新登录
4. 在控制台查看用户信息：
   ```javascript
   console.log(useAuthStore.getState().auth.user)
   ```

### 问题：无法更新权限

1. 确保你有管理员权限
2. 检查 RLS 策略是否正确应用
3. 查看 Supabase 日志中的错误信息

## 📚 下一步

- [ ] 在其他页面添加 `ModuleGuard`
- [ ] 创建用户权限管理界面
- [ ] 添加权限变更日志
- [ ] 实现更细粒度的功能级权限

## 💡 示例场景

### 场景 1: 限制新用户只能访问 Finance 模块

```sql
UPDATE public.profiles
SET allowed_modules = ARRAY['finance']::TEXT[]
WHERE email = 'newuser@example.com';
```

### 场景 2: 授予用户多个模块权限

```sql
UPDATE public.profiles
SET allowed_modules = ARRAY['beetrader', 'beeai', 'finance']::TEXT[]
WHERE email = 'user@example.com';
```

### 场景 3: 提升用户为经理

```sql
UPDATE public.profiles
SET roles = ARRAY['manager', 'user']::TEXT[]
WHERE email = 'user@example.com';
```

---

如有问题，请参考详细文档 `BeeAdmin/RBAC_GUIDE.md`
