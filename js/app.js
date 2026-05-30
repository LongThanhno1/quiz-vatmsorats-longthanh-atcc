/* ================================================================
   CNS Quiz — Application Logic  (js/app.js)
   ES6+ Clean Code | Refactored từ index.html monolith
   Phụ thuộc: js/questions.js phải được load trước file này.
================================================================= */

'use strict';

const SESSION_KEY = 'cnsQuizState';

// ── Helpers ──────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

/** Fisher-Yates shuffle — trả về mảng mới, không mutate bản gốc */
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Format giây → "MM:SS" */
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Lấy cấu hình module theo id, fallback nếu không tìm thấy */
const getMC = id => MODULE_CONFIG.find(m => m.id === id) ?? { color: '#64748b', name: id, icon: '?', grd: '', bg: '' };

// ── Hằng số ──────────────────────────────────────────────────────
const EXAM_DURATION = 50 * 60;  // giây — dùng cho timer VÀ tính elapsed time
const MAX_DRAW      = 50;       // số câu tối đa mỗi lần thi
const PASS_SCORE    = 70;       // % đạt

const TR_DUR = 180;  // ms — screen transition (phải khớp CSS .screen-exit)
const Q_DUR  = 100;  // ms — question card fade-out

// ── State tập trung — dễ reset, dễ lưu vào LocalStorage sau này ──
let state = {
  selectedModule: null,
  examQuestions:  [],
  userAnswers:    {},     // { questionIndex: chosenOption }
  currentIdx:     0,
  secondsLeft:    EXAM_DURATION,
  timerInterval:  null,
  qBusy:          false, // debounce guard cho animation câu hỏi
};

// ── Helper reset state ────────────────────────────────────────────
const resetState = (moduleId) => {
  state = {
    ...state,
    selectedModule: moduleId,
    examQuestions:  [],
    userAnswers:    {},
    currentIdx:     0,
    secondsLeft:    EXAM_DURATION,
    qBusy:          false,
  };
};


/* =================================================================
   CASCADE DROPDOWN LOGIC (Welcome Screen)
================================================================= */

function onChucDanhChange() {
  const cd     = $('selChucDanh').value;
  const grpVT  = $('groupViTri');
  const grpMod = $('groupModule');

  // Reset downstream
  $('selViTri').value          = '';
  $('selModule').innerHTML     = '<option value="">— Chọn module —</option>';
  $('btnStart').disabled       = true;

  if (cd) {
    grpVT.style.opacity       = '1';
    grpVT.style.pointerEvents = 'auto';
    grpVT.classList.remove('cascade-in');
    void grpVT.offsetWidth;   // reflow để trigger animation
    grpVT.classList.add('cascade-in');
  } else {
    grpVT.style.opacity       = '0.35';
    grpVT.style.pointerEvents = 'none';
  }

  grpMod.style.opacity       = '0.35';
  grpMod.style.pointerEvents = 'none';
}

function onViTriChange() {
  const cd     = $('selChucDanh').value;
  const vt     = $('selViTri').value;
  const grpMod = $('groupModule');
  const selMod = $('selModule');

  selMod.innerHTML     = '<option value="">— Chọn module —</option>';
  $('btnStart').disabled = true;

  if (cd && vt) {
    const mIds = LOCATION_MODULE_MAP[cd]?.[vt] ?? [];
    // DocumentFragment: gom thêm option vào fragment, rồi append 1 lần → tránh reflow lặp lại
    const frag = document.createDocumentFragment();
    mIds.forEach(mId => {
      const mc  = getMC(mId);
      const opt = document.createElement('option');
      opt.value       = mId;
      opt.textContent = `${mc.icon}  ${mc.name}`;
      frag.appendChild(opt);
    });
    selMod.appendChild(frag);
    selMod.disabled = false;

    // Unlock visual
    grpMod.classList.remove('locked');
    const lockSvg = $('lockIcon');
    if (lockSvg) lockSvg.style.display = 'none';
    grpMod.style.opacity       = '1';
    grpMod.style.pointerEvents = 'auto';
    grpMod.classList.remove('cascade-in');
    void grpMod.offsetWidth;
    grpMod.classList.add('cascade-in');
  } else {
    selMod.disabled = true;
    grpMod.classList.add('locked');
    const lockSvg = $('lockIcon');
    if (lockSvg) lockSvg.style.display = '';
    grpMod.style.opacity       = '0.35';
    grpMod.style.pointerEvents = 'none';
  }
}

function onModuleChange() {
  $('btnStart').disabled = !$('selModule').value;
}


/* =================================================================
   SCREEN TRANSITION — Welcome → Exam
================================================================= */

function onStartExam() {
  const mod = $('selModule').value;
  if (!mod) return;
  const ss = $('startScreen');
  ss.classList.add('screen-exit');
  // setTimeout PHẢI bằng TR_DUR = 180ms (khớp CSS duration)
  setTimeout(() => {
    ss.classList.add('hidden');
    ss.classList.remove('screen-exit');
    startExam(mod);
  }, TR_DUR);
}


/* =================================================================
   EXAM — START
   SECURITY: Chỉ lấy câu từ questionBank đã nạp sẵn.
   Không tạo câu mới, không fetch API ngoài.
================================================================= */

function startExam(moduleId) {
  resetState(moduleId);
  const mc = getMC(moduleId);

  // GA4: Track bắt đầu thi
  trackEvent('quiz_start', {
    module_id:   moduleId,
    module_name: mc.name,
    vi_tri:      (document.getElementById('selViTri') || {}).value || 'unknown',
    timestamp:   new Date().toISOString()
  });

  // Lọc câu đúng module → shuffle toàn pool → bốc tối đa MAX_DRAW câu
  const rawPool = questionBank.filter(q => q.module === moduleId);

  if (rawPool.length === 0) {
    alert(`⚠ Module "${mc.label}" chưa có câu hỏi trong ngân hàng đề.`);
    return;
  }

  const pool  = shuffle(rawPool);
  const count = Math.min(MAX_DRAW, pool.length);

  // Spread để không mutate dữ liệu gốc; shuffle options riêng mỗi lần thi
  state.examQuestions = pool.slice(0, count).map(q => ({
    ...q,
    options: shuffle(q.options),
  }));

  // Show exam screen với enter animation
  const es = $('examScreen');
  es.classList.remove('hidden');
  es.classList.add('screen-enter');
  setTimeout(() => es.classList.remove('screen-enter'), TR_DUR + 20);

  // Module badge
  const badge = $('examModuleBadge');
  badge.textContent         = mc.label;
  badge.style.background    = mc.bg;
  badge.style.color         = mc.color;
  badge.style.border        = `1px solid ${mc.color}55`;

  renderNavGrids();
  showQ(0);
  startTimer();
}


/* =================================================================
   TIMER
================================================================= */

function startTimer() {
  clearInterval(state.timerInterval);
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.secondsLeft--;
    updateTimerDisplay();
    if (state.secondsLeft <= 0) {
      clearInterval(state.timerInterval);
      doSubmit(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = $('timerText');
  if (!el) return;
  el.textContent = fmt(state.secondsLeft);

  if (state.secondsLeft < 300) {
    el.className = 'timer-warn text-red-400 text-lg';
    $('timerDisplay').style.borderColor = 'rgba(239,68,68,0.5)';
    $('timerDisplay').style.background  = 'rgba(239,68,68,0.1)';
  } else if (state.secondsLeft < 600) {
    el.className = 'text-amber-400 text-lg';
  } else {
    el.className = 'text-sky-300 text-lg';
  }
}


/* =================================================================
   QUESTION DISPLAY
================================================================= */

/**
 * showQ — hiển thị câu hỏi có animation fade (prev/next button)
 * Có debounce guard để tránh click nhanh gây animation chồng lên nhau
 */
function showQ(idx) {
  const { examQuestions, currentIdx } = state;
  if (idx < 0 || idx >= examQuestions.length) return;
  if (idx === currentIdx) { _doRenderQ(idx); return; }
  if (state.qBusy) return;

  state.qBusy = true;
  const card = $('questionCard');
  card.classList.add('q-fade-out');

  setTimeout(() => {
    card.classList.remove('q-fade-out');
    _doRenderQ(idx);
    // CSS transition tự reverse khi remove class → fade-in tự động
    setTimeout(() => { state.qBusy = false; }, 160);
  }, Q_DUR);
}

/**
 * showQInstant — hiển thị ngay, không animation (click số câu từ lưới/sidebar)
 */
function showQInstant(idx) {
  if (idx < 0 || idx >= state.examQuestions.length) return;
  state.qBusy = false;
  $('questionCard').classList.remove('q-fade-out');
  _doRenderQ(idx);
}

/**
 * _doRenderQ — render nội dung câu hỏi vào DOM
 * Được gọi bởi cả showQ (animated) và showQInstant (instant)
 */
function _doRenderQ(idx) {
  state.currentIdx = idx;
  const { examQuestions, userAnswers } = state;
  const q    = examQuestions[idx];
  const mc   = getMC(q.module);
  const tot  = examQuestions.length;
  const cnt  = Object.keys(userAnswers).length;
  const ans  = userAnswers[idx] !== undefined;
  const labels = ['A', 'B', 'C', 'D'];

  // Cập nhật metadata
  $('qModuleBadge').textContent       = mc.label;
  $('qModuleBadge').style.background  = mc.bg;
  $('qModuleBadge').style.color       = mc.color;
  $('qNumber').textContent            = `Câu ${idx + 1} / ${tot}`;
  $('questionText').textContent       = q.question;
  $('progressText').textContent       = `${cnt}/${tot} đã trả lời`;
  $('navInfo').textContent            = `${cnt}/${tot} đã trả lời`;
  $('progressBar').style.width        = `${cnt / tot * 100}%`;

  $('qAnsweredBadge').classList.toggle('hidden', !ans);

  // Render options với template literal — an toàn hơn: escape trước khi đưa vào onclick attr
  $('optionsContainer').innerHTML = q.options.map((opt, i) => {
    const sel = userAnswers[idx] === opt;
    const safe = opt.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `
      <div class="option-btn ${sel ? 'selected' : ''}" onclick="selectOpt(${idx}, this, '${safe}')">
        <span style="min-width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.07);
                     display:flex;align-items:center;justify-content:center;
                     font-size:11px;font-weight:700;flex-shrink:0;margin-top:2px">${labels[i]}</span>
        <span style="font-size:14px;line-height:1.5">${opt}</span>
      </div>`;
  }).join('');

  // Nút Next → "Hoàn thành & nộp bài" ở câu cuối cùng
  const btnNext = $('btnNextQ');
  if (btnNext) {
    const isLast = idx === examQuestions.length - 1;
    Object.assign(btnNext.style, isLast ? {
      background:  'linear-gradient(135deg,#10b981,#059669)',
      borderColor: 'rgba(16,185,129,0.4)',
      color:       '#fff',
      fontWeight:  '700',
      boxShadow:   '0 0 16px rgba(16,185,129,0.35)',
    } : {
      background:  'rgba(255,255,255,0.035)',
      borderColor: '',
      color:       '',
      fontWeight:  '',
      boxShadow:   '',
    });
    btnNext.innerHTML = isLast ? '✅ Hoàn thành &amp; nộp bài' : 'Tiếp ▶';
  }

  renderNavGrids();
  updateSidebarStats();
  saveQuizState(); // lưu vị trí câu hiện tại
}


/* =================================================================
   OPTION SELECTION
================================================================= */

function selectOpt(idx, el, val) {
  state.userAnswers[idx] = val;

  // Highlight option được chọn
  document.querySelectorAll('#optionsContainer .option-btn')
    .forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  $('qAnsweredBadge').classList.remove('hidden');

  // Cập nhật progress
  const cnt = Object.keys(state.userAnswers).length;
  const tot = state.examQuestions.length;
  const txt = `${cnt}/${tot} đã trả lời`;
  $('progressText').textContent = txt;
  $('navInfo').textContent      = txt;
  $('progressBar').style.width  = `${cnt / tot * 100}%`;

  renderNavGrids();
  updateSidebarStats();
  saveQuizState(); // lưu sau mỗi lần chọn đáp án
}

function prevQ() { showQ(state.currentIdx - 1); }

function nextQ() {
  if (state.currentIdx >= state.examQuestions.length - 1) {
    confirmSubmit();
    return;
  }
  showQ(state.currentIdx + 1);
}


/* =================================================================
   NAV GRID (sidebar + mobile drawer)
================================================================= */

function renderNavGrids() {
  const { examQuestions, userAnswers, currentIdx } = state;
  const html = examQuestions.map((_, i) => {
    const answered = userAnswers[i] !== undefined;
    const current  = i === currentIdx;
    return `<button onclick="goToQ(${i})" class="nav-btn ${answered ? 'answered' : ''} ${current ? 'current' : ''}">${i + 1}</button>`;
  }).join('');

  // Cập nhật cả 2 grid cùng lúc
  ['desktopNavGrid', 'mobileNavGrid'].forEach(id => {
    const el = $(id);
    if (el) el.innerHTML = html;
  });
}

function updateSidebarStats() {
  const a   = Object.keys(state.userAnswers).length;
  const t   = state.examQuestions.length;
  const pct = t ? Math.round(a / t * 100) : 0;
  const html = `
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:4px">
      <span>Tiến độ</span><span>${a}/${t}</span>
    </div>
    <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#0ea5e9,#6366f1);
                  border-radius:2px;transition:width .3s"></div>
    </div>`;
  [$('sidebarStats'), $('mobileStats')].forEach(el => { if (el) el.innerHTML = html; });
}

function goToQ(i) {
  showQInstant(i);
  const d = $('mobileDrawer');
  if (d?.classList.contains('open')) toggleDrawer();
}


/* =================================================================
   MOBILE DRAWER
================================================================= */

function toggleDrawer() {
  const d = $('mobileDrawer');
  const o = $('drawerOverlay');
  d.classList.toggle('open');
  o.classList.toggle('hidden');
  if (d.classList.contains('open')) {
    renderNavGrids();
    updateSidebarStats();
  }
}


/* =================================================================
   SUBMIT
================================================================= */

function confirmSubmit() {
  const a = Object.keys(state.userAnswers).length;
  const t = state.examQuestions.length;
  $('modalStats').innerHTML = `
    <div>Đã trả lời: <b style="color:#10b981">${a}</b> / ${t}</div>
    ${t - a > 0
      ? `<div style="color:#f59e0b;margin-top:4px">⚠ Còn ${t - a} câu chưa trả lời</div>`
      : '<div style="color:#10b981;margin-top:4px">✓ Đã hoàn thành tất cả!</div>'}`;
  $('submitModal').classList.remove('hidden');
}

function closeSubmitModal() { $('submitModal').classList.add('hidden'); }

function doSubmit(auto = false) {
  clearInterval(state.timerInterval);
  clearQuizState(); // xoa state khi nop bai
  closeSubmitModal();
  $('examScreen').classList.add('hidden');
  $('resultScreen').classList.remove('hidden');

  const { examQuestions, userAnswers, secondsLeft } = state;
  const correct = examQuestions.reduce((acc, q, i) =>
    acc + (userAnswers[i] === q.correctAnswer ? 1 : 0), 0);

  const total  = examQuestions.length;
  const pct    = Math.round(correct / total * 100);
  const passed = pct >= PASS_SCORE;
  const mc     = getMC(state.selectedModule);

  // GA4: Track hoàn thành bài thi
  trackEvent('quiz_complete', {
    module_id:       state.selectedModule,
    module_name:     mc.name,
    score_percent:   pct,
    correct_answers: correct,
    total_questions: total,
    result:          passed ? 'pass' : 'fail',
    auto_submit:     auto   // true = hết giờ, false = bấm nộp
  });

  $('resultModuleName').textContent = mc.name;
  $('resultModuleName').style.color = mc.color;
  $('scorePct').textContent         = `${pct}%`;
  $('scoreDetail').textContent      = `${correct}/${total}`;

  const ps = $('passStatus');
  ps.textContent = passed ? '✓ ĐẠT' : '✗ KHÔNG ĐẠT';
  ps.className   = `result-tag ${passed ? 'pass' : 'fail'}`;

  // Elapsed time — dùng EXAM_DURATION (không hardcode 3000)
  const elapsed = EXAM_DURATION - secondsLeft;
  const rtEl    = $('resultTime');
  if (rtEl) {
    const em = Math.floor(elapsed / 60);
    const es = elapsed % 60;
    rtEl.textContent = `${String(em).padStart(2, '0')}:${String(es).padStart(2, '0')}`;
  }

  // Score bar animate-in
  setTimeout(() => {
    const bar = $('scoreBar');
    bar.style.width      = `${pct}%`;
    bar.style.background = passed
      ? 'linear-gradient(90deg,#10b981,#34d399)'
      : 'linear-gradient(90deg,#ef4444,#f87171)';
  }, 100);

  renderReview('all');
  injectBreakdown();
}


/* =================================================================
   REVIEW (kết quả chi tiết)
================================================================= */

function renderReview(filter = 'all') {
  const { examQuestions, userAnswers } = state;
  const mc     = getMC(state.selectedModule);
  const labels = ['A', 'B', 'C', 'D'];

  const items = examQuestions
    .map((q, i) => ({ q, i, ua: userAnswers[i], ok: userAnswers[i] === q.correctAnswer }))
    .filter(({ ok }) => filter === 'all' || (filter === 'correct' ? ok : !ok));

  $('reviewList').innerHTML = items.length
    ? items.map(({ q, i, ua, ok }) => `
      <div class="review-card-item ${ok ? 'correct' : 'wrong'}">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
          <div style="width:24px;height:24px;border-radius:50%;flex-shrink:0;
                      display:flex;align-items:center;justify-content:center;
                      font-weight:900;font-size:12px;margin-top:2px;
                      background:${ok ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'};
                      color:${ok ? '#10b981' : '#ef4444'}">${ok ? '✓' : '✗'}</div>
          <div>
            <div style="font-size:11px;color:${mc.color};font-weight:800;margin-bottom:4px">
              ${mc.label} — Câu ${i + 1}
            </div>
            <p style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.92);
                      line-height:1.5;margin:0">${q.question}</p>
          </div>
        </div>
        <div style="padding-left:34px">
          ${q.options.map((opt, oi) => {
            const isC = opt === q.correctAnswer;
            const isU = opt === ua;
            const clr = isC ? '#10b981' : isU ? '#ef4444' : 'rgba(255,255,255,0.3)';
            const ico = isC ? '✓' : isU ? '✗' : '○';
            const strike = (isU && !isC) ? 'text-decoration:line-through;' : '';
            return `<div style="font-size:12px;color:${clr};display:flex;gap:6px;margin-bottom:3px;${strike}">
              <span>${ico}</span><span>${labels[oi]}. ${opt}</span>
            </div>`;
          }).join('')}
          ${!ok ? `
            <div style="margin-top:10px;padding:10px 12px;border-radius:8px;
                        background:rgba(16,185,129,0.08);border-left:3px solid #10b981">
              <div style="font-size:11px;font-weight:800;color:#34d399;margin-bottom:4px">📌 Đáp án đúng:</div>
              <div style="font-size:13px;color:white;font-weight:600">${q.correctAnswer}</div>
            </div>` : ''}
        </div>
      </div>`).join('')
    : '<div style="text-align:center;color:#64748b;padding:32px 0">Không có câu nào phù hợp</div>';
}



/* =================================================================
   MODULE BREAKDOWN - Phan tich ket qua theo module/chu de
================================================================= */

/**
 * Dem dung/sai theo tung module trong bai thi.
 * Tra ve object: { moduleId: { total, correct, name, color, icon } }
 */
function buildModuleBreakdown(questions, answers) {
  var groups = {};
  questions.forEach(function(q, idx) {
    var key = q.module || 'Khac';
    if (!groups[key]) {
      var mc = getMC(key);
      groups[key] = { total: 0, correct: 0, name: mc.name || key, color: mc.color, icon: mc.icon || '' };
    }
    groups[key].total++;
    if (answers[idx] === q.correctAnswer) groups[key].correct++;
  });
  return groups;
}

/**
 * Render HTML cho bang phan tich module.
 * Highlight module yeu nhat (ty le dung thap nhat).
 */
function renderBreakdown(groups) {
  var entries = Object.entries(groups);
  if (entries.length === 0) return '';

  // Tim module yeu nhat
  var weakest = entries.reduce(function(a, b) {
    return (b[1].correct / b[1].total) < (a[1].correct / a[1].total) ? b : a;
  })[0];

  var rows = entries.map(function(entry) {
    var cat  = entry[0];
    var data = entry[1];
    var pct  = Math.round(data.correct / data.total * 100);
    var isWeak = cat === weakest && pct < 100;
    var color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    var borderClr = isWeak ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.07)';
    return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;margin-bottom:8px;background:rgba(255,255,255,0.04);border:1px solid ' + borderClr + '">' +
      '<div style="flex:1;font-size:0.82rem;font-weight:700;color:rgba(255,255,255,0.85)">' + data.name + (isWeak ? ' <span style="font-size:0.75rem">\u26a0\ufe0f</span>' : '') + '</div>' +
      '<div style="font-size:0.78rem;color:rgba(255,255,255,0.45)">' + data.correct + '/' + data.total + ' cau</div>' +
      '<div style="font-size:0.9rem;font-weight:900;color:' + color + '">' + pct + '%</div>' +
    '</div>';
  }).join('');

  return rows;
}

/**
 * Tao va inject breakdown container vao result screen.
 * Goi sau doSubmit tinh xong diem.
 */
function injectBreakdown() {
  // Xoa breakdown cu neu co (vi retake thi lai)
  var old = document.getElementById('breakdownContainer');
  if (old) old.remove();

  var groups = buildModuleBreakdown(state.examQuestions, state.userAnswers);
  var html   = renderBreakdown(groups);
  if (!html) return;

  var container = document.createElement('div');
  container.id        = 'breakdownContainer';
  container.className = 'result-card';
  container.style.marginTop = '16px';
  container.innerHTML =
    '<div style="font-size:0.7rem;font-weight:700;color:rgba(255,255,255,0.4);' +
    'letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px">' +
    '\ud83d\udcca Phan tich theo chu de</div>' +
    html +
    '<div style="font-size:0.65rem;color:rgba(255,255,255,0.3);margin-top:10px;text-align:center">' +
    '\u26a0\ufe0f = Chu de can on them</div>';

  var wrap = document.querySelector('.review-wrap');
  if (wrap) wrap.prepend(container);
}

/* =================================================================
   NAVIGATION — Back / Retake
================================================================= */

function backToStart() {
  state.selectedModule = null;
  clearQuizState(); // xoa state khi ve trang chu
  const from = $('resultScreen');
  from.classList.add('screen-exit');
  setTimeout(() => {
    from.classList.add('hidden');
    from.classList.remove('screen-exit');
    const ss = $('startScreen');
    ss.classList.remove('hidden');
    ss.classList.add('screen-enter');
    setTimeout(() => ss.classList.remove('screen-enter'), TR_DUR + 20);
  }, TR_DUR);
}

function retakeModule() {
  const mod = state.selectedModule;
  const from = $('resultScreen');
  from.classList.add('screen-exit');
  setTimeout(() => {
    from.classList.add('hidden');
    from.classList.remove('screen-exit');
    startExam(mod);   // không qua Welcome screen
  }, TR_DUR);
}





/* =================================================================
   KEYBOARD NAVIGATION
   1/2/3/4 = chon dap an A/B/C/D | ArrowLeft/Right = chuyen cau | Escape = toggle drawer
================================================================= */

/**
 * Wrapper: chon dap an bang so thu tu (0-based index).
 * Tim option button trong DOM roi goi selectOpt giong click.
 */
function selectOption(index) {
  var btns = document.querySelectorAll('#optionsContainer .option-btn');
  if (index < 0 || index >= btns.length) return;
  var q   = state.examQuestions[state.currentIdx];
  var val = q && q.options ? q.options[index] : null;
  if (!val) return;
  selectOpt(state.currentIdx, btns[index], val);
}

document.addEventListener('keydown', function(e) {
  // Chi xu ly khi examScreen dang hien
  var examScreen = document.getElementById('examScreen');
  if (!examScreen || examScreen.classList.contains('hidden')) return;

  // Chon khi user dang focus input/select/textarea
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

  switch (e.key) {
    case '1': selectOption(0); break;
    case '2': selectOption(1); break;
    case '3': selectOption(2); break;
    case '4': selectOption(3); break;
    case 'ArrowRight':
    case 'Enter':
      e.preventDefault();
      nextQ();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      prevQ();
      break;
    case 'Escape':
      toggleDrawer();
      break;
  }
});

/* =================================================================
   SESSION STORAGE - Resume bai thi khi refresh trang
================================================================= */

function saveQuizState() {
  if (!state.selectedModule || !state.examQuestions.length) return;
  const snap = {
    module:    state.selectedModule,
    questions: state.examQuestions,
    answers:   state.userAnswers,
    currentQ:  state.currentIdx,
    timeLeft:  state.secondsLeft,
    savedAt:   Date.now()
  };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(snap)); } catch (_) {}
}

function clearQuizState() {
  sessionStorage.removeItem(SESSION_KEY);
}

function checkResume() {
  let raw;
  try { raw = sessionStorage.getItem(SESSION_KEY); } catch (_) { return false; }
  if (!raw) return false;
  let snap;
  try { snap = JSON.parse(raw); } catch (_) { clearQuizState(); return false; }
  if (!snap.timeLeft || snap.timeLeft <= 0 || !snap.questions || !snap.questions.length) {
    clearQuizState();
    return false;
  }
  const answered = Object.keys(snap.answers || {}).length;
  const mins     = Math.floor(snap.timeLeft / 60);
  const mc       = getMC(snap.module);
 restoreQuizState(snap);
return true;
}

function restoreQuizState(snap) {
  const mc = getMC(snap.module);
  state.selectedModule = snap.module;
  state.examQuestions  = snap.questions;
  state.userAnswers    = snap.answers || {};
  state.currentIdx     = snap.currentQ || 0;
  state.secondsLeft    = snap.timeLeft;
  state.qBusy          = false;
  $('startScreen').classList.add('hidden');
  var es = $('examScreen');
  es.classList.remove('hidden');
  var badge = $('examModuleBadge');
  badge.textContent      = mc.label;
  badge.style.background = mc.bg;
  badge.style.color      = mc.color;
  badge.style.border     = '1px solid ' + mc.color + '55';
  renderNavGrids();
  showQInstant(state.currentIdx);
  startTimer();
}

/* =================================================================
   INIT — chạy khi DOM sẵn sàng
================================================================= */


/* =================================================================
   GA4 — Quiz Abandon (rời trang khi đang thi)
================================================================= */
window.addEventListener('beforeunload', function() {
  var examScreen = document.getElementById('examScreen');
  if (!examScreen || examScreen.classList.contains('hidden')) return;
  // Exam đang hiển thị → user rời trang giữa chừng
  var mc = getMC(state.selectedModule || '');
  trackEvent('quiz_abandon', {
    module_id:        state.selectedModule || 'unknown',
    module_name:      mc.name || 'unknown',
    question_reached: state.currentIdx + 1,
    questions_answered: Object.keys(state.userAnswers || {}).length,
    time_remaining:   state.secondsLeft || 0
  });
});

(function init() {
  if (checkResume()) return;

  // Pre-select ATSEP → unlock dropdown Vị trí ngay khi load
  if ($('selChucDanh')) onChucDanhChange();

  // Live clock cho ATC status bar
  const updateClock = () => {
    const el = $('sysTime');
    if (!el) return;
    const now = new Date();
    el.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(n => String(n).padStart(2, '0'))
      .join(':') + ' UTC+7';
  };
  updateClock();
  setInterval(updateClock, 1000);

  // Scroll-to-top FAB
  const btn = document.createElement('button');
  btn.id        = 'scrollTopBtn';
  btn.title     = 'Lên đầu trang';
  btn.innerHTML = '&#8593;';
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();