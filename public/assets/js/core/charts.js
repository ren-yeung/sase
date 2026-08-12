/* 手写 SVG 图表库（无外部依赖，断网可用）
   色彩用 CSS 变量名：var(--brand) / var(--accent) / var(--success) ... */
window.App = window.App || {};

App.charts = (function () {

  /* 横向柱状图
     items: [{label, value, color, sub}]  color 为 CSS 变量后缀，如 'brand' */
  function bar(items, opts) {
    opts = opts || {};
    var w = 560, rowH = opts.rowH || 46, padL = opts.padL || 130, padR = 70, gap = 12;
    var h = items.length * (rowH + gap) + 10;
    var max = Math.max.apply(null, items.map(function (i) { return i.value; })) || 1;
    var bars = '';
    items.forEach(function (it, i) {
      var y = i * (rowH + gap) + 6;
      var bw = Math.max(2, (it.value / max) * (w - padL - padR));
      var col = 'var(--' + (it.color || 'brand') + ')';
      bars +=
        '<text x="' + (padL - 12) + '" y="' + (y + rowH / 2) + '" text-anchor="end" class="c-label">' + App.ui.esc(it.label) + '</text>' +
        '<rect x="' + padL + '" y="' + y + '" width="' + (w - padL - padR) + '" height="' + rowH + '" rx="6" fill="var(--ink-100)"/>' +
        '<rect x="' + padL + '" y="' + y + '" width="' + bw + '" height="' + rowH + '" rx="6" fill="' + col + '"/>' +
        '<text x="' + (padL + bw + 8) + '" y="' + (y + rowH / 2) + '" class="c-val" fill="' + col + '">' + App.ui.esc(it.value) + (it.unit || '') + '</text>';
      if (it.sub) {
        bars += '<text x="' + (padL - 12) + '" y="' + (y + rowH / 2 + 14) + '" text-anchor="end" class="c-sub">' + App.ui.esc(it.sub) + '</text>';
      }
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" width="100%" preserveAspectRatio="xMinYMin meet" style="font-family:var(--font)">' + bars + '</svg>';
  }

  /* 环形进度图 */
  function ring(percent, opts) {
    opts = opts || {};
    var size = opts.size || 160;
    var sw = opts.sw || Math.max(4, Math.round(size / 10));
    var r = (size - sw) / 2, c = 2 * Math.PI * r;
    var p = Math.max(0, Math.min(100, percent));
    var off = c * (1 - p / 100);
    var col = 'var(--' + (opts.color || 'brand') + ')';
    var cx = size / 2;
    var fs = opts.fontSize || Math.max(12, Math.round(size * 0.26));
    var capFs = opts.capSize || Math.max(9, Math.round(size * 0.12));
    var capY = cx + fs * 0.45;
    return '' +
      '<svg class="chart chart-ring ring-' + size + '" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" data-size="' + size + '">' +
        '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="var(--ink-100)" stroke-width="' + sw + '"/>' +
        '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" ' +
          'stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>' +
        '<text x="' + cx + '" y="' + cx + '" text-anchor="middle" dominant-baseline="middle" class="ring-pct" fill="' + col + '" style="font-size:' + fs + 'px">' + p + (opts.suffix || '%') + '</text>' +
        (opts.center ? '<text x="' + cx + '" y="' + capY + '" text-anchor="middle" dominant-baseline="middle" class="ring-cap" style="font-size:' + capFs + 'px">' + App.ui.esc(opts.center) + '</text>' : '') +
      '</svg>';
  }

  /* 雷达图
     axes: [名称...]  values: [0-100...]  color 为 CSS 变量后缀 */
  function radar(axes, values, opts) {
    opts = opts || {};
    var size = opts.size || 260, cx = size / 2, cy = size / 2;
    var R = size / 2 - 38, n = axes.length, col = 'var(--' + (opts.color || 'brand') + ')';
    function pt(i, rad) {
      var ang = -Math.PI / 2 + i * (2 * Math.PI / n);
      return [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
    }
    var rings = '', grid = '', labels = '', poly = '';
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var pts = [];
      for (var i = 0; i < n; i++) { var p = pt(i, R * f); pts.push(p[0].toFixed(1) + ',' + p[1].toFixed(1)); }
      rings += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="var(--ink-200)" stroke-width="1"/>';
    });
    for (var i = 0; i < n; i++) {
      var edge = pt(i, R);
      grid += '<line x1="' + cx + '" y1="' + cy + '" x2="' + edge[0].toFixed(1) + '" y2="' + edge[1].toFixed(1) + '" stroke="var(--ink-200)" stroke-width="1"/>';
      var lp = pt(i, R + 18);
      labels += '<text x="' + lp[0].toFixed(1) + '" y="' + lp[1].toFixed(1) + '" text-anchor="middle" class="c-label" dominant-baseline="middle">' + App.ui.esc(axes[i]) + '</text>';
      var v = (values[i] || 0) / 100 * R;
      var vp = pt(i, v);
      poly += vp[0].toFixed(1) + ',' + vp[1].toFixed(1) + ' ';
    }
    return '' +
      '<svg class="chart" viewBox="0 0 ' + size + ' ' + size + '" width="100%" style="max-width:' + size + 'px;font-family:var(--font)">' +
        rings + grid +
        '<polygon points="' + poly.trim() + '" fill="' + col + '" fill-opacity="0.22" stroke="' + col + '" stroke-width="2"/>' +
        labels +
      '</svg>';
  }

  /* 漏斗图（背调评分 / 需求优先级）
     steps: [{label, value, color}]  value 代表宽度权重 */
  function funnel(steps, opts) {
    opts = opts || {};
    var w = 600, padT = 10, rowH = opts.rowH || 56, gap = 10;
    var h = steps.length * (rowH + gap) + padT;
    var max = Math.max.apply(null, steps.map(function (s) { return s.value; })) || 1;
    var shapes = '';
    steps.forEach(function (s, i) {
      var y = padT + i * (rowH + gap);
      var bw = (s.value / max) * (w - 160);
      var x0 = (w - bw) / 2;
      var col = 'var(--' + (s.color || 'brand') + ')';
      shapes +=
        '<rect x="' + x0.toFixed(1) + '" y="' + y + '" width="' + bw.toFixed(1) + '" height="' + rowH + '" rx="8" fill="' + col + '" opacity="' + (1 - i * 0.12) + '"/>' +
        '<text x="' + (x0 + 14) + '" y="' + (y + rowH / 2 - 4) + '" class="fn-label">' + App.ui.esc(s.label) + '</text>' +
        '<text x="' + (x0 + 14) + '" y="' + (y + rowH / 2 + 16) + '" class="fn-val">匹配度 ' + s.value + '%</text>' +
        '<text x="' + (w - 12) + '" y="' + (y + rowH / 2 + 5) + '" text-anchor="end" class="fn-rank">#' + (i + 1) + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" width="100%" style="font-family:var(--font)">' + shapes + '</svg>';
  }

  return { bar: bar, ring: ring, radar: radar, funnel: funnel };
})();
