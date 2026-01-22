# BeeAdmin Dashboard

Admin Dashboard UI crafted with Shadcn and Vite. Built with responsiveness and accessibility in mind.



## Tech Stack

**UI:** [ShadcnUI](https://ui.shadcn.com) (TailwindCSS + RadixUI)

**Build Tool:** [Vite](https://vitejs.dev/)

**Routing:** [TanStack Router](https://tanstack.com/router/latest)

**Type Checking:** [TypeScript](https://www.typescriptlang.org/)

**Linting/Formatting:** [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/)

**Icons:** [Lucide Icons](https://lucide.dev/icons/), [Tabler Icons](https://tabler.io/icons) (Brand icons only)

**Auth:** [Supabase](https://supabase.com/)

**权限管理:** 基于角色的访问控制 (RBAC) + 模块级权限

## 功能特性

### 🔐 权限管理系统

BeeAdmin 内置了完整的权限管理系统，支持：

- **角色管理**: admin（管理员）、manager（经理）、user（普通用户）、guest（访客）
- **模块权限**: 细粒度的模块级访问控制
- **灵活配置**: 通过 Supabase profiles 表管理用户权限
- **安全性**: RLS（行级安全）保护，用户无法修改自己的权限

详细文档：
- [完整权限管理指南](./RBAC_GUIDE.md)
- [快速入门指南](./RBAC_QUICKSTART.md)

### 快速配置管理员

在 Supabase SQL Editor 中运行：

```sql
UPDATE public.profiles
SET roles = ARRAY['admin', 'user']::TEXT[]
WHERE id = (SELECT id FROM auth.users WHERE email = '你的邮箱');
```

查看更多配置选项：`../supabase/scripts/setup_admin_user.sql`

## 环境配置

在项目根目录创建 `.env` 文件，并配置以下 Supabase 环境变量：

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

你可以参考 `.env.example` 文件（如果存在）来了解所需的配置项。

### 获取 Supabase 凭证

1. 登录到 [Supabase Dashboard](https://app.supabase.com/)
2. 选择你的项目（或创建新项目）
3. 进入 **Settings** > **API**
4. 复制 **Project URL** 作为 `VITE_SUPABASE_URL`
5. 复制 **anon public** key 作为 `VITE_SUPABASE_ANON_KEY`

## Run Locally

Clone the project

```bash
  git clone <your-repo-url>
```

Go to the project directory

```bash
  cd bee-admin
```

Install dependencies

```bash
  pnpm install
```

配置环境变量（见上方说明）

Start the server

```bash
  pnpm run dev
```

## Docker 部署

### 使用 Docker Compose 启动

1. 确保已创建 `.env` 文件（参考上方环境配置说明）

2. 构建并启动容器：

```bash
  docker-compose up -d
```

3. 访问应用：

打开浏览器访问 `http://localhost:3000`

### Docker Compose 命令

```bash
# 启动服务（后台运行）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build

# 查看服务状态
docker-compose ps
```

### 开发模式（热重载）

使用开发模式的 docker-compose 配置：

```bash
  docker-compose -f docker-compose.dev.yml up
```

访问 `http://localhost:5173`，代码修改会自动热重载。

### 单独使用 Docker

```bash
# 构建镜像（需要先设置环境变量）
export VITE_SUPABASE_URL=your_supabase_url
export VITE_SUPABASE_ANON_KEY=your_anon_key

docker build \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  -t bee-admin .

# 运行容器
docker run -d -p 3000:80 --name bee-admin bee-admin
```

### 注意事项

⚠️ **重要**：Vite 的环境变量是在构建时注入的，不是运行时。如果需要更改环境变量，需要重新构建镜像。

- 生产环境：使用 `docker-compose.yml`（构建后部署）
- 开发环境：使用 `docker-compose.dev.yml`（支持热重载）

## Sponsoring this project ❤️

If you find this project helpful or use this in your own work, consider [sponsoring me](https://github.com/sponsors/satnaing) to support development and maintenance. You can [buy me a coffee](https://buymeacoffee.com/satnaing) as well. Don’t worry, every penny helps. Thank you! 🙏

For questions or sponsorship inquiries, feel free to reach out at [satnaingdev@gmail.com](mailto:satnaingdev@gmail.com).

## Author

Crafted with 🤍 by BeeAdmin Team

## License

Licensed under the [MIT License](https://choosealicense.com/licenses/mit/)
