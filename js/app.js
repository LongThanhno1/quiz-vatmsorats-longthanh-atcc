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
// 'exam' = thi thử (timed, 50 câu, SRS due-priority) | 'practice' = ôn tập toàn bộ pool
// (untimed, SRS-ordered) | 'quickreview' = ôn nhanh CHỈ câu đến hạn (untimed, cap 50)
function isUntimedMode() { return quizMode === 'practice' || quizMode === 'quickreview'; }
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
const TEAM_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzMphyUUJCxuDZ1xuDcvaB8YwO8M6S05rVelyJJMj-_ZKLkcwuHyXvnQOPdoWBU7a0VIw/exec";
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

// ── SRS QUICK REVIEW (chỉ câu CẦN ÔN — mới + quá hạn, không pha câu chưa đến hạn) ──
// Dùng cho nút "Ôn nhanh câu đến hạn": tập trung đúng các câu cần ôn, cap 50 để giữ
// đúng tinh thần "nhanh" (khác Practice mode lấy toàn bộ pool).
function srsSelectDueOnly(rawPool) {
  const h        = loadHistory();
  const NOW      = Date.now();
  const MAX_DRAW = 50;

  const due = shuffle(rawPool)
    .map(function(q) { return { q: q, priority: srsPriorityOf(h, q.id, NOW) }; })
    .filter(function(s) { return s.priority >= SRS_DUE_BASE; })
    .sort(function(a, b) { return b.priority - a.priority; })
    .map(function(s) { return s.q; });

  return due.slice(0, MAX_DRAW).map(function(q) {
    return Object.assign({}, q, { options: shuffle(q.options) });
  });
}

// [MASTERY] % câu đã "thành thạo" trong pool. Định nghĩa: reps >= 3 — tức đã vượt qua
// giai đoạn bootstrap (1 ngày → 6 ngày) và đang giãn interval theo ease factor, chứng tỏ
// ghi nhớ ổn định qua nhiều lần ôn, không phải may mắn đoán đúng 1-2 lần.
const MASTERY_REPS_THRESHOLD = 3;
function srsMasteryPct(rawPool) {
  if (!rawPool.length) return 0;
  const h = loadHistory();
  const mastered = rawPool.filter(function(q) {
    const s = h.srs[String(q.id)];
    return s && s.reps >= MASTERY_REPS_THRESHOLD;
  }).length;
  return Math.round(mastered / rawPool.length * 100);
}

// ════════════════════════════════════════════════════════════════════════════
// ── SYNC MODULE: đồng bộ dữ liệu cá nhân (cns_history_v1 + cns_heatmap_v1) ──
// giữa các thiết bị qua mã tự sinh, KHÔNG cần đăng nhập/thông tin cá nhân.
// Dùng chung endpoint TEAM_WEBHOOK_URL (Apps Script): GET = team log ẩn danh
// (giữ nguyên cũ), POST action=push/pull = đồng bộ cá nhân (mới).
// Tự động push (debounce 3s) sau mỗi câu trả lời nếu đã có mã đồng bộ.
// LƯU Ý: cơ chế ghi-đè đơn giản (last-write-wins), KHÔNG merge dữ liệu giữa
// 2 thiết bị — nếu học song song trên 2 máy không đồng bộ kịp, máy push sau
// sẽ ghi đè máy push trước.
// ════════════════════════════════════════════════════════════════════════════
const SYNC_CODE_KEY = 'cns_sync_code';
const SYNC_HEATMAP_KEY = 'cns_heatmap_v1'; // trùng STORAGE_KEY nội bộ của StudyHeatmap

function getSyncCode() {
  try { return localStorage.getItem(SYNC_CODE_KEY) || ''; } catch(e) { return ''; }
}
function setSyncCode(code) {
  try { localStorage.setItem(SYNC_CODE_KEY, code); } catch(e) {}
}
function genSyncCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ O/0, I/1 dễ nhầm khi chép tay
  function part() { let s=''; for (let i=0;i<4;i++) s += chars[Math.floor(Math.random()*chars.length)]; return s; }
  return part() + '-' + part();
}
function syncIsConfigured() {
  return TEAM_WEBHOOK_URL && !TEAM_WEBHOOK_URL.includes('ANH_LONG_DIEN');
}

let _syncPushTimer = null;
// Gọi sau mỗi sự kiện chấm điểm (debounce 3s — gộp nhiều câu trả lời liên tiếp
// thành 1 request thay vì spam server mỗi câu).
function scheduleSyncPush() {
  if (!getSyncCode() || !syncIsConfigured()) return;
  clearTimeout(_syncPushTimer);
  _syncPushTimer = setTimeout(syncPushNow, 3000);
}
function syncPushNow() {
  const code = getSyncCode();
  if (!code || !syncIsConfigured()) return;
  try {
    const historyRaw = localStorage.getItem(HISTORY_KEY);
    const heatmapRaw = localStorage.getItem(SYNC_HEATMAP_KEY);
    fetch(TEAM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // tránh CORS preflight với Apps Script
      body: JSON.stringify({
        action: 'push',
        code: code,
        history: historyRaw ? JSON.parse(historyRaw) : null,
        heatmap: heatmapRaw ? JSON.parse(heatmapRaw) : null
      })
    }).catch(function(){});
  } catch(e) {}
}
async function syncPullNow(code) {
  if (!syncIsConfigured()) return { ok: false, error: 'not_configured' };
  try {
    const res = await fetch(TEAM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'pull', code: code })
    });
    return await res.json();
  } catch(e) { return { ok: false, error: String(e) }; }
}

// ── MODAL CONTROL ──
function openSyncModal() {
  const m = $('syncModal');
  if (!m) return;
  m.style.display = 'flex';
  m.classList.remove('hidden');
  const code = getSyncCode();
  const block = $('syncCurrentBlock');
  const createBtn = $('syncCreateBtn');
  if (code) {
    if (block) { block.style.display = 'block'; $('syncCurrentCode').textContent = code; }
    if (createBtn) createBtn.textContent = '🔁 Tạo mã mới (thiết bị này sẽ tách khỏi mã cũ)';
    renderSyncQR(code);
  } else {
    if (block) block.style.display = 'none';
    if (createBtn) createBtn.textContent = '✨ Tạo mã đồng bộ mới cho thiết bị này';
  }
  $('syncStatusMsg').textContent = '';
  if (!syncIsConfigured()) {
    $('syncStatusMsg').textContent = '⚠ Tính năng đồng bộ chưa được cấu hình (TEAM_WEBHOOK_URL).';
    $('syncStatusMsg').style.color = '#f59e0b';
  }
}
function closeSyncModal() {
  const m = $('syncModal');
  if (m) { m.style.display = 'none'; m.classList.add('hidden'); }
  if (typeof closeQrScanner === 'function') closeQrScanner(); // phòng trường hợp camera còn đang mở
}
function createNewSyncCode() {
  const code = genSyncCode();
  setSyncCode(code);
  syncPushNow(); // đẩy ngay dữ liệu hiện tại lên dưới mã mới
  openSyncModal(); // re-render hiển thị mã mới
  const msg = $('syncStatusMsg');
  if (msg) { msg.textContent = '✓ Đã tạo mã mới và đồng bộ dữ liệu hiện tại lên server.'; msg.style.color = '#34d399'; }
}
async function confirmEnterSyncCode() {
  const input = $('syncCodeInput');
  const msg = $('syncStatusMsg');
  if (!input || !msg) return;
  const code = input.value.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    msg.textContent = '✗ Mã không đúng định dạng (VD: 7X9K-2A4B).';
    msg.style.color = '#f87171';
    return;
  }
  // Cảnh báo nếu thiết bị này đã có dữ liệu cục bộ — tải về sẽ GHI ĐÈ dữ liệu hiện tại
  const hasLocalData = !!(localStorage.getItem(HISTORY_KEY) || localStorage.getItem(SYNC_HEATMAP_KEY));
  if (hasLocalData) {
    const ok = confirm('Thiết bị này đang có dữ liệu ôn tập cục bộ. Tải mã đồng bộ về sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại trên thiết bị này. Tiếp tục?');
    if (!ok) return;
  }
  msg.textContent = 'Đang tải...';
  msg.style.color = '#7dd3fc';
  const res = await syncPullNow(code);
  if (!res || !res.ok) {
    msg.textContent = '✗ Không tải được dữ liệu (' + (res && res.error || 'lỗi không xác định') + ').';
    msg.style.color = '#f87171';
    return;
  }
  if (!res.found) {
    msg.textContent = '✗ Không tìm thấy mã này trên server. Kiểm tra lại mã.';
    msg.style.color = '#f87171';
    return;
  }
  if (res.history) localStorage.setItem(HISTORY_KEY, JSON.stringify(res.history));
  if (res.heatmap) localStorage.setItem(SYNC_HEATMAP_KEY, JSON.stringify(res.heatmap));
  setSyncCode(code);
  msg.textContent = '✓ Đã tải về thành công. Đang làm mới...';
  msg.style.color = '#34d399';
  // Refresh các UI phụ thuộc dữ liệu vừa tải về
  if (typeof StudyHeatmap !== 'undefined') StudyHeatmap.render();
  if ($('selModule') && $('selModule').value && typeof onModuleChange === 'function') onModuleChange();
  setTimeout(function() { openSyncModal(); }, 800);
}

// ── QR CODE: tạo mã QR hiển thị mã đồng bộ (thư viện qrcodejs, load qua CDN) ──
function renderSyncQR(code) {
  const box = $('syncQRBox');
  if (!box || typeof QRCode === 'undefined') return;
  box.innerHTML = ''; // xóa QR cũ trước khi vẽ QR mới, tránh chồng nhiều canvas qua các lần mở modal
  try {
    new QRCode(box, { text: code, width: 120, height: 120, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  } catch(e) {}
}

// ── QR SCANNER: quét mã đồng bộ bằng camera (thư viện jsQR, load qua CDN) ──
// Yêu cầu HTTPS (GitHub Pages đã có sẵn) vì getUserMedia chỉ chạy trên context bảo mật.
let _qrScannerStream = null;
let _qrScannerRAF = null;

async function openQrScanner() {
  const overlay = $('qrScannerOverlay');
  const video = $('qrScannerVideo');
  const status = $('qrScannerStatus');
  if (!overlay || !video) return;
  if (typeof jsQR === 'undefined') {
    alert('Không tải được thư viện quét QR (có thể do mất mạng). Anh có thể nhập mã thủ công thay thế.');
    return;
  }
  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');
  if (status) status.textContent = 'Đang mở camera...';
  try {
    _qrScannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = _qrScannerStream;
    await video.play();
    if (status) status.textContent = 'Đưa mã QR (hiện trên thiết bị khác) vào khung hình';
    scanQrFrame();
  } catch (e) {
    if (status) status.textContent = '✗ Không truy cập được camera: ' + (e && e.message || e) + '. Anh có thể nhập mã thủ công thay thế.';
  }
}

function scanQrFrame() {
  const video = $('qrScannerVideo');
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
    _qrScannerRAF = requestAnimationFrame(scanQrFrame);
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height);
  if (result && result.data) {
    const code = result.data.trim().toUpperCase();
    if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      closeQrScanner();
      const input = $('syncCodeInput');
      if (input) input.value = code;
      confirmEnterSyncCode(); // tự động tải về luôn, không bắt bấm thêm lần nữa (đúng tinh thần giảm thao tác)
      return;
    }
    // Quét được QR nhưng không đúng định dạng mã đồng bộ (vd QR khác) → tiếp tục quét, không dừng
  }
  _qrScannerRAF = requestAnimationFrame(scanQrFrame);
}

function closeQrScanner() {
  const overlay = $('qrScannerOverlay');
  if (overlay) { overlay.style.display = 'none'; overlay.classList.add('hidden'); }
  if (_qrScannerRAF) { cancelAnimationFrame(_qrScannerRAF); _qrScannerRAF = null; }
  if (_qrScannerStream) {
    _qrScannerStream.getTracks().forEach(function(t) { t.stop(); }); // tắt camera hẳn, không để chạy ngầm tốn pin
    _qrScannerStream = null;
  }
  const video = $('qrScannerVideo');
  if (video) video.srcObject = null;
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

  const dueBadge     = $('srsDueBadge');
  const masteryBadge = $('srsMasteryBadge');
  const quickBtn     = $('btnQuickReview');

  if (modId) {
    const rawPool = questionBank.filter(q => q.module === modId);
    const due     = srsCountDue(rawPool);
    const mastery = srsMasteryPct(rawPool);

    // [SRS] Badge "X câu đến hạn hôm nay"
    if (dueBadge) {
      dueBadge.style.display = 'inline-flex';
      dueBadge.textContent = due > 0 ? `⏰ ${due} câu đến hạn ôn` : '✓ Chưa có câu nào đến hạn';
      dueBadge.style.color = due > 0 ? '#f59e0b' : '#34d399';
      dueBadge.style.borderColor = due > 0 ? 'rgba(245,158,11,0.35)' : 'rgba(52,211,153,0.3)';
      dueBadge.style.background = due > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(52,211,153,0.06)';
    }

    // [MASTERY] Badge "X% thành thạo"
    if (masteryBadge) {
      masteryBadge.style.display = 'inline-flex';
      masteryBadge.textContent = `🎯 ${mastery}% thành thạo`;
    }

    // [QUICK REVIEW] Nút "Ôn nhanh" chỉ hiện khi có câu đến hạn
    if (quickBtn) {
      quickBtn.style.display = due > 0 ? 'inline-flex' : 'none';
      quickBtn.textContent = `⚡ Ôn nhanh ${due} câu đến hạn`;
    }
  } else {
    if (dueBadge)     dueBadge.style.display = 'none';
    if (masteryBadge) masteryBadge.style.display = 'none';
    if (quickBtn)      quickBtn.style.display = 'none';
  }
}

// ── QUICK REVIEW: vào thẳng phiên ôn chỉ gồm câu đến hạn (bỏ qua dropdown mode) ──
function startQuickReview() {
  const mod = $('selModule').value;
  if (!mod) return;
  quizMode = 'quickreview';
  const ss = $('startScreen');
  ss.classList.add('screen-exit');
  setTimeout(() => {
    ss.classList.add('hidden');
    ss.classList.remove('screen-exit');
    startExam(mod);
  }, TR_DUR);
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
  const _gaStart = quizMode==='practice' ? 'practice_start' : quizMode==='quickreview' ? 'quickreview_start' : 'quiz_start';
  if (typeof gtag === 'function') gtag('event', _gaStart, {module_id: moduleId, module_name: mc.name});

  if (rawPool.length === 0) {
    alert(`⚠ Module "${mc.label}" chưa có câu hỏi trong ngân hàng đề.\nVui lòng bổ sung dữ liệu vào questionBank trước khi thi.`);
    return;
  }

  // [SRS] Exam: tối đa 50 câu ưu tiên due-based | Quick review: CHỈ câu due, cap 50
  // [SRS] Practice: TOÀN BỘ pool, sắp câu cần ôn nhất lên đầu
  if (quizMode === 'exam') {
    examQuestions = srsSelectQuestions(rawPool);
  } else if (quizMode === 'quickreview') {
    examQuestions = srsSelectDueOnly(rawPool);
    if (examQuestions.length === 0) {
      alert('Không còn câu nào đến hạn ôn trong module này.');
      return;
    }
  } else {
    examQuestions = srsOrderForPractice(rawPool);
  }

  userAnswers  = {};
  currentIdx   = 0;
  secondsLeft  = 50 * 60;

  // Practice/Quick review mode: ẩn timer, không countdown
  const timerDisp = $('timerDisplay');
  if (isUntimedMode()) {
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
    submitBtn.innerHTML = isUntimedMode()
      ? '✅ Hoàn thành'
      : '✈ Nộp Bài';
  }

  // Show/hide exit button cho practice/quick review mode
  const exitBtn = $('btnExitPractice');
  if (exitBtn) exitBtn.style.display = isUntimedMode() ? 'inline-block' : 'none';

  renderNavGrids();
  showQ(0);
  startTimer();
}

// ── TIMER ──
function startTimer() {
  clearInterval(timerInterval);
  if (isUntimedMode()) return;  // Practice/Quick review: không đếm giờ
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
  // Trong practice/quick review mode: nếu câu đã trả lời → render lại với highlight
  const alreadyAnswered = isUntimedMode() && userAnswers[idx] !== undefined;

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

  // Practice/Quick review mode: hiện feedback ngay
  if (isUntimedMode()) {
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
    // [SYNC] Lên lịch đồng bộ dữ liệu cá nhân (debounce, chỉ chạy nếu đã có mã đồng bộ)
    scheduleSyncPush();
  }

  updateNavGrids();
  updateSidebarStats();
}

function prevQ() { showQ(currentIdx-1); }
function nextQ() {
  if (currentIdx >= examQuestions.length - 1) {
    if (isUntimedMode()) {
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
  // Practice/Quick review mode: không cần confirm, submit thẳng
  if (isUntimedMode()) {
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

  // Practice/Quick review mode: về thẳng menu sau khi hoàn thành
  if (isUntimedMode()) {
    clearInterval(timerInterval);
    clearQuizState();
    if (typeof RESULT_SAVE_KEY !== 'undefined') {
      localStorage.removeItem(RESULT_SAVE_KEY);
    }
    // [QUICK REVIEW] Tóm tắt nhanh vì không có result screen riêng cho mode này
    if (quizMode === 'quickreview') {
      var _qrCorrect = 0;
      examQuestions.forEach(function(q, i) { if (userAnswers[i] === q.correctAnswer) _qrCorrect++; });
      alert(`⚡ Ôn nhanh hoàn tất: ${_qrCorrect}/${examQuestions.length} câu đúng. Lịch ôn tập đã được cập nhật.`);
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
  // [SYNC] Lên lịch đồng bộ dữ liệu cá nhân sau khi nộp bài (1 lần, không phải mỗi câu)
  scheduleSyncPush();

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

// ── LEECH SCREEN: câu hỏi sai dai dẳng — quét TOÀN BỘ ngân hàng đề, độc lập với
// bất kỳ phiên thi nào (không cần làm bài mới để thấy câu mình đang yếu) ──
function openLeechScreen() {
  renderLeechScreen();
  const ss = $('startScreen');
  const ls = $('leechScreen');
  const hp = $('heatmapPanel');
  if (hp) hp.style.display = 'none'; // [HEATMAP] ẩn panel khi rời startScreen, giống các luồng khác
  if (ss) {
    ss.classList.add('screen-exit');
    setTimeout(() => {
      ss.classList.add('hidden');
      ss.classList.remove('screen-exit');
      if (ls) { ls.classList.remove('hidden'); ls.classList.add('screen-enter'); setTimeout(() => ls.classList.remove('screen-enter'), TR_DUR + 20); }
      window.scrollTo({top: 0, behavior: 'smooth'});
    }, TR_DUR);
  } else if (ls) {
    ls.classList.remove('hidden');
  }
}
function closeLeechScreen() {
  const ls = $('leechScreen');
  const ss = $('startScreen');
  if (ls) {
    ls.classList.add('screen-exit');
    setTimeout(() => {
      ls.classList.add('hidden');
      ls.classList.remove('screen-exit');
      if (ss) { ss.classList.remove('hidden'); ss.classList.add('screen-enter'); setTimeout(() => ss.classList.remove('screen-enter'), TR_DUR + 20); }
      // [HEATMAP] Hiện lại panel khi quay về startScreen
      StudyHeatmap.render();
      const hp = $('heatmapPanel');
      if (hp) hp.style.display = 'block';
    }, TR_DUR);
  } else if (ss) {
    ss.classList.remove('hidden');
  }
}
function renderLeechScreen() {
  const h = loadHistory();
  const leechQuestions = questionBank
    .filter(function(q) {
      const s = h.srs[String(q.id)];
      return s && s.lapses >= LEECH_THRESHOLD;
    })
    .map(function(q) { return Object.assign({}, q, { lapses: h.srs[String(q.id)].lapses }); })
    .sort(function(a, b) { return b.lapses - a.lapses; });

  const countEl = $('leechCount');
  if (countEl) countEl.textContent = leechQuestions.length;

  const listEl = $('leechList');
  if (!listEl) return;

  if (leechQuestions.length === 0) {
    listEl.innerHTML = `<div style="text-align:center;padding:60px 20px;color:rgba(255,255,255,0.4)">
      <div style="font-size:2.2rem;margin-bottom:10px">🎉</div>
      <div style="font-size:14px">Chưa có câu nào bị đánh dấu khó dai dẳng.<br>Sai từ ${LEECH_THRESHOLD} lần trở lên (tính trên toàn bộ lịch sử) mới xuất hiện ở đây.</div>
    </div>`;
    return;
  }

  listEl.innerHTML = leechQuestions.map(function(q) {
    const mc = getMC(q.module);
    return `<div class="review-card-item wrong">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
        <div style="width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;
                    justify-content:center;font-weight:900;font-size:12px;margin-top:2px;
                    background:rgba(251,191,36,0.18);color:#fbbf24">⚠</div>
        <div>
          <div style="font-size:11px;color:${mc.color};font-weight:800;margin-bottom:4px">
            ${mc.label}
            <span style="margin-left:6px;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:800;
                         color:#fbbf24;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3)">Sai ${q.lapses} lần</span>
          </div>
          <p style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.92);line-height:1.5;margin:0">${q.question}</p>
        </div>
      </div>
      <div style="padding-left:34px;font-size:12px;color:#34d399;font-weight:700">✓ ${q.correctAnswer}</div>
    </div>`;
  }).join('');
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
    // [SYNC] Đồng bộ luôn trạng thái đã xóa lên server (nếu có mã đồng bộ), tránh server giữ data cũ
    if (typeof scheduleSyncPush === 'function') scheduleSyncPush();
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
