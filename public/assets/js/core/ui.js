/* UI 工具：DOM 辅助、SVG 图标库、toast、modal、金额格式化 */
window.App = window.App || {};

App.ui = (function () {

  /* ---------- 图标库（线性，stroke=currentColor） ---------- */
  var ICONS = {
    book:   '<path d="M12 6c-1.5-1.2-3-2-5-2H4v15h3c2 0 3.5.8 5 2 1.5-1.2 3-2 5-2h3V4h-3c-2 0-3.5.8-5 2z"/><path d="M12 6v15"/>',
    grid:   '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    recommend: '<path d="M5 19l8-8"/><path d="M14 4l.9 2.3L17 7l-2.1.9L14 10l-.9-2.1L11 7l2.1-.7z"/><path d="M4 20l9-9"/>',
    crm:    '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
    cart:   '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.5 12h11l2-8H6"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    chart:  '<path d="M4 20V13M9 20V4M14 20v-8M19 20v-5"/><path d="M3 20h18"/>',
    gear:   '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    star:   '<path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9z"/>',
    check:  '<path d="M5 12l5 5L20 6"/>',
    clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    users:  '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.6M17 14.5a5.5 5.5 0 0 1 3.5 5.5"/>',
    file:   '<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/>',
    download:'<path d="M12 3v12M7 11l5 5 5-5M4 21h16"/>',
    print:  '<path d="M7 8V3h10v5M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/>',
    arrow:  '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowl: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    menu:   '<path d="M3 6h18M3 12h18M3 18h18"/>',
    bell:   '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0"/>',
    chevron:'<path d="M6 9l6 6 6-6"/>',
    x:      '<path d="M6 6l12 12M18 6L6 18"/>',
    plus:   '<path d="M12 5v14M5 12h14"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 12H3M7 8l-4 4 4 4"/>',
    eye:    '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    mail:   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    phone:  '<path d="M4 5a1 1 0 0 1 1-1h2l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v2a1 1 0 0 1-1 1A17 17 0 0 1 3 6a1 1 0 0 1 1-1z"/>',
    building:'<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
    trend:  '<path d="M3 17l6-6 4 4 8-8M21 7v5M21 7h-5"/>',
    alert:  '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    lock:   '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    cloud:  '<path d="M7 18a4 4 0 0 1-.5-8A5 5 0 0 1 16 8a4.5 4.5 0 0 1 1 9z"/>',
    network:'<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5v4M10.3 12l-3.8 4M13.7 12l3.8 4"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    award:  '<circle cx="12" cy="9" r="6"/><path d="M9 14l-2 7 5-3 5 3-2-7"/>',
    edit:   '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    send:   '<path d="M4 12l16-8-6 16-3-7z"/>',
    globe:  '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    cpu:    '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/><rect x="10" y="10" width="4" height="4" rx="1"/>',
    wrench: '<path d="M14 7a4 4 0 0 1-5 5L4 17l3 3 5-5a4 4 0 0 1 5-5l-2.5 2.5L11 11l-1.5-2.5z"/>',
    spark:  '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    play:   '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>',
    bulb:   '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.9c-.6.5-1 1.3-1 2.1H9.5c0-.8-.4-1.6-1-2.1A6 6 0 0 1 12 3z"/>',
    flame:  '<path d="M12 3c1 3-1 4-1 6a3 3 0 0 0 6 0c0 4-3 6-3 6s5 2 5 8a6 6 0 0 1-12 0c0-5 5-7 5-11 0-2-1-4 0-9z"/>',
    map:    '<path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    calendar:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    coin:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5a2.5 2 0 0 1 5 0c0 2-5 1.5-5 3.5a2.5 2 0 0 0 5 0"/>',
    doc:    '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12h6M10 16h6"/>',
    chat:   '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    scale:  '<path d="M12 3v18M5 21h14M7 7l-3 6h6zM17 7l-3 6h6z"/>',
    bolt:   '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
    flag:   '<path d="M5 21V4h11l-2 4 2 4H5"/>',
    checkc: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    dots:   '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    refresh:'<path d="M20 11a8 8 0 0 0-14-4M4 13a8 8 0 0 0 14 4"/><path d="M20 5v6h-6M4 19v-6h6"/>'
  };

  function icon(name, size) {
    size = size || 20;
    var body = ICONS[name] || ICONS.dot;
    return '<svg class="ico" viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      body + '</svg>';
  }

  /* ---------- 文本工具 ---------- */
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function money(n, withSymbol) {
    var sign = withSymbol === false ? '' : '¥';
    var v = Math.round(Number(n) || 0);
    return sign + v.toLocaleString('zh-CN');
  }

  function avatar(name) {
    if (!name) return '?';
    return esc(String(name).slice(0, 1));
  }

  /* ---------- 小部件 ---------- */
  function tag(text, type) {
    type = type || 'default';
    return '<span class="tag tag-' + type + '">' + esc(text) + '</span>';
  }

  function statCard(opts) {
    return '' +
      '<div class="stat">' +
        (opts.icon ? '<div class="stat-ico" style="color:var(--' + (opts.color || 'brand') + ')">' + icon(opts.icon, 22) + '</div>' : '') +
        '<div class="stat-body">' +
          '<div class="stat-val' + (opts.big ? ' big' : '') + '">' + opts.val + '</div>' +
          '<div class="stat-label">' + esc(opts.label) + '</div>' +
        '</div>' +
      '</div>';
  }

  function pageHead(title, subtitle, actions) {
    return '' +
      '<div class="page-head">' +
        '<div class="page-head-main">' +
          '<h1 class="page-title">' + esc(title) + '</h1>' +
          (subtitle ? '<p class="page-sub">' + esc(subtitle) + '</p>' : '') +
        '</div>' +
        (actions ? '<div class="page-head-actions">' + actions + '</div>' : '') +
      '</div>';
  }

  function btn(label, opts) {
    opts = opts || {};
    var cls = 'btn ' + (opts.kind ? 'btn-' + opts.kind : 'btn-primary');
    if (opts.ghost) cls += ' btn-ghost';
    if (opts.sm) cls += ' btn-sm';
    if (opts.block) cls += ' btn-block';
    var ico = opts.icon ? icon(opts.icon, opts.iconSize || 18) : '';
    var attr = opts.onclick ? ' data-onclick="' + esc(opts.onclick) + '"' : '';
    return '<button class="' + cls + '"' + attr + '>' + ico + '<span>' + esc(label) + '</span></button>';
  }

  /* ---------- toast ---------- */
  function toast(msg, type) {
    var box = document.getElementById('toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast-box';
      box.className = 'toast-box';
      document.body.appendChild(box);
    }
    var t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    t.innerHTML = (type === 'success' ? icon('checkc', 18) : type === 'error' ? icon('alert', 18) : type === 'warn' ? icon('alert', 18) : icon('bell', 18)) + '<span>' + esc(msg) + '</span>';
    box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 2600);
  }

  /* ---------- modal ---------- */
  function modal(html, opts) {
    opts = opts || {};
    var back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML =
      '<div class="modal ' + (opts.size ? 'modal-' + opts.size : '') + '">' +
        (opts.title !== false ? '<div class="modal-head"><span>' + esc(opts.title || '') + '</span><button class="modal-x" data-close>' + icon('x', 18) + '</button></div>' : '') +
        '<div class="modal-body">' + html + '</div>' +
      '</div>';
    document.body.appendChild(back);
    requestAnimationFrame(function () { back.classList.add('show'); });
    function close() {
      back.classList.remove('show');
      setTimeout(function () { if (back.parentNode) back.parentNode.removeChild(back); }, 250);
    }
    back.addEventListener('click', function (e) {
      if (e.target === back || e.target.hasAttribute('data-close')) close();
    });
    return { close: close, el: back };
  }

  /* 事件委托：带 data-onclick 的元素（避免内联脚本在 file:// 下被 CSP 拦截）
     支持命名空间，如 data-onclick="Learn.openCourse" */
  function bindDelegation(root) {
    root = root || document;
    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-onclick]');
      if (!el) return;
      var fnName = el.getAttribute('data-onclick');
      if (!fnName) return;
      var parts = fnName.split('.');
      var fn = window;
      for (var i = 0; i < parts.length; i++) {
        if (fn == null) break;
        fn = fn[parts[i]];
      }
      if (typeof fn === 'function') {
        try { fn.call(el, el); } catch (err) { console.error(err); }
      }
    });
  }

  return {
    icon: icon, esc: esc, money: money, avatar: avatar, tag: tag,
    statCard: statCard, pageHead: pageHead, btn: btn,
    toast: toast, modal: modal, bindDelegation: bindDelegation
  };
})();
