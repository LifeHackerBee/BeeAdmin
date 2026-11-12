# 安全改造说明（2026-11-08）

## 2026-11-12 认证迁移：Auth0 → 本地账号 + JWT

少数人使用的自托管应用，Auth0 控制台维护成本不划算，改为业界标准的自建方案：

- **后端**：PG 新表 `local_users`（主键沿用原 Supabase profiles 的 UUID，
  按 user_id 关联的数据不断链）；`app/auth_local.py` 实现
  - `POST /api/auth/login` — bcrypt 验密 → HS256 JWT（7 天），带 IP 限流
    （10 分钟 10 次失败）
  - `GET /api/auth/me` — 会话恢复
  - `POST /api/auth/change-password` — 修改密码（需 Bearer）
  - 中间件 Bearer 验签换成本地 JWT；`/api/auth/login` 加入认证豁免路径
  - 依赖：`passlib[bcrypt]` + `bcrypt>=4,<5`（bcrypt 5.0 与 passlib 1.7.4 不兼容）
- **迁移的用户**（初始临时密码不写入本仓库，已通过其他渠道告知；登录后请立即改密）：
  - `hackerbee@hackerbee.life`（admin）
  - `yuanyuan@hackerbee.life`（admin）
  - `xmandongdong@hackerbee.life`（user，保留原模块白名单）
- **前端**：删除 `@auth0/auth0-react` 与全部 Auth0 配置；登录页改为
  邮箱+密码表单；JWT 存 localStorage，`auth-bridge.tsx` 挂载时经
  `/api/auth/me` 恢复会话；sign-up / forgot-password / OTP 页面删除
- **清理**：`app/auth0_verify.py`、`src/lib/auth0.ts` 删除；
  `.env` 两端 AUTH0_*/VITE_AUTH0_* 配置删除
- **注意**：修改后端 `JWT_SECRET` 会让所有已登录会话立即失效



## 背景

此前所有上游密钥（后端 API Key / IBKR / OpenAI / CF Access / Crawl4AI）都通过
`VITE_` 环境变量打进前端 JS 包，在公网公开可下载；且 Auth0 注册开放，
任何人可注册登录。Vercel 部署已删除，本改造让前端彻底零密钥。

## 改造后的架构

```
浏览器（零密钥，只持 Auth0 短期 access token）
   │  Authorization: Bearer <Auth0 JWT>
   ▼
后端 FastAPI（hyperliquid-ai-trader）
   ├─ Auth0 JWKS 验签（app/auth0_verify.py）
   ├─ /api/proxy/llm/chat/completions  → 复用后端主 OPENAI_*（Azure OpenAI）
   └─ /api/cvd/ws-ticket               → WebSocket 一次性 ticket
```

## 你还需要手动做的事（重要！）

1. **轮换已泄露的密钥**（旧值已随 JS 包公开，必须视为已泄露）：
   - [x] ModelArts API Key —— `FRONTEND_LLM_*` 配置已整体删除，前端 LLM 代理
     复用后端主 `OPENAI_*`（Azure OpenAI）。ModelArts 旧 key 若还在华为云账户里，
     建议顺手在控制台删除
   - [x] IBKR 网关 Key（已在 2026-11-09 轮换；IBKR 模块随后整体下线）
   - [x] Cloudflare Access Client Secret（Crawl4AI 下线后已无使用方，
     在 Zero Trust → Service Tokens **删除**该 token 即可，无需轮换）
   - [x] 后端 `API_KEY` 已轮换（见 hyperliquid-ai-trader/.env）
2. **关闭 Auth0 注册**：Auth0 Dashboard → Authentication → Database →
   Settings → **Disable Sign Ups**；并删除陌生注册用户
3. **创建 Auth0 API**（让前端拿到可验证的 access token）：
   - Auth0 Dashboard → APIs → Create API，名字随意（如 `hyperliquid-trader`），
     Identifier 随便一个 URI（如 `https://hyperliquid-ai-trader.hackerbee.life`）
   - 把 Identifier 同时填到：
     - 前端 `BeeAdmin/.env` 的 `VITE_AUTH0_AUDIENCE`
     - 后端 `hyperliquid-ai-trader/.env` 的 `AUTH0_AUDIENCE`
   - 可选：后端 `AUTH0_ALLOWED_SUBS` 填你的 `auth0|xxx` user_id 白名单（推荐，双重保险）
4. **重新部署后端**：`cd hyperliquid-ai-trader && docker compose up --build -d`

## 后端新增配置（hyperliquid-ai-trader/.env）

```env
AUTH0_DOMAIN=dev-c1pjubizva6hrjt7.jp.auth0.com
AUTH0_AUDIENCE=<Auth0 API Identifier>
AUTH0_ALLOWED_SUBS=          # 可选白名单
# 前端 LLM 代理复用后端主 OPENAI_*（无独立 FRONTEND_LLM_* 配置）
```

## 认证规则（后端中间件）

- `Authorization: Bearer <Auth0 JWT>` → Auth0 JWKS 验签，通过即放行（前端用）
- `X-API-Key: <API_KEY>` → 服务间/CLI 调用（只存后端）
- 两者都不带 → 401
- WebSocket（/ws/cvd/{coin}）：先 `POST /api/cvd/ws-ticket`（带 Bearer）换
  60 秒一次性 ticket，再 `ws://...?ticket=xxx` 连接

## 前端遗留检查

- `VITE_HYPERLIQUID_TRADER_API_URL` 仍是公开配置（服务地址本身不敏感）
- Auth0 `domain` / `client_id` 是公开信息（OAuth2 标准设计）
- 构建产物已验证不含任何密钥（grep 扫描通过）

## 2026-11-09 模块下线

- **BeeAI（火火 Agent）模块删除**：前端 `src/features/beeai/`、路由 `/beeai`、
  侧边栏/RBAC 条目移除；后端 `/api/proxy/huohuo/*` 代理与 `HUOHUO_API_URL` 配置删除
- **投资账户（IBKR）模块删除**：前端 `src/features/finance/investment/`、路由
  `/finance/investment`、侧边栏/RBAC 条目移除；后端 `/api/proxy/ibkr/*` 代理与
  `IBKR_API_URL/KEY` 配置删除。VPS 上的 IBKR-Web-API-Server 可自行 `docker compose down`
- **Crawl4AI 爬虫模块删除**：前端 `src/features/crawler/`、路由 `/apps/crawler`、
  侧边栏/应用市场/RBAC 条目移除；后端 `/api/proxy/crawl4ai/*` 代理删除。
  CF Access service token（已泄露的 Client Secret）随之失去唯一使用方 ——
  **直接在 Cloudflare Zero Trust → Service Tokens 删除即可，无需再轮换**
