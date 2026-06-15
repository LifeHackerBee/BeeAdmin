/**
 * Auth0 (SPA) 配置
 *
 * BeeAdmin 是纯前端 SPA（Vite → nginx），因此用 Auth0 SPA SDK + PKCE，
 * 只需要 domain + client_id，绝不在前端使用 client secret。
 *
 * 需要的前端环境变量（VITE_ 前缀才会被打进产物）：
 *   VITE_AUTH0_DOMAIN     例：dev-c1pjubizva6hrjt7.jp.auth0.com
 *   VITE_AUTH0_CLIENT_ID  例：rdmICRMYwhoJEst95HPVpTRFY8YNezES
 *   VITE_AUTH0_AUDIENCE   可选：需要 access_token 调后端 API 时填
 *
 * Auth0 应用（Single Page Application 类型）控制台需配置：
 *   Allowed Callback URLs / Allowed Logout URLs / Allowed Web Origins
 *   = 站点 origin（如 https://dash.hackerbee.life）
 */
export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN ?? '',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID ?? '',
  authorizationParams: {
    redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
    ...(import.meta.env.VITE_AUTH0_AUDIENCE
      ? { audience: import.meta.env.VITE_AUTH0_AUDIENCE }
      : {}),
  },
}

export const isAuth0Configured = Boolean(auth0Config.domain && auth0Config.clientId)

/**
 * 若在 Auth0 里给用户配置了角色（Action 注入的自定义 claim），从该 claim 读取。
 * 默认 namespace claim，按需改成你 Auth0 Action 实际写入的键。
 */
export const AUTH0_ROLES_CLAIM = 'https://hackerbee.life/roles'

/**
 * 规范用户 ID 的自定义 claim：用于把 Auth0 用户映射到原 Supabase 用户 UUID，
 * 使按 user_id 归属的数据（如 kol_mvp_log）对得上。
 *
 * 在 Auth0 把用户的 app_metadata.uid 设为原 Supabase UUID，并加一个 Post-Login Action：
 *   exports.onExecutePostLogin = async (event, api) => {
 *     const uid = event.user.app_metadata?.uid
 *     if (uid) {
 *       api.idToken.setCustomClaim('https://hackerbee.life/uid', uid)
 *       api.accessToken.setCustomClaim('https://hackerbee.life/uid', uid)
 *     }
 *   }
 * 未设置时回退到 Auth0 的 sub。
 */
export const AUTH0_UID_CLAIM = 'https://hackerbee.life/uid'
