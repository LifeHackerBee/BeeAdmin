/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ALLOW_SIGNUP?: string
  readonly VITE_ALLOW_FORGOT_PASSWORD?: string
  readonly VITE_IBKR_API_URL?: string
  readonly VITE_IBKR_API_KEY?: string
  readonly VITE_IBKR_ACCOUNT_ID?: string
  readonly VITE_HYPERLIQUID_TRADER_API_URL?: string
  readonly VITE_CRAWL4AI_API_URL?: string
  readonly VITE_CRAWL4AI_SECRET_KEY?: string
  readonly VITE_CF_ACCESS_CLIENT_ID?: string
  readonly VITE_CF_ACCESS_CLIENT_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
