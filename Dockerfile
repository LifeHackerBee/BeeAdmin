# 构建阶段
FROM node:24-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
# 使用 --no-frozen-lockfile 允许在 lockfile 不同步时自动更新
RUN pnpm install --no-frozen-lockfile

# 复制源代码
COPY . .

# 构建参数 - 用于传递环境变量
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# 设置环境变量（构建时需要）
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# 构建应用
RUN pnpm run build

# 生产阶段 - 使用 nginx
FROM nginx:1.27-alpine

# 复制构建产物到 nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]

