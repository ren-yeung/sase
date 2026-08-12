/* 学习平台：课程阅读器 + 进度 / 随堂测验 + 评分 / 产品知识卡片 / 实战模拟 */
window.App = window.App || {};

var Learn = (function () {
  var ui = App.ui;

  function courseById(id) {
    return (DB.courses || []).filter(function (c) { return c.id === id; })[0] || null;
  }
  function quizById(id) {
    return (DB.quizzes || []).filter(function (q) { return q.id === id; })[0] || null;
  }
  function simById(id) {
    return (DB.simulations || []).filter(function (s) { return s.id === id; })[0] || null;
  }
  function flatLessons(c) {
    var ls = [];
    c.chapters.forEach(function (ch) { ch.lessons.forEach(function (l) { ls.push(l); }); });
    return ls;
  }
  function progress(c) {
    var p = App.store.courseProgress(c.id);
    var all = flatLessons(c);
    var done = all.filter(function (l) { return p.lessons[l.id] && p.lessons[l.id].done; }).length;
    return { done: done, total: all.length, pct: all.length ? Math.round(done / all.length * 100) : 0 };
  }
  function nextLesson(c, lessonId) {
    var all = flatLessons(c);
    for (var i = 0; i < all.length; i++) if (all[i].id === lessonId) return all[i + 1] || null;
    return null;
  }
  function findLesson(c, lessonId) {
    var all = flatLessons(c);
    for (var i = 0; i < all.length; i++) if (all[i].id === lessonId) return all[i];
    return all[0];
  }

  /* ---------- 列表页 ---------- */
  function render(parts) {
    var sub = parts[0];
    if (sub === 'course') return openCourse(parts[1], parts[2]);
    if (sub === 'quiz') return startQuiz(parts[1]);
    if (sub === 'sim') return openSim(parts[1]);
    return list();
  }

  function list() {
    var cBasic = courseById('c-basic'), cAdv = courseById('c-adv');
    var quizBasic = quizById('q-basic'), quizAdv = quizById('q-adv');
    var pb = App.store.courseProgress('c-basic'), pa = App.store.courseProgress('c-adv');
    var qbBest = pb.quizzes ? (Object.keys(pb.quizzes).length ? Math.max.apply(null, Object.keys(pb.quizzes).map(function (k) { return pb.quizzes[k].best || 0; })) : 0) : 0;
    var qaBest = pa.quizzes ? (Object.keys(pa.quizzes).length ? Math.max.apply(null, Object.keys(pa.quizzes).map(function (k) { return pa.quizzes[k].best || 0; })) : 0) : 0;

    /* 课程卡片见下方 courseCards */

    var courseCards = [cBasic, cAdv].map(function (c, i) {
      var pr = progress(c);
      var lvClass = c.level === 1 ? 'lv1' : 'lv4';
      var q = i === 0 ? quizBasic : quizAdv;
      var qbest = i === 0 ? qbBest : qaBest;
      return '' +
        '<div class="card course-card course-card-' + lvClass + '">' +
          '<div class="course-banner ' + lvClass + '">' +
            '<span class="course-lv">' + ui.esc(c.levelName) + '</span>' +
            '<h3>' + ui.esc(c.name) + '</h3>' +
            '<div class="course-meta"><span>' + ui.icon('clock', 15) + ui.esc(c.duration) + '</span><span>' + ui.icon('users', 15) + ui.esc(c.audience) + '</span></div>' +
          '</div>' +
          '<div class="course-body">' +
            '<p class="course-desc">' + ui.esc(c.desc) + '</p>' +
            '<div class="course-progress">' +
              ui.icon('book', 16) +
              '<div class="bar"><div class="bar-fill" style="width:' + pr.pct + '%"></div></div>' +
              '<span class="course-pct">' + pr.done + '/' + pr.total + ' 节 · ' + pr.pct + '%</span>' +
            '</div>' +
            '<div class="course-actions">' +
              '<a class="c-btn-solid" href="#/learn/course/' + c.id + '">' + ui.icon('play', 18) + '<span>开始学习</span></a>' +
              '<a class="c-btn-ghost" href="#/learn/quiz/' + q.id + '">' + ui.icon('edit', 18) + '<span>随堂测验</span></a>' +
            '</div>' +
            (qbest ? '<div class="course-best">最新测验成绩：<b>' + qbest + ' 分</b></div>' : '') +
          '</div>' +
        '</div>';
    }).join('');

    // 产品知识卡片（速查）
    var kcards = (DB.products || []).slice(0, 6).map(function (p) {
      var cat = (DB.categories || []).filter(function (c) { return c.id === p.cat; })[0];
      var hl = p.highlights ? p.highlights[0] : { k: '', v: '' };
      return '' +
        '<a class="kcard" href="#/products/' + p.id + '">' +
          '<div class="kcard-ico" style="color:var(--' + (cat ? cat.color : 'brand') + ')">' + ui.icon(cat ? cat.icon : 'globe', 20) + '</div>' +
          '<div class="kcard-txt"><b>' + ui.esc(p.name) + '</b><span>' + ui.esc(p.tagline) + '</span></div>' +
          '<div class="kcard-hl">' + ui.esc(hl.k) + ' <b>' + ui.esc(hl.v) + '</b></div>' +
        '</a>';
    }).join('');

    var sims = (DB.simulations || []).map(function (s) {
      return '' +
        '<div class="card sim-card">' +
          '<div class="sim-head"><span class="c-badge alt">' + ui.esc(s.difficulty) + '</span><span class="sim-ind">' + ui.icon('building', 15) + ui.esc(s.industry) + '</span></div>' +
          '<h4>' + ui.esc(s.name) + '</h4>' +
          '<p class="sim-brief">' + ui.esc(s.brief.slice(0, 70)) + '…</p>' +
          '<div class="sim-foot">' +
            '<span class="sim-budget">' + ui.icon('coin', 15) + ui.esc(s.budget) + '</span>' +
            '<a class="c-btn-solid" href="#/learn/sim/' + s.id + '">进入模拟 ' + ui.icon('arrow', 16) + '</a>' +
          '</div>' +
        '</div>';
    }).join('');

    var html = '' +
      ui.pageHead('学习平台', '零基础引导版 + 进阶版 · 课程学习 · 随堂测验 · 实战场景模拟') +
      '<div class="learn-grid">' + courseCards + '</div>' +
      '<section class="sec">' +
        '<div class="sec-head"><h2>' + ui.icon('spark', 20) + '产品知识卡片 · 速查</h2><a class="sec-more" href="#/products">查看全部产品 ' + ui.icon('arrow', 16) + '</a></div>' +
        '<div class="kcard-grid">' + kcards + '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<div class="sec-head"><h2>' + ui.icon('play', 20) + '实战场景模拟</h2><span class="sec-sub">选对产品组合，理解取舍逻辑</span></div>' +
        '<div class="sim-grid">' + sims + '</div>' +
      '</section>';

    App.shell.setContent(html, '学习平台');
  }

  /* ---------- 课程阅读器 ---------- */
  function openCourse(courseId, lessonId) {
    var c = courseById(courseId); if (!c) { App.shell.setContent('<div class="empty">课程不存在</div>', '课程'); return; }
    var lesson = findLesson(c, lessonId);
    var pr = progress(c);
    var p = App.store.courseProgress(c.id);

    var toc = c.chapters.map(function (ch) {
      var items = ch.lessons.map(function (l) {
        var done = p.lessons[l.id] && p.lessons[l.id].done;
        var active = l.id === lesson.id;
        return '<a class="toc-lesson' + (active ? ' active' : '') + (done ? ' done' : '') + '" href="#/learn/course/' + c.id + '/' + l.id + '">' +
          '<span class="toc-dot">' + (done ? ui.icon('check', 14) : '') + '</span>' +
          '<span class="toc-name">' + ui.esc(l.name) + '</span>' +
          '<span class="toc-min">' + l.min + '′</span></a>';
      }).join('');
      return '<div class="toc-ch"><div class="toc-ch-name">' + ui.esc(ch.name) + '</div>' + items + '</div>';
    }).join('');

    var next = nextLesson(c, lesson.id);
    var prev = (function () {
      var all = flatLessons(c), idx = -1;
      for (var i = 0; i < all.length; i++) if (all[i].id === lesson.id) idx = i;
      return idx > 0 ? all[idx - 1] : null;
    })();

    var html = '' +
      '<div class="reader-bar">' +
        '<a class="lnk-back" href="#/learn">' + ui.icon('arrowl', 16) + '返回课程</a>' +
        '<div class="bar bar-inline"><div class="bar-fill" style="width:' + pr.pct + '%"></div></div>' +
        '<span class="reader-pct">' + pr.pct + '%</span>' +
      '</div>' +
      '<div class="reader-layout">' +
        '<aside class="reader-toc">' + toc + '</aside>' +
        '<article class="reader-main">' +
          '<div class="reader-crumb">' + ui.esc(c.levelName) + ' · ' + ui.esc(c.name) + '</div>' +
          '<h1 class="reader-title">' + ui.esc(lesson.name) + '</h1>' +
          '<div class="reader-meta">时长 ' + lesson.min + ' 分钟</div>' +
          '<div class="article">' + lesson.body + '</div>' +
          '<div class="reader-foot">' +
            (prev ? '<a class="btn btn-ghost" href="#/learn/course/' + c.id + '/' + prev.id + '">' + ui.icon('arrowl', 16) + '上一节</a>' : '<span></span>') +
            '<button class="btn btn-primary" data-onclick="Learn.markDone" data-course="' + c.id + '" data-lesson="' + lesson.id + '">' + ui.icon('check', 18) + '<span>标记完成' + (next ? ' · 下一节' : '') + '</span></button>' +
          '</div>' +
        '</article>' +
      '</div>';

    App.shell.setContent(html, lesson.name);
  }

  function markDone(e) {
    var cid = e.getAttribute('data-course'), lid = e.getAttribute('data-lesson');
    var c = courseById(cid);
    App.store.setLessonDone(cid, lid, { lesson: true });
    var nxt = nextLesson(c, lid);
    if (nxt) {
      ui.toast('已记录进度，进入下一节', 'success');
      location.hash = '#/learn/course/' + cid + '/' + nxt.id;
    } else {
      var pr = progress(c);
      ui.toast('本章全部完成！' + (pr.pct >= 100 ? '课程通关 🎉' : ''), 'success');
      // 触发测验建议
      location.hash = '#/learn/quiz/' + (cid === 'c-basic' ? 'q-basic' : 'q-adv');
    }
  }

  /* ---------- 随堂测验 ---------- */
  function startQuiz(quizId) {
    var q = quizById(quizId); if (!q) { App.shell.setContent('<div class="empty">测验不存在</div>', '测验'); return; }
    var qs = q.questions.map(function (item, i) {
      var opts = item.opts.map(function (o, oi) {
        return '<label class="quiz-opt"><input type="radio" name="q_' + item.id + '" value="' + oi + '"><span class="quiz-radio"></span><span class="quiz-opt-txt">' + o + '</span></label>';
      }).join('');
      return '<div class="quiz-q" data-qid="' + item.id + '">' +
        '<div class="quiz-q-head"><span class="quiz-no">Q' + (i + 1) + '</span><span class="quiz-q-txt">' + item.text + '</span></div>' +
        '<div class="quiz-opts">' + opts + '</div>' +
        '<div class="quiz-fb" id="fb_' + item.id + '"></div>' +
      '</div>';
    }).join('');

    var html = '' +
      '<a class="lnk-back" href="#/learn">' + ui.icon('arrowl', 16) + '返回学习平台</a>' +
      '<div class="quiz-head">' +
        '<div>' +
          '<h1 class="page-title">' + ui.esc(q.name) + '</h1>' +
          '<p class="page-sub">' + ui.esc(q.desc) + '</p>' +
        '</div>' +
        '<div class="quiz-passcard"><span>及格线</span><b>' + q.pass + ' 分</b></div>' +
      '</div>' +
      '<form id="quiz-form" class="quiz-form">' + qs + '</form>' +
      '<div class="quiz-submit">' +
        '<button class="c-btn" data-onclick="Learn.submitQuiz" data-quiz="' + q.id + '">' + ui.icon('check', 18) + '<span>提交并评分</span></button>' +
      '</div>' +
      '<div id="quiz-result"></div>';

    App.shell.setContent(html, q.name);
  }

  function submitQuiz(e) {
    var qid = e.getAttribute('data-quiz');
    var q = quizById(qid);
    var form = document.getElementById('quiz-form');
    var total = q.questions.length, correct = 0;
    var reviewRows = '';
    q.questions.forEach(function (item) {
      var name = 'q_' + item.id;
      var sel = form.querySelector('input[name="' + name + '"]:checked');
      var chosen = sel ? parseInt(sel.value, 10) : -1;
      var ok = chosen === item.ans;
      if (ok) correct++;
      // 标记选项对错
      var optsEls = form.querySelectorAll('input[name="' + name + '"]');
      optsEls.forEach(function (inp) {
        var lab = inp.closest('.quiz-opt');
        var vi = parseInt(inp.value, 10);
        lab.classList.add(vi === item.ans ? 'is-right' : (vi === chosen && !ok ? 'is-wrong' : ''));
        inp.disabled = true;
      });
      var fb = document.getElementById('fb_' + item.id);
      if (fb) fb.innerHTML = (ok ? '<div class="fb-ok">' + ui.icon('checkc', 16) + '回答正确</div>' : '<div class="fb-no">' + ui.icon('x', 16) + '回答错误</div>') +
        '<div class="fb-why">' + item.why + '</div>';
      reviewRows += '<div class="rev-row ' + (ok ? 'ok' : 'no') + '"><span class="rev-no">Q' + (q.questions.indexOf(item) + 1) + '</span><span>' + (ok ? ui.icon('checkc', 15) : ui.icon('x', 15)) + '</span></div>';
    });
    var score = Math.round(correct / total * 100);
    var pass = score >= q.pass;
    App.store.setLessonDone(q.courseId, qid, { quiz: score, pass: pass });

    var resultHtml = '' +
      '<div class="quiz-result ' + (pass ? 'pass' : 'fail') + '">' +
        App.charts.ring(score, { color: pass ? 'success' : 'danger', size: 150, center: pass ? '通过' : '未过' }) +
        '<div class="qr-info">' +
          '<h3>' + (pass ? '恭喜，测验通过！' : '差一点，再看看课程回放') + '</h3>' +
          '<p>答对 ' + correct + ' / ' + total + ' 题，得分 <b>' + score + '</b> 分（及格线 ' + q.pass + '）</p>' +
          '<div class="qr-rev">' + reviewRows + '</div>' +
          '<div class="qr-actions">' +
            '<button class="btn btn-ghost" data-onclick="Learn.clearQuiz" data-quiz="' + qid + '">' + ui.icon('refresh', 16) + '重新作答</button>' +
            '<a class="btn btn-primary" href="#/learn">' + ui.icon('book', 16) + '返回课程</a>' +
          '</div>' +
        '</div>' +
      '</div>';
    var box = document.getElementById('quiz-result');
    box.innerHTML = resultHtml;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 隐藏提交按钮
    var sub = document.querySelector('.quiz-submit');
    if (sub) sub.style.display = 'none';
  }

  function clearQuiz(e) {
    var qid = e.getAttribute('data-quiz');
    location.hash = '#/learn/quiz/' + qid;
  }

  /* ---------- 实战模拟 ---------- */
  function openSim(simId) {
    var s = simById(simId); if (!s) { App.shell.setContent('<div class="empty">场景不存在</div>', '模拟'); return; }
    var facts = s.facts.map(function (f) {
      return '<div class="sim-fact"><span class="sf-k">' + ui.esc(f.k) + '</span><span class="sf-v">' + ui.esc(f.v) + '</span></div>';
    }).join('');
    var opts = s.options.map(function (o) {
      return '<label class="pick-card" data-oid="' + o.id + '">' +
        '<input type="checkbox" class="pick-check" value="' + o.id + '">' +
        '<span class="pick-box"></span>' +
        '<span class="pick-name">' + ui.esc(o.name) + '</span>' +
        '<div class="pick-fb" id="pf_' + o.id + '"></div>' +
      '</label>';
    }).join('');

    var html = '' +
      '<a class="lnk-back" href="#/learn">' + ui.icon('arrowl', 16) + '返回学习平台</a>' +
      '<div class="sim-detail">' +
        '<div class="sim-detail-head">' +
          '<div><h1 class="page-title">' + ui.esc(s.name) + '</h1>' +
          '<div class="sim-tags"><span class="tag tag-warn">' + ui.esc(s.difficulty) + '</span><span class="tag tag-default">' + ui.esc(s.industry) + '</span><span class="tag tag-accent">' + ui.esc(s.budget) + '</span></div></div>' +
        '</div>' +
        '<div class="sim-brief-block"><h3>客户背景</h3><p>' + ui.esc(s.brief) + '</p></div>' +
        '<div class="sim-facts">' + facts + '</div>' +
        '<div class="sim-q">' + ui.esc(s.question) + '</div>' +
        '<div class="pick-grid" id="pick-grid">' + opts + '</div>' +
        '<div class="sim-submit">' +
          '<button class="c-btn" data-onclick="Learn.submitSim" data-sim="' + s.id + '">' + ui.icon('check', 18) + '<span>提交方案并查看解析</span></button>' +
        '</div>' +
        '<div id="sim-result"></div>' +
      '</div>';

    App.shell.setContent(html, s.name);
  }

  function submitSim(e) {
    var sid = e.getAttribute('data-sim');
    var s = simById(sid);
    var checked = Array.prototype.slice.call(document.querySelectorAll('#pick-grid .pick-check:checked')).map(function (i) { return i.value; });
    var rightSet = s.options.filter(function (o) { return o.right; }).map(function (o) { return o.id; });
    var wrongSet = s.options.filter(function (o) { return !o.right; }).map(function (o) { return o.id; });
    // 揭示每个卡片
    s.options.forEach(function (o) {
      var card = document.querySelector('.pick-card[data-oid="' + o.id + '"]');
      var fb = document.getElementById('pf_' + o.id);
      var chosen = checked.indexOf(o.id) >= 0;
      var state = (o.right && chosen) ? 'right' : (!o.right && !chosen) ? 'skip-ok' : (o.right && !chosen) ? 'miss' : 'wrong';
      card.classList.add('revealed', state);
      var label = state === 'right' ? '<b class="t-right">✓ 选对了</b>' : state === 'miss' ? '<b class="t-miss">⚠ 漏选（应选）</b>' : state === 'wrong' ? '<b class="t-wrong">✗ 多选了</b>' : '<b class="t-skip">✓ 正确排除</b>';
      if (fb) fb.innerHTML = label + '<div class="pick-why">' + ui.esc(o.why) + '</div>';
    });
    // 评分
    var hit = s.options.filter(function (o) { return o.right && checked.indexOf(o.id) >= 0; }).length;
    var falsePos = s.options.filter(function (o) { return !o.right && checked.indexOf(o.id) >= 0; }).length;
    var score = Math.max(0, Math.round((hit / rightSet.length - falsePos / wrongSet.length) * 100));
    var tips = s.tips.map(function (t) { return '<li>' + ui.esc(t) + '</li>'; }).join('');
    var resultHtml = '' +
      '<div class="sim-result">' +
        '<div class="sim-score ' + (score >= 60 ? 'good' : 'bad') + '">' +
          '<span class="sim-score-num">' + score + '</span><span class="sim-score-txt">分</span>' +
          '<span class="sim-score-cap">选对 ' + hit + '/' + rightSet.length + ' · 误选 ' + falsePos + '</span>' +
        '</div>' +
        '<div class="sim-tips"><h4>' + ui.icon('bulb', 18) + '策略提示</h4><ul>' + tips + '</ul></div>' +
        '<div class="sim-actions">' +
          '<button class="btn btn-ghost" data-onclick="Learn.clearSim" data-sim="' + sid + '">' + ui.icon('refresh', 16) + '重新挑战</button>' +
          '<a class="btn btn-primary" href="#/learn">' + ui.icon('check', 16) + '完成</a>' +
        '</div>' +
      '</div>';
    var box = document.getElementById('sim-result');
    box.innerHTML = resultHtml;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var sub = document.querySelector('.sim-submit');
    if (sub) sub.style.display = 'none';
  }

  function clearSim(e) {
    var sid = e.getAttribute('data-sim');
    location.hash = '#/learn/sim/' + sid;
  }

  return { render: render, openCourse: openCourse, markDone: markDone, startQuiz: startQuiz, submitQuiz: submitQuiz, clearQuiz: clearQuiz, openSim: openSim, submitSim: submitSim, clearSim: clearSim };
})();
window.Learn = Learn;

App.defineNav({ path: 'learn', title: '学习平台', icon: 'book', roles: ['all'], view: Learn.render });
