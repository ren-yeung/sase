/* 客户一键背调：向导 + 8 章报告 + 历史 */
window.App = window.App || {};

var Customers = (function () {
  var ui = App.ui;
  var genCache = {};           // 向导生成（非库内）客户的临时缓存
  var pending = null;          // 从客户池预填的待办

  function custById(id) {
    var c = (DB.customers || []).filter(function (x) { return x.id === id; })[0];
    if (c) return c;
    return genCache[id] || null;
  }
  function intentTag(t) {
    return t === 'high' ? 'tag-hot' : t === 'mid' ? 'tag-warn' : 'tag-default';
  }
  function intentLabel(t) { return t === 'high' ? '高意向' : t === 'mid' ? '中意向' : '观察'; }
  function riskColor(l) { return l === 'high' ? 'danger' : l === 'mid' ? 'warn' : 'success'; }
  function riskLabel(l) { return l === 'high' ? '高风险' : l === 'mid' ? '中风险' : '低风险'; }

  function render(parts) {
    if (parts[0] === 'new') return wizard();
    if (parts[0]) return openReport(parts[0]);
    return list();
  }

  /* ---------- 列表 ---------- */
  function list() {
    var pool = (DB.customerPool || []).map(function (p) {
      return '<button class="pool-chip" data-onclick="Customers.startNew" data-name="' + ui.esc(p.name) + '" data-ind="' + ui.esc(p.industry) + '" data-region="' + ui.esc(p.region) + '">' +
        ui.icon('search', 15) + ui.esc(p.name) + '<i>' + ui.esc(p.industry) + ' · ' + ui.esc(p.region) + '</i></button>';
    }).join('');

    var cards = (DB.customers || []).map(function (c) {
      return '' +
        '<a class="card cust-card" href="#/customer/' + c.id + '">' +
          '<div class="cust-top">' +
            '<div class="cust-ring-wrap">' +
              App.charts.ring(c.report.score, { color: c.intent === 'high' ? 'success' : 'brand', size: 64, sw: 5 }) +
              '<div class="cust-ring-label">匹配度</div>' +
            '</div>' +
            '<div class="cust-top-txt"><h3>' + ui.esc(c.name) + '</h3>' +
              '<div class="cust-meta">' + ui.icon('building', 14) + ui.esc(c.industry) + ' · ' + ui.esc(c.region) + '</div>' +
              '<div class="cust-meta">' + ui.icon('users', 14) + '跟进人 ' + ui.esc(c.owner) + ' · ' + ui.esc(c.stage) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cust-tags">' + (c.tags || []).map(function (t) { return ui.tag(t, 'default'); }).join('') + '</div>' +
          '<div class="cust-foot"><span class="tag ' + intentTag(c.intent) + '">' + intentLabel(c.intent) + '</span><span class="cust-amt">' + ui.money(c.amount) + '</span></div>' +
        '</a>';
    }).join('');

    var hist = App.store.bcHistory().slice(0, 6).map(function (h) {
      return '<button class="hist-item" data-onclick="Customers.openHist" data-id="' + h.id + '">' +
        '<span class="hist-name">' + ui.esc(h.name) + '</span>' +
        '<span class="hist-when">' + new Date(h.at).toLocaleDateString('zh-CN') + '</span></button>';
    }).join('');

    var html = '' +
      ui.pageHead('客户一键背调', '输入公司名，自动生成企业画像 / 决策链 / 需求预测 / 切入建议') +
      '<div class="bc-actions">' +
        '<a class="btn btn-primary" href="#/customer/new">' + ui.icon('plus', 18) + '<span>新建背调</span></a>' +
        '<a class="btn btn-ghost" href="#/aiconfig">' + ui.icon('gear', 18) + '<span>AI 模型配置</span></a>' +
        '<span class="bc-hint">演示数据 · 已内置 6 家网络安全头部厂商样本；AI 背调需启动本地服务并配置模型，未配置则回退模板。配置入口见上方「AI 模型配置」。</span>' +
      '</div>' +
      '<section class="sec"><div class="sec-head"><h2>' + ui.icon('search', 18) + '客户池快速选择</h2></div><div class="pool-row">' + pool + '</div></section>' +
      '<section class="sec"><div class="sec-head"><h2>我的客户</h2><span class="sec-sub">' + (DB.customers || []).length + ' 家</span></div><div class="cust-grid">' + cards + '</div></section>' +
      (hist ? '<section class="sec"><div class="sec-head"><h2>最近背调</h2></div><div class="hist-list">' + hist + '</div></section>' : '');

    App.shell.setContent(html, '客户一键背调');
  }

  /* ---------- 向导 ---------- */
  function wizard() {
    var name = pending ? pending.name : '';
    var html = '' +
      '<a class="lnk-back" href="#/customer">' + ui.icon('arrowl', 16) + '返回背调列表</a>' +
      '<div class="wizard">' +
      '<div class="wizard-steps"><span class="ws on">1 输入信息</span><span class="ws">2 自动生成</span><span class="ws">3 查看报告</span></div>' +
      '<div class="card"><div class="card-head">' + ui.icon('search', 18) + '新建客户背调</div>' +
          '<div class="card-body">' +
            '<div class="field"><label>公司名称</label><input class="input" id="bc-name" placeholder="如：广东天耘科技有限公司" value="' + ui.esc(name) + '"></div>' +
            '<div class="field"><label>已知信息 / 补充（选填）</label><textarea class="input" id="bc-extra" rows="5" placeholder="如：客户刚完成 B 轮融资、近期在招网络工程师、现有 MPLS 年底到期、老板最关心海外访问卡顿…\n\n💡 建议：把天眼查/企查查的工商信息复制粘贴到这里，可大幅提高企业画像准确度。示例：\n企业名称：广东天耘科技有限公司\n法定代表人：戴煜\n注册资本：2498.243485万人民币\n成立日期：2014-04-19\n注册地址：广州市黄埔区联和街道开泰大道28号1701-1707房\n参保人数：160"></textarea></div>' +
      '<div class="wizard-tip wizard-tip-strong">⚠️ 重要：AI 联网检索对企业画像的工商字段（法人、注册资本、成立日期、地址等）容易出错。若未在上方粘贴天眼查/企查查等权威数据，生成后请务必人工复核，或直接把这些信息填入「已知信息」框。</div>' +
            '<div class="wizard-btns"><button class="btn btn-primary" data-onclick="Customers.generate">' + ui.icon('spark', 18) + '<span>生成背调报告</span></button></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    pending = null;
    App.shell.setContent(html, '新建背调');
  }

  function startNew(e) {
    pending = { name: e.getAttribute('data-name') };
    location.hash = '#/customer/new';
  }

  function openHist(e) {
    var id = e.getAttribute('data-id');
    var h = App.store.bcHistory().filter(function (x) { return x.id === id; })[0];
    if (h && h.report) { genCache[id] = h; location.hash = '#/customer/' + id; }
    else ui.toast('记录已失效', 'warn');
  }

  function generate() {
    var name = (document.getElementById('bc-name').value || '').trim();
    var extra = (document.getElementById('bc-extra') ? document.getElementById('bc-extra').value : '').trim();
    if (!name) { ui.toast('请填写公司名称', 'warn'); return; }
    var payload = { name: name, industry: '', region: '', extra: extra };

    // 加载态（复用品牌涟漪 c-loader）
    App.shell.setContent(
      '<div class="calc-loading-ui" style="min-height:52vh">' +
        '<div class="c-loader"><span class="ring"></span><span class="ring"></span><span class="ring"></span><span class="ring"></span><span class="ring"></span><span class="lab">AI</span></div>' +
        '<div class="calc-loading-hint">AI 正在生成客户背调报告，约 10–30 秒…</div>' +
      '</div>', '生成中');

    fetch('/api/baidiao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (resp) {
        if (resp && resp.ok && resp.report) buildFromAI(resp.report, payload, resp.sources, resp.searchNote, resp.tycNote);
        else { fallbackGenerate(payload); ui.toast('AI 生成失败：' + (resp && resp.error ? resp.error : '未知错误') + '，已改用行业模板', 'warn'); }
      })
      .catch(function () { fallbackGenerate(payload); ui.toast('未连接到本地服务，已改用行业模板生成', 'warn'); });
  }

  function buildFromAI(report, payload, sources, searchNote, tycNote) {
    var score = Number(report.score) || 0;
    var intent = score >= 85 ? 'high' : score >= 70 ? 'mid' : 'low';
    var c = {
      id: 'ai_' + Date.now(),
      name: payload.name,
      short: payload.name.length > 4 ? payload.name.slice(0, 4) : payload.name,
      industry: payload.industry,
      region: payload.region || '未知',
      stage: 'AI 背调',
      owner: (App.store.user() || {}).name || '我',
      intent: intent,
      amount: 0,
      tags: ['AI 背调'],
      generated: true,
      ai: true,
      sources: sources || [],
      searchNote: searchNote || '',
      tycNote: tycNote || '',
      report: report
    };
    genCache[c.id] = c;
    App.store.addBcRecord({ id: c.id, name: c.name, industry: c.industry, region: c.region, score: score, at: Date.now(), report: report, sources: sources || [] });
    if (searchNote) ui.toast('已生成（注意：' + searchNote + '）', 'warn');
    else ui.toast('AI 联网背调报告已生成', 'success');
    location.hash = '#/customer/' + c.id;
  }

  /* 模板回退：未配置模型 / 接口异常时使用（与之前行为一致） */
  function fallbackGenerate(payload) {
    var name = payload.name, ind = payload.industry, region = payload.region;
    var base = (DB.customers || [])[0];
    if (ind.indexOf('餐饮') >= 0) base = DB.customers[0];
    else if (ind.indexOf('跨境') >= 0) base = DB.customers[1];
    else if (ind.indexOf('制造') >= 0) base = DB.customers[2];
    else if (ind.indexOf('医疗') >= 0) base = DB.customers[3];
    var clone = JSON.parse(JSON.stringify(base));
    clone.id = 'gen_' + Date.now();
    clone.name = name;
    clone.short = name.length > 4 ? name.slice(0, 4) : name;
    clone.industry = ind;
    clone.region = region || '未知';
    clone.owner = (App.store.user() || {}).name || '我';
    clone.report.profile.fullName = name;
    clone.report.generatedAt = new Date().toLocaleString('zh-CN');
    clone.generated = true;
    genCache[clone.id] = clone;
    App.store.addBcRecord({ id: clone.id, name: name, industry: ind, region: region, score: clone.report.score, at: Date.now(), report: clone.report });
    location.hash = '#/customer/' + clone.id;
  }

  /* ---------- 报告 ---------- */
  function openReport(id) {
    var c = custById(id); if (!c) { App.shell.setContent('<div class="empty">客户不存在</div>', '报告'); return; }
    var r = c.report;
    var sec = DB.reportSections || [];

    function kv(rows) {
      return '<div class="kv-grid">' + rows.map(function (row) {
        return '<div class="kv"><span class="kv-k">' + ui.esc(row.k) + '</span><span class="kv-v">' + ui.esc(row.v) + '</span></div>';
      }).join('') + '</div>';
    }

    // 11 项背调标准指标表（源自 OgSales 背调 skill）
    function renderMetrics(metrics) {
      if (!metrics || !metrics.length) return '';
      var rows = metrics.map(function (m) {
        var typeCls = m.type === '事实' ? 'm-fact' : (m.type === '估算' ? 'm-est' : 'm-miss');
        var confCls = m.confidence === '高' ? 'c-high' : (m.confidence === '中' ? 'c-mid' : 'c-low');
        return '<tr>' +
          '<td class="mc-idx">' + ui.esc(m.idx) + '</td>' +
          '<td class="mc-name">' + ui.esc(m.name) + '</td>' +
          '<td class="mc-val">' + ui.esc(m.value) + '</td>' +
          '<td class="mc-type ' + typeCls + '">' + ui.esc(m.type || '') + '</td>' +
          '<td class="mc-conf ' + confCls + '">' + ui.esc(m.confidence || '') + '</td>' +
          '<td class="mc-year">' + ui.esc(m.year || '') + '</td>' +
          '<td class="mc-src">' + ui.esc(m.source || '') + '</td>' +
        '</tr>';
      }).join('');
      return '<div class="metrics-wrap"><table class="metrics-table"><thead><tr>' +
        '<th>#</th><th>指标</th><th>结论</th><th>类型</th><th>置信度</th><th>年份</th><th>来源</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div class="metrics-tip">' + (c.tycNote && c.tycNote.indexOf('已接入天眼查') >= 0 ? '指标 5/6（需要上外网人数、IT 人数）由系统按行业系数自动估算；第 7 项注册资本/实缴资本已由天眼查官方 MCP 核验；其余指标来自 AI 联网检索，请核对来源。' : '指标 5/6（需要上外网人数、IT 人数）由系统按行业系数自动估算；其余来自联网检索，关键工商字段请通过天眼查/企查查/官网复核。') + '</div></div>';
    }

    function renderGaps(gaps) {
      if (!gaps || !gaps.length) return '';
      return '<div class="rp-gaps"><div class="rp-sub"><b>缺口与限制</b></div><ul class="gap-list">' +
        gaps.map(function (g) { return '<li>' + ui.icon('warn', 14) + ui.esc(g) + '</li>'; }).join('') + '</ul></div>';
    }

    // 1 画像
    var profileNote = '';
    if (c.ai) {
      if (c.tycNote && c.tycNote.indexOf('已接入天眼查') >= 0) {
        profileNote = '<div class="rp-profile-note rp-profile-ok">✅ 以下工商字段已由天眼查官方 MCP 核验（法人、注册资本、成立日期、地址等），可作为权威事实基础。</div>';
      } else if (c.sources && c.sources.length) {
        profileNote = '<div class="rp-profile-note">以下工商字段由 AI 联网检索生成，建议通过天眼查/企查查复核关键信息（法人、注册资本、地址）。</div>';
      } else {
        profileNote = '<div class="rp-profile-note rp-profile-warn">⚠️ 未开启联网检索，企业画像可能由模型推断生成，请务必人工核对。</div>';
      }
    }
    var s1 = profileNote + kv([
      { k: '全称', v: r.profile.fullName }, { k: '成立', v: r.profile.founded },
      { k: '注册资本', v: r.profile.capital }, { k: '类型', v: r.profile.type },
      { k: '状态', v: r.profile.status }, { k: '法人', v: r.profile.legal },
      { k: '人员', v: r.profile.staff }, { k: '地址', v: r.profile.address },
      { k: '点位', v: r.profile.branches }
    ]);

    // 2 业务
    var moves = (r.business.moves || []).map(function (m) {
      return '<div class="move"><span class="move-date">' + ui.esc(m.date) + '</span><span class="move-text">' + ui.esc(m.text) + '</span></div>';
    }).join('');
    var signals = (r.business.signals || []).map(function (s) { return '<li>' + ui.icon('bolt', 14) + ui.esc(s) + '</li>'; }).join('');
    var s2 = '' +
      '<div class="kv-grid"><div class="kv"><span class="kv-k">主营业务</span><span class="kv-v">' + ui.esc(r.business.main) + '</span></div>' +
      '<div class="kv"><span class="kv-k">行业地位</span><span class="kv-v">' + ui.esc(r.business.position) + '</span></div></div>' +
      '<div class="rp-sub"><b>近期动向</b></div><div class="moves">' + moves + '</div>' +
      '<div class="rp-sub"><b>关键信号</b></div><ul class="signal-list">' + signals + '</ul>';

    // 3 IT 现状
    var inf = (r.itstack.inferred || []).map(function (x) {
      return '<div class="kv"><span class="kv-k">' + ui.esc(x.k) + '</span><span class="kv-v">' + ui.esc(x.v) + '<i class="kv-src">来源：' + ui.esc(x.src) + '</i></span></div>';
    }).join('');
    var contracts = (r.itstack.contracts || []).map(function (x) {
      return '<div class="contract"><div class="contract-item">' + ui.esc(x.item) + '</div><div class="contract-meta">' + ui.esc(x.vendor) + ' · 到期 ' + ui.esc(x.expire) + '</div><div class="contract-note">' + ui.esc(x.note) + '</div></div>';
    }).join('');
    var s3 = kv2list(inf) + '<div class="rp-sub"><b>现有合同与到期窗口</b></div><div class="contracts">' + contracts + '</div>';
    function kv2list(html) { return '<div class="kv-grid">' + html + '</div>'; }

    // 4 合规
    var s4 = (r.compliance.items || []).map(function (x) {
      return '<div class="comp-item"><div class="comp-head"><b>' + ui.esc(x.name) + '</b>' + (x.must ? '<span class="tag tag-brand">必需</span>' : '<span class="tag tag-default">视情况</span>') + '<span class="comp-level">' + ui.esc(x.level) + '</span></div><div class="comp-note">' + ui.esc(x.note) + '</div></div>';
    }).join('');

    // 5 风险
    var s5 = (r.risk || []).map(function (x) {
      return '<div class="risk-item risk-' + x.level + '"><div class="risk-head"><span class="risk-dot"></span><b>' + ui.esc(x.title) + '</b><span class="tag tag-' + riskColor(x.level) + '">' + riskLabel(x.level) + '</span></div><div class="risk-text">' + ui.esc(x.text) + '</div></div>';
    }).join('');

    // 6 决策链
    var s6 = (r.chain || []).map(function (x, i) {
      return '<div class="chain-node' + (x.key ? ' key' : '') + '"><div class="chain-idx">' + (i + 1) + '</div>' +
        '<div class="chain-body"><div class="chain-role">' + ui.esc(x.role) + (x.key ? '<span class="tag tag-hot">关键人</span>' : '') + '</div>' +
        '<div class="chain-title">' + ui.esc(x.title) + (x.name && x.name !== '—' ? ' · ' + ui.esc(x.name) : '') + '</div>' +
        '<div class="chain-note">' + ui.esc(x.note) + '</div></div></div>';
    }).join('');

    // 7 需求预测
    var s7 = App.charts.funnel((r.demand || []).map(function (d) {
      return { label: d.name, value: d.fit, color: 'brand' };
    }), { rowH: 48 });
    var demList = (r.demand || []).map(function (d) {
      return '<div class="dem-item"><span class="dem-pri">#' + d.pri + '</span><b>' + ui.esc(d.name) + '</b><span class="dem-fit">匹配 ' + d.fit + '%</span><div class="dem-reason">' + ui.esc(d.reason) + '</div></div>';
    }).join('');

    // 8 切入建议
    var s8 = '' +
      '<div class="kv-grid"><div class="kv"><span class="kv-k">时间窗口</span><span class="kv-v">' + ui.esc(r.entry.window) + '</span></div>' +
      '<div class="kv"><span class="kv-k">切入话题</span><span class="kv-v">' + ui.esc(r.entry.topic) + '</span></div></div>' +
      '<div class="rp-sub"><b>为什么这样切</b></div><p class="entry-why">' + ui.esc(r.entry.why) + '</p>' +
      '<div class="rp-sub"><b>首单建议</b></div><div class="entry-first">' + ui.esc(r.entry.first) + '</div>' +
      '<div class="rp-sub"><b>行动清单</b></div><ul class="entry-acts">' + (r.entry.actions || []).map(function (a) { return '<li>' + ui.esc(a) + '</li>'; }).join('') + '</ul>';

    function section(n, title, desc, body) {
      return '<section class="rp-sec" id="sec-' + n + '"><div class="rp-sec-head"><span class="rp-no">' + n + '</span><div><b>' + ui.esc(title) + '</b><i>' + ui.esc(desc) + '</i></div></div><div class="rp-sec-body">' + body + '</div></section>';
    }

    var nav = sec.map(function (x) {
      return '<a class="rp-nav-item" href="#sec-' + x.id + '" data-onclick="Customers.scrollSec" data-sec="' + x.id + '">' + x.n + '. ' + ui.esc(x.name) + '</a>';
    }).join('');

    var html = '' +
      '<a class="lnk-back" href="#/customer">' + ui.icon('arrowl', 16) + '返回背调列表</a>' +
      '<div class="rp-head card">' +
        '<div class="rp-score">' +
          '<div class="cust-ring-wrap rp-ring-wrap">' +
            App.charts.ring(r.score, { color: c.intent === 'high' ? 'success' : 'brand', size: 92, sw: 7 }) +
            '<div class="cust-ring-label">匹配度</div>' +
          '</div>' +
          '<div class="rp-score-txt"><span class="tag ' + intentTag(c.intent) + '">' + intentLabel(c.intent) + '</span><b>' + r.scoreLabel + '</b></div></div>' +
        '<div class="rp-title"><h1 class="page-title">' + ui.esc(c.name) + '</h1>' +
          '<div class="rp-meta">' + ui.icon('building', 14) + ui.esc(c.industry) + ' · ' + ui.esc(c.region) + ' · 跟进 ' + ui.esc(c.owner) + ' · ' + ui.esc(c.stage) + '</div>' +
          '<div class="rp-tags">' + (c.tags || []).map(function (t) { return ui.tag(t, 'default'); }).join('') + '</div>' +
          (c.realData ? '<div class="rp-gen rp-gen-real">✅ 工商基础信息（法人 / 注册资本 / 成立日期 / 地址 / 人员 / 上市代码）来自天眼查权威核验；下方业务、合规、风险、决策链、需求与切入建议为结合公开资料与行业经验的销售情报分析，供内部参考，落地前请复核。</div>' : (c.generated ? '<div class="rp-gen">' + (c.ai ? (c.tycNote && c.tycNote.indexOf('已接入天眼查') >= 0 ? '✅ 天眼查权威工商已核验 · AI 联网检索合成' : (c.sources && c.sources.length ? 'AI 联网检索合成 · 基于公开资料生成，请核对来源' : 'AI 合成 · 内容由大模型生成，仅供参考请核对')) : '演示模板生成 · 非真实企业数据') + '</div>' : '')) +
        '</div>' +
        '<div class="rp-head-actions">' +
          '<button class="btn btn-ghost" data-onclick="Customers.saveRecord" data-id="' + c.id + '">' + ui.icon('star', 16) + '加入跟进</button>' +
          '<a class="btn btn-primary" href="#/recommend/' + c.id + '">' + ui.icon('recommend', 16) + '生成推介方案</a>' +
        '</div>' +
      '</div>' +
      '<div class="rp-nav">' + nav + '</div>' +
      section(1, '企业画像', '工商信息、规模、资质', s1) +
      (function () { var sm = renderMetrics(r.metrics); return sm ? section('m', '背调指标（11 项标准）', '规模·布局·融资·官网触达', sm) : ''; })() +
      section(2, '业务与行业', '主营业务、行业地位、扩张动向', s2) +
      section(3, 'IT 与安全现状', '现有架构推断、供应商、合同周期', s3) +
      section(4, '合规要求', '等保、密评、数据出境适用性', s4) +
      section(5, '风险信号', '经营、司法、舆情风险', s5) +
      section(6, '决策链分析', '关键角色、汇报关系、预算层级', s6) +
      section(7, '安全需求预测', '基于画像推断的需求优先级', s7 + '<div class="dem-list">' + demList + '</div>') +
      section(8, '推荐切入点', '切入话题、时间窗口、首单建议', s8) +
      renderGaps(r.gaps) +
      (c.sources && c.sources.length ? '<div class="rp-sources"><div class="rp-sub"><b>资料来源（联网检索）</b></div><ul class="src-list">' + c.sources.map(function (u) { return '<li><a href="' + ui.esc(u) + '" target="_blank" rel="noopener">' + ui.esc(u) + '</a></li>'; }).join('') + '</ul></div>' : '');

    App.shell.setContent(html, c.name + ' · 背调');
  }

  function scrollSec(e) {
    var id = e.getAttribute('data-sec');
    var el = document.getElementById('sec-' + id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  function saveRecord(e) {
    var id = e.getAttribute('data-id');
    var c = custById(id); if (!c) return;
    App.store.addBcRecord({ id: c.id, name: c.name, industry: c.industry, region: c.region, score: c.report.score, at: Date.now(), report: c.report });
    ui.toast('已加入跟进列表', 'success');
  }

  return { render: render, wizard: wizard, startNew: startNew, generate: generate, openReport: openReport, openHist: openHist, saveRecord: saveRecord, scrollSec: scrollSec };
})();
window.Customers = Customers;

App.defineNav({ path: 'customer', title: '客户背调', icon: 'search', roles: ['all'], view: Customers.render });
