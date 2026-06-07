/**
 * VANDAP-APP.JS — Main Logic for Vấn Đáp Module
 * Features: Drag & Drop, Flashcard, Spaced Repetition
 * Keyboard: 100% touch-friendly (mobile support)
 */

// ═══════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════

const vdState = {
  mode: null,           // 'flashcard' | 'procedure' | 'incident'
  currentItem: null,    // current object (procedure, incident, or flashcard)
  currentIndex: 0,      // index in current list
  shuffledSteps: [],    // shuffled steps
  slotData: [],         // user's answers [step1, step2, ...]
  draggedItem: null,    // dragged step element
  dragSource: null,     // 'pool' | 'slot-{idx}'
  startTime: null,
  score: { correct: 0, total: 0 },
  ratings: {},
  flashcardKeywords: [] // keywords to check
};

const shuffle = (arr) => {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const $ = (id) => document.getElementById(id);

// ═══════════════════════════════════════════════════════════
// SCREEN MANAGER
// ═══════════════════════════════════════════════════════════

function showScreen(id) {
  document.querySelectorAll('.vd-screen').forEach(s => {
    s.classList.toggle('active', s.id === id);
  });
}

function goHome() {
  window.location.href = 'index.html';
}

function goMenu() {
  showScreen('vdMenu');
  renderMenu();
}

function goList() {
  showScreen('vdList');
  renderList(vdState.mode);
}

function retryItem() {
  if (vdState.mode === 'flashcard') {
    retryFlashcard();
  } else {
    startItem(vdState.currentItem);
  }
}

function nextItem() {
  if (vdState.mode === 'flashcard') {
    nextFlashcard();
  } else {
    const list = getList(vdState.mode);
    const idx = list.findIndex(i => i.id === vdState.currentItem.id);
    if (idx < list.length - 1) {
      startItem(list[idx + 1]);
    } else {
      goList();
    }
  }
}

function startMode(mode) {
  vdState.mode = mode;
  goList();
}

// ═══════════════════════════════════════════════════════════
// DATA ACCESS
// ═══════════════════════════════════════════════════════════

function getList(mode) {
  if (!VANDAP_VHF) return [];
  switch (mode) {
    case 'flashcard': return VANDAP_VHF.flashcards || [];
    case 'procedure': return VANDAP_VHF.procedures || [];
    case 'incident': return VANDAP_VHF.incidents || [];
    default: return [];
  }
}

function getRating(itemId) {
  try {
    const data = localStorage.getItem('vd_rating_' + itemId);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveRating(itemId, rating, score) {
  const data = {
    rating,
    score,
    timestamp: Date.now(),
    nextReview: calcNextReview(rating)
  };
  localStorage.setItem('vd_rating_' + itemId, JSON.stringify(data));
  updateListCard(itemId);

  // Show feedback
  setTimeout(() => {
    alert('✓ Đã lưu đánh giá');
  }, 100);
}

function calcNextReview(rating) {
  const now = Date.now();
  switch (rating) {
    case 'unknown': return now + 5 * 60 * 1000;      // 5 phút
    case 'partial': return now + 24 * 60 * 60 * 1000;  // 1 ngày
    case 'mastered': return now + 7 * 24 * 60 * 60 * 1000; // 7 ngày
    default: return now;
  }
}

// ═══════════════════════════════════════════════════════════
// MENU RENDER
// ═══════════════════════════════════════════════════════════

function renderMenu() {
  const flashcards = getList('flashcard');
  const procedures = getList('procedure');
  const incidents = getList('incident');

  $('flashcardCount').textContent = flashcards.length + ' câu hỏi';
  $('procedureCount').textContent = procedures.length + ' quy trình';
  $('incidentCount').textContent = incidents.length + ' tình huống';
}

// ═══════════════════════════════════════════════════════════
// LIST RENDER
// ═══════════════════════════════════════════════════════════

function renderList(mode) {
  const list = getList(mode);
  const container = $('vdListContent');
  const title = $('listTitle');

  if (mode === 'flashcard') {
    title.textContent = '📇 Flashcard';
  } else if (mode === 'procedure') {
    title.textContent = '🔧 Quy Trình';
  } else if (mode === 'incident') {
    title.textContent = '🚨 Sự Cố';
  }

  container.innerHTML = list.map((item, idx) => {
    const rating = getRating(item.id);
    const ratingEmoji = {
      'unknown': '😰',
      'partial': '🤔',
      'mastered': '✅'
    }[rating?.rating] || '';

    let badgeHtml = '';
    if (item.difficulty) {
      badgeHtml += `<div class="vd-badge difficulty-${item.difficulty}">${item.difficulty}</div>`;
    }

    let safetyIcon = '';
    if (item.safety) {
      safetyIcon = '<div class="vd-badge safety">⚠️ SAFETY</div>';
    }

    let criticalBadge = '';
    if (item.criticalLevel === 'critical') {
      criticalBadge = '<div class="vd-badge critical">CRITICAL</div>';
    } else if (item.criticalLevel === 'high') {
      criticalBadge = '<div class="vd-badge critical" style="background: rgba(245,158,11,0.3); color: #fcd34d;">HIGH</div>';
    }

    const steps = item.steps ? item.steps.length : 0;
    const time = item.estimatedTime ? `⏱ ${item.estimatedTime}` : '';

    return `
      <div class="vd-proc-card ${item.criticalLevel || ''}" onclick="startItem(${idx})">
        <div class="vd-card-header">
          <div class="vd-card-title">${item.title || item.question}</div>
          <div class="vd-card-badges">
            ${badgeHtml}
            ${safetyIcon}
            ${criticalBadge}
          </div>
        </div>
        <div class="vd-card-info">
          <span>📍 ${steps} bước</span>
          ${time ? `<span>${time}</span>` : ''}
        </div>
        ${rating ? `<div class="vd-card-rating">${ratingEmoji} ${rating.rating}</div>` : ''}
      </div>
    `;
  }).join('');
}

function updateListCard(itemId) {
  // Regenerate list to update rating badge
  renderList(vdState.mode);
}

function startItem(idx) {
  const list = getList(vdState.mode);
  const item = list[idx];
  if (!item) return;

  vdState.currentItem = item;
  vdState.currentIndex = idx;

  if (vdState.mode === 'flashcard') {
    startFlashcard(item);
  } else {
    startExam(item);
  }
}

// ═══════════════════════════════════════════════════════════
// EXAM (DRAG & DROP)
// ═══════════════════════════════════════════════════════════

function startExam(item) {
  $('examTitle').textContent = item.title;
  $('examSubtitle').textContent = `0/${item.steps.length} bước`;
  $('safetyBanner').classList.remove('active');

  vdState.shuffledSteps = shuffle(item.steps);
  vdState.slotData = new Array(item.steps.length).fill(null);
  vdState.startTime = Date.now();

  renderStepPool();
  renderDropZones();
  updateProgress();

  showScreen('vdExam');
}

function renderStepPool() {
  const pool = $('vdStepPool');
  pool.innerHTML = vdState.shuffledSteps.map((step, idx) => {
    return `
      <div class="vd-step-item"
        draggable="true"
        ondragstart="onDragStart(event)"
        ondragend="onDragEnd(event)"
        data-step-text="${step.text || ''}"
        data-step-id="${step.id}">
        ${step.text || ''}
      </div>
    `;
  }).join('');
}

function renderDropZones() {
  const zones = $('vdDropZones');
  const len = vdState.currentItem.steps.length;

  zones.innerHTML = Array.from({ length: len }).map((_, idx) => {
    const slotContent = vdState.slotData[idx];
    return `
      <div class="vd-drop-slot"
        id="slot-${idx}"
        ondrop="onDrop(event)"
        ondragover="onDragOver(event)"
        ondragleave="onDragLeave(event)"
        data-slot-idx="${idx}">
        <div class="vd-slot-number">${idx + 1}</div>
        <div class="vd-slot-content">
          ${slotContent || '<em style="opacity: 0.5;">Kéo bước vào đây</em>'}
        </div>
      </div>
    `;
  }).join('');

  // Add touch support
  document.querySelectorAll('.vd-drop-slot').forEach(slot => {
    slot.addEventListener('touchover', onTouchOver);
    slot.addEventListener('touchmove', onTouchMove, { passive: false });
  });
}

function updateProgress() {
  const filled = vdState.slotData.filter(x => x !== null).length;
  const total = vdState.currentItem.steps.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  $('progressFill').style.width = pct + '%';
  $('examSubtitle').textContent = `${filled}/${total} bước`;
}

// ─────────────────────────────────────────────────────────
// DRAG & DROP HANDLERS (Desktop + Mobile)
// ─────────────────────────────────────────────────────────

let touchItem = null;
let touchOffset = { x: 0, y: 0 };

function onDragStart(e) {
  vdState.draggedItem = e.target;
  vdState.dragSource = 'pool';
  e.dataTransfer.effectAllowed = 'move';
  e.target.classList.add('dragging');
}

function onDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.vd-drop-slot').forEach(s => s.classList.remove('over'));
  vdState.draggedItem = null;
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (e.target.classList.contains('vd-drop-slot')) {
    e.target.classList.add('over');
  } else if (e.target.closest('.vd-drop-slot')) {
    e.target.closest('.vd-drop-slot').classList.add('over');
  }
}

function onDragLeave(e) {
  if (e.target.classList.contains('vd-drop-slot')) {
    e.target.classList.remove('over');
  }
}

function onDrop(e) {
  e.preventDefault();
  const slot = e.target.closest('.vd-drop-slot');
  if (!slot) return;

  const slotIdx = parseInt(slot.dataset.slotIdx);
  const stepText = vdState.draggedItem?.dataset.stepText || '';

  if (stepText) {
    // If slot already has content, return it to pool
    if (vdState.slotData[slotIdx]) {
      // Keep it in pool for now (no visual change needed)
    }
    // Place new step
    vdState.slotData[slotIdx] = stepText;
    renderDropZones();
    updateProgress();
    vdState.draggedItem = null;
  }

  document.querySelectorAll('.vd-drop-slot').forEach(s => s.classList.remove('over'));
}

// ─────────────────────────────────────────────────────────
// CHECK & VALIDATE
// ─────────────────────────────────────────────────────────

function checkOrder() {
  let correct = 0;
  const violations = [];

  vdState.currentItem.steps.forEach((correctStep, idx) => {
    const userStep = vdState.slotData[idx];
    const slot = $(`slot-${idx}`);

    if (userStep === correctStep.text) {
      correct++;
      slot.classList.remove('wrong');
      slot.classList.add('correct');
    } else {
      slot.classList.remove('correct');
      slot.classList.add('wrong');

      // Check safety violations
      if (vdState.currentItem.safetySteps && vdState.currentItem.safetySteps.includes(correctStep.id)) {
        violations.push(`Bước ${correctStep.id} phải đúng vị trí để đảm bảo an toàn`);
      }
    }
  });

  // Show safety banner if violations
  if (violations.length > 0) {
    $('safetyText').textContent = vdState.currentItem.safetyNote || violations.join('; ');
    $('safetyBanner').classList.add('active');
  }

  vdState.score = { correct, total: vdState.currentItem.steps.length };
  showResult();
}

function showResult() {
  $('btnCheck').style.display = 'none';
  $('btnRetry').style.display = 'inline-block';
  $('btnNext').style.display = 'inline-block';

  const pct = vdState.score.total > 0
    ? Math.round((vdState.score.correct / vdState.score.total) * 100)
    : 0;

  $('scoreDisplay').textContent = pct + '%';
  $('scoreLabel').textContent = `${vdState.score.correct}/${vdState.score.total} bước đúng`;
  $('resultBarFill').style.width = pct + '%';

  // Show correct order
  const correctHtml = vdState.currentItem.steps.map((step, idx) => {
    return `<div class="vd-correct-order-item">${idx + 1}. ${step.text}</div>`;
  }).join('');

  $('correctOrderList').innerHTML = correctHtml;

  // Check if can go next
  const list = getList(vdState.mode);
  const isLast = vdState.currentIndex >= list.length - 1;
  if (isLast) {
    $('btnNext').style.display = 'none';
  }

  showScreen('vdResult');
}

function retryFlashcard() {
  const item = vdState.currentItem;
  $('flashcardInput').value = '';
  $('flashcardInput').focus();
  $('flashcardResult').style.display = 'none';
  showScreen('vdFlash');
}

function nextFlashcard() {
  const list = getList(vdState.mode);
  const idx = vdState.currentIndex + 1;
  if (idx < list.length) {
    startItem(idx);
  } else {
    goList();
  }
}

// ═══════════════════════════════════════════════════════════
// FLASHCARD
// ═══════════════════════════════════════════════════════════

function startFlashcard(card) {
  $('flashcardQuestion').textContent = card.question;
  $('flashcardInput').value = '';
  $('flashcardInput').focus();
  $('flashcardResult').style.display = 'none';

  vdState.flashcardKeywords = card.keywords || [];
  showScreen('vdFlash');
}

function checkFlashcard() {
  const userText = $('flashcardInput').value.toLowerCase();
  const keywords = vdState.flashcardKeywords;

  const results = keywords.map(kw => {
    const normalized = kw.toLowerCase();
    const found = userText.includes(normalized);
    return { keyword: kw, found };
  });

  const found = results.filter(r => r.found).length;
  const pct = keywords.length > 0 ? Math.round((found / keywords.length) * 100) : 0;

  // Show results
  $('keywordList').innerHTML = results.map(r => {
    return `
      <div class="vd-keyword-chip ${r.found ? 'found' : ''}">
        ${r.found ? '✓' : '○'} ${r.keyword}
      </div>
    `;
  }).join('');

  $('flashcardResult').style.display = 'block';

  // Enable next button
  const list = getList(vdState.mode);
  if (vdState.currentIndex < list.length - 1) {
    $('btnFlashNext').style.display = 'inline-block';
  }

  // Save score on close
  vdState.score = { correct: found, total: keywords.length };
}

// ═══════════════════════════════════════════════════════════
// RATING & SPACED REPETITION
// ═══════════════════════════════════════════════════════════

function saveRating(rating) {
  saveRating(vdState.currentItem.id, rating, vdState.score.correct);
  goList();
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Check if VANDAP_VHF is loaded
  if (typeof VANDAP_VHF === 'undefined') {
    console.error('vandap-vhf.js not loaded');
    return;
  }

  // Parse URL params (if any)
  const params = new URLSearchParams(window.location.search);
  const module = params.get('module');
  const vitri = params.get('vitri');

  // Render menu with counts
  renderMenu();
});
