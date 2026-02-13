/**
 * Vercel Serverless：代理火火 /ask/stream，避免浏览器直连时的 CORS（Cloudflare 返回 403 无 CORS 头）
 * 环境变量（与 .env 一致，在 Vercel Settings → Environment Variables 中配置）：
 *   VITE_HUOHUO_API_URL  可选，默认 https://huohuo.hackerbee.life
 *   VITE_CF_ACCESS_CLIENT_ID
 *   VITE_CF_ACCESS_CLIENT_SECRET
 */

const HUOHUO_BASE =
  process.env.VITE_HUOHUO_API_URL || 'https://huohuo.hackerbee.life'
const STREAM_URL = `${HUOHUO_BASE.replace(/\/$/, '')}/ask/stream`

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const clientId = process.env.VITE_CF_ACCESS_CLIENT_ID || ''
    const clientSecret = process.env.VITE_CF_ACCESS_CLIENT_SECRET || ''

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          error: 'Missing VITE_CF_ACCESS_CLIENT_ID or VITE_CF_ACCESS_CLIENT_SECRET',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const message = body?.message
    if (typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "message" field' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const upstream = await fetch(STREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'CF-Access-Client-Id': clientId,
        'CF-Access-Client-Secret': clientSecret,
      },
      body: JSON.stringify({ message }),
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return new Response(
        JSON.stringify({ error: text || `upstream ${upstream.status}` }),
        {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  },
}
