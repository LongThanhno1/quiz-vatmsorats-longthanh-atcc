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

// ── Helpers ──
const shuffle = arr => { let a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; };
const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const getMC = id => MODULE_CONFIG.find(m=>m.id===id)||{color:'#64748b',name:id,icon:'?',grd:'',bg:'',label:id};
const $ = id => document.getElementById(id);

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
  $('btnStart').disabled = !$('selModule').value;
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
  selectedModule = moduleId;
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

  // Trộn ngẫu nhiên (Fisher-Yates)
  // Thi thử: bốc tối đa 50 câu | Ôn tập: lấy toàn bộ pool
  const MAX_DRAW = 50;
  const pool     = shuffle(rawPool);
  const count    = quizMode === 'practice' ? pool.length : Math.min(MAX_DRAW, pool.length);
  examQuestions  = pool.slice(0, count).map(q => ({ ...q, options: shuffle(q.options) }));

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
      <span style="min-width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.07);
                   display:flex;align-items:center;justify-content:center;
                   font-size:11px;font-weight:700;flex-shrink:0;margin-top:2px">${labels[i]}</span>
      <span style="font-size:14px;line-height:1.5">${opt}</span>
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
    quizMode       = 'exam';
    selectedModule = null;
    examQuestions  = [];
    userAnswers    = {};
    if (typeof onChucDanhChange === 'function') onChucDanhChange();
    return;
  }

  $('examScreen').classList.add('hidden');
  $('resultScreen').classList.remove('hidden');
  // Luôn hiện scroll-to-top trên màn hình kết quả
  const _sb = $('scrollTopBtn');
  if (_sb) _sb.classList.add('visible');

  let correct = 0;
  examQuestions.forEach((q,i) => { if (userAnswers[i] === q.correctAnswer) correct++; });

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
  quizMode = 'exam';
  selectedModule = null;
  examQuestions = [];
  userAnswers = {};
  onChucDanhChange();
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
        b.tag.innerHTML = b.call + '<br>' + b.fl + ' ' + headingArrow(b.heading) + ' ' + b.spd;
      }

      // Sweep sync — PSR/SSR behavior
      const targetAngle = ((Math.atan2(b.y - cy, b.x - cx) * 180 / Math.PI) + 360) % 360;
      let diff = Math.abs(sweepAngle - targetAngle);
      if (diff > 180) diff = 360 - diff;

      let opacity, shadow;
      if (diff < 8) {
        // FLASH: vệt sweep đang quét qua
        opacity = 1.0;
        shadow = '0 0 14px rgba(150,230,255,1), 0 0 28px rgba(150,210,255,0.7), 0 0 6px #fff';
      } else if (diff < 60) {
        // FADE: đuôi vệt — giảm tuyến tính 1→0
        opacity = 1 - (diff - 8) / 52;
        const glow = Math.round(opacity * 255);
        shadow = '0 0 ' + Math.round(opacity * 14) + 'px rgba(150,230,255,' + opacity.toFixed(2) + ')';
      } else {
        // ẨN hoàn toàn
        opacity = 0;
        shadow = '';
      }

      b.dot.style.opacity = opacity;
      b.dot.style.boxShadow = shadow;
      // blip-tag chỉ hiện khi đủ sáng
      b.tag.style.opacity = opacity > 0.3 ? opacity : 0;
    }

    rafId = requestAnimationFrame(radarLoop);
  }

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(radarLoop);
    } else {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }
  });

  document.addEventListener('DOMContentLoaded', radarInit);
})();
