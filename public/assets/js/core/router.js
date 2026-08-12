/* 路由 + 应用外壳（侧边栏 / 顶栏 / 内容区）+ 角色菜单 */
window.App = window.App || {};

App.nav = [];
App.defineNav = function (item) { App.nav.push(item); };

App.shell = (function () {
  var mounted = false;

  function user() { return App.store.user(); }

  function navItems(user) {
    return App.nav.filter(function (n) {
      return !n.roles || n.roles.indexOf('all') >= 0 || (user && n.roles.indexOf(user.role) >= 0);
    });
  }

  function buildSidebar(user) {
    var items = navItems(user);
    var brand = DB.company || { name: 'OgCloud', cnName: '' };
    var menu = items.map(function (n) {
      return '<a class="nav-item" data-path="' + n.path + '" href="#/' + n.path + '">' +
        '<span class="nav-ico">' + App.ui.icon(n.icon, 20) + '</span>' +
        '<span class="nav-txt">' + App.ui.esc(n.title) + '</span>' +
        (n.badge ? '<span class="nav-badge">' + n.badge + '</span>' : '') +
        '</a>';
    }).join('');
    return '' +
      '<div class="side-brand">' +
        '<div class="brand-mark">' + App.ui.icon('globe', 22) + '</div>' +
        '<div class="brand-txt"><b>' + App.ui.esc(brand.name) + '</b><span>赋能平台</span></div>' +
      '</div>' +
      '<div class="side-sec">主菜单</div>' +
      '<nav class="side-nav">' + menu + '</nav>' +
      '<div class="side-foot">' +
        '<div class="side-tip">内部赋能 · 演示数据</div>' +
        '<div class="side-ver">v0.1 prototype</div>' +
      '</div>';
  }

  function buildTopbar(user) {
    var u = user;
    var role = (DB.roles && DB.roles[u.role]) || { name: u.role };
    return '' +
      '<button class="tb-menu" data-onclick="App.shell.openDrawer">' + App.ui.icon('menu', 22) + '</button>' +
      '<div class="tb-title" id="tb-title"></div>' +
      '<div class="tb-spacer"></div>' +
      '<button class="tb-icon" data-onclick="App.ui.toast(\'暂无新消息\',\'info\')" title="通知">' + App.ui.icon('bell', 20) + '<span class="dot"></span></button>' +
      '<div class="tb-user" data-onclick="App.shell.toggleUserMenu">' +
        '<span class="ava">' + App.ui.avatar(u.name) + '</span>' +
        '<span class="tb-user-txt"><b>' + App.ui.esc(u.name) + '</b><i>' + App.ui.esc(role.name) + ' · ' + App.ui.esc(u.region || '') + '</i></span>' +
        '<span class="tb-caret">' + App.ui.icon('chevron', 16) + '</span>' +
        '<div class="user-menu" id="user-menu">' +
          '<div class="um-head"><b>' + App.ui.esc(u.name) + '</b><span>' + App.ui.esc(u.title || '') + '</span></div>' +
          '<div class="um-sec">切换角色（演示）</div>' +
          Object.keys(DB.roles).map(function (rid) {
            var r = DB.roles[rid];
            return '<button class="um-item' + (rid === u.role ? ' on' : '') + '" data-onclick="App.shell.switchRole" data-role="' + rid + '">' +
              '<span class="um-ico" style="color:var(--' + r.color + ')">' + App.ui.icon(r.icon, 18) + '</span>' +
              '<span>' + App.ui.esc(r.name) + '</span><span class="um-d">' + App.ui.esc(r.desc) + '</span></button>';
          }).join('') +
          '<button class="um-item um-logout" data-onclick="App.shell.logout">' + App.ui.icon('logout', 18) + '<span>退出登录</span></button>' +
        '</div>' +
      '</div>';
  }

  function mount() {
    if (mounted) return;
    var u = user();
    document.body.innerHTML =
      '<div class="shell" id="shell">' +
        '<aside class="sidebar" id="sidebar"></aside>' +
        '<div class="scrim" id="scrim" data-onclick="App.shell.closeDrawer"></div>' +
        '<div class="main">' +
          '<header class="topbar" id="topbar"></header>' +
          '<main class="content" id="content"></main>' +
        '</div>' +
      '</div>';
    document.getElementById('sidebar').innerHTML = buildSidebar(u);
    document.getElementById('topbar').innerHTML = buildTopbar(u);
    mounted = true;
  }

  function setActive(path) {
    var items = document.querySelectorAll('.nav-item');
    items.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-path') === path);
    });
  }

  function setContent(html, title) {
    var c = document.getElementById('content');
    c.innerHTML = html;
    c.scrollTop = 0;
    window.scrollTo(0, 0);
    var t = document.getElementById('tb-title');
    if (t && title) t.textContent = title;
    // 关闭移动端抽屉
    closeDrawer();
  }

  function openDrawer() { document.getElementById('sidebar').classList.add('open'); document.getElementById('scrim').classList.add('show'); }
  function closeDrawer() {
    var s = document.getElementById('sidebar'); if (s) s.classList.remove('open');
    var sc = document.getElementById('scrim'); if (sc) sc.classList.remove('show');
  }
  function toggleUserMenu() {
    var m = document.getElementById('user-menu');
    if (m) m.classList.toggle('show');
  }

  function switchRole(e) {
    var rid = e.getAttribute('data-role');
    var nu = DB.defaultUserForRole(rid);
    App.store.setUser(nu);
    // 重建外壳
    document.getElementById('sidebar').innerHTML = buildSidebar(nu);
    document.getElementById('topbar').innerHTML = buildTopbar(nu);
    var m = document.getElementById('user-menu'); if (m) m.classList.remove('show');
    App.ui.toast('已切换为「' + (DB.roles[rid] ? DB.roles[rid].name : rid) + '」视图', 'success');
    // 重新渲染当前路由
    App.router.dispatch();
  }

  function logout() {
    App.store.logout();
    location.href = 'index.html';
  }

  return {
    mount: mount, setActive: setActive, setContent: setContent,
    openDrawer: openDrawer, closeDrawer: closeDrawer, toggleUserMenu: toggleUserMenu,
    switchRole: switchRole, logout: logout, buildSidebar: buildSidebar, buildTopbar: buildTopbar
  };
})();

App.router = (function () {
  function parse() {
    var h = location.hash.replace(/^#\/?/, '');
    return h.split('/').filter(Boolean);
  }
  function dispatch() {
    var u = App.store.user();
    if (!u) { location.href = 'index.html'; return; }
    if (!document.getElementById('shell')) App.shell.mount();
    var parts = parse();
    var path = parts[0] || 'learn';
    var route = null;
    for (var i = 0; i < App.nav.length; i++) if (App.nav[i].path === path) { route = App.nav[i]; break; }
    if (!route) route = App.nav[0];
    App.shell.setActive(route.path);
    // 调用视图渲染函数
    if (route.view && typeof route.view === 'function') {
      try { route.view(parts.slice(1)); }
      catch (err) { console.error(err); document.getElementById('content').innerHTML = '<div class="empty">页面渲染出错：' + App.ui.esc(err.message) + '</div>'; }
    } else {
      document.getElementById('content').innerHTML = '<div class="empty">模块未实现</div>';
    }
  }
  function start() {
    App.ui.bindDelegation(document);
    window.addEventListener('hashchange', dispatch);
    dispatch();
  }
  return { dispatch: dispatch, start: start, parse: parse };
})();
