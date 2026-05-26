/* ================================================================
   CNS Quiz — Application Logic  (js/app.js)
   ES6+ Clean Code | Refactored từ index.html monolith
   Phụ thuộc: js/questions.js phải được load trước file này.
================================================================= */

'use strict';

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
   NAVIGATION — Back / Retake
================================================================= */

function backToStart() {
  state.selectedModule = null;
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
   INIT — chạy khi DOM sẵn sàng
================================================================= */

(function init() {
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
