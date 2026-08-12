/* 状态管理：localStorage 持久化
   存：当前登录用户/角色、学习进度、测验成绩、实战成绩、背调历史、推介方案 */
window.App = window.App || {};

App.store = (function () {
  var KEY = 'ogcloud_prototype_state_v1';

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  var state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  return {
    /* 通用 */
    get: function (k, def) { return state[k] !== undefined ? state[k] : def; },
    set: function (k, v) { state[k] = v; save(); },

    /* 登录态 */
    user: function () { return state.user || null; },
    setUser: function (u) { state.user = u; save(); },
    logout: function () { delete state.user; save(); },

    /* 学习进度 */
    learn: function () { return state.learn || {}; },
    setLessonDone: function (courseId, lessonId, opts) {
      state.learn = state.learn || {};
      state.learn[courseId] = state.learn[courseId] || { lessons: {}, quizzes: {}, sims: {} };
      var c = state.learn[courseId];
      if (opts && opts.lesson) {
        c.lessons[lessonId] = { done: true, at: Date.now() };
      }
      if (opts && opts.quiz !== undefined) {
        var prev = c.quizzes[lessonId];
        c.quizzes[lessonId] = { score: opts.quiz, pass: opts.pass, at: Date.now(),
          best: prev ? Math.max(prev.best || 0, opts.quiz) : opts.quiz };
      }
      if (opts && opts.sim !== undefined) {
        c.sims[lessonId] = { score: opts.sim, at: Date.now() };
      }
      save();
    },
    courseProgress: function (courseId) {
      var c = (state.learn || {})[courseId];
      return c || { lessons: {}, quizzes: {}, sims: {} };
    },

    /* 背调历史 */
    bcHistory: function () {
      state.bc = state.bc || { history: [] };
      return state.bc.history;
    },
    addBcRecord: function (rec) {
      state.bc = state.bc || { history: [] };
      rec.at = Date.now();
      state.bc.history.unshift(rec);
      state.bc.history = state.bc.history.slice(0, 30);
      save();
    },

    /* 推介方案草稿 */
    proposals: function () {
      state.prop = state.prop || { list: [] };
      return state.prop.list;
    },
    saveProposal: function (p) {
      state.prop = state.prop.list ? state.prop : { list: [] };
      state.prop = state.prop || { list: [] };
      p.savedAt = Date.now();
      var exists = false;
      for (var i = 0; i < state.prop.list.length; i++) {
        if (state.prop.list[i].id === p.id) { state.prop.list[i] = p; exists = true; break; }
      }
      if (!exists) state.prop.list.unshift(p);
      state.prop.list = state.prop.list.slice(0, 50);
      save();
    },

    /* 重置（演示用） */
    reset: function () { state = {}; save(); }
  };
})();
