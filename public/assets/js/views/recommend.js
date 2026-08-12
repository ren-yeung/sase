/* 一键推介：方案生成器 → 在线方案页 / 可打印方案书 / 报价单 / 话术邮件 */
window.App = window.App || {};

var Recommend = (function () {
  var ui = App.ui;
  var current = null;       // 当前已生成方案
  var DEMAND2PROD = {
    'SD-WAN 组网替代': 'sdwan', 'SD-WAN 拓扑重构': 'sdwan', 'SD-WAN 旗舰版': 'sdwan',
    '视频监控互联': 'video', 'MSP 网络托管': 'msp', 'SASE 安全接入': 'sase',
    '安全合规咨询': 'compliance', '安全合规咨询（等保三级）': 'compliance',
    '国际专线与带宽': 'bandwidth', '国际专线': 'bandwidth', '多云互联专线': 'multicloud',
    'OgAI 智能引擎': 'ogai', '硬件维保服务': 'hwcare',
    'AI 算力互联': 'aicompute', 'SOC 阵列服务器': 'cph'
  };

  function custById(id) {
    var c = (DB.customers || []).filter(function (x) { return x.id === id; })[0];
    if (c) return c;
    return null;
  }
  function prodById(id) { return (DB.products || []).filter(function (p) { return p.id === id; })[0] || null; }

  function render(parts) {
    if (parts[0] && custById(parts[0])) {
      // 如果已有为该客户生成的方案则展示，否则打开生成器
      if (current && current.custId === parts[0]) return showProposal(current);
      return builder(parts[0]);
    }
    return start();
  }

  function start() {
    var opts = (DB.customers || []).map(function (c) {
      return '<option value="' + c.id + '">' + ui.esc(c.name) + '（' + ui.esc(c.industry) + '）</option>';
    }).join('');
    var html = '' +
      ui.pageHead('一键推介', '选客户 + 选产品，自动生成在线方案、可打印方案书、报价单与销售话术') +
      '<div class="card rec-pick"><div class="card-body">' +
        '<div class="field"><label>选择客户</label><select class="select" id="rec-cust">' + opts + '</select></div>' +
        '<div class="rec-pick-btns"><button class="btn btn-primary" data-onclick="Recommend.goBuild">' + ui.icon('arrow', 18) + '<span>下一步：配置方案</span></button>' +
        '<a class="btn btn-ghost" href="#/customer/new">或新建客户背调</a></div>' +
      '</div></div>';
    App.shell.setContent(html, '一键推介');
  }

  function goBuild() {
    var cid = document.getElementById('rec-cust').value;
    location.hash = '#/recommend/' + cid;
  }

  /* ---------- 生成器 ---------- */
  function builder(custId) {
    var c = custById(custId);
    // 默认勾选该客户需求量前 3 对应的产品
    var defaults = {};
    (c.report.demand || []).slice(0, 3).forEach(function (d) {
      var pid = DEMAND2PROD[d.name];
      if (pid) defaults[pid] = true;
    });

    var rows = (DB.products || []).map(function (p) {
      var on = defaults[p.id] ? ' on' : '';
      var checked = defaults[p.id] ? ' checked' : '';
      return '' +
        '<div class="bprod' + on + '" data-pid="' + p.id + '">' +
          '<label class="bprod-head"><input type="checkbox" class="bprod-chk" value="' + p.id + '"' + checked + '><span class="bprod-ico" style="color:var(--brand)">' + ui.icon('grid', 18) + '</span><b>' + ui.esc(p.name) + '</b><span class="bprod-tag">' + ui.esc(p.tagline) + '</span></label>' +
          '<div class="bprod-cfg">' + cfgHtml(p) + '</div>' +
        '</div>';
    }).join('');

    var html = '' +
      '<a class="lnk-back" href="#/recommend">' + ui.icon('arrowl', 16) + '返回客户选择</a>' +
      '<div class="rec-builder">' +
        '<div class="card"><div class="card-head">' + ui.icon('recommend', 18) + '配置推介方案 · ' + ui.esc(c.name) + '</div>' +
          '<div class="card-body">' +
            '<div class="rec-hint">已根据客户背调需求量，预选前 3 项推荐产品。可增删并调整配置。</div>' +
            '<div class="bprod-list">' + rows + '</div>' +
            '<div class="rec-build-actions"><button class="btn btn-primary btn-lg" data-onclick="Recommend.build" data-cust="' + c.id + '">' + ui.icon('spark', 18) + '<span>生成方案书 / 报价单 / 话术</span></button></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    App.shell.setContent(html, '配置方案');
    var list = document.querySelector('.bprod-list');
    if (list) list.addEventListener('change', function (e) {
      if (e.target.classList.contains('bprod-chk')) {
        e.target.closest('.bprod').classList.toggle('on', e.target.checked);
      }
    });
  }

  function cfgHtml(p) {
    var id = p.id;
    if (p.pricingModel === 'tier') {
      var planOpts = p.plans.map(function (pl) { return '<option value="' + pl.id + '"' + (pl.hot ? ' selected' : '') + '>' + ui.esc(pl.name) + '</option>'; }).join('');
      return '<div class="cfg-row">' +
        '<label>套餐</label><select class="select sm" id="cfg_' + id + '_plan">' + planOpts + '</select>' +
        '<label>' + ui.esc(p.unitLabel) + '</label><input class="input sm" type="number" id="cfg_' + id + '_qty" value="' + (p.unitLabel === '项目' ? 1 : 20) + '">' +
        '<label>年限</label><select class="select sm" id="cfg_' + id + '_years"><option value="1">1年</option><option value="2">2年</option><option value="3">3年</option></select>' +
        '</div>';
    } else if (p.pricingModel === 'usage') {
      var adds = (p.addons || []).map(function (a) {
        return '<label class="c-bubble bubble-item"><input type="checkbox" class="bubble" value="' + a.id + '" name="cfg_' + id + '_addon"><span class="bubble-lbl">' + ui.esc(a.name) + '</span></label>';
      }).join('');
      return '<div class="cfg-row">' +
        '<label>' + ui.esc(p.unitLabel) + '</label><input class="input sm" type="number" id="cfg_' + id + '_qty" value="50">' +
        '<label>年限</label><select class="select sm" id="cfg_' + id + '_years"><option value="1">1年</option><option value="2">2年</option><option value="3">3年</option></select>' +
        (adds ? '<div class="cfg-addons">' + adds + '</div>' : '') +
        '</div>';
    } else {
      var mOpts = p.hwModels.map(function (m) { return '<option value="' + m.id + '">' + ui.esc(m.name) + '</option>'; }).join('');
      var lOpts = p.serviceLevels.map(function (l) { return '<option value="' + l.id + '"' + (l.rate === 1 ? ' selected' : '') + '>' + ui.esc(l.name) + '（×' + l.rate + '）</option>'; }).join('');
      return '<div class="cfg-row">' +
        '<label>型号</label><select class="select sm" id="cfg_' + id + '_model">' + mOpts + '</select>' +
        '<label>数量</label><input class="input sm" type="number" id="cfg_' + id + '_qty" value="10">' +
        '<label>等级</label><select class="select sm" id="cfg_' + id + '_level">' + lOpts + '</select>' +
        '<label>年限</label><select class="select sm" id="cfg_' + id + '_years"><option value="1">1年</option><option value="2">2年</option><option value="3">3年</option></select>' +
        '</div>';
    }
  }

  function val(id, d) { var e = document.getElementById(id); return e ? e.value : d; }
  function num(id, d) { var e = document.getElementById(id); var v = e ? parseFloat(e.value) : NaN; return isNaN(v) ? d : v; }
  function checked(name) {
    return Array.prototype.slice.call(document.querySelectorAll('input[name="' + name + '"]:checked')).map(function (i) { return i.value; });
  }

  function readCfg(p) {
    var id = p.id;
    if (p.pricingModel === 'tier') return { planId: val('cfg_' + id + '_plan', p.plans[0].id), qty: num('cfg_' + id + '_qty', 20), years: num('cfg_' + id + '_years', 1) };
    if (p.pricingModel === 'usage') return { qty: num('cfg_' + id + '_qty', 50), years: num('cfg_' + id + '_years', 1), addons: checked('cfg_' + id + '_addon') };
    return { modelId: val('cfg_' + id + '_model', p.hwModels[0].id), count: num('cfg_' + id + '_qty', 10), levelId: val('cfg_' + id + '_level', p.serviceLevels[0].id), years: num('cfg_' + id + '_years', 1) };
  }

  function build(e) {
    var custId = e.getAttribute('data-cust');
    var c = custById(custId);
    var chks = Array.prototype.slice.call(document.querySelectorAll('.bprod-chk:checked')).map(function (i) { return i.value; });
    if (!chks.length) { ui.toast('请至少选择一个产品', 'warn'); return; }
    var items = [];
    var annual = 0, total = 0, onetime = 0;
    chks.forEach(function (pid) {
      var p = prodById(pid);
      var r = App.pricing.calc(pid, readCfg(p));
      if (!r) return;
      annual += r.annual; total += r.total; onetime += r.onetime;
      items.push({ p: p, r: r, cfg: readCfg(p) });
    });
    var prop = {
      id: 'prop_' + custId + '_' + Date.now(),
      custId: custId, custName: c.name, industry: c.industry, owner: (App.store.user() || {}).name || c.owner,
      items: items, annual: annual, total: total, onetime: onetime,
      createdAt: new Date().toLocaleString('zh-CN')
    };
    current = prop;
    App.store.saveProposal(prop);
    ui.toast('方案已生成', 'success');
    showProposal(prop);
  }

  /* ---------- 在线方案 / 方案书 ---------- */
  function showProposal(prop) {
    var c = custById(prop.custId) || { report: { scoreLabel: '', demand: [] } };
    var rep = c.report || {};

    // 产品方案卡片
    var prodCards = prop.items.map(function (it) {
      var p = it.p;
      var planName = it.r.plan ? it.r.plan.name : (it.r.model ? it.r.model.name : '');
      var cfgTxt = p.pricingModel === 'tier' ? (planName + ' · ' + it.cfg.qty + ' ' + p.unitLabel + ' · ' + it.cfg.years + ' 年')
        : p.pricingModel === 'usage' ? (it.cfg.qty + ' ' + p.unitLabel + ' · ' + it.cfg.years + ' 年' + (it.cfg.addons && it.cfg.addons.length ? ' · 含 ' + it.cfg.addons.length + ' 模块' : ''))
        : (it.r.model.name + ' × ' + it.cfg.count + ' 台 · ' + it.cfg.years + ' 年');
      return '' +
        '<div class="pp-item">' +
          '<div class="pp-item-head"><b>' + ui.esc(p.name) + '</b><span class="pp-plan">' + ui.esc(cfgTxt) + '</span></div>' +
          '<div class="pp-item-price"><span class="pp-annual">' + ui.money(it.r.annual) + '<i> / 年</i></span>' +
          (it.r.onetime ? '<span class="pp-once">一次性 ' + ui.money(it.r.onetime) + '</span>' : '') +
          '<span class="pp-total">合计 ' + ui.money(it.r.total) + '</span></div>' +
        '</div>';
    }).join('');

    // 报价单表格
    var qtRows = prop.items.map(function (it) {
      var p = it.p;
      var cfg = p.pricingModel === 'tier' ? (it.r.plan.name + ' × ' + it.cfg.qty)
        : p.pricingModel === 'usage' ? (it.cfg.qty + ' ' + p.unitLabel + (it.cfg.addons && it.cfg.addons.length ? ' +' + it.cfg.addons.length + '模块' : ''))
        : (it.r.model.name + ' ×' + it.cfg.count);
      return '<tr><td>' + ui.esc(p.name) + '</td><td>' + ui.esc(cfg) + '</td><td>' + it.cfg.years + ' 年</td>' +
        '<td class="num">' + ui.money(it.r.annual) + '</td><td class="num">' + ui.money(it.r.onetime) + '</td><td class="num strong">' + ui.money(it.r.total) + '</td></tr>';
    }).join('') +
      '<tr class="qt-sum"><td colspan="3">合计</td><td class="num">' + ui.money(prop.annual) + '</td><td class="num">' + ui.money(prop.onetime) + '</td><td class="num strong">' + ui.money(prop.total) + '</td></tr>';

    // 价值映射
    var valueCards = prop.items.map(function (it) {
      var p = it.p;
      var pain = (p.solves && p.solves[0]) || p.tagline;
      return '<div class="value-card"><div class="vc-name">' + ui.esc(p.name) + '</div>' +
        '<div class="vc-pain"><span class="vc-tag pain">痛点</span>' + ui.esc(pain) + '</div>' +
        '<div class="vc-val"><span class="vc-tag val">价值</span>' + ui.esc(p.summary.split('。')[0] + '。') + '</div></div>';
    }).join('');

    // 话术
    var scripts = [];
    prop.items.forEach(function (it) {
      var objs = DB.objections[it.p.id];
      if (objs) objs.forEach(function (o) { scripts.push({ p: it.p.name, q: o.q, a: o.a }); });
    });
    (DB.objections.common || []).forEach(function (o) { scripts.push({ p: '通用', q: o.q, a: o.a }); });
    var scriptHtml = scripts.map(function (s) {
      return '<div class="script-block"><div class="script-q">' + ui.icon('chat', 15) + ui.esc(s.q) + '<span class="script-prod">' + ui.esc(s.p) + '</span></div><div class="script-a">' + ui.esc(s.a) + '</div></div>';
    }).join('');

    // 开场邮件
    var prodNames = prop.items.map(function (it) { return it.p.name; }).join('、');
    var email = '尊敬的 ' + ui.esc(prop.custName) + ' 负责人：\n\n您好！我是 OgCloud 的 ' + ui.esc(prop.owner) + '。\n\n基于前期沟通，我们了解到贵司在' +
      (rep.business ? ui.esc(rep.business.main) : '网络与业务支撑') + '方面存在进一步提效空间。为此我们准备了一份《' + ui.esc(prop.custName) +
      ' 网络与安全工作建议书》，核心建议包括：' + ui.esc(prodNames) + '。\n\n预计整体投入约 ' + ui.money(prop.total) + '（' + (prop.items[0] ? prop.items[0].cfg.years : 1) +
      ' 年），可带来明显的成本下降与运维提效。\n\n方便的话，我们安排一次 30 分钟的线上交流，为您演示同行业客户的落地数据。期待您的回复。\n\n顺颂商祺\n' + ui.esc(prop.owner) + '\nOgCloud 天云解决方案';

    var html = '' +
      '<div class="doc-toolbar no-print">' +
        '<a class="lnk-back" href="#/recommend/' + prop.custId + '">返回修改配置</a>' +
        '<div class="doc-toolbar-actions">' +
          '<button class="btn btn-ghost" data-onclick="Recommend.printDoc">' + ui.icon('print', 16) + '打印 / 另存 PDF</button>' +
          '<button class="btn btn-ghost" data-onclick="Recommend.saveProp">' + ui.icon('star', 16) + '保存方案</button>' +
          '<a class="btn btn-primary" href="#/recommend">新建推介</a>' +
        '</div>' +
      '</div>' +
      '<div class="doc">' +
        '<div class="doc-cover avoid-break">' +
          '<div class="dc-brand">' + ui.icon('globe', 26) + ' OgCloud · 天云解决方案</div>' +
          '<h1 class="dc-title">网络与安全工作建议书</h1>' +
          '<div class="dc-sub">为 ' + ui.esc(prop.custName) + ' 定制</div>' +
          '<div class="dc-meta">' +
            '<div><span>客户</span><b>' + ui.esc(prop.custName) + '</b></div>' +
            '<div><span>行业</span><b>' + ui.esc(prop.industry) + '</b></div>' +
            '<div><span>顾问</span><b>' + ui.esc(prop.owner) + '</b></div>' +
            '<div><span>方案总额</span><b>' + ui.money(prop.total) + '</b></div>' +
            '<div><span>生成时间</span><b>' + ui.esc(prop.createdAt) + '</b></div>' +
          '</div>' +
          '<div class="dc-note">本方案由赋能平台自动生成，价格为演示数据，最终以正式商务报价为准。</div>' +
        '</div>' +

        '<section class="doc-sec avoid-break"><h2>一、客户洞察</h2>' +
          (rep.scoreLabel ? '<p>综合评估：<b>' + ui.esc(rep.scoreLabel) + '</b>（评分 ' + rep.score + '）。' : '') +
          (rep.business && rep.business.signals ? '<ul class="doc-signals">' + rep.business.signals.map(function (s) { return '<li>' + ui.esc(s) + '</li>'; }).join('') + '</ul>' : '') +
          (rep.demand ? '<div class="doc-demand">重点需求：' + rep.demand.slice(0, 3).map(function (d) { return ui.tag(d.name, 'brand'); }).join('') + '</div>' : '') +
        '</section>' +

        '<section class="doc-sec avoid-break"><h2>二、推荐方案</h2><div class="pp-list">' + prodCards + '</div></section>' +

        '<section class="doc-sec avoid-break"><h2>三、价值映射</h2><div class="value-grid">' + valueCards + '</div></section>' +

        '<section class="doc-sec print-page-break"><h2>四、报价单（税前）</h2>' +
          '<table class="quote-tbl"><thead><tr><th>产品</th><th>配置</th><th>年限</th><th>年费</th><th>一次性</th><th>合计</th></tr></thead><tbody>' + qtRows + '</tbody></table>' +
          '<div class="quote-total"><span>方案合计</span><b>' + ui.money(prop.total) + '</b><span class="qt-yr">（年费 ' + ui.money(prop.annual) + (prop.onetime ? ' + 一次性 ' + ui.money(prop.onetime) : '') + '）</span></div>' +
        '</section>' +

        '<section class="doc-sec avoid-break"><h2>五、实施节奏</h2>' +
          '<div class="timeline">' +
            tl('第 1 周', '需求确认与环境调研', '确认站点清单、业务系统、现有合同周期') +
            tl('第 2-3 周', '方案设计与 POC', '选取代表性站点部署，设定量化成功标准') +
            tl('第 4 周', '试点评估与汇报', '输出前后对比数据，对齐决策链') +
            tl('第 2 月', '分批推广', '按区域/门店分批上线，ZTP 零接触开局') +
            tl('持续', '运维与优化', 'MSP/SASE 托管接入，月度优化报告') +
          '</div>' +
        '</section>' +

        '<section class="doc-sec print-page-break"><h2>六、销售话术参考</h2><div class="script-list">' + scriptHtml + '</div></section>' +

        '<section class="doc-sec avoid-break"><h2>七、开场邮件模板</h2><div class="email-block"><pre>' + ui.esc(email) + '</pre></div></section>' +
      '</div>';

    App.shell.setContent(html, '方案书 · ' + prop.custName);
    window.scrollTo(0, 0);
  }

  function tl(time, title, desc) {
    return '<div class="tl-item"><div class="tl-dot"></div><div class="tl-time">' + ui.esc(time) + '</div><div class="tl-body"><b>' + ui.esc(title) + '</b><span>' + ui.esc(desc) + '</span></div></div>';
  }

  function printDoc() { window.print(); }
  function saveProp() { if (current) { App.store.saveProposal(current); ui.toast('已保存到方案库', 'success'); } }

  return { render: render, start: start, goBuild: goBuild, builder: builder, build: build, showProposal: showProposal, printDoc: printDoc, saveProp: saveProp };
})();
window.Recommend = Recommend;

App.defineNav({ path: 'recommend', title: '一键推介', icon: 'recommend', roles: ['all'], view: Recommend.render });
