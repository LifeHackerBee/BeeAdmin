/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ALLOW_SIGNUP?: string
  readonly VITE_ALLOW_FORGOT_PASSWORD?: string
  readonly VITE_IBKR_API_URL?: string
  readonly VITE_IBKR_API_KEY?: string
  readonly VITE_IBKR_ACCOUNT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
