/* 三种计价引擎
   tier     — 套餐分层 × 数量 × 规模折扣 × 年限折扣（年费制）
   usage    — 按数量阶梯（整单统一单价，非分段）× 年限折扣 + 可选模块
   hardware — 设备本体一次性 + 年度服务费 × SLA 系数 */
window.App = window.App || {};

App.pricing = (function () {

  function find(arr, id) {
    if (!arr) return null;
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }
  function money(n) { return App.ui.money(n); }

  /* 规模折扣系数 */
  function volRate(tiers, qty) {
    if (!tiers) return 1;
    for (var i = 0; i < tiers.length; i++) {
      if (qty >= tiers[i].min && qty <= tiers[i].max) return tiers[i].rate;
    }
    return 1;
  }
  /* 整单统一阶梯单价（取包含 qty 的档） */
  function tierPrice(tiers, qty) {
    if (!tiers) return 0;
    for (var i = 0; i < tiers.length; i++) {
      if (qty >= tiers[i].min && qty <= tiers[i].max) return tiers[i].price;
    }
    return tiers[tiers.length - 1].price;
  }

  /* tier 引擎 */
  function calcTier(p, cfg) {
    var plan = find(p.plans, cfg.planId); if (!plan) return null;
    var qty = cfg.qty || 1, years = cfg.years || 1;
    var vol = volRate(p.volumeTiers, qty);
    var td = (p.termDiscount && p.termDiscount[years]) || 1;
    var gross = plan.basePrice * qty;
    var afterVol = gross * vol;
    var afterTerm = afterVol * td;
    var annual = afterTerm * 12;
    var total = annual * years;
    var lines = [];
    lines.push({ label: plan.name + ' 月费', detail: money(plan.basePrice) + ' × ' + qty + ' ' + p.unitLabel, amount: gross });
    if (vol < 1) lines.push({ label: '规模折扣', detail: qty + ' ' + p.unitLabel + ' 适用 ×' + vol, amount: -(gross - afterVol) });
    if (td < 1) lines.push({ label: '签约 ' + years + ' 年折扣', detail: (((1 - td) * 100).toFixed(0)) + '% off', amount: -(afterVol - afterTerm) });
    lines.push({ label: '折后月费', detail: '税前 / 月', amount: afterTerm });
    return {
      model: 'tier', product: p, plan: plan, qty: qty, years: years,
      lines: lines, onetime: 0, annual: annual, total: total,
      unitLabel: p.unitLabel, unit: plan.unit
    };
  }

  /* usage 引擎 */
  function calcUsage(p, cfg) {
    var qty = cfg.qty || 1, years = cfg.years || 1;
    var unit = tierPrice(p.usageTiers, qty);
    var base = unit * qty;
    var td = (p.termDiscount && p.termDiscount[years]) || 1;
    var lines = [];
    lines.push({ label: '用量月费', detail: money(unit) + ' × ' + qty + ' ' + p.unitLabel + '（整单统一单价）', amount: base });
    var addonsMonthly = 0;
    (cfg.addons || []).forEach(function (aid) {
      var a = find(p.addons, aid); if (!a) return;
      var amt = a.price * qty;
      addonsMonthly += amt;
      lines.push({ label: '模块 · ' + a.name, detail: money(a.price) + ' × ' + qty + ' ' + p.unitLabel, amount: amt });
    });
    var sub = (base + addonsMonthly) * td;
    if (td < 1) lines.push({ label: '签约 ' + years + ' 年折扣', detail: (((1 - td) * 100).toFixed(0)) + '% off', amount: -((base + addonsMonthly) - sub) });
    lines.push({ label: '折后月费', detail: '税前 / 月', amount: sub });
    var annual = sub * 12, total = annual * years;
    return {
      model: 'usage', product: p, qty: qty, years: years,
      lines: lines, onetime: 0, annual: annual, total: total,
      unitLabel: p.unitLabel, unit: p.usageUnit
    };
  }

  /* hardware 引擎 */
  function calcHardware(p, cfg) {
    var m = find(p.hwModels, cfg.modelId); if (!m) return null;
    var count = cfg.count || 1, level = find(p.serviceLevels, cfg.levelId) || p.serviceLevels[0];
    var years = cfg.years || 1;
    var onetime = m.price * count;
    var annual = m.yearly * count * level.rate;
    var lines = [];
    lines.push({ label: '设备一次性采购', detail: money(m.price) + ' × ' + count + ' 台（' + m.spec + '）', amount: onetime });
    if (m.yearly > 0) {
      lines.push({ label: '年度服务费 · ' + level.name, detail: money(m.yearly) + ' × ' + count + ' 台 × ×' + level.rate, amount: annual });
    } else {
      lines.push({ label: '年度服务费', detail: '本型号含 ' + (m.yearly === 0 ? '3 年质保，无需年费' : '年费'), amount: 0 });
    }
    var total = onetime + annual * years;
    return {
      model: 'hardware', product: p, model: m, level: level, count: count, years: years,
      lines: lines, onetime: onetime, annual: annual, total: total,
      unitLabel: '台', unit: '一次性 + 年费'
    };
  }

  function calc(productId, cfg) {
    var p = null;
    (DB.products || []).forEach(function (x) { if (x.id === productId) p = x; });
    if (!p) return null;
    if (p.pricingModel === 'tier') return calcTier(p, cfg);
    if (p.pricingModel === 'usage') return calcUsage(p, cfg);
    if (p.pricingModel === 'hardware') return calcHardware(p, cfg);
    return null;
  }

  return { calc: calc, calcTier: calcTier, calcUsage: calcUsage, calcHardware: calcHardware, volRate: volRate, tierPrice: tierPrice };
})();
