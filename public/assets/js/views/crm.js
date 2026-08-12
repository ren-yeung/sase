/* CRM 四端版面（二期功能，当前为静态原型）
   按当前登录角色渲染不同看板：销售 / 售前 / 主管 / 管理员 */
window.App = window.App || {};

var CRM = (function () {
  var ui = App.ui;

  /* 模拟数据（二期接真实 CRM 时替换） */
  var DEALS = [
    { name: 'SD-WAN 300 站点', cust: '鲜享连锁', stage: '方案沟通', amount: 360, owner: '李昌任' },
    { name: '等保三级陪跑', cust: '恒锐装备', stage: '需求确认', amount: 88, owner: '王售前' },
    { name: '国际专线+多云互联', cust: '远洋数字', stage: '需求确认', amount: 45, owner: '李昌任' },
    { name: 'SD-WAN 旗舰 12 点位', cust: '康泰医疗', stage: '商务谈判', amount: 96, owner: '陈销售' },
    { name: 'MSP 标准包', cust: '鲜享连锁', stage: '初步接触', amount: 58, owner: '李昌任' },
    { name: '全球办公网络 8 站点', cust: '远洋数字', stage: '初步接触', amount: 52, owner: '李昌任' },
    { name: '硬件维保续保', cust: '康泰医疗', stage: '赢单', amount: 24, owner: '陈销售' }
  ];
  var STAGES = ['初步接触', '需求确认', '方案沟通', '商务谈判', '赢单'];
  var TEAM = [
    { name: '李昌任', deals: 12, amount: 680, rate: 0.71 },
    { name: '陈销售', deals: 9, amount: 520, rate: 0.63 },
    { name: '王售前', schemes: 14, amount: 430, rate: 0.82 },
    { name: '赵主管', deals: 0, amount: 1860, rate: 0.66 }
  ];
  var AUDIT = [
    { t: '08-11 09:12', who: '李昌任', a: '生成「鲜享连锁」背调报告' },
    { t: '08-11 08:40', who: '王售前', a: '生成「恒锐装备」推介方案' },
    { t: '08-10 17:05', who: '系统', a: '完成零基础结业测验（92 分）' },
    { t: '08-10 14:22', who: '陈销售', a: '查看「康泰医疗」产品价目' },
    { t: '08-09 11:30', who: '赵主管', a: '导出团队月度目标看板' }
  ];
  var POCS = [
    { cust: '恒锐装备', scope: 'MES 等保三级网络分区', status: '进行中', std: '延迟<30ms 丢包<0.1%' },
    { cust: '远洋数字', scope: '深圳→AWS 美西加速', status: '待启动', std: '提速 40% 以上' },
    { cust: '康泰医疗', scope: '远程会诊网络保障', status: '已完成', std: '零中断' }
  ];

  function mockHint() {
    return '<div class="mock-banner no-print">' + ui.icon('info', 16) + '二期功能 · 当前为静态版面原型，交互逻辑后续接入真实 CRM 系统</div>';
  }

  function render(parts) {
    var u = App.store.user();
    var role = u ? u.role : 'sales';
    if (role === 'pre') return boardPre();
    if (role === 'manager') return boardManager();
    if (role === 'admin') return boardAdmin();
    return boardSales();
  }

  /* ---------- 销售端 ---------- */
  function boardSales() {
    var u = App.store.user();
    var myDeals = DEALS.filter(function (d) { return d.owner === u.name; });
    var myAmt = myDeals.reduce(function (s, d) { return s + d.amount; }, 0);
    var stats = '' +
      '<div class="grid g4">' +
        ui.statCard({ icon: 'target', color: 'brand', val: myDeals.length, label: '在跟商机' }) +
        ui.statCard({ icon: 'coin', color: 'success', val: ui.money(myAmt) + '万', label: '管线金额' }) +
        ui.statCard({ icon: 'checkc', color: 'accent', val: '3', label: '本月赢单' }) +
        ui.statCard({ icon: 'users', color: 'purple', val: '4', label: '活跃客户' }) +
      '</div>';

    var kanban = '<div class="kanban">' + STAGES.map(function (st) {
      var cards = DEALS.filter(function (d) { return d.stage === st; }).map(function (d) {
        return '<div class="kb-card"><div class="kb-card-name">' + ui.esc(d.name) + '</div>' +
          '<div class="kb-card-meta">' + ui.esc(d.cust) + '</div>' +
          '<div class="kb-card-foot"><span class="kb-amt">' + ui.money(d.amount) + '万</span>' +
          '<a class="btn btn-xs btn-ghost" href="#/customer">背调</a></div></div>';
      }).join('') || '<div class="kb-empty">—</div>';
      return '<div class="kb-col"><div class="kb-col-head">' + ui.esc(st) + '<span class="kb-count">' + DEALS.filter(function (d) { return d.stage === st; }).length + '</span></div>' + cards + '</div>';
    }).join('') + '</div>';

    var quick = '' +
      '<div class="card"><div class="card-head">' + ui.icon('bolt', 18) + '快捷动作</div><div class="card-body quick-actions">' +
        '<a class="btn btn-primary" href="#/customer/new">新建客户背调</a>' +
        '<a class="btn btn-ghost" href="#/recommend">生成推介方案</a>' +
        '<a class="btn btn-ghost" href="#/products">查看产品价目</a>' +
        '<button class="btn btn-ghost" data-onclick="CRM.noop">新建商机' + ui.icon('lock', 14) + '</button>' +
      '</div></div>';

    var html = '' +
      ui.pageHead('销售工作台', '我的商机、管线与今日待办') +
      mockHint() + stats +
      '<section class="sec"><div class="sec-head"><h2>销售管线</h2></div>' + kanban + '</section>' +
      '<div class="grid g2"><section class="sec">' + '<div class="sec-head"><h2>今日待办</h2></div>' +
        '<ul class="todo-list"><li>' + ui.icon('clock', 15) + '联系鲜享连锁 IT 总监，预约 POC 站点<i class="todo-when">今天</i></li>' +
        '<li>' + ui.icon('clock', 15) + '跟进远洋数字国际专线报价<i class="todo-when">明天</i></li>' +
        '<li>' + ui.icon('clock', 15) + '提交康泰医疗方案书（打印版）<i class="todo-when">本周</i></li></ul></section>' + quick + '</div>';

    App.shell.setContent(html, '销售工作台');
  }

  /* ---------- 售前端 ---------- */
  function boardPre() {
    var pocCards = POCS.map(function (p) {
      var cls = p.status === '已完成' ? 'done' : p.status === '进行中' ? 'doing' : 'todo';
      return '<div class="card poc-card ' + cls + '"><div class="poc-head"><b>' + ui.esc(p.cust) + '</b><span class="tag tag-' + (cls === 'done' ? 'success' : cls === 'doing' ? 'brand' : 'default') + '">' + ui.esc(p.status) + '</span></div>' +
        '<div class="poc-scope">' + ui.esc(p.scope) + '</div><div class="poc-std">成功标准：' + ui.esc(p.std) + '</div></div>';
    }).join('');
    var qa = [
      { q: '客户问"SD-WAN 走公网安全吗"', a: '强调 100+ 自建 POP 与 90+ Tier1 直连骨干，非纯公网，支持国密与等保。' },
      { q: '客户问"和运营商比优势在哪"', a: '突出响应速度、统一运维看板、海外落地能力——运营商的结构性短板。' },
      { q: '客户要做 POC 选最差站点', a: '婉拒，改选 2-3 个代表性站点 + 总部，避免非我方问题背锅。' }
    ].map(function (x) { return '<div class="script-block"><div class="script-q">' + ui.icon('chat', 15) + ui.esc(x.q) + '</div><div class="script-a">' + ui.esc(x.a) + '</div></div>'; }).join('');

    var html = '' +
      ui.pageHead('售前工作台', '方案设计、POC 推进与技术答疑') +
      mockHint() +
      '<div class="grid g4">' +
        ui.statCard({ icon: 'doc', color: 'brand', val: '14', label: '在制方案' }) +
        ui.statCard({ icon: 'play', color: 'accent', val: '3', label: 'POC 进行中' }) +
        ui.statCard({ icon: 'checkc', color: 'success', val: '9', label: '已赢单方案' }) +
        ui.statCard({ icon: 'chat', color: 'purple', val: '26', label: '技术答疑' }) +
      '</div>' +
      '<section class="sec"><div class="sec-head"><h2>POC 推进看板</h2></div><div class="poc-grid">' + pocCards + '</div></section>' +
      '<section class="sec"><div class="sec-head"><h2>常见技术答疑</h2></div><div class="script-list">' + qa + '</div></section>';

    App.shell.setContent(html, '售前工作台');
  }

  /* ---------- 主管端 ---------- */
  function boardManager() {
    var board = TEAM.map(function (m, i) {
      return '<div class="leaderboard-row"><span class="lb-rank">' + (i + 1) + '</span>' +
        '<span class="lb-name">' + ui.esc(m.name) + '</span>' +
        '<span class="lb-amt">' + ui.money(m.amount) + '万</span>' +
        '<span class="lb-rate"><span class="bar"><span class="bar-fill" style="width:' + (m.rate * 100) + '%"></span></span>' + (m.rate * 100).toFixed(0) + '%</span></div>';
    }).join('');

    var cal = '<div class="mini-cal"><div class="mc-head">八月 2026</div><div class="mc-grid">' +
      ['一', '二', '三', '四', '五', '六', '日'].map(function (d) { return '<span class="mc-d">' + d + '</span>'; }).join('') +
      Array.from({ length: 35 }, function (_, i) {
        var day = i - 4; // 8/1 为周六，简单排布
        if (day < 1 || day > 31) return '<span class="mc-cell empty"></span>';
        var hot = (day === 11 || day === 15 || day === 25) ? ' hot' : '';
        return '<span class="mc-cell' + hot + '">' + day + (hot ? '<i></i>' : '') + '</span>';
      }).join('') + '</div></div>';

    var html = '' +
      ui.pageHead('主管驾驶舱', '团队目标、业绩排行与过程把控') +
      mockHint() +
      '<div class="grid g4">' +
        ui.statCard({ icon: 'target', color: 'brand', val: ui.money(1860) + '万', label: '团队管线' }) +
        ui.statCard({ icon: 'users', color: 'purple', val: '9', label: '团队成员' }) +
        ui.statCard({ icon: 'checkc', color: 'success', val: '62%', label: '赢单率' }) +
        ui.statCard({ icon: 'flag', color: 'accent', val: '78%', label: '目标完成' }) +
      '</div>' +
      '<div class="grid g2">' +
        '<section class="sec"><div class="sec-head"><h2>业绩排行榜</h2></div><div class="leaderboard">' + board + '</div></section>' +
        '<section class="sec"><div class="sec-head"><h2>八月关键节点</h2></div>' + cal + '</section>' +
      '</div>' +
      '<section class="sec"><div class="sec-head"><h2>团队管线总览</h2></div><div class="kanban">' + STAGES.map(function (st) {
        var cards = DEALS.filter(function (d) { return d.stage === st; }).map(function (d) {
          return '<div class="kb-card"><div class="kb-card-name">' + ui.esc(d.name) + '</div><div class="kb-card-meta">' + ui.esc(d.cust) + ' · ' + ui.esc(d.owner) + '</div><div class="kb-card-foot"><span class="kb-amt">' + ui.money(d.amount) + '万</span></div></div>';
        }).join('') || '<div class="kb-empty">—</div>';
        return '<div class="kb-col"><div class="kb-col-head">' + ui.esc(st) + '<span class="kb-count">' + DEALS.filter(function (d) { return d.stage === st; }).length + '</span></div>' + cards + '</div>';
      }).join('') + '</div></section>';

    App.shell.setContent(html, '主管驾驶舱');
  }

  /* ---------- 管理员端 ---------- */
  function boardAdmin() {
    var users = (DB.users || []).map(function (u) {
      var role = DB.roles[u.role];
      return '<tr><td><span class="ava sm">' + ui.avatar(u.name) + '</span> ' + ui.esc(u.name) + '</td><td>' + ui.esc(u.title) + '</td>' +
        '<td><span class="tag tag-' + (role ? role.color : 'brand') + '">' + ui.esc(role ? role.name : u.role) + '</span></td>' +
        '<td>' + ui.esc(u.region) + '</td><td>' + ui.esc(u.email) + '</td><td><button class="btn btn-xs btn-ghost" data-onclick="CRM.noop">编辑' + ui.icon('lock', 13) + '</button></td></tr>';
    }).join('');
    var audit = AUDIT.map(function (a) {
      return '<div class="audit-row"><span class="audit-t">' + ui.esc(a.t) + '</span><span class="audit-who">' + ui.esc(a.who) + '</span><span class="audit-a">' + ui.esc(a.a) + '</span></div>';
    }).join('');
    var mods = ['学习平台', '产品与价目', '客户背调', '一键推介', 'CRM'].map(function (m, i) {
      var on = i !== 4; // 演示：CRM 模块以「已停用」展示禁用态
      return '<div class="mod-row"><span class="mod-name">' + ui.esc(m) + '</span>' +
        '<label class="c-switch"><input type="checkbox"' + (on ? ' checked' : '') + '>' +
        '<span class="slider"><svg class="slider-icon" viewBox="0 0 32 32"><path fill="none" d="m4 16.5 8 8 16-16"></path></svg></span></label>' +
        '<span class="mod-state ' + (on ? 'on' : 'off') + '">' + (on ? '已启用' : '已停用') + '</span></div>';
    }).join('');

    var html = '' +
      ui.pageHead('平台管理', '用户权限、模块配置与操作审计') +
      mockHint() +
      '<div class="grid g4">' +
        ui.statCard({ icon: 'users', color: 'brand', val: '142', label: '平台用户' }) +
        ui.statCard({ icon: 'gear', color: 'warn', val: '4', label: '角色' }) +
        ui.statCard({ icon: 'grid', color: 'purple', val: '5', label: '功能模块' }) +
        ui.statCard({ icon: 'shield', color: 'success', val: '正常', label: '审计状态' }) +
      '</div>' +
      '<div class="grid g2">' +
        '<section class="sec"><div class="sec-head"><h2>用户与角色</h2></div><div class="card"><div class="card-body"><table class="tbl"><thead><tr><th>用户</th><th>职务</th><th>角色</th><th>区域</th><th>邮箱</th><th></th></tr></thead><tbody>' + users + '</tbody></table></div></div></section>' +
        '<section class="sec"><div class="sec-head"><h2>模块开关</h2></div><div class="card"><div class="card-body mod-list">' + mods + '</div></div></section>' +
      '</div>' +
      '<section class="sec"><div class="sec-head"><h2>操作审计日志</h2></div><div class="audit-list">' + audit + '</div></section>';

    App.shell.setContent(html, '平台管理');
  }

  function noop() { ui.toast('该操作为二期功能，当前为静态版面', 'info'); }

  return { render: render, noop: noop };
})();
window.CRM = CRM;

App.defineNav({ path: 'crm', title: 'CRM', icon: 'crm', roles: ['all'], view: CRM.render });
