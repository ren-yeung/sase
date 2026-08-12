/* 产品与价目：列表 / 详情 / 套餐对比 / 计价试算 */
window.App = window.App || {};

var Products = (function () {
  var ui = App.ui;
  var currentCat = 'all';

  function catById(id) {
    return (DB.categories || []).filter(function (c) { return c.id === id; })[0] || null;
  }
  function prodById(id) {
    return (DB.products || []).filter(function (p) { return p.id === id; })[0] || null;
  }
  function prodIcon(p) {
    var c = catById(p.cat);
    return c ? c.icon : 'globe';
  }
  function prodColor(p) {
    var c = catById(p.cat);
    return c ? c.color : 'brand';
  }
  function modelName(m) {
    return m === 'tier' ? '套餐分层 × 年限' : m === 'usage' ? '数量阶梯' : '硬件 + 年费';
  }

  function render(parts) {
    if (parts[0] === 'calc') return openCalc(parts[1]);
    if (parts[0] && parts[0] !== 'calc') return openDetail(parts[0]);
    return list();
  }

  /* ---------- 列表 ---------- */
  function list() {
    var cats = [{ id: 'all', name: '全部', icon: 'grid', color: 'brand' }].concat(DB.categories || []);
    var tabs = cats.map(function (c) {
      var active = c.id === currentCat ? ' active' : '';
      return '<button class="pill' + active + '" data-onclick="Products.filter" data-cat="' + c.id + '">' + ui.esc(c.name) + '</button>';
    }).join('');

    var html = '' +
      ui.pageHead('产品与价目', '公司全部产品、套餐与价格 · 演示数据，非官方报价') +
      '<div class="pills">' + tabs + '</div>';

    // 核心方案：仅「全部」视图置顶展示三款核心产品
    if (currentCat === 'all') {
      html += heroBand();
      html += '<div class="sec-label">更多产品</div>';
    }

    // 其余产品网格（全部视图隐藏 featured，分类筛选时显示该分类全部）
    var rest = (DB.products || []).filter(function (p) {
      if (currentCat !== 'all' && p.cat !== currentCat) return false;
      if (currentCat === 'all' && p.featured) return false;
      return true;
    });
    html += '<div class="prod-grid">' + rest.map(prodCard).join('') + '</div>';

    App.shell.setContent(html, '产品与价目');
  }

  /* 核心方案矩阵（OGbox / OgSASE / MSP） */
  function heroBand() {
    var feats = (DB.products || []).filter(function (p) { return p.featured; });
    return '' +
      '<section class="prod-hero">' +
        '<div class="prod-hero-head">' +
          '<h2>核心产品方案</h2>' +
          '<p>围绕企业网络安全的一体化组合：<b>OGbox</b> 守住分支边界 · <b>OgSASE</b> 收敛全域远程接入 · <b>MSP 全托管</b> 把前两者变成「有人管、不用自己管」的服务</p>' +
        '</div>' +
        '<div class="prod-hero-grid">' + feats.map(heroCard).join('') + '</div>' +
      '</section>';
  }

  /* 核心方案卡片 */
  function heroCard(p) {
    var c = catById(p.cat);
    var color = c ? c.color : 'brand';
    var hl = (p.highlights || []).slice(0, 4).map(function (h) {
      return '<div class="ph-hl"><b>' + ui.esc(h.v) + '</b><span>' + ui.esc(h.k) + '</span></div>';
    }).join('');
    var feats = (p.features || []).slice(0, 4).map(function (f) {
      return '<li>' + ui.icon('check', 15) + ui.esc(f) + '</li>';
    }).join('');
    return '' +
      '<div class="card prod-hero-card">' +
        '<div class="ph-banner ph-' + color + '">' +
          '<div class="ph-icon">' + ui.icon(c ? c.icon : 'globe', 26) + '</div>' +
          (p.role ? '<span class="ph-role">' + ui.esc(p.role) + '</span>' : '') +
        '</div>' +
        '<h3 class="ph-name">' + ui.esc(p.name) + '</h3>' +
        '<p class="ph-tag">' + ui.esc(p.tagline) + '</p>' +
        '<div class="ph-hls">' + hl + '</div>' +
        '<ul class="ph-feats">' + feats + '</ul>' +
        '<div class="ph-foot">' +
          '<span class="pm-tag">' + ui.esc(modelName(p.pricingModel)) + '</span>' +
          '<div class="prod-card-btns">' +
            '<a class="btn btn-sm btn-ghost" href="#/products/' + p.id + '">详情</a>' +
            '<a class="btn btn-sm btn-primary" href="#/products/calc/' + p.id + '">' + ui.icon('coin', 15) + '试算</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* 普通产品卡 */
  function prodCard(p) {
    var c = catById(p.cat);
    var hl = (p.highlights || []).slice(0, 3).map(function (h) {
      return '<div class="pc-hl"><b>' + ui.esc(h.v) + '</b><span>' + ui.esc(h.k) + '</span></div>';
    }).join('');
    return '' +
      '<div class="card prod-card">' +
        '<div class="prod-card-top">' +
          '<div class="prod-icon" style="color:var(--' + (c ? c.color : 'brand') + ')">' + ui.icon(c ? c.icon : 'globe', 22) + '</div>' +
          (p.hot ? '<span class="c-badge">' + ui.icon('flame', 13) + '热门</span>' : '') +
          (p.flagship ? '<span class="c-badge">旗舰</span>' : '') +
        '</div>' +
        '<h3 class="prod-name">' + ui.esc(p.name) + '</h3>' +
        '<p class="prod-tag">' + ui.esc(p.tagline) + '</p>' +
        '<div class="pc-hls">' + hl + '</div>' +
        '<div class="prod-card-foot">' +
          '<span class="pm-tag">' + ui.esc(modelName(p.pricingModel)) + '</span>' +
          '<div class="prod-card-btns">' +
            '<a class="btn btn-sm btn-ghost" href="#/products/' + p.id + '">详情</a>' +
            '<a class="btn btn-sm btn-primary" href="#/products/calc/' + p.id + '">' + ui.icon('coin', 15) + '试算</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function filter(e) {
    currentCat = e.getAttribute('data-cat');
    list();
  }

  /* ---------- 详情 ---------- */
  function openDetail(id) {
    var p = prodById(id); if (!p) { App.shell.setContent('<div class="empty">产品不存在</div>', '产品'); return; }
    var c = catById(p.cat);
    var solves = (p.solves || []).map(function (s) { return '<li>' + ui.esc(s) + '</li>'; }).join('');
    var feats = (p.features || []).map(function (f) { return '<li>' + ui.icon('check', 16) + ui.esc(f) + '</li>'; }).join('');
    var hls = '<div class="pd-hls">' + (p.highlights || []).map(function (h) {
      return '<div class="pd-hl">' +
        '<div class="pd-hl-k">' + ui.esc(h.k) + '</div>' +
        '<div class="pd-hl-v">' + ui.esc(h.v) + '</div>' +
        '<div class="pd-hl-d">核心指标</div></div>';
    }).join('') + '</div>';
    var scen = (p.scenarios || []).map(function (s) { return ui.tag(s, 'default'); }).join('');

    // 套餐对比
    var plansHtml = '';
    if (p.plans) {
      plansHtml = '<div class="plan-row">' + p.plans.map(function (pl) {
        return '' +
          '<div class="plan-col' + (pl.hot ? ' hot' : '') + '">' +
            (pl.hot ? '<div class="plan-flag">推荐</div>' : '') +
            '<div class="plan-name">' + ui.esc(pl.name) + '</div>' +
            '<div class="plan-price">' + ui.money(pl.basePrice) + '<span>/' + ui.esc(pl.unit) + '</span></div>' +
            '<p class="plan-desc">' + ui.esc(pl.desc) + '</p>' +
            '<div class="plan-list"><div class="plan-list-h">包含</div>' + (pl.includes || []).map(function (x) { return '<div class="plan-inc">' + ui.icon('check', 14) + ui.esc(x) + '</div>'; }).join('') + '</div>' +
            (pl.excludes && pl.excludes.length ? '<div class="plan-list"><div class="plan-list-h">不含</div>' + pl.excludes.map(function (x) { return '<div class="plan-exc">' + ui.icon('x', 14) + ui.esc(x) + '</div>'; }).join('') + '</div>' : '') +
          '</div>';
      }).join('') + '</div>';
    }

    var html = '' +
      '<a class="lnk-back" href="#/products">' + ui.icon('arrowl', 16) + '返回产品列表</a>' +
      '<div class="prod-detail">' +
        '<div class="pd-head">' +
          '<div class="prod-icon lg" style="color:var(--' + (c ? c.color : 'brand') + ')">' + ui.icon(c ? c.icon : 'globe', 30) + '</div>' +
          '<div class="pd-head-txt">' +
            '<div class="pd-title-row">' +
              '<h1 class="page-title">' + ui.esc(p.name) + '</h1>' +
              (c ? '<span class="tag tag-' + (c.color === 'brand' ? 'brand' : c.color) + '">' + ui.esc(c.name) + '</span>' : '') +
            '</div>' +
            '<p class="page-sub">' + ui.esc(p.tagline) + '</p>' +
          '</div>' +
          '<div class="pd-head-actions">' +
            '<a class="btn btn-primary" href="#/products/calc/' + p.id + '">' + ui.icon('coin', 18) + '<span>计价试算</span></a>' +
          '</div>' +
        '</div>' +
      '<div class="card"><div class="card-body"><p class="pd-summary">' + ui.esc(p.summary) + '</p></div></div>' +
      hls +
        '<div class="grid g2">' +
          '<div class="card"><div class="card-head">' + ui.icon('target', 18) + '解决什么痛点</div><div class="card-body"><ul class="pd-solves">' + solves + '</ul></div></div>' +
          '<div class="card"><div class="card-head">' + ui.icon('layers', 18) + '核心特性</div><div class="card-body"><ul class="pd-feats">' + feats + '</ul></div></div>' +
        '</div>' +
        (p.plans ? '<section class="sec"><div class="sec-head"><h2>套餐对比</h2><span class="pm-tag">' + ui.esc(modelName(p.pricingModel)) + '</span></div>' + plansHtml + '</section>' : '') +
        '<section class="sec"><div class="sec-head"><h2>适用场景</h2></div><div class="tags-wrap">' + scen + '</div></section>' +
      '</div>';

    App.shell.setContent(html, p.name);
  }

  /* ---------- 计价试算 ---------- */
  function openCalc(id) {
    var p = prodById(id); if (!p) { App.shell.setContent('<div class="empty">产品不存在</div>', '试算'); return; }
    var c = catById(p.cat);

    var controls = '';
    if (p.pricingModel === 'tier') {
      var planRadios = p.plans.map(function (pl, i) {
        return '<label class="calc-opt' + (pl.hot ? ' hot' : '') + '"><input type="radio" name="plan" value="' + pl.id + '"' + (i === 0 ? ' checked' : '') + '><span class="calc-opt-name">' + ui.esc(pl.name) + '</span><span class="calc-opt-sub">' + ui.money(pl.basePrice) + '/' + ui.esc(pl.unit) + '</span></label>';
      }).join('');
      controls =
        '<div class="field"><label>选择套餐</label><div class="calc-opts">' + planRadios + '</div></div>' +
        '<div class="field"><label>' + ui.esc(p.unitLabel) + '数量</label><input class="input" id="qty" type="number" min="1" value="' + (p.unitLabel === '项目' ? 1 : 20) + '"></div>' +
        termSelect();
    } else if (p.pricingModel === 'usage') {
      var addons = (p.addons || []).map(function (a) {
        return '<label class="calc-addon"><input type="checkbox" name="addon" value="' + a.id + '"><span>' + ui.esc(a.name) + '（+' + ui.money(a.price) + '/' + ui.esc(p.usageUnit.split('/')[0]) + '）</span></label>';
      }).join('');
      controls =
        '<div class="field"><label>' + ui.esc(p.unitLabel) + '数量</label><input class="input" id="qty" type="number" min="1" value="50"></div>' +
        termSelect() +
        (addons ? '<div class="field"><label>可选模块</label><div class="calc-addons">' + addons + '</div></div>' : '');
    } else if (p.pricingModel === 'hardware') {
      var modelOpts = p.hwModels.map(function (m) {
        return '<option value="' + m.id + '">' + ui.esc(m.name) + '（设备 ' + ui.money(m.price) + (m.yearly ? ' · 年费 ' + ui.money(m.yearly) : ' · 含质保') + '）</option>';
      }).join('');
      var levelOpts = p.serviceLevels.map(function (l) {
        return '<label class="calc-opt"><input type="radio" name="level" value="' + l.id + '"' + (l.rate === 1 ? ' checked' : '') + '><span class="calc-opt-name">' + ui.esc(l.name) + '</span><span class="calc-opt-sub">×' + l.rate + '</span></label>';
      }).join('');
      controls =
        '<div class="field"><label>设备型号</label><select class="select" id="model">' + modelOpts + '</select></div>' +
        '<div class="field"><label>设备数量</label><input class="input" id="qty" type="number" min="1" value="10"></div>' +
        '<div class="field"><label>服务等级（SLA）</label><div class="calc-opts">' + levelOpts + '</div></div>' +
        termSelect();
    }

    var modelNote = p.pricingModel === 'usage'
      ? '数量阶梯：整单统一单价（取包含数量所在档的单价，非分段累加）。'
      : p.pricingModel === 'tier'
        ? '套餐单价 × 数量 × 规模折扣 × 年限折扣 × 12 = 年费。'
        : '设备本体一次性采购 + 年费 × 服务等级系数。CPE 含 3 年质保，年费为 0。';

    var html = '' +
      '<a class="lnk-back" href="#/products/' + p.id + '">' + ui.icon('arrowl', 16) + '返回产品详情</a>' +
      '<div class="calc-layout">' +
        '<div class="card calc-panel">' +
          '<div class="card-head">' + ui.icon('coin', 18) + '计价试算 · ' + ui.esc(p.name) + '</div>' +
          '<div class="card-body">' +
            '<div class="calc-model"><span class="pm-tag">' + ui.esc(modelName(p.pricingModel)) + '</span><span class="calc-note">' + ui.esc(modelNote) + '</span></div>' +
            controls +
          '</div>' +
        '</div>' +
        '<div class="card calc-result" id="calc-result"><div class="calc-loading-ui"><div class="c-loader"><div class="ring"></div><div class="ring"></div><div class="ring"></div><div class="ring"></div><div class="ring"></div><div class="lab">测算中</div></div><div class="calc-loading-hint">依据左侧配置实时出价…</div></div></div>' +
      '</div>';

    App.shell.setContent(html, '计价试算 · ' + p.name);
    var box = document.getElementById('calc-result');
    var panel = document.querySelector('.calc-panel');
    if (panel) {
      panel.addEventListener('input', function () { recompute(p); });
      panel.addEventListener('change', function () { recompute(p); });
    }
    // 先展示品牌涟漪加载动画，再出价（让 c-loader 真正可见）
    setTimeout(function () { recompute(p); }, 320);
  }

  function termSelect() {
    return '<div class="field"><label>签约年限</label><select class="select" id="years"><option value="1">1 年</option><option value="2">2 年（92 折）</option><option value="3">3 年（85 折）</option></select></div>';
  }

  function getVal(id, def) {
    var el = document.getElementById(id);
    if (!el) return def;
    var v = parseFloat(el.value);
    return isNaN(v) ? def : v;
  }

  function recompute(p) {
    var box = document.getElementById('calc-result');
    if (!box) return;
    var cfg = {};
    if (p.pricingModel === 'tier') {
      var pl = document.querySelector('input[name="plan"]:checked');
      cfg = { planId: pl ? pl.value : p.plans[0].id, qty: getVal('qty', 20), years: getVal('years', 1) };
    } else if (p.pricingModel === 'usage') {
      var adds = Array.prototype.slice.call(document.querySelectorAll('input[name="addon"]:checked')).map(function (i) { return i.value; });
      cfg = { qty: getVal('qty', 50), years: getVal('years', 1), addons: adds };
    } else if (p.pricingModel === 'hardware') {
      var mdl = document.getElementById('model');
      var lvl = document.querySelector('input[name="level"]:checked');
      cfg = { modelId: mdl ? mdl.value : p.hwModels[0].id, count: getVal('qty', 10), levelId: lvl ? lvl.value : p.serviceLevels[0].id, years: getVal('years', 1) };
    }
    var r = App.pricing.calc(p.id, cfg);
    if (!r) { box.innerHTML = '<div class="calc-loading">无法计算</div>'; return; }

    var lines = r.lines.map(function (ln) {
      var amt = ln.amount === 0 ? '<span class="calc-zero">含</span>' : (ln.amount > 0 ? '+' : '−') + ui.money(Math.abs(ln.amount));
      var cls = ln.amount < 0 ? 'neg' : (ln.amount === 0 ? 'zero' : '');
      return '<div class="calc-line"><span class="cl-label">' + ui.esc(ln.label) + '<i>' + ui.esc(ln.detail || '') + '</i></span><span class="cl-amt ' + cls + '">' + amt + '</span></div>';
    }).join('');

    box.innerHTML = '' +
      '<div class="card-head">' + ui.icon('file', 18) + '费用测算（税前）</div>' +
      '<div class="card-body">' +
        lines +
        '<div class="calc-totals">' +
          (r.onetime ? '<div class="ct-row"><span>一次性采购</span><b>' + ui.money(r.onetime) + '</b></div>' : '') +
          '<div class="ct-row"><span>年费（' + r.years + ' 年）</span><b>' + ui.money(r.annual) + ' / 年</b></div>' +
          '<div class="ct-row ct-grand"><span>合计（' + r.years + ' 年）</span><b>' + ui.money(r.total) + '</b></div>' +
        '</div>' +
        '<div class="calc-disclaimer">演示测算，实际以正式报价单为准。可前往「一键推介」生成可打印报价单。</div>' +
      '</div>';
  }

  return { render: render, filter: filter, openDetail: openDetail, openCalc: openCalc };
})();
window.Products = Products;

App.defineNav({ path: 'products', title: '产品与价目', icon: 'grid', roles: ['all'], view: Products.render });
