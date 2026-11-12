# 构建阶段
FROM node:24-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm（锁定 v9，与 pnpm-lock.yaml lockfileVersion 9.0 匹配；
# pnpm v10 会因 ERR_PNPM_IGNORED_BUILDS 直接报错中断安装）
RUN npm install -g pnpm@9

# 安装依赖
# 使用 --no-frozen-lockfile 允许在 lockfile 不同步时自动更新
RUN pnpm install --no-frozen-lockfile

# 复制源代码
COPY . .

# 构建参数 - 用于传递环境变量
# 2026-11-08 改造：前端零密钥，只保留公开配置
# 2026-11-12：认证改本地账号，Auth0 配置删除
ARG VITE_HYPERLIQUID_TRADER_API_URL
ARG VITE_ALLOW_SIGNUP
ARG VITE_ALLOW_FORGOT_PASSWORD

# 设置环境变量（构建时需要）
ENV VITE_HYPERLIQUID_TRADER_API_URL=$VITE_HYPERLIQUID_TRADER_API_URL
ENV VITE_ALLOW_SIGNUP=$VITE_ALLOW_SIGNUP
ENV VITE_ALLOW_FORGOT_PASSWORD=$VITE_ALLOW_FORGOT_PASSWORD

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
