/// <reference types="vite/client" />

declare const __APP_VERSION__: string

/**
 * 2026-11-08 改造：前端零密钥。
 * VITE_ 变量会被打进公开的 JS 包 —— 这里只允许出现非敏感配置。
 * 所有上游密钥（LLM/CF Access/Crawl4AI/后端 API Key）都在后端 .env，
 * 前端经后端 /api/proxy/* 代理访问；后端认证用本地账号签发的 JWT Bearer token。
 */
interface ImportMetaEnv {
  readonly VITE_ALLOW_SIGNUP?: string
  readonly VITE_ALLOW_FORGOT_PASSWORD?: string
  readonly VITE_HYPERLIQUID_TRADER_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
