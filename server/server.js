/* OgCloud 销售赋能原型 —— 本地后端
 * 职责：
 *   1) 静态托管原型（让 app.html 走 localhost 打开）
 *   2) POST /api/baidiao  —— 把 {name,industry,region,extra} 转发给「OpenAI 兼容」大模型，
 *      要求模型按既有 8 章报告 schema 输出 JSON（前端 openReport 直接渲染）
 *   3) GET  /api/config   —— 返回是否已配置模型 key（前端据此决定走 AI 还是模板回退）
 *   4) POST /api/config    —— 保存模型配置到 server/config.json，运行期热更新，无需重启
 *   5) POST /api/config/test —— 用给定配置做一次最小连通性测试（不落盘）
 *
 * 零三方依赖，仅用 Node 内置模块。API key 仅在服务端读取，绝不进浏览器。
 *
 * 启动：  node server/server.js
 * 配置：  方式一（手工）复制 server/.env.example 为 server/.env 并填写；
 *        方式二（页面）在原型「AI 配置」页填写并保存，写入 server/config.json。
 *        优先级：命令行 env > config.json > .env > 默认值。
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { execSync } = require('child_process');

/* 代理需要 undici 的 ProxyAgent；为让 dispatcher 与 fetch 属于同一 undici 实例，
 * 这里统一用 npm undici 提供的 fetch（而非 Node 内置全局 fetch），否则会报 UND_ERR_INVALID_ARG。 */
let undiciFetch = fetch;
let ProxyAgentCls = null;
try {
  const _u = require('undici');
  undiciFetch = _u.fetch;
  ProxyAgentCls = _u.ProxyAgent;
} catch (e) { /* 未安装 undici 则回退全局 fetch（直连，无代理） */ }

const ROOT = path.resolve(__dirname, '..', 'public'); // 原型根目录（含 app.html / index.html）
const PORT = process.env.PORT || 4173;
const CONFIG_FILE = path.join(__dirname, 'config.json');

/* ---------- 读取 .env（不依赖任何库） ---------- */
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const map = {};
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(function (line) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        map[m[1]] = v;
      }
    });
  }
  return map;
}
const ENV = loadEnv();

/* ---------- 读取 config.json（UI 保存的运行时配置，优先级高于 .env） ---------- */
let CFG = loadConfig();
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const o = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (o && typeof o === 'object') return o;
    }
  } catch (e) { /* 损坏则忽略，回退到 .env/默认 */ }
  return {};
}
function saveConfig(obj) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

/* ---------- 运行时配置解析（优先级：process.env > config.json > .env > 默认） ---------- */
function resolve(k, def) {
  if (process.env[k] != null && String(process.env[k]) !== '') return process.env[k];
  if (CFG && CFG[k] != null && String(CFG[k]) !== '') return CFG[k];
  if (ENV[k] != null && String(ENV[k]) !== '') return ENV[k];
  return def;
}
function runtime() {
  return {
    LLM_BASE_URL: resolve('LLM_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1').trim(),
    LLM_API_KEY: resolve('LLM_API_KEY', '').trim(),
    LLM_MODEL: resolve('LLM_MODEL', 'qwen-plus').trim(),
    LLM_TIMEOUT: parseInt(resolve('LLM_TIMEOUT', '90000'), 10) || 90000,
    LLM_PROXY: EFFECTIVE_PROXY,
    SEARCH_PROVIDER: resolve('SEARCH_PROVIDER', 'none').trim(),
    SEARCH_BASE_URL: resolve('SEARCH_BASE_URL', 'https://api.perplexity.com').trim(),
    SEARCH_MODEL: resolve('SEARCH_MODEL', 'sonar-pro').trim(),
    TYC_KEY: resolve('TYC_KEY', '').trim(),
    TYC_MCP_URL: resolve('TYC_MCP_URL', 'https://mcp.tianyancha.com/v1').trim()
  };
}
function maskKey(k) {
  if (!k) return '';
  if (k.length <= 8) return '••••••••';
  return k.slice(0, 4) + '••••••' + k.slice(-4);
}
/* ---------- 代理（Node fetch 默认不走系统代理，公司内网/全局代理下需手动指定） ---------- */
/* 自动检测顺序：手动配置(LLM_PROXY) > 环境变量(HTTPS_PROXY) > Windows 系统代理(注册表) */
let PROXY_AGENT = null;
let EFFECTIVE_PROXY = '';

function explicitProxy() {
  if (process.env.LLM_PROXY && process.env.LLM_PROXY.trim()) return process.env.LLM_PROXY.trim();
  if (CFG.LLM_PROXY && CFG.LLM_PROXY.trim()) return CFG.LLM_PROXY.trim();
  if (ENV.LLM_PROXY && ENV.LLM_PROXY.trim()) return ENV.LLM_PROXY.trim();
  return process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || '';
}

function readWindowsSystemProxy() {
  if (process.platform !== 'win32') return '';
  try {
    const out = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"', { encoding: 'utf8', windowsHide: true });
    if (!/ProxyEnable[\s\S]*?0x1\b/.test(out)) return '';   // 未启用系统代理
    const m = out.match(/ProxyServer\s+REG_SZ\s+(\S+)/);
    if (!m) return '';
    let p = m[1].trim();
    const hp = p.match(/https=([^\s;]+)/i);
    const htp = p.match(/http=([^\s;]+)/i);
    if (hp) p = hp[1]; else if (htp) p = htp[1];
    if (!/^https?:/i.test(p)) p = 'http://' + p;
    return p;
  } catch (e) {
    return '';
  }
}

function proxyUrlToHostPort(proxyUrl) {
  try {
    const u = new URL(proxyUrl);
    const port = parseInt(u.port, 10) || (u.protocol === 'https:' ? 443 : 80);
    return { host: u.hostname, port };
  } catch (e) { return null; }
}
async function validateProxy(proxyUrl) {
  const hp = proxyUrlToHostPort(proxyUrl);
  if (!hp) return false;
  const net = require('net');
  return new Promise(function (resolve) {
    const s = net.createConnection(hp.port, hp.host);
    s.setTimeout(3000);
    s.once('connect', function () { s.end(); resolve(true); });
    s.once('error', function () { resolve(false); });
    s.once('timeout', function () { s.destroy(); resolve(false); });
  });
}
async function initProxy() {
  const proxy = explicitProxy() || readWindowsSystemProxy();
  EFFECTIVE_PROXY = proxy || '';
  PROXY_AGENT = null;
  if (!proxy) {
    console.log('网络代理：未检测到（直连模式，如仍超时请检查本机是否需要代理访问外网）');
    return;
  }
  const ok = await validateProxy(proxy);
  if (!ok) {
    console.log('⚠️ 检测到代理 ' + proxy + ' 但端口无法连接，已回退直连。如需代理请打开 Clash/VPN 后重启服务。');
    EFFECTIVE_PROXY = '';
    return;
  }
  try {
    if (!ProxyAgentCls) throw new Error('undici 未安装');
    PROXY_AGENT = new ProxyAgentCls(proxy);
    console.log('已启用网络代理（自动检测）：' + proxy);
  } catch (e) {
    console.log('⚠️ 未加载 undici 代理模块，将直连；如需代理请先执行 npm install undici。原因：' + e.message);
  }
}

function formatError(err) {
  const msg = String(err && err.message || err);
  if (msg.includes('aborted') || msg.includes('AbortError') || msg.includes('timeout')) {
    return '请求超时：接口在 ' + (runtime().LLM_TIMEOUT / 1000) + ' 秒内未响应，请检查网络、Base URL 是否带 /v1、API Key 是否正确';
  }
  if (msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
    return '网络连接失败：无法访问该接口地址，请检查网络或 Base URL';
  }
  return msg;
}

/* ---------- 提示词 ---------- */
const SYSTEM_PROMPT = `你是一名资深的 B2B 网络安全销售赋能顾问，服务于云网安全厂商「OgCloud（天云）」。
你的任务：根据销售提供的「公司名称 / 行业 / 地区 /（可选）已知信息」，生成一份结构化的《客户一键背调报告》，
帮助一线销售快速理解客户、找到切入点与首单机会。

请严格只输出一个 JSON 对象（不要 markdown 代码块、不要任何解释文字），字段与结构必须如下：

{
  "score": 0-100 的整数（客户与 OgCloud 产品/服务的综合匹配度，越高越值得投入）,
  "scoreLabel": "一句话价值评级，如 高价值目标 / 值得投入 / 观察对象",
  "profile": {
    "fullName": "公司全称（必须与检索资料一致）", "credit": "统一社会信用代码（检索到就填）", "founded": "成立日期",
    "capital": "注册资本（带单位）", "type": "企业类型", "status": "经营状态", "legal": "法定代表人",
    "staff": "人员规模/参保人数", "address": "注册/总部地址", "branches": "分支/网点情况"
  },
  "metrics": [
    {"idx":1,"name":"中国办公室/分支/分厂/门店数量","value":"数值/范围/未找到","type":"事实|估算|未找到","confidence":"高|中|低","year":"数据年份或访问日期","source":"来源（年报/天眼查/官网/招聘/未找到）"},
    {"idx":2,"name":"海外办公室/分支/分厂/门店数量","value":"","type":"事实|估算|未找到","confidence":"高|中|低","year":"","source":""},
    {"idx":3,"name":"海外业务涉及国家或城市","value":"","type":"事实|估算|未找到","confidence":"高|中|低","year":"","source":""},
    {"idx":4,"name":"全公司真实人数","value":"","type":"事实|估算|未找到","confidence":"高|中|低","year":"","source":""},
    {"idx":5,"name":"全公司需要上外网人数","value":"待系统估算","type":"估算","confidence":"中","year":"","source":"行业系数自动估算"},
    {"idx":6,"name":"全公司 IT 人数（不含研发）","value":"待系统估算","type":"估算","confidence":"中","year":"","source":"行业系数自动估算"},
    {"idx":7,"name":"注册资本/实缴资本","value":"","type":"事实|估算|未找到","confidence":"高|中|低","year":"","source":""},
    {"idx":8,"name":"累计融资是否超过 1 亿元","value":"","type":"事实|估算|未找到","confidence":"高|中|低","year":"","source":""},
    {"idx":9,"name":"国内营收/海外营收","value":"","type":"事实|估算|未找到","confidence":"高|中|低","year":"","source":""},
    {"idx":10,"name":"企业官网公开邮箱（仅 1 个）","value":"","type":"事实|估算|未找到","confidence":"高|中|低","year":"","source":""},
    {"idx":11,"name":"企业官网公开总机（仅 1 个）","value":"","type":"事实|估算|未找到","confidence":"高|中|低","year":"","source":""}
  ],
  "realStaff": 0,
  "industryTag": "主营行业（从下列 12 类选一个：外贸制造/外资制造/跨境卖家及服务商/软件IT系统集成/泛互联网/游戏及游戏服务商/新能源/设计商务律师等商务类/传媒/金融投资证券/教育学校/国央企事业单位）",
  "business": {
    "main": "主营业务", "position": "行业地位",
    "moves": [ {"date": "2026-0X", "text": "近期扩张/融资/招标等动向"} ],
    "signals": ["关键信号1（为什么现在是窗口）", "关键信号2"]
  },
  "itstack": {
    "inferred": [ {"k": "维度(如 网络架构/核心系统/IT团队/云环境/安全建设)", "v": "推断现状", "src": "推断依据，如 行业惯例/公开招标/招聘JD"} ],
    "contracts": [ {"item": "现有合同/服务", "vendor": "供应商", "expire": "到期时间", "note": "对销售的切入点提示"} ]
  },
  "compliance": {
    "items": [ {"name": "合规要求名(如 网络安全等级保护/数据出境安全评估/GDPR)", "level": "适用等级或适用性说明", "must": true/false, "note": "对销售的提示"} ]
  },
  "risk": [ {"level": "high|mid|low", "title": "风险维度", "text": "说明"} ],
  "chain": [ {"role": "角色(预算决策/技术决策/使用执行/业务背书/采购流程)", "title": "职位", "name": "姓名(未知写 — )", "key": true/false(是否关键人), "note": "销售打法提示"} ],
  "demand": [ {"pri": 1, "name": "需求名", "fit": 0-100 的整数(匹配度)", "reason": "为什么匹配"} ],
  "entry": {
    "window": "最佳接触时间窗口", "topic": "推荐切入话题", "why": "为什么这样切",
    "first": "首单建议(产品组合+大致金额区间)", "actions": ["行动清单1", "行动清单2"]
  },
  "gaps": ["未找到项/口径冲突/登录付费墙限制/过期风险/需要人工核验的线索"]
}

要求：
- 一切围绕 OgCloud 真实产品线来推断需求与切入：SD-WAN 组网替代、Og SASE 安全接入、OGbox 安全盒子(边缘安全硬件/FW+IPS+AV+AC)、MSP 全托管运维服务、国际专线与带宽、多云互联专线、安全合规咨询(等保/密评/数据出境)、OgAI 智能引擎、硬件维保服务。
- demand 的 name 尽量使用上述真实产品名；fit 为 0-100 整数；按优先级 pri 从小到大排列。
- 对不确定的信息要基于行业惯例做"合理推断"，并在 itstack.inferred[].src 注明推断依据；不要编造具体人名（用「张**」「李**」式脱敏或写 —）。
- 报告要像资深销售写的，可执行、有具体打法，不要空话。
- 若系统提示中附带了【联网检索到的真实资料】，必须以其为事实基础：资料中已有的工商/业务/风险等事实不得篡改或编造；资料未覆盖的字段才允许基于行业惯例做"合理推断"，并在 itstack.inferred[].src 注明「推断（未检索到，按行业惯例）」。
- **企业画像（profile）是后续所有推断的事实基础，必须严格**：fullName、credit、founded、capital、type、status、legal、staff、address 必须直接引用检索资料中的权威工商数据（天眼查/企查查/国家企业信用信息公示系统）。若检索资料未明确给出某项，该项必须填「未检索到」或「—」，**严禁编造具体人名、日期、金额、地址**。
- 若销售提供了「已知信息」，务必结合它修正画像、需求与切入点；当已知信息与检索资料冲突时，以检索资料为准并标注冲突。
- **必须完整输出 metrics（11 项客户背调标准，idx 1-11 顺序一致），这是背调质量的核心**：
  1) 每项 type 只能取「事实 / 估算 / 未找到」之一；confidence 只能取「高 / 中 / 低」；year 填数据年份或访问日期，未知填空字符串；source 填该结论的来源（年报/天眼查/企查查/官网/招聘/未找到/推断）。
  2) 第 7 项「注册资本/实缴资本」首选来源必须是工商注册信息（天眼查/企查查/国家企业信用信息公示系统）或授权 API，与 profile.capital 必须一致；检索不到必须填「未找到」，严禁编造。
  3) 第 10 项「官网公开邮箱」与第 11 项「官网公开总机」各只保留 1 条，且必须来自已确认企业官网的 Contact/联系我们/页脚，不得用第三方邮箱或个人电话替代；官网没有直接公开则填「未找到」。
  4) 第 5、6 项（需要上外网人数 / IT 人数）由系统在服务端按行业系数自动估算，你无需填写具体数字，只需在 realStaff 填真实人数整数、在 industryTag 填主营行业（从给定 12 类选一个）；这两项 value 固定填「待系统估算」。
  5) 任何未检索到具体值的指标，value 必须填「未找到」（不要留空、不要编一个数）；可在 gaps 中说明原因。
- **gaps 缺口与限制必须如实填写**：列出未找到项、来源口径冲突、登录/验证码/付费墙限制、信息过期风险，以及需要销售人工核验的线索；不要为了"看起来完整"而掩盖不确定性。`;

/* ---------- 调用大模型（OpenAI 兼容 /chat/completions） ---------- */
async function callLLM(payload, grounded, override, tycRaw) {
  const rt = Object.assign(runtime(), override || {});
  if (!rt.LLM_API_KEY) throw new Error('未配置 API Key，请先配置模型');
  const url = rt.LLM_BASE_URL.replace(/\/$/, '') + '/chat/completions';
  const body = {
    model: rt.LLM_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(payload, grounded, tycRaw) }
    ],
    temperature: 0.3,
    max_tokens: 6000
  };
  // 部分厂商支持 json_object，不支持则靠后续容错解析
  try { body.response_format = { type: 'json_object' }; } catch (e) {}

  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, rt.LLM_TIMEOUT);
  let res;
  try {
    const fetchOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + rt.LLM_API_KEY
      },
      body: JSON.stringify(body),
      signal: ctrl.signal
    };
    if (PROXY_AGENT) fetchOpts.dispatcher = PROXY_AGENT;
    res = await undiciFetch(url, fetchOpts);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const txt = await res.text().catch(function () { return ''; });
    throw new Error('LLM HTTP ' + res.status + ' ' + txt.slice(0, 300));
  }
  const data = await res.json();
  const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  return parseJSON(content);
}

/* 最小连通性测试：只发一句 user 问好，验证地址/密钥/模型可用 */
async function testConn(override) {
  const rt = Object.assign(runtime(), override || {});
  if (!rt.LLM_BASE_URL) throw new Error('请填写接口地址');
  if (!rt.LLM_API_KEY) throw new Error('请填写 API Key');
  if (!rt.LLM_MODEL) throw new Error('请填写模型名');
  const url = rt.LLM_BASE_URL.replace(/\/$/, '') + '/chat/completions';
  const body = { model: rt.LLM_MODEL, messages: [{ role: 'user', content: '请只回复两个字：ok' }], temperature: 0, max_tokens: 16 };
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, Math.min(rt.LLM_TIMEOUT, 30000));
  let res;
  try {
    const fetchOpts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + rt.LLM_API_KEY },
      body: JSON.stringify(body),
      signal: ctrl.signal
    };
    if (PROXY_AGENT) fetchOpts.dispatcher = PROXY_AGENT;
    res = await undiciFetch(url, fetchOpts);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const txt = await res.text().catch(function () { return ''; });
    throw new Error('LLM HTTP ' + res.status + ' ' + txt.slice(0, 200));
  }
  const data = await res.json();
  const echo = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  return { model: rt.LLM_MODEL, echo: String(echo).slice(0, 40) };
}

function buildUserPrompt(p, grounded, tycRaw) {
  let s = '请为以下客户生成《客户一键背调报告》：\n';
  s += '公司名称：' + (p.name || '未知') + '\n';
  s += '所属行业：' + (p.industry || '未知') + '\n';
  s += '所在地区：' + (p.region || '未知') + '\n';
  if (p.extra && String(p.extra).trim()) {
    s += '\n销售已知信息（请重点结合；若与下方检索资料冲突，以检索资料为准）：\n' + String(p.extra).trim() + '\n';
  }
  if (grounded && String(grounded).trim()) {
    s += '\n【联网检索到的真实资料（必须优先据此填写；资料未覆盖的字段才做推断，并在 itstack.inferred[].src 注明"推断"）】\n' + String(grounded).trim() + '\n';
    s += '\n重要提醒：以上资料中的工商注册信息（成立日期、注册资本、法定代表人、地址、人员规模）是权威数据源，必须原样写入 profile 对应字段，不得改写、不得凭记忆替换。若某项资料中未明确出现，必须填"未检索到"，禁止编造。';
  } else {
    s += '\n【未检索到真实资料】本次没有联网检索结果，profile 中的工商字段请全部填"未检索到"，其他字段可基于行业惯例做合理推断并注明推断依据。';
  }
  if (tycRaw && String(tycRaw).trim()) {
    s += '\n【天眼查权威工商数据（来自天眼查官方 MCP，工商注册信息已核验，必须原样写入 profile 与 metrics 第1~4项及相关工商字段，不得改写、不得凭记忆替换、不得编造；若与上方联网检索资料冲突，以本段天眼查数据为准）】\n' + String(tycRaw).trim() + '\n';
  }
  s += '\n请严格按系统提示的 JSON 结构输出，注意必须包含完整的 metrics（11 项背调标准）与 gaps（缺口与限制）两部分。';
  return s;
}

function parseJSON(text) {
  if (typeof text !== 'string') throw new Error('LLM 返回内容为空');
  let t = text.trim();
  // 去 ```json ... ``` 围栏
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // 截取首个 { 到末尾 } 
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try {
    return JSON.parse(t);
  } catch (err) {
    throw new Error('LLM 返回不是合法 JSON：' + t.slice(0, 200));
  }
}

/* ---------- 行业系数与人数自动估算（源自 OgSales 背调 skill 的 estimate_headcount.py） ---------- */
const INDUSTRY_RATES = {
  '外贸制造': [0.05, 0.01],
  '外资制造': [0.10, 0.02],
  '跨境卖家及服务商': [1.00, 0.005],
  '软件IT系统集成': [0.03, 0.01],
  '泛互联网': [0.15, 0.02],
  '游戏及游戏服务商': [0.20, 0.02],
  '新能源': [0.05, 0.02],
  '设计商务律师等商务类': [0.10, 0.005],
  '传媒': [0.05, 0.01],
  '金融投资证券': [0.01, 0.03],
  '教育学校': [0.05, 0.01],
  '国央企事业单位': [0.01, 0.01]
};
function matchIndustry(text) {
  if (!text) return null;
  var t = String(text);
  var keys = Object.keys(INDUSTRY_RATES);
  for (var i = 0; i < keys.length; i++) {
    if (t.indexOf(keys[i]) >= 0) return keys[i];
  }
  var map = [
    ['制造', '外贸制造'], ['外贸', '外贸制造'], ['跨境', '跨境卖家及服务商'], ['电商', '跨境卖家及服务商'],
    ['软件', '软件IT系统集成'], ['系统集成', '软件IT系统集成'], ['互联网', '泛互联网'],
    ['游戏', '游戏及游戏服务商'], ['新能源', '新能源'], ['设计', '设计商务律师等商务类'],
    ['律所', '设计商务律师等商务类'], ['律师', '设计商务律师等商务类'], ['商务', '设计商务律师等商务类'],
    ['传媒', '传媒'], ['金融', '金融投资证券'], ['证券', '金融投资证券'], ['投资', '金融投资证券'],
    ['教育', '教育学校'], ['学校', '教育学校'], ['国央企', '国央企事业单位'], ['事业单位', '国央企事业单位']
  ];
  for (var j = 0; j < map.length; j++) { if (t.indexOf(map[j][0]) >= 0) return map[j][1]; }
  return null;
}
function calcHeadcount(realStaff, industryTag, fallbackIndustry) {
  var tag = industryTag || matchIndustry(fallbackIndustry);
  if (!realStaff || realStaff <= 0 || !tag || !INDUSTRY_RATES[tag]) {
    return { ok: false, tag: tag || null, internet: null, it: null, reason: !tag ? '未识别行业' : '缺少真实人数' };
  }
  var rate = INDUSTRY_RATES[tag];
  return {
    ok: true, tag: tag,
    internet: Math.round(realStaff * rate[0]),
    it: Math.round(realStaff * rate[1]),
    rates: { internet: rate[0], it: rate[1] }
  };
}

/* ---------- 联网检索（用 Perplexity 等 AI 搜索模型取真实公开资料，不接企查查） ---------- */
async function doSearch(payload) {
  const rt = runtime();
  if (rt.SEARCH_PROVIDER !== 'perplexity') throw new Error('未配置搜索后端');
  const base = rt.SEARCH_BASE_URL.replace(/\/$/, '') || 'https://api.perplexity.com';
  const url = base + '/chat/completions';
  const key = rt.LLM_API_KEY;
  if (!key) throw new Error('未配置 API Key');
  const model = rt.SEARCH_MODEL || 'sonar-pro';
  const q = '请优先在天眼查（tianyancha.com）、企查查（qcc.com）、国家企业信用信息公示系统、爱企查等权威工商数据源检索企业「' + (payload.name || '') + '」（行业：' + (payload.industry || '未知') + '，地区：' + (payload.region || '未知') + '）的工商注册信息，并整理真实公开信息用于 B2B 销售背调。\n' +
    '请严格按以下优先级使用来源（越靠前越优先）：\n' +
    '1) 权威工商数据源（天眼查/企查查/国家企业信用信息公示系统）：统一社会信用代码、成立日期、注册资本、法定代表人、企业类型、经营状态、参保人数、注册地址；\n' +
    '2) 企业官网、官方公众号、上市公司公告；\n' +
    '3) 主流招聘平台（猎聘、BOSS 直聘、智联）的招聘岗位；\n' +
    '4) 政府采购网、招标公告、知识产权公示；\n' +
    '5) 新闻舆情。\n' +
    '对每一项关键事实（尤其是成立日期、注册资本、法定代表人、地址、人员规模），必须在正文中标注信息来源网址；只依据真实检索结果，不要编造。';
  const body = {
    model: model,
    messages: [
      { role: 'system', content: '你是企业调研助手，只依据联网检索到的真实公开信息作答，绝不编造；事实后尽量附来源网址。' },
      { role: 'user', content: q }
    ],
    temperature: 0.2,
    max_tokens: 3000
  };
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, rt.LLM_TIMEOUT);
  let res;
  try {
    const fetchOpts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(body),
      signal: ctrl.signal
    };
    if (PROXY_AGENT) fetchOpts.dispatcher = PROXY_AGENT;
    res = await undiciFetch(url, fetchOpts);
  } finally { clearTimeout(timer); }
  if (!res.ok) {
    const txt = await res.text().catch(function () { return ''; });
    throw new Error('检索 HTTP ' + res.status + ' ' + txt.slice(0, 200));
  }
  const data = await res.json();
  const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  let sources = [];
  if (Array.isArray(data.citations)) sources = data.citations.map(String);
  const urls = content.match(/https?:\/\/[^\s)\]]+/g) || [];
  urls.forEach(function (u) { if (sources.indexOf(u) < 0) sources.push(u); });
  return { text: content.trim(), sources: sources.slice(0, 12) };
}

/* DeepSeek 原生联网搜索：/chat/completions + web_search_options，与生成共用同一 Key，无需 Perplexity */
async function doSearchDeepseek(payload) {
  const rt = runtime();
  const base = (rt.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
  const url = base + '/chat/completions';
  const key = rt.LLM_API_KEY;
  if (!key) throw new Error('未配置 API Key');
  const q = '请优先在天眼查（tianyancha.com）、企查查（qcc.com）、国家企业信用信息公示系统、爱企查等权威工商数据源检索企业「' + (payload.name || '') + '」（行业：' + (payload.industry || '未知') + '，地区：' + (payload.region || '未知') + '）的工商注册信息，并整理真实公开信息用于 B2B 销售背调。\n' +
    '请严格按以下优先级使用来源（越靠前越优先）：\n' +
    '1) 权威工商数据源（天眼查/企查查/国家企业信用信息公示系统）：统一社会信用代码、成立日期、注册资本、法定代表人、企业类型、经营状态、参保人数、注册地址；\n' +
    '2) 企业官网、官方公众号、上市公司公告；\n' +
    '3) 主流招聘平台（猎聘、BOSS 直聘、智联）的招聘岗位；\n' +
    '4) 政府采购网、招标公告、知识产权公示；\n' +
    '5) 新闻舆情。\n' +
    '对每一项关键事实（尤其是成立日期、注册资本、法定代表人、地址、人员规模），必须在正文中标注信息来源网址；只依据真实检索结果，不要编造。';
  const body = {
    model: rt.LLM_MODEL,
    messages: [
      { role: 'system', content: '你是企业调研助手，只依据联网检索到的真实公开信息作答，绝不编造；事实后尽量附来源网址。' },
      { role: 'user', content: q }
    ],
    temperature: 0.2,
    web_search_options: { enable: true }
  };
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, rt.LLM_TIMEOUT);
  let res;
  try {
    const fetchOpts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(body),
      signal: ctrl.signal
    };
    if (PROXY_AGENT) fetchOpts.dispatcher = PROXY_AGENT;
    res = await undiciFetch(url, fetchOpts);
  } finally { clearTimeout(timer); }
  if (!res.ok) {
    const txt = await res.text().catch(function () { return ''; });
    throw new Error('检索 HTTP ' + res.status + ' ' + txt.slice(0, 200));
  }
  const data = await res.json();
  const msg = (data.choices && data.choices[0] && data.choices[0].message) || {};
  const content = msg.content || '';
  let sources = [];
  // 引用来源可能在顶层 citations，或 message.citations，或正文中的链接
  if (Array.isArray(data.citations)) sources = data.citations.map(String);
  else if (Array.isArray(msg.citations)) sources = msg.citations.map(String);
  const urls = content.match(/https?:\/\/[^\s\u4e00-\u9fa5`（）()\[\]【】{}<>""''，。、；：？！]+/g) || [];
  urls.forEach(function (u) { if (sources.indexOf(u) < 0) sources.push(u); });
  return { text: content.trim(), sources: sources.slice(0, 12) };
}

/* ---------- 天眼查官方 MCP（Streamable HTTP）直连：拉真实工商数据覆盖 AI 编造 ---------- */
let _tycRpcId = 0;
function tycMcpHeaders(key, sid) {
  var h = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Mcp-Protocol-Version': '2024-11-05', 'Authorization': 'Bearer ' + key };
  if (sid) h['Mcp-Session-Id'] = sid;
  return h;
}
function parseMcpBody(text) {
  var t = (text || '').trim();
  if (t.charAt(0) === '{') { try { return JSON.parse(t); } catch (e) {} }
  var lines = t.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.indexOf('data:') === 0; }).map(function (l) { return l.slice(5).trim(); });
  for (var i = lines.length - 1; i >= 0; i--) { try { return JSON.parse(lines[i]); } catch (e) {} }
  return null;
}
function mcpText(result) {
  if (!result) return '';
  if (typeof result === 'string') return result;
  if (Array.isArray(result.content)) return result.content.map(function (c) { return c.text || (c.resource && c.resource.text) || ''; }).join('\n');
  if (result.structuredContent) return JSON.stringify(result.structuredContent, null, 2);
  if (result.text) return result.text;
  return JSON.stringify(result);
}
async function tycMcpCall(key, url, method, params, sid) {
  var body = { jsonrpc: '2.0', id: ++_tycRpcId, method: method, params: params || {} };
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 30000);
  var res;
  try {
    var opts = { method: 'POST', headers: tycMcpHeaders(key, sid), body: JSON.stringify(body), signal: ctrl.signal };
    if (PROXY_AGENT) opts.dispatcher = PROXY_AGENT;
    res = await undiciFetch(url, opts);
  } finally { clearTimeout(timer); }
  var nsid = res.headers.get('mcp-session-id');
  var text = await res.text().catch(function () { return ''; });
  return { sid: nsid || sid, parsed: parseMcpBody(text) };
}
function pickTycTool(tools, nameHints, descHints) {
  for (var i = 0; i < tools.length; i++) {
    var n = (tools[i].name || '').toLowerCase();
    var d = (tools[i].description || '').toLowerCase();
    if (nameHints.some(function (h) { return n.indexOf(h) >= 0; }) && descHints.some(function (h) { return d.indexOf(h) >= 0; })) return tools[i].name;
  }
  return '';
}
function pickTycSearchTool(tools) {
  var names = tools.map(function (t) { return t.name; });
  if (names.indexOf('search_companies') >= 0) return 'search_companies';
  return pickTycTool(tools, ['search', 'companies', 'company_search', 'company'], ['搜索', '候选', '企业名称']);
}
function pickTycBasicTool(tools) {
  var names = tools.map(function (t) { return t.name; });
  if (names.indexOf('get_company_basic_profile') >= 0) return 'get_company_basic_profile';
  return pickTycTool(tools, ['basic', 'registration', 'baseinfo', 'company', 'ic'], ['工商', '基本信息', '登记', '注册', '企业']);
}
function tycExtract(raw) {
  var ext = { creditCode: '', legal: '', capital: '', paid: '', founded: '', status: '', type: '', staff: '', address: '', phone: '' };
  // 1) 优先解析 "法定代表人：戴煜" 这种键值对格式
  var get = function (labels) {
    for (var i = 0; i < labels.length; i++) {
      var re = new RegExp(labels[i] + '\\s*[:：]\\s*[*_`]*([^\\n]{1,120}?)\\s*(?:$|\\n)', 'i');
      var m = raw.match(re);
      if (m) return m[1].replace(/[*_`]/g, '').trim();
    }
    return '';
  };
  ext.creditCode = get(['统一社会信用代码', '信用代码']);
  ext.legal = get(['法定代表人', '法人']);
  ext.capital = get(['注册资本']);
  ext.paid = get(['实缴资本']);
  ext.founded = get(['成立日期', '成立']);
  ext.status = get(['登记状态', '经营状态']);
  ext.type = get(['企业类型']);
  ext.staff = get(['参保人数', '人员规模']);
  ext.address = get(['注册地址', '注册地']);
  ext.phone = get(['联系电话']);
  // 2) 键值对没解析到（或为空）时，回退解析天眼查 MCP 返回的 Markdown 表格
  if (!ext.legal || !ext.capital || !ext.founded) {
    var lines = String(raw).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.charAt(0) !== '|') continue;
      var cells = line.split('|').map(function (c) { return c.replace(/[*_`]/g, '').trim(); }).filter(function (c) { return c; });
      if (cells.length < 2) continue;
      var key = cells[0];
      var val = cells[1];
      if (!ext.legal && (key === '法定代表人' || key === '法人')) ext.legal = val;
      else if (!ext.capital && key === '注册资本') ext.capital = val;
      else if (!ext.paid && key === '实缴资本') ext.paid = val;
      else if (!ext.founded && (key === '成立日期' || key === '成立')) ext.founded = val;
      else if (!ext.creditCode && (key === '统一社会信用代码' || key === '信用代码')) ext.creditCode = val;
      else if (!ext.status && (key === '登记状态' || key === '经营状态')) ext.status = val;
      else if (!ext.type && key === '企业类型') ext.type = val;
      else if (key === '参保人数' || key === '人员规模') {
        if (key === '参保人数' || !ext.staff) ext.staff = val;
      }
      else if (!ext.address && (key === '注册地址' || key === '注册地')) ext.address = val;
      else if (!ext.phone && key === '联系电话') ext.phone = val;
    }
  }
  return ext;
}

/* 用天眼查权威数据强制覆盖 LLM 可能写错的 profile / metrics 工商字段 */
function applyTycToReport(report, tycRaw) {
  if (!report || typeof report !== 'object' || !tycRaw) return;
  const ext = tycExtract(String(tycRaw));
  if (!ext.legal && !ext.capital && !ext.founded) return;
  if (!report.profile) report.profile = {};
  if (ext.legal) report.profile.legal = ext.legal;
  if (ext.capital) {
    let cap = ext.capital;
    if (ext.paid) cap += '（实缴：' + ext.paid + '）';
    report.profile.capital = cap;
  }
  if (ext.founded) report.profile.founded = ext.founded;
  if (ext.creditCode) report.profile.credit = ext.creditCode;
  if (ext.status) report.profile.status = ext.status;
  if (ext.type) report.profile.type = ext.type;
  if (ext.address) report.profile.address = ext.address;
  if (ext.staff) {
    report.profile.staff = /人$/.test(ext.staff) ? ext.staff : ext.staff + '人';
    const n = parseInt(ext.staff, 10);
    if (!isNaN(n) && n > 0) report.realStaff = n;
  }
  if (!Array.isArray(report.metrics)) report.metrics = [];
  let m7 = report.metrics.find(function (m) { return m.idx === 7; });
  if (!m7) {
    m7 = { idx: 7, name: '注册资本/实缴资本', value: '', type: '事实', confidence: '高', year: '', source: '' };
    report.metrics.push(m7);
  }
  m7.value = report.profile.capital || ext.capital || '';
  m7.type = '事实';
  m7.confidence = '高';
  m7.year = '';
  m7.source = '天眼查官方 MCP';
  report.metrics.sort(function (a, b) { return a.idx - b.idx; });
}

async function doFetchTYC(name) {
  var rt = runtime();
  var key = rt.TYC_KEY, url = rt.TYC_MCP_URL;
  if (!key) throw new Error('未配置天眼查 API Key（请在 AI 配置页填写 TYC_KEY）');
  var r = await tycMcpCall(key, url, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'ogcloud-proto', version: '1.0.0' } }, null);
  if (r.parsed && r.parsed.error) throw new Error('天眼查 MCP 初始化失败：' + (r.parsed.error.message || JSON.stringify(r.parsed.error)));
  var sid = r.sid;
  await tycMcpCall(key, url, 'notifications/initialized', {}, sid);
  r = await tycMcpCall(key, url, 'tools/list', {}, sid);
  var tools = (r.parsed && r.parsed.result && r.parsed.result.tools) || [];
  if (!tools.length) throw new Error('天眼查 MCP 未返回工具列表');
  var searchTool = pickTycSearchTool(tools);
  var basicTool = pickTycBasicTool(tools);
  r = await tycMcpCall(key, url, 'tools/call', { name: searchTool, arguments: { query: name } }, sid);
  var searchText = mcpText(r.parsed && r.parsed.result);
  var cid = (searchText.match(/company_id["'\s:]+([0-9]+)/i) || [])[1] || '';
  r = await tycMcpCall(key, url, 'tools/call', { name: basicTool, arguments: { company_name: name, company_id: cid } }, sid);
  var basicText = mcpText(r.parsed && r.parsed.result);
  if (!basicText.trim()) throw new Error('天眼查未返回工商信息');
  var ext = tycExtract(basicText);
  var out = '企业名称：' + name + '\n';
  if (ext.creditCode) out += '统一社会信用代码：' + ext.creditCode + '\n';
  if (ext.legal) out += '法定代表人：' + ext.legal + '\n';
  if (ext.capital) out += '注册资本：' + ext.capital + '\n';
  if (ext.paid) out += '实缴资本：' + ext.paid + '\n';
  if (ext.founded) out += '成立日期：' + ext.founded + '\n';
  if (ext.status) out += '登记状态：' + ext.status + '\n';
  if (ext.type) out += '企业类型：' + ext.type + '\n';
  if (ext.staff) out += '人员规模/参保人数：' + ext.staff + '\n';
  if (ext.address) out += '注册地址：' + ext.address + '\n';
  if (ext.phone) out += '联系电话：' + ext.phone + '\n';
  out += '\n（以上数据来自天眼查官方 MCP，工商字段权威，请原样采用）';
  return out;
}

/* ---------- 静态文件服务 ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, function (err, buf) {
    if (err) {
      // SPA 兜底：未命中文件且非带扩展名，回退 app.html（hash 路由用不到，但保险）
      if (!path.extname(filePath)) {
        fs.readFile(path.join(ROOT, 'app.html'), function (e2, b2) {
          if (e2) { res.writeHead(404); res.end('Not found'); }
          else { res.writeHead(200, { 'Content-Type': MIME['.html'] }); res.end(b2); }
        });
        return;
      }
      res.writeHead(404); res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

/* ---------- 请求分发 ---------- */
const server = http.createServer(function (req, res) {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;

  if (p === '/api/config' && req.method === 'GET') {
    const rt = runtime();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      configured: !!rt.LLM_API_KEY,
      model: rt.LLM_API_KEY ? rt.LLM_MODEL : null,
      base: rt.LLM_API_KEY ? rt.LLM_BASE_URL : null,
      keyMask: maskKey(rt.LLM_API_KEY),
      proxy: rt.LLM_PROXY || null,
      search: rt.SEARCH_PROVIDER,
      searchEnabled: rt.SEARCH_PROVIDER === 'perplexity' || rt.SEARCH_PROVIDER === 'deepseek',
      tycKey: maskKey(rt.TYC_KEY),
      tycEnabled: !!rt.TYC_KEY,
      note: rt.LLM_API_KEY ? '' : '未配置模型，AI 背调将回退模板；可在「AI 配置」页填写并保存'
    }));
    return;
  }

  if (p === '/api/config' && req.method === 'POST') {
    let raw = '';
    req.on('data', function (c) { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', function () {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      let body;
      try { body = JSON.parse(raw || '{}'); }
      catch (e) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: '请求体不是合法 JSON' })); return; }
      const next = Object.assign({}, CFG);
      if (body.LLM_BASE_URL != null && String(body.LLM_BASE_URL).trim() !== '') next.LLM_BASE_URL = String(body.LLM_BASE_URL).trim();
      if (body.LLM_MODEL != null && String(body.LLM_MODEL).trim() !== '') next.LLM_MODEL = String(body.LLM_MODEL).trim();
      if (body.LLM_TIMEOUT != null && String(body.LLM_TIMEOUT).trim() !== '') next.LLM_TIMEOUT = String(body.LLM_TIMEOUT).trim();
      // 搜索后端：接受 none / perplexity / deepseek
      if (body.SEARCH_PROVIDER != null && ['none', 'perplexity', 'deepseek'].indexOf(String(body.SEARCH_PROVIDER).trim()) >= 0) next.SEARCH_PROVIDER = String(body.SEARCH_PROVIDER).trim();
      // 天眼查 API Key：填写了才更新；为空保留原值
      if (body.TYC_KEY != null && String(body.TYC_KEY).trim() !== '') next.TYC_KEY = String(body.TYC_KEY).trim();
      // API Key 为空则保留原值（不覆盖）；填写了才更新
      if (body.LLM_API_KEY != null && String(body.LLM_API_KEY).trim() !== '') next.LLM_API_KEY = String(body.LLM_API_KEY).trim();
      // 代理：显式传了才更新；传空字符串则删除
      if (body.LLM_PROXY != null) {
        const p = String(body.LLM_PROXY).trim();
        if (p) next.LLM_PROXY = p;
        else delete next.LLM_PROXY;
      }
      saveConfig(next);
      CFG = next;                       // 热更新，无需重启
      initProxy();                      // 代理配置变更后重建 Agent
      const rt = runtime();
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, configured: !!rt.LLM_API_KEY, model: rt.LLM_MODEL, base: rt.LLM_BASE_URL, keyMask: maskKey(rt.LLM_API_KEY), proxy: rt.LLM_PROXY || null, search: rt.SEARCH_PROVIDER }));
    });
    return;
  }

  if (p === '/api/config/test' && req.method === 'POST') {
    let raw = '';
    req.on('data', function (c) { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', async function () {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      let body;
      try { body = JSON.parse(raw || '{}'); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: '请求体不是合法 JSON' })); return; }
      try {
        const override = {};
        if (body.LLM_BASE_URL) override.LLM_BASE_URL = String(body.LLM_BASE_URL).trim();
        if (body.LLM_API_KEY) override.LLM_API_KEY = String(body.LLM_API_KEY).trim();
        if (body.LLM_MODEL) override.LLM_MODEL = String(body.LLM_MODEL).trim();
        if (body.LLM_TIMEOUT) override.LLM_TIMEOUT = parseInt(body.LLM_TIMEOUT, 10);
        const r = await testConn(override);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, model: r.model, echo: r.echo }));
      } catch (err) {
        res.writeHead(200);
        res.end(JSON.stringify({ ok: false, error: formatError(err) }));
      }
    });
    return;
  }

  if (p === '/api/baidiao' && req.method === 'POST') {
    let raw = '';
    req.on('data', function (c) { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', async function () {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (!runtime().LLM_API_KEY) {
        res.writeHead(200);
        res.end(JSON.stringify({ ok: false, error: '未配置模型：请在「AI 配置」页填写 LLM_API_KEY 并保存，或 server/.env 中填入后重启' }));
        return;
      }
      let payload;
      try { payload = JSON.parse(raw || '{}'); }
      catch (e) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: '请求体不是合法 JSON' })); return; }
      try {
        let grounded = null, sources = [], searchNote = '';
        let tycRaw = null, tycNote = '';
        const _prov = runtime().SEARCH_PROVIDER;
        if (_prov === 'perplexity' || _prov === 'deepseek') {
          try {
            const s = _prov === 'deepseek' ? await doSearchDeepseek(payload) : await doSearch(payload);
            grounded = s.text; sources = s.sources || [];
          } catch (se) {
            searchNote = '联网检索失败（' + formatError(se) + '），已退回纯模型生成，数据可能不准确';
          }
        }
        if (runtime().TYC_KEY) {
          try {
            tycRaw = await doFetchTYC(payload.name);
            tycNote = '已接入天眼查权威工商数据';
          } catch (te) {
            tycNote = '天眼查工商拉取失败（' + formatError(te) + '），工商字段以 AI 检索/推断为准，请务必核对来源';
          }
        }
        const report = await callLLM(payload, grounded, null, tycRaw);
        // 若已接入天眼查权威工商数据，强制覆盖 LLM 可能错误的企业画像与 metrics 第 7 项
        if (tycRaw) applyTycToReport(report, tycRaw);
        // 服务端按行业系数自动估算上外网人数 / IT 人数，覆盖 metrics 第 5、6 项（源自背调 skill）
        try {
          if (report && Array.isArray(report.metrics)) {
            const hc = calcHeadcount(Number(report.realStaff) || 0, report.industryTag, payload.industry);
            if (hc.ok) {
              report.metrics.forEach(function (m) {
                if (m.idx === 5) { m.value = String(hc.internet); m.type = '估算'; m.confidence = '中'; m.year = ''; m.source = '行业系数自动估算（' + hc.tag + ' × ' + (hc.rates.internet * 100) + '%）'; }
                if (m.idx === 6) { m.value = String(hc.it); m.type = '估算'; m.confidence = '中'; m.year = ''; m.source = '行业系数自动估算（' + hc.tag + ' × ' + (hc.rates.it * 100) + '%）'; }
              });
            }
          }
        } catch (e) {}
        const rt = runtime();
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, report: report, model: rt.LLM_MODEL, sources: sources, searchNote: searchNote, tycNote: tycNote }));
      } catch (err) {
        res.writeHead(200);
        res.end(JSON.stringify({ ok: false, error: formatError(err) }));
      }
    });
    return;
  }

  if (p.startsWith('/api/')) { res.writeHead(404); res.end('Not found'); return; }

  serveStatic(req, res, p);
});

const rt0 = runtime();
(async function startServer() {
  await initProxy();
  server.listen(PORT, function () {
    console.log('OgCloud 原型本地服务已启动： http://localhost:' + PORT + '/');
    console.log('模型配置： ' + (rt0.LLM_API_KEY ? (rt0.LLM_MODEL + ' @ ' + rt0.LLM_BASE_URL) : '未配置（AI 背调将回退模板；可在「AI 配置」页填写）'));
    console.log('网络出口： ' + (EFFECTIVE_PROXY ? ('代理 ' + EFFECTIVE_PROXY) : '直连'));
    console.log('搜索后端： ' + (rt0.SEARCH_PROVIDER === 'perplexity' ? ('Perplexity 联网检索（' + rt0.SEARCH_MODEL + '）') : rt0.SEARCH_PROVIDER === 'deepseek' ? ('DeepSeek 联网检索（' + rt0.LLM_MODEL + '）') : '未启用（纯模型生成，可能编造）'));
  });
})().catch(function (e) { console.error('启动失败', e); process.exit(1); });
