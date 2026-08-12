/* Cloudflare Pages Functions —— /api/* 统一入口
 * 把 /api/<rest> 转发给 functions/lib/baidiao.js 的 handleApi。
 * 静态站点（index.html / app.html / assets/）由 Cloudflare Pages 自动托管，不在此处理。
 */
import { handleApi } from '../lib/baidiao.js';

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  const rest = (params && params.path) || '';
  const pathname = '/api/' + String(rest).replace(/\/+$/, '');

  let body = null;
  if (method === 'POST' || method === 'PUT') {
    try { body = await request.json(); } catch (e) { body = {}; }
  }

  try {
    const result = await handleApi(pathname, method, body, env);
    return jsonResponse(result.json, result.status);
  } catch (err) {
    return jsonResponse({ ok: false, error: String((err && err.message) || err) }, 500);
  }
}
