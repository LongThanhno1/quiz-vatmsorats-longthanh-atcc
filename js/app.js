// ── Theme (day / night) ──
function applyTheme(t) {
  document.body.setAttribute('data-theme', t);
  localStorage.setItem('cns_theme', t);
}
function toggleTheme() {
  const current = document.body.getAttribute('data-theme') || 'day';
  applyTheme(current === 'night' ? 'day' : 'night');
}
// Apply saved theme on load
(function() { applyTheme(localStorage.getItem('cns_theme') || 'night'); })();

// ── State ──
let selectedModule = null;
let quizMode       = 'exam';
let examQuestions  = [];
let userAnswers    = {};
let currentIdx     = 0;
let timerInterval  = null;
let secondsLeft    = 50 * 60;
let reviewFilter   = 'all';

// ── Transition timing (sync CSS ↔ JS) ──
const TR_DUR = 180;
const Q_DUR  = 100;
let   _qBusy = false;

// ── WEBHOOK ANALYTICS (fire-and-forget, ẩn danh) ──
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyTHnhK8qMxpPUtaL8Ezvi3_iDcEVpb9vWFe6lV87IR5Tr68MPfjD9NruMJ77ylWQuUVg/exec';
const TEAM_WEBHOOK_URL = "ANH_LONG_DIEN_URL_SAU_KHI_DEPLOY_APPS_SCRIPT";
let   currentViTri = ''; // Capture từ selViTri khi startExam(), dùng trong payload

// ── Helpers ──
const shuffle = arr => { let a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; };
const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const getMC = id => MODULE_CONFIG.find(m=>m.id===id)||{color:'#64748b',name:id,icon:'?',grd:'',bg:'',label:id};
const $ = id => document.getElementById(id);


// ── WEBHOOK HELPERS ──────────────────────────────────────────────────────
// Trả về timestamp ISO 8601 theo múi giờ UTC+7 (Việt Nam)
function getTimestampVN() {
  var d  = new Date();
  var vn = new Date(d.getTime() + 7 * 3600 * 1000);
  return vn.toISOString().replace('Z', '+07:00');
}

// Gửi 1 sự kiện câu hỏi lên Google Sheet webhook — async, không chặn UI
// Payload hoàn toàn ẩn danh: không gửi tên, email, hay định danh cá nhân
function sendQuestionWebhook(q, isWrong) {
  if (!WEBHOOK_URL) return;
  try {
    // GET + query params: không CORS preflight, không bị mất body qua redirect
    // Apps Script nhận qua e.parameter (doGet handler)
    var params = new URLSearchParams({
      ts:  getTimestampVN(),
      mod: q.module,
      vt:  currentViTri,
      qid: String(q.id),
      err: isWrong ? '1' : '0'
    });
    fetch(WEBHOOK_URL + '?' + params.toString(), {
      method: 'GET',
      mode:   'no-cors'
    }).catch(function() {});
  } catch(e) {}
}

// Gửi dữ liệu ẩn danh lên Team Dashboard webhook (GET, fire-and-forget)
// Chỉ gửi 4 trường: module, viTri, questionId, isWrong — không có PII
// Dùng GET + URLSearchParams để tránh mất body qua Apps Script 302 redirect
function logToTeamDashboard(module, viTri, questionId, isWrong) {
  if (!TEAM_WEBHOOK_URL || TEAM_WEBHOOK_URL.includes("ANH_LONG_DIEN")) return;
  try {
    var params = new URLSearchParams({
      ts:  new Date().toISOString(),
      mod: module,
      vt:  viTri,
      qid: String(questionId),
      err: isWrong ? '1' : '0'
    });
    fetch(TEAM_WEBHOOK_URL + '?' + params.toString(), {
      method: 'GET',
      mode:   'no-cors'
    }).catch(function() {});
  } catch(e) {
    console.warn("Không gửi được dữ liệu team dashboard:", e);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ── SRS HISTORY MODULE (localStorage key: 'cns_history_v1') ──────────────
// Lưu lịch sử ôn tập persist qua các session. Không reset nếu đã có data.
// Cấu trúc: {
//   seen:     {id: count}          — số lần hiển thị câu (exposure, giữ để thống kê)
//   wrong:    {id: count}          — số lần trả lời sai (giữ để thống kê)
//   lastSeen: {id: ms}             — timestamp lần cuối hiển thị
//   srs:      {id: {ef,reps,interval,due,lastReviewed,lapses}} — lịch ôn tập interval-based
// }
// ════════════════════════════════════════════════════════════════════════════
const HISTORY_KEY       = 'cns_history_v1';
const MS_PER_DAY        = 86400000; // 1 ngày tính bằng mili-giây — dùng chung cho cả module SRS
const MAX_INTERVAL_DAYS = 90;       // [CAP] trần interval — không câu nào "biến mất" khỏi vòng ôn quá 90 ngày
const LEECH_THRESHOLD   = 5;        // [LEECH] số lần sai (lapses) trở lên thì coi là câu khó dai dẳng

// Đọc history từ localStorage; khởi tạo cấu trúc mới nếu chưa tồn tại
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const h = JSON.parse(raw);
      // Đảm bảo các key chính luôn tồn tại (backward compat với data cũ chưa có field srs)
      if (!h.seen)     h.seen     = {};
      if (!h.wrong)    h.wrong    = {};
      if (!h.lastSeen) h.lastSeen = {};
      if (!h.srs)      h.srs      = {};
      return h;
    }
  } catch(e) {}
  // Khởi tạo mới nếu chưa có hoặc lỗi JSON.parse
  return { seen: {}, wrong: {}, lastSeen: {}, srs: {} };
}

// Ghi history vào localStorage (silent fail nếu storage quota đầy)
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch(e) {}
}

// Ghi nhận câu đã gặp: tăng seen[id]++ và cập nhật lastSeen[id]
// Gọi khi người dùng chọn đáp án bất kỳ (cả exam & practice mode) — thuần thống kê exposure,
// KHÔNG liên quan tới lịch ôn tập (xem srsGrade bên dưới).
function srsRecordSeen(id) {
  if (!id) return;
  const h = loadHistory();
  h.seen[id]     = (h.seen[id]     || 0) + 1;
  h.lastSeen[id] = Date.now();   // ms timestamp, giữ cho mục đích thống kê/debug
  saveHistory(h);
}

// ── SRS GRADING (interval-based, SM-2 rút gọn cho input nhị phân đúng/sai) ──
// Gọi đúng 1 lần cho mỗi câu NGAY KHI biết kết quả đúng/sai:
//   - Practice mode: gọi ngay trong selectOpt() vì biết kết quả tức thì.
//   - Exam mode: gọi trong doSubmit() sau khi chấm toàn bộ bài.
// Công thức (SM-2 rút gọn, quality nhị phân thay vì thang 0-5):
//   Đúng → reps++; interval: 1 → 6 → round(interval * ef), trần MAX_INTERVAL_DAYS; ef += 0.1 (cap 3.0)
//   Sai  → reps=0; interval=1 (mai ôn lại ngay); ef -= 0.2 (sàn 1.3, chuẩn SM-2); lapses++ (đếm leech)
//   due  = now + interval ngày
function srsGrade(id, isCorrect) {
  if (!id) return;
  id = String(id);
  const h = loadHistory();
  if (!isCorrect) h.wrong[id] = (h.wrong[id] || 0) + 1; // giữ thống kê wrong[] như cũ

  const NOW = Date.now();
  let s = h.srs[id] || { ef: 2.5, reps: 0, interval: 0, due: 0, lastReviewed: 0, lapses: 0 };
  if (s.lapses === undefined) s.lapses = 0; // backward-compat: câu đã có srs từ trước nhưng chưa có field lapses

  if (isCorrect) {
    s.reps++;
    if (s.reps === 1)      s.interval = 1;
    else if (s.reps === 2) s.interval = 6;
    else                   s.interval = Math.round(s.interval * s.ef);
    s.interval = Math.min(MAX_INTERVAL_DAYS, s.interval); // [CAP]
    s.ef = Math.min(3.0, s.ef + 0.1);
  } else {
    s.reps     = 0;
    s.interval = 1;
    s.ef       = Math.max(1.3, s.ef - 0.2);
    s.lapses++; // [LEECH] mỗi lần trượt tính 1 lapse, tích lũy suốt vòng đời câu hỏi
  }
  s.due          = NOW + s.interval * MS_PER_DAY;
  s.lastReviewed = NOW;
  h.srs[id] = s;
  saveHistory(h);
}

// [LEECH] Câu bị sai >= LEECH_THRESHOLD lần → "leech": học mãi không thuộc. Thường là dấu
// hiệu câu khó thật sự, nhưng cũng có thể là tín hiệu câu hỏi/đáp án bị lỗi nội dung cần rà soát.
function srsIsLeech(id) {
  const h = loadHistory();
  const s = h.srs[String(id)];
  return !!(s && s.lapses >= LEECH_THRESHOLD);
}

// ── Priority dùng chung cho selection (exam), đếm due (badge) và sắp thứ tự (practice) ──
//   - Chưa từng học (reps===0, kể cả câu mới hoặc vừa trả lời sai gần nhất) → ưu tiên TUYỆT ĐỐI.
//   - Đã đến hạn ôn lại (due <= now) → ưu tiên theo mức độ QUÁ HẠN (quá hạn càng lâu càng ưu tiên).
//   - Chưa đến hạn (due > now) → ưu tiên thấp nhất.
const SRS_DUE_BASE = 50000; // ngưỡng phân biệt "cần ôn" (>= ngưỡng) và "chưa cần" (< ngưỡng)
function srsPriorityOf(h, id, NOW) {
  const s = h.srs[String(id)];
  if (!s || s.reps === 0) return 100000;
  if (s.due <= NOW)       return SRS_DUE_BASE + (NOW - s.due) / MS_PER_DAY;
  return -(s.due - NOW) / MS_PER_DAY;
}

// [BADGE] Đếm số câu "cần ôn" (mới + quá hạn) trong 1 pool — dùng cho badge "X câu đến hạn hôm nay"
function srsCountDue(rawPool) {
  const h = loadHistory(), NOW = Date.now();
  return rawPool.reduce(function(n, q) {
    return n + (srsPriorityOf(h, q.id, NOW) >= SRS_DUE_BASE ? 1 : 0);
  }, 0);
}

// ── SRS SELECTION ALGORITHM (Exam mode — interval-based, giới hạn 50 câu) ────
//   Nếu số câu "cần ôn" (mới + quá hạn) >= 50 → lấy đúng 50 câu quá hạn/mới nhất.
//   Nếu chưa đủ 50 → lấp đầy bằng câu CHƯA đến hạn, chọn ngẫu nhiên để đa dạng.
function srsSelectQuestions(rawPool) {
  const h        = loadHistory();
  const NOW      = Date.now();
  const MAX_DRAW = 50;

  // Shuffle trước khi tính priority để các câu đồng hạng được xáo ngẫu nhiên
  // thay vì luôn giữ thứ tự cố định theo id gốc.
  const scored = shuffle(rawPool).map(function(q) {
    return { q: q, priority: srsPriorityOf(h, q.id, NOW) };
  });
  scored.sort(function(a, b) { return b.priority - a.priority; });

  const duePool  = scored.filter(function(s) { return s.priority >= SRS_DUE_BASE; }).map(function(s) { return s.q; });
  const restPool = scored.filter(function(s) { return s.priority <  SRS_DUE_BASE; }).map(function(s) { return s.q; });

  let selected;
  if (duePool.length >= MAX_DRAW) {
    selected = duePool.slice(0, MAX_DRAW);
  } else {
    const pickRest = shuffle(restPool).slice(0, MAX_DRAW - duePool.length);
    selected = duePool.concat(pickRest);
  }

  return shuffle(selected).map(function(q) {
    return Object.assign({}, q, { options: shuffle(q.options) });
  });
}

// ── SRS ORDERING (Practice mode — KHÔNG giới hạn số câu, chỉ sắp thứ tự ưu tiên) ──
// "Ôn tập" vẫn cho học toàn bộ pool đúng như trước, nhưng giờ câu cần ôn nhất
// (mới/quá hạn) luôn xuất hiện TRƯỚC — nếu thoát giữa chừng vẫn ưu tiên đúng
// phần quan trọng nhất thay vì random thuần túy như trước đây.
function srsOrderForPractice(rawPool) {
  const h   = loadHistory();
  const NOW = Date.now();
  const scored = shuffle(rawPool).map(function(q) {
    return { q: q, priority: srsPriorityOf(h, q.id, NOW) };
  });
  scored.sort(function(a, b) { return b.priority - a.priority; });
  return scored.map(function(s) {
    return Object.assign({}, s.q, { options: shuffle(s.q.options) });
  });
}

// ── CASCADE DROPDOWN LOGIC ──
function onChucDanhChange() {
  const cd = $('selChucDanh').value;
  const grpVT  = $('groupViTri');
  const grpMod = $('groupModule');

  // Reset downstream dropdowns
  $('selViTri').value = '';
  $('selModule').innerHTML = '<option value="">— Chọn module —</option>';
  $('btnStart').disabled = true;

  if (cd) {
    grpVT.style.opacity = '1';
    grpVT.style.pointerEvents = 'auto';
    grpVT.classList.remove('cascade-in');
    void grpVT.offsetWidth; // reflow để trigger animation
    grpVT.classList.add('cascade-in');
  } else {
    grpVT.style.opacity = '0.35';
    grpVT.style.pointerEvents = 'none';
  }
  grpMod.style.opacity = '0.35';
  grpMod.style.pointerEvents = 'none';
}

function onViTriChange() {
  const cd = $('selChucDanh').value;
  const vt = $('selViTri').value;
  const grpMod = $('groupModule');
  const selMod = $('selModule');

  selMod.innerHTML = '<option value="">— Chọn module —</option>';
  $('btnStart').disabled = true;

  if (cd && vt) {
    const mIds = (LOCATION_MODULE_MAP[cd] && LOCATION_MODULE_MAP[cd][vt]) || [];
    mIds.forEach(mId => {
      const mc  = getMC(mId);
      const opt = document.createElement('option');
      opt.value = mId;
      if (quizMode === 'practice') {
        // Hiện số câu thực tế trong pool
        const poolSize = questionBank.filter(q => q.module === mId).length;
        opt.textContent = `${mc.icon}  ${mc.name}  —  ${poolSize} câu`;
      } else {
        const poolSize = questionBank.filter(q => q.module === mId).length;
        const drawCount = Math.min(mc.draw || 50, poolSize);
        opt.textContent = `${mc.icon}  ${mc.name}  —  ${drawCount} câu`;
      }
      selMod.appendChild(opt);
    });
    selMod.disabled = false;
    // Unlock visual
    grpMod.classList.remove('locked');
    const lockSvg = $('lockIcon');
    if (lockSvg) lockSvg.style.display = 'none';
    grpMod.style.opacity = '1';
    grpMod.style.pointerEvents = 'auto';
    grpMod.classList.remove('cascade-in');
    void grpMod.offsetWidth;
    grpMod.classList.add('cascade-in');
  } else {
    selMod.disabled = true;
    grpMod.classList.add('locked');
    const lockSvg = $('lockIcon');
    if (lockSvg) lockSvg.style.display = '';
    grpMod.style.opacity = '0.35';
    grpMod.style.pointerEvents = 'none';
  }
}

function onModuleChange() {
  const modId = $('selModule').value;
  $('btnStart').disabled = !modId;

  // [SRS] Badge "X câu đến hạn hôm nay" cho module vừa chọn
  const badge = $('srsDueBadge');
  if (badge) {
    if (modId) {
      const rawPool = questionBank.filter(q => q.module === modId);
      const due = srsCountDue(rawPool);
      badge.style.display = 'inline-flex';
      badge.textContent = due > 0 ? `⏰ ${due} câu đến hạn ôn` : '✓ Chưa có câu nào đến hạn';
      badge.style.color = due > 0 ? '#f59e0b' : '#34d399';
      badge.style.borderColor = due > 0 ? 'rgba(245,158,11,0.35)' : 'rgba(52,211,153,0.3)';
      badge.style.background = due > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(52,211,153,0.06)';
    } else {
      badge.style.display = 'none';
    }
  }
}

// ── QUIZ MODE SELECTOR ──
function setQuizMode(mode) {
  quizMode = mode;
  const bE = $('btnModeExam');
  const bP = $('btnModePractice');
  const lbl = $('btnStartLabel');
  if (bE) { bE.className = 'mode-btn' + (mode==='exam'     ? ' active-exam'     : ''); }
  if (bP) { bP.className = 'mode-btn' + (mode==='practice' ? ' active-practice' : ''); }
  if (lbl) lbl.textContent = mode === 'practice' ? 'BẮT ĐẦU ÔN TẬP' : 'VÀO LÀM BÀI';
  // Cập nhật lại dropdown module nếu đã chọn vị trí
  if ($('selViTri') && $('selViTri').value) onViTriChange();

  // Nếu đang trong exam screen, cập nhật nút submit label
  const examScreen = $('examScreen');
  if (examScreen && !examScreen.classList.contains('hidden')) {
    const submitBtn = $('btnSubmit');
    if (submitBtn) {
      submitBtn.innerHTML = mode === 'practice'
        ? '✅ Hoàn thành'
        : '✈ Nộp Bài';
    }
    // Ẩn/hiện timer theo mode khi resume
    const timerDisp = $('timerDisplay');
    if (timerDisp) {
      timerDisp.style.display = mode === 'practice' ? 'none' : '';
    }
    // Ẩn/hiện nút thoát ôn tập
    const exitBtn = $('btnExitPractice');
    if (exitBtn) {
      exitBtn.style.display = mode === 'practice' ? 'inline-block' : 'none';
    }
  }
}

// ── WELCOME SCREEN: VÀO LÀM BÀI handler ──
function onStartExam() {
  const mod = $('selModule').value;
  if (!mod) return;
  const ss = $('startScreen');
  ss.classList.add('screen-exit');
  // setTimeout EXACTLY matches CSS screen-exit duration (TR_DUR = 180ms)
  setTimeout(() => {
    ss.classList.add('hidden');
    ss.classList.remove('screen-exit');
    startExam(mod);
  }, TR_DUR);
}

// ── START EXAM (direct — no modal) ──
// SECURITY: chỉ lấy câu từ questionBank đã nạp sẵn — không tạo câu mới.
// Nếu pool < 50 → lấy toàn bộ; nếu pool >= 50 → bốc ngẫu nhiên đúng 50 câu.
function startExam(moduleId) {
  // [HEATMAP] Ẩn panel khi bắt đầu bài mới
  var _hpHide = $('heatmapPanel');
  if (_hpHide) _hpHide.style.display = 'none';

  selectedModule = moduleId;
  currentViTri   = ($('selViTri') && $('selViTri').value) || ''; // [WEBHOOK] Lưu vị trí thi
  const mc       = getMC(moduleId);

  // --- STRICT POOL: chỉ câu thuộc đúng module này ---
  const rawPool  = questionBank.filter(q => q.module === moduleId);

  // GA4
  if (typeof gtag === 'function') gtag('event', quizMode==='practice' ? 'practice_start' : 'quiz_start',
    {module_id: moduleId, module_name: mc.name});

  if (rawPool.length === 0) {
    alert(`⚠ Module "${mc.label}" chưa có câu hỏi trong ngân hàng đề.\nVui lòng bổ sung dữ liệu vào questionBank trước khi thi.`);
    return;
  }

  // [SRS] Exam mode: chọn tối đa 50 câu ưu tiên theo lịch ôn tập (due-based)
  // [SRS] Practice mode: lấy TOÀN BỘ pool nhưng sắp câu cần ôn nhất (mới/quá hạn) lên đầu
  if (quizMode === 'exam') {
    examQuestions = srsSelectQuestions(rawPool);
  } else {
    examQuestions = srsOrderForPractice(rawPool);
  }

  userAnswers  = {};
  currentIdx   = 0;
  secondsLeft  = 50 * 60;

  // Practice mode: ẩn timer, không countdown
  const timerDisp = $('timerDisplay');
  if (quizMode === 'practice') {
    if (timerDisp) timerDisp.style.display = 'none';
  } else {
    if (timerDisp) timerDisp.style.display = '';
  }

  // startScreen already hidden by onStartExam; show examScreen with enter animation
  const es = $('examScreen');
  es.classList.remove('hidden');
  es.classList.add('screen-enter');
  // Remove will-change after animation completes to free GPU layer
  setTimeout(() => es.classList.remove('screen-enter'), TR_DUR + 20);

  const badge = $('examModuleBadge');
  badge.textContent   = mc.label;
  badge.style.background  = mc.bg;
  badge.style.color       = mc.color;
  badge.style.border      = `1px solid ${mc.color}55`;

  // Update submit button label theo mode
  const submitBtn = $('btnSubmit');
  if (submitBtn) {
    submitBtn.innerHTML = quizMode === 'practice'
      ? '✅ Hoàn thành'
      : '✈ Nộp Bài';
  }

  // Show/hide exit button cho practice mode
  const exitBtn = $('btnExitPractice');
  if (exitBtn) exitBtn.style.display = quizMode === 'practice' ? 'inline-block' : 'none';

  renderNavGrids();
  showQ(0);
  startTimer();
}

// ── TIMER ──
function startTimer() {
  clearInterval(timerInterval);
  if (quizMode === 'practice') return;  // Practice: không đếm giờ
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    secondsLeft--;
    updateTimerDisplay();
    if (secondsLeft <= 0) { clearInterval(timerInterval); doSubmit(true); }
  }, 1000);
}

function updateTimerDisplay() {
  const el = $('timerText');
  el.textContent = fmt(secondsLeft);
  if (secondsLeft < 300) {
    el.className = 'timer-warn text-red-400 text-lg';
    $('timerDisplay').style.borderColor  = 'rgba(239,68,68,0.5)';
    $('timerDisplay').style.background   = 'rgba(239,68,68,0.1)';
  } else if (secondsLeft < 600) {
    el.className = 'text-amber-400 text-lg';
  } else {
    el.className = 'text-sky-300 text-lg';
  }
}

// ── SHOW QUESTION ──
// ── SHOW QUESTION (animated, for prev/next) ──
function showQ(idx) {
  if (idx < 0 || idx >= examQuestions.length) return;
  const card = $('questionCard');
  if (idx === currentIdx) { _doRenderQ(idx); return; }
  if (_qBusy) return; // debounce: ignore rapid taps
  _qBusy = true;
  card.classList.add('q-fade-out');        // fade out in Q_DUR=100ms
  setTimeout(() => {
    card.classList.remove('q-fade-out');   // content switches here
    _doRenderQ(idx);                        // renders new question instantly
    // fade-in is handled automatically by CSS transition reversal
    setTimeout(() => { _qBusy = false; }, 160);
  }, Q_DUR);
}

// ── SHOW QUESTION (instant, for sidebar/grid navigation) ──
function showQInstant(idx) {
  if (idx < 0 || idx >= examQuestions.length) return;
  _qBusy = false; // always allow grid jump
  $('questionCard').classList.remove('q-fade-out');
  _doRenderQ(idx);
}

// ── RENDER QUESTION CONTENT (shared by both showQ variants) ──
function _doRenderQ(idx) {
  currentIdx = idx;
    const q   = examQuestions[idx];
  const mc  = getMC(q.module);
  const ans = userAnswers[idx] !== undefined;
  const tot = examQuestions.length;
  const cnt = Object.keys(userAnswers).length;

  // Reset practice feedback khi chuyển câu
  const fb2 = $('practiceFeedback');
  if (fb2) { fb2.style.display='none'; fb2.textContent=''; fb2.className=''; }

  $('qModuleBadge').textContent = mc.label;
  $('qModuleBadge').style.background = mc.bg;
  $('qModuleBadge').style.color      = mc.color;
  $('qNumber').textContent    = `Câu ${idx+1} / ${tot}`;
  $('questionText').textContent = q.question;
  $('progressText').textContent = `${cnt}/${tot} đã trả lời`;
  $('navInfo').textContent      = `${cnt}/${tot} đã trả lời`;
  $('progressBar').style.width  = (cnt/tot*100)+'%';
  ans ? $('qAnsweredBadge').classList.remove('hidden')
      : $('qAnsweredBadge').classList.add('hidden');

  const labels = ['A','B','C','D'];
  // Trong practice mode: nếu câu đã trả lời → render lại với highlight
  const alreadyAnswered = quizMode === 'practice' && userAnswers[idx] !== undefined;

  $('optionsContainer').innerHTML = q.options.map((opt,i) => {
    const sel = userAnswers[idx] === opt;
    const esc = opt.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
    return `<div class="option-btn ${sel?'selected':''}"
                 onclick="selectOpt(${idx},this,'${esc}')">
      <span style="min-width:26px;width:26px;height:26px;border-radius:50%;
                   background:rgba(56,189,248,0.18);border:1px solid rgba(56,189,248,0.35);
                   display:flex;align-items:center;justify-content:center;
                   font-size:11px;font-weight:800;flex-shrink:0;color:#7dd3fc;
                   letter-spacing:0">${labels[i]}</span>
      <span style="font-size:14px;line-height:1.5;color:rgba(255,255,255,0.92)">${opt}</span>
    </div>`;
  }).join('');

  // Practice mode: nếu câu đã trả lời → re-apply highlight sau khi render
  if (alreadyAnswered) {
    const ua2 = userAnswers[idx];
    document.querySelectorAll('#optionsContainer .option-btn').forEach(btn => {
      const spans = btn.querySelectorAll('span');
      const optText = spans[spans.length-1]?.textContent;
      btn.classList.add('opt-disabled');
      if (optText === q.correctAnswer) btn.classList.add('opt-correct');
      else if (optText === ua2 && ua2 !== q.correctAnswer) btn.classList.add('opt-wrong');
    });
    const isOk = ua2 === q.correctAnswer;
    const fb3 = $('practiceFeedback');
    if (fb3) {
      fb3.style.display = 'block';
      fb3.className = isOk ? 'correct' : 'wrong';
      fb3.textContent = isOk ? '✓ Chính xác!' : `✗ Đáp án đúng là: ${q.correctAnswer}`;
    }
  }

  // Cập nhật nút Next → "Hoàn thành & nộp bài" ở câu cuối
  const btnNext = $('btnNextQ');
  if (btnNext) {
    const isLast = idx === examQuestions.length - 1;
    if (isLast) {
      btnNext.innerHTML = '✅ Hoàn thành &amp; nộp bài';
      btnNext.style.background = 'linear-gradient(135deg,#10b981,#059669)';
      btnNext.style.borderColor = 'rgba(16,185,129,0.4)';
      btnNext.style.color = '#fff';
      btnNext.style.fontWeight = '700';
      btnNext.style.boxShadow = '0 0 16px rgba(16,185,129,0.35)';
    } else {
      btnNext.innerHTML = 'Tiếp ▶';
      btnNext.style.background = 'rgba(255,255,255,0.035)';
      btnNext.style.borderColor = '';
      btnNext.style.color = '';
      btnNext.style.fontWeight = '';
      btnNext.style.boxShadow = '';
    }
  }

  renderSegBar(idx);
  updateNavGrids();
  updateSidebarStats();
}

function renderSegBar(currentIdx) {
  var tot = examQuestions.length;
  var cnt = Object.keys(userAnswers).length;
  var bar = $('segBar');
  if (!bar) return;
  bar.innerHTML = '';
  for (var i = 0; i < tot; i++) {
    var seg = document.createElement('div');
    seg.style.cssText = 'flex:1;min-width:0;height:6px;border-radius:2px;transition:background 0.15s;';
    if (userAnswers[i] !== undefined) {
      seg.style.background = '#0ea5e9';
    } else if (i === currentIdx) {
      seg.style.background = '#f59e0b';
    } else {
      seg.style.background = 'rgba(255,255,255,0.1)';
    }
    bar.appendChild(seg);
  }
  var sc = $('segCurrent');   if (sc) sc.textContent = currentIdx + 1;
  var st = $('segTotal');     if (st) st.textContent = tot;
  var sa = $('segAnswered');  if (sa) sa.textContent = cnt;
  var sr = $('segRemaining'); if (sr) sr.textContent = tot - cnt;
}

function selectOpt(idx, el, val) {
  userAnswers[idx] = val;
  // [SRS] Ghi nhận câu đã gặp khi người dùng chọn đáp án (cả exam & practice)
  srsRecordSeen(examQuestions[idx].id);
  document.querySelectorAll('#optionsContainer .option-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  $('qAnsweredBadge').classList.remove('hidden');
  const cnt = Object.keys(userAnswers).length;
  const tot = examQuestions.length;
  $('progressText').textContent = `${cnt}/${tot} đã trả lời`;
  $('navInfo').textContent      = `${cnt}/${tot} đã trả lời`;
  $('progressBar').style.width  = (cnt/tot*100)+'%';
  renderSegBar(idx);

  // Practice mode: hiện feedback ngay
  if (quizMode === 'practice') {
    const q = examQuestions[idx];
    const isCorrect = val === q.correctAnswer;
    // [SRS] Chấm điểm + cập nhật lịch ôn tập ngay (practice mode biết kết quả tức thì)
    srsGrade(q.id, isCorrect);
    // Highlight tất cả options
    document.querySelectorAll('#optionsContainer .option-btn').forEach(btn => {
      const btnVal = btn.getAttribute('data-val') || btn.querySelector('span:last-child')?.textContent;
      btn.classList.add('opt-disabled');
      if (btn === el && !isCorrect) btn.classList.add('opt-wrong');
    });
    // Tìm option đúng và highlight
    document.querySelectorAll('#optionsContainer .option-btn').forEach(btn => {
      const spans = btn.querySelectorAll('span');
      const optText = spans[spans.length-1]?.textContent;
      if (optText === q.correctAnswer) btn.classList.add('opt-correct');
    });
    // Feedback message
    const fb = $('practiceFeedback');
    if (fb) {
      fb.style.display = 'block';
      fb.className = isCorrect ? 'correct' : 'wrong';
      fb.textContent = isCorrect
        ? '✓ Chính xác!'
        : `✗ Đáp án đúng là: ${q.correctAnswer}`;
    }
    // [WEBHOOK] Practice mode: gửi ngay vì đã biết đúng/sai
    sendQuestionWebhook(q, !isCorrect);
    logToTeamDashboard(q.module, currentViTri, q.id, !isCorrect);
    // [HEATMAP] Ghi nhận câu trả lời vào nhật ký ôn tập hôm nay
    StudyHeatmap.logAnswer(!isCorrect);
  }

  updateNavGrids();
  updateSidebarStats();
}

function prevQ() { showQ(currentIdx-1); }
function nextQ() {
  if (currentIdx >= examQuestions.length - 1) {
    if (quizMode === 'practice') {
      doSubmit(false); // Hoàn thành thẳng, không modal
    } else {
      confirmSubmit(); // Exam: hiện modal confirm
    }
    return;
  }
  showQ(currentIdx+1);
}

// ── NAV GRID ──
function renderNavGrids() {
  ['desktopNavGrid','mobileNavGrid'].forEach(id => {
    $(id).innerHTML = examQuestions.map((_,i) => {
      const a = userAnswers[i] !== undefined;
      const c = i === currentIdx;
      return `<button onclick="goToQ(${i})" class="nav-btn ${a?'answered':''} ${c?'current':''}">${i+1}</button>`;
    }).join('');
  });
}
function updateNavGrids() { renderNavGrids(); }

function updateSidebarStats() {
  const a = Object.keys(userAnswers).length, t = examQuestions.length;
  const pct = t ? Math.round(a/t*100) : 0;
  const html = `<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:4px"><span>Tiến độ</span><span>${a}/${t}</span></div>
    <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#0ea5e9,#6366f1);border-radius:2px;transition:width .3s"></div>
    </div>`;
  $('sidebarStats').innerHTML = html;
  if ($('mobileStats')) $('mobileStats').innerHTML = html;
}

function goToQ(i) {
  showQInstant(i); // sidebar/grid: instant, no animation
  const d = $('mobileDrawer');
  if (d && d.classList.contains('open')) toggleDrawer();
}

// ── DRAWER ──
function toggleDrawer() {
  const d = $('mobileDrawer'), o = $('drawerOverlay');
  d.classList.toggle('open');
  o.classList.toggle('hidden');
  if (d.classList.contains('open')) { renderNavGrids(); updateSidebarStats(); }
}

// ── SUBMIT ──
function confirmSubmit() {
  // Practice mode: không cần confirm, submit thẳng
  if (quizMode === 'practice') {
    doSubmit(false);
    return;
  }
  // Exam mode: hiện modal confirm
  const a = Object.keys(userAnswers).length, t = examQuestions.length;
  $('modalStats').innerHTML = `<div>Đã trả lời: <b style="color:#10b981">${a}</b> / ${t}</div>
    ${t-a>0 ? `<div style="color:#f59e0b;margin-top:4px">⚠ Còn ${t-a} câu chưa trả lời</div>`
            : '<div style="color:#10b981;margin-top:4px">✓ Đã hoàn thành tất cả!</div>'}`;
  $('submitModal').classList.remove('hidden');
}
function closeSubmitModal() { $('submitModal').classList.add('hidden'); }

function doSubmit(auto=false) {
  clearInterval(timerInterval);
  closeSubmitModal();

  // Practice mode: về thẳng menu sau khi hoàn thành
  if (quizMode === 'practice') {
    clearInterval(timerInterval);
    clearQuizState();
    if (typeof RESULT_SAVE_KEY !== 'undefined') {
      localStorage.removeItem(RESULT_SAVE_KEY);
    }
    const es = $('examScreen');
    const ss = $('startScreen');
    const td = $('timerDisplay');
    if (es) es.classList.add('hidden');
    if (td) td.style.display = '';
    if (ss) {
      ss.classList.remove('hidden');
      ss.classList.add('screen-enter');
      setTimeout(() => ss.classList.remove('screen-enter'), TR_DUR + 20);
    }
    selectedModule = null;
    examQuestions  = [];
    userAnswers    = {};
    if (typeof onChucDanhChange === 'function') onChucDanhChange();
    setQuizMode('exam'); // [FIX] Reset visual mode buttons + label về "Thi thử"
    // [HEATMAP] Hiện nhật ký ôn tập bên dưới startScreen
    StudyHeatmap.render();
    var _hp = $('heatmapPanel');
    if (_hp) _hp.style.display = 'block';
    return;
  }

  $('examScreen').classList.add('hidden');
  $('resultScreen').classList.remove('hidden');
  // [HEATMAP] Render và hiện panel sau khi nộp bài thi thử
  StudyHeatmap.render();
  var _hp2 = $('heatmapPanel');
  if (_hp2) _hp2.style.display = 'block';
  // Luôn hiện scroll-to-top trên màn hình kết quả
  const _sb = $('scrollTopBtn');
  if (_sb) _sb.classList.add('visible');

  let correct = 0;
  examQuestions.forEach((q,i) => { if (userAnswers[i] === q.correctAnswer) correct++; });

  // [WEBHOOK + HEATMAP] Exam mode: gửi batch sau khi nộp bài (đã biết đúng/sai toàn bộ)
  examQuestions.forEach(function(q, i) {
    if (userAnswers[i] === undefined) return; // Bỏ câu chưa trả lời
    var _isWrong = userAnswers[i] !== q.correctAnswer;
    sendQuestionWebhook(q, _isWrong);
    logToTeamDashboard(q.module, currentViTri, q.id, _isWrong);
    // [HEATMAP] Ghi nhận từng câu vào nhật ký ôn tập hôm nay
    StudyHeatmap.logAnswer(_isWrong);
  });

  // [SRS] Chấm điểm + cập nhật lịch ôn tập sau khi nộp bài (chỉ chạy ở exam mode)
  // Đây là dữ liệu cốt lõi để SRS lên lịch ôn tập interval-based cho lần thi tiếp theo.
  // FIX: bỏ qua câu chưa trả lời — trước đây bị tính nhầm thành "sai" do
  // (undefined !== q.correctAnswer) luôn true, làm méo dữ liệu ưu tiên SRS.
  examQuestions.forEach(function(q, i) {
    if (userAnswers[i] === undefined) return; // câu chưa trả lời: không chấm, không tính vào lịch ôn
    srsGrade(q.id, userAnswers[i] === q.correctAnswer);
  });

  // GA4
  const _pct2 = Math.round(correct/examQuestions.length*100);
  if (typeof gtag === 'function') gtag('event', quizMode==='practice' ? 'practice_complete' : 'quiz_complete',
    {module_id: selectedModule, score_pct: _pct2, auto_submit: auto||false});

  // Restore timer display nếu đang ở practice mode
  const _td = $('timerDisplay');
  if (_td) _td.style.display = '';

  const total  = examQuestions.length;
  const pct    = Math.round(correct/total*100);
  const passed = pct >= 70;
  const mc     = getMC(selectedModule);

  $('resultModuleName').textContent = mc.name;
  $('resultModuleName').style.color = mc.color;
  $('scorePct').textContent   = pct+'%';
  $('scorePct').style.color   = '';
  $('scoreDetail').textContent = `${correct}/${total}`;
  const ps = $('passStatus');
  ps.textContent = passed ? '✓ ĐẠT' : '✗ KHÔNG ĐẠT';
  ps.className   = 'result-tag ' + (passed ? 'pass' : 'fail');
  // Elapsed time
  const elapsed = 3000 - secondsLeft;
  const em = Math.floor(elapsed/60), es = elapsed%60;
  const rtEl = $('resultTime');
  if (rtEl) rtEl.textContent = String(em).padStart(2,'0')+':'+String(es).padStart(2,'0');

  setTimeout(() => {
    $('scoreBar').style.width = pct+'%';
    $('scoreBar').style.background = passed
      ? 'linear-gradient(90deg,#10b981,#34d399)'
      : 'linear-gradient(90deg,#ef4444,#f87171)';
  }, 100);

  renderReview('all');
}

// ── EXIT PRACTICE ──
function exitPractice() {
  if (!confirm('Thoát ôn tập? Kết quả sẽ không được lưu.')) return;
  clearInterval(timerInterval);
  clearQuizState();
  const es = $('examScreen');
  const ss = $('startScreen');
  if (es) es.classList.add('hidden');
  if (ss) {
    ss.classList.remove('hidden');
    ss.classList.add('screen-enter');
    setTimeout(() => ss.classList.remove('screen-enter'), TR_DUR + 20);
  }
  selectedModule = null;
  examQuestions = [];
  userAnswers = {};
  onChucDanhChange();
  setQuizMode('exam'); // [FIX] Reset visual mode buttons + label về "Thi thử"
}

// ── REVIEW ──
function filterReview(f) {
  reviewFilter = f;
  ['all','wrong','correct'].forEach(k => {
    const key = 'f' + k.charAt(0).toUpperCase() + k.slice(1);
    const el = $(key);
    if (el) {
      el.className = 'f-tab' + (reviewFilter===k ? ' active' : '');
    }
  });
  renderReview(f);
}

function renderReview(filter) {
  const mc     = getMC(selectedModule);
  const labels = ['A','B','C','D'];
  const items  = examQuestions.map((q,i) => {
    const ua = userAnswers[i];
    const ok = ua === q.correctAnswer;
    return {q,i,ua,ok};
  }).filter(({ok}) =>
    filter === 'all' || (filter === 'correct' && ok) || (filter === 'wrong' && !ok)
  );

  $('reviewList').innerHTML = items.length ? items.map(({q,i,ua,ok}) => `
    <div class="review-card-item ${ok?'correct':'wrong'}">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
        <div style="width:24px;height:24px;border-radius:50%;flex-shrink:0;
                    display:flex;align-items:center;justify-content:center;
                    font-weight:900;font-size:12px;margin-top:2px;
                    background:${ok?'rgba(16,185,129,0.18)':'rgba(239,68,68,0.18)'};
                    color:${ok?'#10b981':'#ef4444'}">${ok?'✓':'✗'}</div>
        <div>
          <div style="font-size:11px;color:${mc.color};font-weight:800;margin-bottom:4px">
            ${mc.label} — Câu ${i+1}
            ${(!ok && typeof srsIsLeech === 'function' && srsIsLeech(q.id)) ? '<span style="margin-left:6px;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:800;color:#fbbf24;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3)">⚠ Sai nhiều lần — cần xem lại</span>' : ''}
          </div>
          <p style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.92);line-height:1.5;margin:0">${q.question}</p>
        </div>
      </div>
      <div style="padding-left:34px">
        ${q.options.map((opt,oi) => {
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
            <div style="font-size:11px;font-weight:800;color:#34d399;margin-bottom:4px">
              📌 Đáp án đúng:
            </div>
            <div style="font-size:13px;color:white;font-weight:600">${q.correctAnswer}</div>
            ${q.refDoc ? `<div style="margin-top:6px;font-size:11px;color:#64748b;">
              📄 Tài liệu: <span style="color:#38bdf8">${q.refDoc}</span></div>` : ''}
          </div>` : ''}
      </div>
    </div>`).join('')
    : '<div style="text-align:center;color:#64748b;padding:32px 0">Không có câu nào phù hợp</div>';
}

// ── WRONG REVIEW ──
function openWrongReview() {
  var hdr = $('reviewHeader');
  var btn = $('btnReviewWrong');
  if (!hdr) return;
  hdr.style.display = 'block';
  filterReview('wrong');
  var wrongCount = examQuestions.filter((q,i) => userAnswers[i] !== q.correctAnswer).length;
  var title = $('reviewTitle');
  if (title) title.textContent = 'Câu sai: ' + wrongCount + '/' + examQuestions.length;
  hdr.scrollIntoView({behavior:'smooth', block:'start'});
  if (btn) {
    btn.textContent = '📋 Đang xem câu sai (' + wrongCount + ')';
    btn.style.background = 'rgba(239,68,68,0.2)';
  }
}

function hideReview() {
  var hdr = $('reviewHeader');
  var btn = $('btnReviewWrong');
  if (hdr) hdr.style.display = 'none';
  $('reviewList').innerHTML = '';
  if (btn) {
    btn.textContent = '📋 Ôn lại câu sai';
    btn.style.background = 'rgba(239,68,68,0.1)';
  }
}

// ── NAVIGATION ──
function backToStart() {
  quizMode = 'exam';
  selectedModule = null;
  const _sb = $('scrollTopBtn'); if (_sb) _sb.classList.remove('visible');
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
  const _sb = $('scrollTopBtn'); if (_sb) _sb.classList.remove('visible');
  const mod = selectedModule;
  const from = $('resultScreen');
  from.classList.add('screen-exit');
  setTimeout(() => {
    from.classList.add('hidden');
    from.classList.remove('screen-exit');
   startExam(mod);
  }, TR_DUR);
}

// ── INIT ──
const QUIZ_SAVE_KEY = 'cns_quiz_state_v3';

function saveQuizState() {
  if (!selectedModule || !examQuestions.length) return;
  try {
    sessionStorage.setItem(QUIZ_SAVE_KEY, JSON.stringify({
      module: selectedModule,
      quizMode: quizMode,
      questions: examQuestions,
      answers: userAnswers,
      currentQ: currentIdx,
      timeLeft: secondsLeft,
      savedAt: Date.now()
    }));
  } catch(e) {}
}

function clearQuizState() { sessionStorage.removeItem(QUIZ_SAVE_KEY); }

function checkResume() {
  try {
    const raw = sessionStorage.getItem(QUIZ_SAVE_KEY);
    if (!raw) return false;
    const snap = JSON.parse(raw);
    if (Date.now() - snap.savedAt > 3 * 3600 * 1000) { clearQuizState(); return false; }
    // Restore state
    selectedModule = snap.module;
    quizMode = snap.quizMode || 'exam';
    examQuestions  = snap.questions;
    userAnswers    = snap.answers || {};
    currentIdx     = snap.currentQ  || 0;
    secondsLeft    = snap.timeLeft  || 50 * 60;
    const ss = $('startScreen');
    const es = $('examScreen');
    if (ss) ss.classList.add('hidden');
    if (es) {
      es.classList.remove('hidden');
      setQuizMode(quizMode);
      renderNavGrids();
      showQInstant(currentIdx);
      startTimer();
    }
    return true;
  } catch(e) { clearQuizState(); return false; }
}

// Patch selectOpt, showQ, doSubmit to save/clear state
(function() {
  const _origSelectOpt = window.selectOpt;
  if (_origSelectOpt) window.selectOpt = function(idx, el, val) {
    _origSelectOpt(idx, el, val); saveQuizState();
  };
  const _origShowQ = window.showQ;
  if (_origShowQ) window.showQ = function(idx) {
    _origShowQ(idx); saveQuizState();
  };
  const _origDoSubmit = window.doSubmit;
  if (_origDoSubmit) window.doSubmit = function(auto) {
    _origDoSubmit(auto); clearQuizState();
  };
})();

document.addEventListener('DOMContentLoaded', function() {
  // [HEATMAP] Khởi tạo module nhật ký ôn tập
  StudyHeatmap.init();

  // Clock
  setInterval(function() {
    const el = $('sysTime');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('vi-VN', {
      hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
    }) + ' UTC+7';
  }, 1000);

  // Unlock selViTri if selChucDanh already has a value (e.g. "ATSEP" pre-selected)
  if ($('selChucDanh') && $('selChucDanh').value) {
    onChucDanhChange();
  }

  // Resume bài thi nếu có
  checkResume();
});

// ── SCROLL TO TOP ──
function updateScrollBtn() {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  if (window.pageYOffset > 200 || document.documentElement.scrollTop > 200) {
    btn.classList.add('visible');
  } else {
    btn.classList.remove('visible');
  }
}
window.addEventListener('scroll', updateScrollBtn, {passive:true});
// Fire on load in case page already scrolled
document.addEventListener('DOMContentLoaded', updateScrollBtn);

/* ── RADAR ENGINE ── */
(function() {
  const AIRCRAFT = [
    {call:'VN161', fl:'FL340', spd:'465kt'},
    {call:'QH123', fl:'FL280', spd:'418kt'},
    {call:'VJ456', fl:'FL190', spd:'382kt'},
    {call:'BL789', fl:'FL120', spd:'315kt'},
    {call:'VN234', fl:'FL350', spd:'472kt'},
    {call:'VJ789', fl:'FL220', spd:'390kt'},
    {call:'QH456', fl:'FL300', spd:'445kt'},
    {call:'BL123', fl:'FL150', spd:'328kt'},
  ];

  const blips = [];
  let rafId = null;

  function headingArrow(h) {
    h = ((h % 360) + 360) % 360;
    if (h < 22.5 || h >= 337.5) return '↑';
    if (h < 67.5)  return '↗';
    if (h < 112.5) return '→';
    if (h < 157.5) return '↘';
    if (h < 202.5) return '↓';
    if (h < 247.5) return '↙';
    if (h < 292.5) return '←';
    return '↖';
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function radarInit() {
    const container = document.getElementById('radarBlips');
    if (!container) return;

    const count = 6 + Math.floor(Math.random() * 3); // 6-8
    for (let i = 0; i < count; i++) {
      const ac = AIRCRAFT[i % AIRCRAFT.length];
      const heading = rand(0, 360);
      const el = document.createElement('div');
      el.className = 'blip';
      el.style.cssText = 'position:absolute;pointer-events:none;';
      el.innerHTML =
        '<div class="blip-dot"></div>' +
        '<div class="blip-tag">' + ac.call + '<br>' + ac.fl + ' ' + headingArrow(heading) + ' ' + ac.spd + '</div>';
      container.appendChild(el);

      blips.push({
        el: el,
        tag: el.querySelector('.blip-tag'),
        dot: el.querySelector('.blip-dot'),
        x: rand(5, 95),
        y: rand(5, 95),
        heading: heading,
        speed: rand(0.002, 0.006),
        changeTimer: Math.floor(rand(400, 900)),
        opacity: 0.15,
        call: ac.call, fl: ac.fl, spd: ac.spd
      });
    }
    radarLoop();
  }

  function radarLoop() {
    const sweepAngle = (Date.now() / 10000 * 360) % 360;
    const cx = 50, cy = 50;

    for (let i = 0; i < blips.length; i++) {
      const b = blips[i];

      // Movement
      b.x += Math.cos(b.heading * Math.PI / 180) * b.speed;
      b.y += Math.sin(b.heading * Math.PI / 180) * b.speed;
      if (b.x < -3)  b.x = 103;
      if (b.x > 103) b.x = -3;
      if (b.y < -3)  b.y = 103;
      if (b.y > 103) b.y = -3;
      b.el.style.left = b.x + '%';
      b.el.style.top  = b.y + '%';

      // Heading change
      b.changeTimer--;
      if (b.changeTimer <= 0) {
        b.heading += rand(-40, 40);
        b.changeTimer = Math.floor(rand(800, 1500));
        // Update tag arrow
        var h2 = b.heading;
        b.tag.innerHTML = b.call + '<br>' + b.fl + ' ' + headingArrow(h2) + ' ' + b.spd;
      }

      // Fade blip với sweep proximity
      var bdx = b.x - cx;
      var bdy = b.y - cy;
      var blipAngle = (Math.atan2(bdy, bdx) * 180 / Math.PI + 360) % 360;
      var diff = Math.abs(sweepAngle - blipAngle);
      if (diff > 180) diff = 360 - diff;
      b.opacity = 0.15 + Math.max(0, 1 - diff / 90) * 0.85;
      b.el.style.opacity = b.opacity;
    }
    rafId = requestAnimationFrame(radarLoop);
  }

  document.addEventListener('DOMContentLoaded', radarInit);
})();

// ════════════════════════════════════════════════════════════════════════════
// === Study Heatmap Module ===
// Nhật ký ôn tập dạng heatmap kiểu GitHub contribution graph
// localStorage key: "cns_heatmap_v1"
// Cấu trúc: { "YYYY-MM-DD": { count: số câu trả lời, wrong: số câu sai } }
// Độc lập hoàn toàn với cns_history_v1, cns_quiz_state_v3, cns_result_v3
// ════════════════════════════════════════════════════════════════════════════
const StudyHeatmap = (function() {
  const STORAGE_KEY = 'cns_heatmap_v1';
  var currentRange = 365; // hiển thị 365 ngày — GitHub style

  // Đọc dữ liệu nhật ký từ localStorage
  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e) { return {}; }
  }

  // Ghi dữ liệu nhật ký vào localStorage (silent fail nếu đầy)
  function saveData(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
  }

  // Lấy ngày hôm nay dạng "YYYY-MM-DD" theo múi giờ local
  function todayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // Mức màu 0-4 dựa trên số câu đã trả lời trong ngày
  // 0=không có | 1=<5 | 2=5-14 | 3=15-29 | 4=≥30
  function levelFor(count) {
    if (!count || count === 0) return 0;
    if (count < 5)  return 1;
    if (count < 15) return 2;
    if (count < 30) return 3;
    return 4;
  }

  // Tính số ngày liên tiếp có hoạt động (chuỗi streak)
  // "Khoan dung": nếu hôm nay chưa ôn thì vẫn tính chuỗi từ hôm qua trở về
  function computeStreak(data) {
    var checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    // Nếu hôm nay chưa có dữ liệu → bắt đầu kiểm tra từ hôm qua
    var tk = todayKey();
    if (!data[tk] || data[tk].count === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    var streak = 0;
    while (true) {
      var y = checkDate.getFullYear();
      var mo = String(checkDate.getMonth() + 1).padStart(2, '0');
      var dy = String(checkDate.getDate()).padStart(2, '0');
      var key = y + '-' + mo + '-' + dy;
      if (data[key] && data[key].count > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  // Dựng mảng ngày tuyến tính cho n ngày gần nhất (mới nhất ở cuối)
  function buildDaysGrid(data, days) {
    var result = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var y  = d.getFullYear();
      var mo = String(d.getMonth() + 1).padStart(2, '0');
      var dy = String(d.getDate()).padStart(2, '0');
      var key = y + '-' + mo + '-' + dy;
      result.push({
        key:   key,
        date:  new Date(d),
        count: data[key] ? (data[key].count || 0) : 0,
        wrong: data[key] ? (data[key].wrong || 0) : 0,
        dow:   d.getDay(),
      });
    }
    return result;
  }


  // Ghi nhận 1 câu trả lời vào ngày hôm nay
  function logAnswer(isWrong) {
    var data = loadData();
    var key  = todayKey();
    if (!data[key]) data[key] = { count: 0, wrong: 0 };
    data[key].count += 1;
    if (isWrong) data[key].wrong += 1;
    saveData(data);
  }

    function render() {
    var data     = loadData();
    var grid     = document.getElementById('hmGrid');
    var elTotal  = document.getElementById('hmTotal');
    var elDays   = document.getElementById('hmDays');
    var elStreak = document.getElementById('hmStreak');
    var elFooter = document.getElementById('hmFooter');
    if (!grid) return;

    var totalCount = 0, activeDays = 0;
    Object.keys(data).forEach(function(k) {
      if (data[k].count > 0) { totalCount += data[k].count; activeDays++; }
    });
    var streak = computeStreak(data);
    if (elTotal)  elTotal.textContent  = totalCount.toLocaleString('vi-VN');
    if (elDays)   elDays.textContent   = activeDays;
    if (elStreak) elStreak.textContent = streak + ' ngày';
    if (elFooter) {
      if (streak === 0)     elFooter.textContent = 'Hôm nay bắt đầu chuỗi ôn tập mới!';
      else if (streak < 3)  elFooter.textContent = streak + ' ngày liên tiếp — tiếp tục!';
      else if (streak < 7)  elFooter.textContent = streak + ' ngày liên tiếp — phong độ tốt!';
      else if (streak < 30) elFooter.textContent = streak + ' ngày liên tiếp — đừng gián đoạn!';
      else                  elFooter.textContent = streak + ' ngày liên tiếp — kỷ lục! 🎖️';
    }

    var days_arr = buildDaysGrid(data, 365);
    var startDow = days_arr[0].dow;
    var padded = [];
    for (var p = 0; p < startDow; p++) padded.push(null);
    days_arr.forEach(function(d) { padded.push(d); });
    while (padded.length % 7 !== 0) padded.push(null);

    var weeks = [];
    for (var w = 0; w < padded.length / 7; w++) {
      weeks.push(padded.slice(w * 7, w * 7 + 7));
    }

    // GitHub-style: hiện tất cả 7 ngày trong tuần
    var DAY_LABELS = ['CN','T2','T3','T4','T5','T6','T7'];

    var MONTH_VI = ['Th1','Th2','Th3','Th4','Th5','Th6',
                    'Th7','Th8','Th9','T10','T11','T12'];
    var lastMonth = -1;
    var monthMap  = {};
    weeks.forEach(function(wk, wi) {
      var firstReal = null;
      for (var x = 0; x < wk.length; x++) { if (wk[x]) { firstReal = wk[x]; break; } }
      if (firstReal) {
        var mo = firstReal.date.getMonth();
        if (mo !== lastMonth) { monthMap[wi] = MONTH_VI[mo]; lastMonth = mo; }
      }
    });

    var h = '<div class="hm-gh-graph">';
    h += '<div class="hm-gh-daylabels"><div class="hm-gh-month-spacer"></div>';
    for (var r = 0; r < 7; r++) {
      h += '<div class="hm-gh-daylbl">' + DAY_LABELS[r] + '</div>';
    }
    h += '</div>';

    h += '<div class="hm-gh-right">';
    h += '<div class="hm-gh-months">';
    weeks.forEach(function(wk, wi) {
      h += '<div class="hm-gh-month-cell">' + (monthMap[wi] || '') + '</div>';
    });
    h += '</div>';

    h += '<div class="hm-gh-weeks">';
    weeks.forEach(function(wk) {
      h += '<div class="hm-gh-week">';
      wk.forEach(function(cell) {
        if (!cell) {
          h += '<div class="hm-gh-cell hm-empty"></div>';
        } else {
          var lv  = levelFor(cell.count);
          var dd  = String(cell.date.getDate()).padStart(2,'0');
          var mm  = String(cell.date.getMonth()+1).padStart(2,'0');
          var tip = dd + '/' + mm + ': ' + cell.count + ' câu'
                  + (cell.wrong > 0 ? ', ' + cell.wrong + ' sai' : '');
          var cls = 'hm-gh-cell hm-l' + lv + (cell.wrong > 0 ? ' hm-has-wrong' : '');
          h += '<div class="' + cls + '" data-tip="' + tip + '"'
             + ' onmouseenter="StudyHeatmap._showTip(event,this)"'
             + ' onmouseleave="StudyHeatmap._hideTip()"></div>';
        }
      });
      h += '</div>';
    });
    h += '</div></div></div>';

    grid.innerHTML = h;
  }

  // Hiện tooltip khi hover ô
  function showTip(event, el) {
    var tip = document.getElementById('hmTooltip');
    if (!tip) return;
    tip.textContent = el.getAttribute('data-tip');
    tip.style.display = 'block';
    tip.style.left = (event.clientX + 8) + 'px';
    tip.style.top  = (event.clientY - 34) + 'px';
  }

  // Ẩn tooltip
  function hideTip() {
    var tip = document.getElementById('hmTooltip');
    if (tip) tip.style.display = 'none';
  }

  // Xóa toàn bộ nhật ký — có confirm trước
  // Đổi khoảng thời gian hiển thị và re-render
  function setRange(n) {
    currentRange = n;
    // Cập nhật active tab
    document.querySelectorAll('#hmRangeTabs .hm-tab').forEach(function(btn) {
      btn.classList.toggle('hm-tab-active', parseInt(btn.getAttribute('data-r')) === n);
    });
    // Cập nhật subtitle
    var sub = document.getElementById('hmSubtitle');
    if (sub) sub.textContent = n + ' ngày gần nhất';
    render();
  }

  function clearData() {
    if (!confirm('Xóa toàn bộ dữ liệu ôn tập cục bộ (nhật ký heatmap + lịch sử SRS từng câu)? Hành động này không thể hoàn tác.')) return;
    localStorage.removeItem(STORAGE_KEY);   // cns_heatmap_v1 — nhật ký theo ngày
    localStorage.removeItem(HISTORY_KEY);   // cns_history_v1 — seen/wrong/srs theo từng câu
    render();
    // [SRS] Cập nhật lại badge "đến hạn" nếu đang hiện (module đang chọn coi như reset về 0 due)
    if (typeof onModuleChange === 'function') onModuleChange();
  }

  function init() { /* no-op */ }

  return {
    logAnswer:     logAnswer,
    render:        render,
    init:          init,
    clearData:     clearData,
    setRange:      setRange,
    levelFor:      levelFor,
    computeStreak: computeStreak,
    _showTip:      showTip,
    _hideTip:      hideTip,
  };
})();
