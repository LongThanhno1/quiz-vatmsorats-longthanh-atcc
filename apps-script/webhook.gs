/**
 * ============================================================
 * HƯỚNG DẪN TRIỂN KHAI GOOGLE APPS SCRIPT WEBHOOK
 * CNS Quiz — VATMSORATS Long Thành ATCC
 * ============================================================
 *
 * BƯỚC 1 — TẠO GOOGLE SHEET MỚI
 *   - Vào https://sheets.google.com → tạo Sheet trắng
 *   - Đặt tên sheet tab đầu tiên là: RawLog
 *     (Chuột phải vào tab "Sheet1" ở dưới → Rename → gõ "RawLog")
 *   - Giữ nguyên, KHÔNG cần tạo sheet "Summary" thủ công
 *     (buildSummary() sẽ tự tạo khi chạy)
 *
 * BƯỚC 2 — MỞ APPS SCRIPT EDITOR
 *   - Trong Google Sheet, vào menu: Extensions > Apps Script
 *   - Một tab mới mở ra là Apps Script Editor
 *
 * BƯỚC 3 — PASTE CODE
 *   - Xóa toàn bộ code mẫu (function myFunction(){}) có sẵn
 *   - Paste toàn bộ nội dung file này vào
 *   - Nhấn Ctrl+S (hoặc nút Save) để lưu
 *
 * BƯỚC 4 — DEPLOY WEBHOOK
 *   - Nhấn nút "Deploy" (góc trên phải) → "New deployment"
 *   - Type: chọn "Web app"
 *   - Description: gõ tên bất kỳ, ví dụ "CNS Quiz Webhook v1"
 *   - Execute as: "Me (your.email@gmail.com)"
 *   - Who has access: "Anyone"  ← BẮT BUỘC để webhook nhận POST không cần auth
 *   - Nhấn "Deploy" → Google sẽ yêu cầu xác nhận quyền lần đầu → chọn "Authorize"
 *   - Copy URL dạng: https://script.google.com/macros/s/AKfycb.../exec
 *     → Đây là WEBHOOK_URL dán vào quiz app (js/app.js hoặc js/questions.js)
 *
 * BƯỚC 5 — LƯU Ý QUAN TRỌNG
 *   - Mỗi khi SỬA CODE: phải "Deploy > New deployment" (không dùng "Edit deployment")
 *     Nếu dùng "Edit deployment" → URL cũ vẫn chạy code CŨ, không update
 *   - URL webhook là public — bảo mật theo logic: chỉ nhận đúng format JSON hợp lệ
 *   - Sheet "RawLog" tích lũy dữ liệu qua thời gian, KHÔNG tự xóa
 *   - Chạy buildSummary() thủ công: trong Editor, chọn function "buildSummary"
 *     từ dropdown → nhấn nút ▶ Run
 *
 * ============================================================
 */

// ── DANH SÁCH MODULE HỢP LỆ (đồng bộ với questionBank) ──────────────────
const VALID_MODULES = [
  'VHF',
  'Ghi âm',
  'ADS-B',
  'RDP/FDP',
  'VCCS',
  'SMS',
  'A-SGMCS',
  'Radar',
  'ADS-B-LT',
  'Radar-TSN',
  'KipTruong-TSN'
];

// ── TÊN SHEET ─────────────────────────────────────────────────────────────
const SHEET_RAWLOG  = 'RawLog';
const SHEET_SUMMARY = 'Summary';

// Header hàng đầu của RawLog (tạo tự động nếu sheet trống)
const RAWLOG_HEADERS = ['timestamp', 'module', 'viTri', 'questionId', 'isWrong'];


// ============================================================
// doGet — Webhook handler chính (GET + query params)
// Hai mode:
//   ?action=summary  → trả về JSON tổng hợp cho admin dashboard
//   ?ts=...&mod=...  → ghi log vào RawLog (webhook bình thường)
// ============================================================
function doGet(e) {
  // ── Summary API: admin dashboard fetch ?action=summary ──
  if (e && e.parameter && e.parameter.action === 'summary') {
    return getSummaryData();
  }

  try {
    if (!e || !e.parameter) {
      return jsonResponse('error', 'Missing query params');
    }

    var p = e.parameter;

    // 1. Map query params → payload object
    var payload = {
      timestamp:  p.ts  || '',
      module:     p.mod || '',
      viTri:      p.vt  || '',
      questionId: parseInt(p.qid, 10),
      isWrong:    p.err === '1'
    };

    // 2. Validate
    var validationError = validatePayload(payload);
    if (validationError) {
      return jsonResponse('error', validationError);
    }

    // 3. Ghi vào sheet RawLog
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateSheet(ss, SHEET_RAWLOG);

    // Tạo header nếu sheet còn trống
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(RAWLOG_HEADERS);
      sheet.getRange(1, 1, 1, RAWLOG_HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // Ghi dữ liệu — KHÔNG lưu định danh cá nhân
    sheet.appendRow([
      payload.timestamp,
      payload.module,
      payload.viTri,
      payload.questionId,
      payload.isWrong
    ]);

    return jsonResponse('ok', null);

  } catch (err) {
    return jsonResponse('error', 'Internal error: ' + err.message);
  }
}

// doPost giữ lại để tương thích nếu gọi từ server/Postman
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return jsonResponse('error', 'Missing body');
    var payload = JSON.parse(e.postData.contents);
    var err = validatePayload(payload);
    if (err) return jsonResponse('error', err);
    var sheet = getOrCreateSheet(SpreadsheetApp.getActiveSpreadsheet(), SHEET_RAWLOG);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(RAWLOG_HEADERS);
      sheet.getRange(1,1,1,RAWLOG_HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([payload.timestamp, payload.module, payload.viTri||'', payload.questionId, payload.isWrong===true]);
    return jsonResponse('ok', null);
  } catch(err) { return jsonResponse('error', err.message); }
}


// ============================================================
// getSummaryData — Trả về JSON cho admin dashboard
// Gọi qua: GET ?action=summary
// Response: { status, modules[], topWrong[], totalRows, updatedAt }
// ============================================================
function getSummaryData() {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var rawSheet = ss.getSheetByName(SHEET_RAWLOG);

  if (!rawSheet || rawSheet.getLastRow() <= 1) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok', modules: [], topWrong: [], totalRows: 0,
      updatedAt: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var data    = rawSheet.getDataRange().getValues();
  var headers = data[0];
  var rows    = data.slice(1);

  var COL_MOD     = headers.indexOf('module');
  var COL_QID     = headers.indexOf('questionId');
  var COL_WRONG   = headers.indexOf('isWrong');

  var moduleStats   = {};
  var questionStats = {};

  rows.forEach(function(row) {
    var mod     = String(row[COL_MOD]   || '').trim();
    var qid     = String(row[COL_QID]   || '').trim();
    var isWrong = row[COL_WRONG] === true || row[COL_WRONG] === 'TRUE';
    if (!mod || !qid) return;

    if (!moduleStats[mod])   moduleStats[mod]   = { total: 0, wrong: 0 };
    if (!questionStats[qid]) questionStats[qid] = { total: 0, wrong: 0, mod: mod };
    moduleStats[mod].total++;
    if (isWrong) moduleStats[mod].wrong++;
    questionStats[qid].total++;
    if (isWrong) questionStats[qid].wrong++;
  });

  // Modules: sort theo mastery tăng dần (yếu nhất lên đầu)
  var modules = Object.keys(moduleStats).map(function(mod) {
    var s = moduleStats[mod];
    return {
      module:  mod,
      total:   s.total,
      wrong:   s.wrong,
      mastery: s.total > 0 ? Math.round((s.total - s.wrong) / s.total * 100) : 0
    };
  }).sort(function(a, b) { return a.mastery - b.mastery; });

  // Top 10 câu sai nhiều nhất (có ít nhất 3 lượt)
  var topWrong = Object.keys(questionStats)
    .filter(function(qid) { return questionStats[qid].total >= 3; })
    .map(function(qid) {
      var s = questionStats[qid];
      return { qid: Number(qid), mod: s.mod, total: s.total, wrong: s.wrong,
               pct: Math.round(s.wrong / s.total * 100) };
    })
    .sort(function(a, b) { return b.pct - a.pct; })
    .slice(0, 10);

  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok', modules: modules, topWrong: topWrong,
    totalRows: rows.length, updatedAt: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}


// ============================================================
// buildSummary — Hàm tổng hợp (chạy THỦ CÔNG từ Apps Script Editor)
// Đọc toàn bộ RawLog → ghi ra sheet "Summary" với 3 bảng:
//   A) Theo module: tổng lượt, tổng sai, % sai
//   B) Top 30 câu sai nhiều nhất toàn hệ thống
//   C) Theo module + viTri: % thành thạo (chỉ câu ≥ 10 lượt)
// ============================================================
function buildSummary() {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var rawSheet = ss.getSheetByName(SHEET_RAWLOG);

  if (!rawSheet || rawSheet.getLastRow() <= 1) {
    SpreadsheetApp.getUi().alert('RawLog trống hoặc chưa có dữ liệu.');
    return;
  }

  // Đọc toàn bộ dữ liệu (bỏ qua hàng header)
  var data      = rawSheet.getDataRange().getValues();
  var headers   = data[0]; // ['timestamp','module','viTri','questionId','isWrong']
  var rows      = data.slice(1);

  // Index cột theo header (đảm bảo linh hoạt nếu cột thay đổi)
  var COL_MODULE     = headers.indexOf('module');
  var COL_VITR      = headers.indexOf('viTri');
  var COL_QID        = headers.indexOf('questionId');
  var COL_ISWRONG    = headers.indexOf('isWrong');

  // ── A: Thống kê theo module ──────────────────────────────
  // moduleStats[module] = { total: n, wrong: n }
  var moduleStats = {};

  // ── B: Thống kê theo questionId (toàn hệ thống) ──────────
  // questionStats[qId] = { total: n, wrong: n }
  var questionStats = {};

  // ── C: Thống kê theo module + viTri ──────────────────────
  // moduleViTriStats[module+'|'+viTri] = { total: n, wrong: n }
  var moduleViTriStats = {};

  rows.forEach(function(row) {
    var mod      = String(row[COL_MODULE]  || '').trim();
    var vt       = String(row[COL_VITR]   || '').trim();
    var qid      = String(row[COL_QID]     || '').trim();
    var isWrong  = row[COL_ISWRONG] === true || row[COL_ISWRONG] === 'TRUE';

    if (!mod || !qid) return; // Bỏ qua dòng thiếu dữ liệu

    // A — module stats
    if (!moduleStats[mod]) moduleStats[mod] = { total: 0, wrong: 0 };
    moduleStats[mod].total++;
    if (isWrong) moduleStats[mod].wrong++;

    // B — question stats
    if (!questionStats[qid]) questionStats[qid] = { total: 0, wrong: 0 };
    questionStats[qid].total++;
    if (isWrong) questionStats[qid].wrong++;

    // C — module + viTri stats
    var key = mod + '|' + vt;
    if (!moduleViTriStats[key]) moduleViTriStats[key] = { module: mod, viTri: vt, total: 0, wrong: 0 };
    moduleViTriStats[key].total++;
    if (isWrong) moduleViTriStats[key].wrong++;
  });

  // ── Tạo / clear sheet Summary ────────────────────────────
  var sumSheet = getOrCreateSheet(ss, SHEET_SUMMARY);
  sumSheet.clearContents();

  var writeRow = 1; // con trỏ dòng hiện tại (1-indexed)

  // ── Ghi bảng A: Theo module ──────────────────────────────
  sumSheet.getRange(writeRow, 1).setValue('=== A. THỐNG KÊ THEO MODULE ===');
  sumSheet.getRange(writeRow, 1).setFontWeight('bold');
  writeRow++;

  var hdrA = ['Module', 'Tổng lượt', 'Tổng sai', '% Sai'];
  sumSheet.getRange(writeRow, 1, 1, hdrA.length).setValues([hdrA]).setFontWeight('bold');
  writeRow++;

  Object.keys(moduleStats).sort().forEach(function(mod) {
    var s    = moduleStats[mod];
    var pct  = s.total > 0 ? Math.round(s.wrong / s.total * 10000) / 100 : 0;
    sumSheet.getRange(writeRow, 1, 1, 4).setValues([[mod, s.total, s.wrong, pct]]);
    writeRow++;
  });

  writeRow++; // dòng trống ngăn cách

  // ── Ghi bảng B: Top 30 câu sai nhiều nhất ────────────────
  sumSheet.getRange(writeRow, 1).setValue('=== B. TOP 30 CÂU SAI NHIỀU NHẤT (toàn hệ thống) ===');
  sumSheet.getRange(writeRow, 1).setFontWeight('bold');
  writeRow++;

  var hdrB = ['questionId', 'Tổng lượt', 'Tổng sai', '% Sai'];
  sumSheet.getRange(writeRow, 1, 1, hdrB.length).setValues([hdrB]).setFontWeight('bold');
  writeRow++;

  // Sắp xếp theo % sai giảm dần, lấy top 30
  var sortedQ = Object.keys(questionStats).map(function(qid) {
    var s   = questionStats[qid];
    var pct = s.total > 0 ? s.wrong / s.total * 100 : 0;
    return { qid: qid, total: s.total, wrong: s.wrong, pct: pct };
  });
  sortedQ.sort(function(a, b) { return b.pct - a.pct; });
  sortedQ.slice(0, 30).forEach(function(item) {
    var pctRound = Math.round(item.pct * 100) / 100;
    sumSheet.getRange(writeRow, 1, 1, 4).setValues([[item.qid, item.total, item.wrong, pctRound]]);
    writeRow++;
  });

  writeRow++;

  // ── Ghi bảng C: Module + viTri (min 10 lượt) ─────────────
  sumSheet.getRange(writeRow, 1).setValue('=== C. % THÀNH THẠO THEO MODULE + VỊ TRÍ (≥10 lượt) ===');
  sumSheet.getRange(writeRow, 1).setFontWeight('bold');
  writeRow++;

  var hdrC = ['Module', 'Vị trí', 'Tổng lượt', 'Tổng đúng', '% Thành thạo'];
  sumSheet.getRange(writeRow, 1, 1, hdrC.length).setValues([hdrC]).setFontWeight('bold');
  writeRow++;

  Object.keys(moduleViTriStats).sort().forEach(function(key) {
    var s = moduleViTriStats[key];
    if (s.total < 10) return; // Loại bỏ mẫu quá nhỏ
    var correct  = s.total - s.wrong;
    var mastery  = Math.round(correct / s.total * 10000) / 100;
    sumSheet.getRange(writeRow, 1, 1, 5).setValues([[s.module, s.viTri, s.total, correct, mastery]]);
    writeRow++;
  });

  // Auto-resize tất cả cột
  sumSheet.autoResizeColumns(1, 5);

  // Thông báo hoàn thành
  SpreadsheetApp.getUi().alert(
    'buildSummary() hoàn thành!\n' +
    'Sheet "Summary" đã được cập nhật.\n' +
    'Tổng dòng RawLog: ' + rows.length
  );
}


// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Validate payload JSON — trả về string lỗi nếu không hợp lệ, null nếu OK
 */
function validatePayload(payload) {
  if (typeof payload !== 'object' || payload === null) {
    return 'Payload must be a JSON object';
  }

  // timestamp: phải là string, không rỗng
  if (typeof payload.timestamp !== 'string' || payload.timestamp.trim() === '') {
    return 'Invalid field: timestamp (must be non-empty string)';
  }

  // module: phải nằm trong danh sách hợp lệ
  if (VALID_MODULES.indexOf(payload.module) === -1) {
    return 'Invalid field: module "' + payload.module + '" not in valid list';
  }

  // questionId: phải là số nguyên dương
  if (
    typeof payload.questionId !== 'number' ||
    !Number.isInteger(payload.questionId) ||
    payload.questionId <= 0
  ) {
    return 'Invalid field: questionId (must be positive integer)';
  }

  // isWrong: phải là boolean
  if (typeof payload.isWrong !== 'boolean') {
    return 'Invalid field: isWrong (must be boolean true/false)';
  }

  return null; // Hợp lệ
}

/**
 * Lấy sheet theo tên; tạo mới nếu chưa tồn tại
 */
function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

/**
 * Trả về ContentService JSON response chuẩn
 * @param {string} status  - 'ok' hoặc 'error'
 * @param {string|null} message - mô tả lỗi (null nếu ok)
 */
function jsonResponse(status, message) {
  var body = { status: status };
  if (message) body.message = message;
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
