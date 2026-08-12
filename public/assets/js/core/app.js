/* 应用启动引导 */
(function () {
  // 未登录则回到登录页
  if (!App.store.user()) {
    location.href = 'index.html';
    return;
  }
  App.router.start();
})();
