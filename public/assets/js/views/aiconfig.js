/* AI 模型配置页：在原型内直接配置用于「客户一键背调」的大模型
 * （OpenAI 兼容协议）。配置由服务端持久化到 server/config.json，运行期热更新。
 * API Key 只保存在本地服务端，绝不进入浏览器。
 */
window.App = window.App || {};

var AIConfig = (function () {
  var ui = App.ui;
  var state = { connected: false, configured: false, model: '', base: '', keyMask: '', tycKey: '', tycEnabled: false };

  function presets() {
    return {
      'qwen':     { label: '通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
      'deepseek': { label: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-v4-pro', search: 'deepseek' },
      'glm':      { label: '智谱 GLM', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' },
      'openai':   { label: 'OpenAI',   base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
      'perplexity': { label: 'Perplexity 联网搜索', base: 'https://api.perplexity.com', model: 'sonar-pro', search: 'perplexity' }
    };
  }

  function presetBtns() {
    return Object.keys(presets()).map(function (k) {
      var p = presets()[k];
      return '<button class="btn btn-sm" data-onclick="AIConfig.applyPreset" data-p="' + k + '">' + ui.esc(p.label) + '</button>';
    }).join('');
  }

  function render() {
    var html = '' +
      ui.pageHead('AI 模型配置', '配置用于「客户一键背调」的大模型（OpenAI 兼容协议）。配置仅保存在本地服务端，绝不上传浏览器或第三方。') +
      '<div class="ai-cfg-wrap">' +
        '<div class="ai-state" id="ai-state"><span class="ai-state-dot"></span><span id="ai-state-txt">正在检测服务…</span></div>' +
        '<div class="card"><div class="card-head">' + ui.icon('gear', 18) + '模型参数</div><div class="card-body">' +
          '<div class="field"><label>接口地址（Base URL）</label><input class="input" id="ai-base" placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"></div>' +
          '<div class="field"><label>API Key</label><input class="input" id="ai-key" type="password" placeholder="填写你的模型服务商密钥" autocomplete="off"></div>' +
          '<div class="field"><label>模型名（Model）</label><input class="input" id="ai-model" placeholder="qwen-plus"></div>' +
          '<div class="field"><label>搜索方式（让 AI 先联网检索真实公开资料，再套进 8 章模板，避免编造）</label><select class="select" id="ai-search">' +
            '<option value="none">不开搜索（纯模型生成，可能编造）</option>' +
            '<option value="perplexity">Perplexity 联网搜索（需把上方模型设为 Perplexity）</option>' +
            '<option value="deepseek">DeepSeek 联网搜索（用上方 DeepSeek Key 联网，需先在平台开通联网搜索）</option>' +
          '</select></div>' +
          '<div class="field"><label>天眼查 API Key（可选 · 根治工商信息不准）</label><input class="input" id="ai-tyc" type="password" placeholder="tyc_ 开头，去 ai.tianyancha.com 免费开通" autocomplete="off"></div>' +
          '<div class="wizard-tip">填入天眼查 API Key 后，「一键背调」会<b>先调天眼查官方 MCP 拉真实工商数据</b>（法人/注册资本/成立日期/地址/参保人数…），原样覆盖 AI 可能编造的工商字段，彻底解决"数据很全但全是错的"问题。Key 与 WorkBuddy 里用的是同一个，去 <b>ai.tianyancha.com</b> 免费注册开通即可拿到（有周期重置的免费额度）。</div>' +
          '<div class="field"><label>超时（毫秒，默认 90000）</label><input class="input" id="ai-timeout" placeholder="90000"></div>' +
          '<details class="ai-adv"><summary>高级：网络代理（默认自动读取本机系统代理，一般无需填写）</summary>' +
            '<div class="field"><label>代理地址（留空则自动检测 Windows 系统代理 / HTTPS_PROXY 环境变量）</label><input class="input" id="ai-proxy" placeholder="如 http://127.0.0.1:7890"></div>' +
          '</details>' +
          '<div class="field"><label>快捷预设（自动填好接口与模型名，API Key 需自填）</label><div class="ai-preset-row">' + presetBtns() + '</div></div>' +
          '<div class="wizard-tip">常见服务商均兼容 OpenAI /chat/completions 协议：通义千问 / DeepSeek / 智谱 GLM / OpenAI / Perplexity。选「DeepSeek」预设会自动填好 api.deepseek.com/v1、模型 deepseek-v4-pro 并开启<b>联网检索</b>（用 DeepSeek 自带的 web_search，需在 DeepSeek 平台「工具管理」领取联网搜索资源包或开通后付费）——背调基于真实网页资料生成。选「Perplexity 联网搜索」预设则改用 sonar-pro 检索。两者报告末尾都附来源链接。<b>接口地址需包含 /v1 前缀</b>。</div>' +
          '<div class="wizard-btns">' +
            '<button class="btn btn-primary" data-onclick="AIConfig.save">' + ui.icon('check', 18) + '<span>保存配置</span></button>' +
            '<button class="btn btn-ghost" data-onclick="AIConfig.test">' + ui.icon('bolt', 18) + '<span>测试连接</span></button>' +
          '</div>' +
        '</div></div>' +
        '<div class="ai-result" id="ai-result" style="display:none"></div>' +
        '<div class="card"><div class="card-head">' + ui.icon('bulb', 18) + '使用说明</div><div class="card-body">' +
          '<ul class="ai-help-list">' +
            '<li><b>本地运行：</b>在原型目录运行 <code>node server/server.js</code>，浏览器访问 <b>http://localhost:4173/</b>。配置保存在服务端 <code>server/config.json</code>，立即生效、无需重启。</li>' +
            '<li><b>云端运行（当前域名）：</b>配置由 Cloudflare 环境变量 / Secrets 提供，页面显示「云端服务（Cloudflare）已连接」。页面上「保存配置」在云端仅做校验、不持久化（未绑 KV 时），如需改配置请去 Cloudflare 控制台修改 Secrets。</li>' +
            '<li>API Key 只保存在服务端 / Secrets，<b>不会进入浏览器、不会上传</b>。请勿提交到任何代码仓库。</li>' +
            '<li>未配置模型时，客户背调会自动回退到行业模板；配置并测试通过后，背调改为大模型真实合成。</li>' +
          '</ul>' +
        '</div></div>' +
      '</div>';
    App.shell.setContent(html, 'AI 模型配置');
    load();
  }

  function applyPreset(e) {
    var p = presets()[e.getAttribute('data-p')];
    if (!p) return;
    var b = document.getElementById('ai-base'); if (b) b.value = p.base;
    var m = document.getElementById('ai-model'); if (m) m.value = p.model;
    var sp = document.getElementById('ai-search'); if (sp && p.search) sp.value = p.search;
    ui.toast('已填入「' + p.label + '」预设，请补全 API Key' + (p.search ? '（已开启联网检索）' : ''), 'info');
  }

  function load() {
    fetch('/api/config')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        state.connected = true;
        state.configured = !!d.configured;
        state.model = d.model || '';
        state.base = d.base || '';
        state.keyMask = d.keyMask || '';
        state.search = d.search || 'none';
        state.tycKey = d.tycKey || '';
        state.tycEnabled = !!d.tycEnabled;
        renderState();
        var b = document.getElementById('ai-base');
        if (b && d.base) b.value = d.base;
        var m = document.getElementById('ai-model');
        if (m && d.model) m.value = d.model;
        var to = document.getElementById('ai-timeout');
        if (to && d.timeout) to.value = d.timeout;
        var sp = document.getElementById('ai-search');
        if (sp && d.search) sp.value = d.search;
        var px = document.getElementById('ai-proxy');
        if (px && d.proxy) px.value = d.proxy;
        var k = document.getElementById('ai-key');
        if (k && d.keyMask) k.placeholder = '已配置（' + d.keyMask + '），留空则保持不变';
        var tk = document.getElementById('ai-tyc');
        if (tk && d.tycKey) tk.placeholder = '已配置（' + d.tycKey + '），留空则保持不变';
      })
      .catch(function () { state.connected = false; renderState(); });
  }

  function isLocalhost() {
    var h = location.hostname || '';
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  }

  function serviceLabel() {
    return isLocalhost() ? '本地服务' : '云端服务（Cloudflare）';
  }

  function renderState() {
    var el = document.getElementById('ai-state');
    if (!el) return;
    var txt = document.getElementById('ai-state-txt');
    if (!state.connected) {
      el.className = 'ai-state off';
      if (isLocalhost()) {
        txt.textContent = '未连接本地服务：请先运行 node server/server.js，并通过 http://localhost:4173/ 访问';
      } else {
        txt.textContent = '未连接云端服务：请确认 Cloudflare Pages 已部署，或检查网络 / DNS';
      }
      return;
    }
    if (state.configured) {
      el.className = 'ai-state ok';
      var searchTxt = state.search === 'perplexity' ? ' · 已开启联网检索(Perplexity)' : state.search === 'deepseek' ? ' · 已开启联网检索(DeepSeek)' : ' · 未开启检索（可能编造）';
      var tycTxt = state.tycEnabled ? ' · 已接入天眼查权威工商' : '';
      txt.textContent = serviceLabel() + '已连接 · 模型已配置（' + (state.model || '') + ' · ' + (state.keyMask || '') + '）' + searchTxt + tycTxt;
    } else {
      el.className = 'ai-state warn';
      txt.textContent = serviceLabel() + '已连接 · 尚未配置模型，背调将回退模板';
    }
  }

  function collect() {
    return {
      LLM_BASE_URL: (document.getElementById('ai-base').value || '').trim(),
      LLM_API_KEY: (document.getElementById('ai-key').value || '').trim(),
      LLM_MODEL: (document.getElementById('ai-model').value || '').trim(),
      LLM_TIMEOUT: (document.getElementById('ai-timeout').value || '').trim(),
      LLM_PROXY: (document.getElementById('ai-proxy').value || '').trim(),
      SEARCH_PROVIDER: (document.getElementById('ai-search') ? document.getElementById('ai-search').value : 'none'),
      TYC_KEY: (document.getElementById('ai-tyc').value || '').trim()
    };
  }

  function showResult(ok, msg) {
    var el = document.getElementById('ai-result');
    if (!el) return;
    el.style.display = 'flex';
    el.className = 'ai-result ' + (ok ? 'ok' : 'err');
    el.innerHTML = (ok ? ui.icon('checkc', 18) : ui.icon('alert', 18)) + '<span>' + ui.esc(msg) + '</span>';
  }

  function save() {
    var p = collect();
    if (!p.LLM_BASE_URL) { ui.toast('请填写接口地址', 'warn'); return; }
    if (!p.LLM_MODEL) { ui.toast('请填写模型名', 'warn'); return; }
    if (!p.LLM_API_KEY && !state.configured) { ui.toast('请填写 API Key', 'warn'); return; }
    showResult(true, '正在保存…');
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok) { ui.toast('配置已保存并生效', 'success'); load(); showResult(true, '已保存：模型 ' + (d.model || '') + ' · 配置立即生效，无需重启'); }
        else showResult(false, '保存失败：' + (d && d.error ? d.error : '未知错误'));
      })
      .catch(function () { showResult(false, '未连接到本地服务'); });
  }

  function test() {
    var p = collect();
    if (!p.LLM_BASE_URL || !p.LLM_MODEL) { ui.toast('请先填写接口地址与模型名', 'warn'); return; }
    if (!p.LLM_API_KEY && !state.configured) { ui.toast('请填写 API Key', 'warn'); return; }
    showResult(true, '正在测试连接（约数秒）…');
    fetch('/api/config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok) showResult(true, '连接成功：模型 ' + (d.model || '') + ' 已就绪，可生成 AI 背调');
        else showResult(false, '连接失败：' + (d && d.error ? d.error : '未知错误'));
      })
      .catch(function () { showResult(false, '未连接到本地服务'); });
  }

  return {
    render: render, save: save, test: test, load: load, applyPreset: applyPreset
  };
})();
window.AIConfig = AIConfig;

App.defineNav({ path: 'aiconfig', title: 'AI 配置', icon: 'gear', roles: ['all'], view: AIConfig.render });
