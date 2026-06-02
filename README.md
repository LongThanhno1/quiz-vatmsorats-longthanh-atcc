# 🛰️ CNS Quiz — VATMSORATS Long Thành ATCC

> Website ôn tập trắc nghiệm CNS/ATM dành cho ATSEP tại Trung tâm Kiểm soát không lưu Long Thành (Long Thanh ATCC) - Công ty quản lý bay miền nam (VATMSORATS) - Tổng công ty Quản lý bay Việt Nam (VATM).

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Truy_cập_ngay-0078d4?style=for-the-badge)](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/)
[![Câu hỏi](https://img.shields.io/badge/📚_Câu_hỏi-1780_câu-10b981?style=for-the-badge)](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/check.html)
[![Phiên bản](https://img.shields.io/badge/Phiên_bản-v2.0--2026-f59e0b?style=for-the-badge)](https://github.com/LongThanhno1/quiz-vatmsorats-longthanh-atcc/releases)
[![Analytics](https://img.shields.io/badge/📊_Analytics-GA4-orange?style=for-the-badge)](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/admin.html)

---

## 📌 Giới thiệu

Website ôn tập trắc nghiệm **CNS/ATM** (Communication · Navigation · Surveillance) dành cho nhân viên kỹ thuật điện tử hàng không (ATSEP).

> ⚠️ Đây là công cụ ôn tập **nội bộ**, không phải tài liệu chính thức của VATM.

---

## 🚀 Truy cập nhanh

| Trang | Link |
|---|---|
| 🌐 Trang thi | https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/ |
| 📊 Admin Dashboard | https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/admin.html |
| 🔍 Kiểm tra ngân hàng đề | https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/check.html |
| 📦 Source code | https://github.com/LongThanhno1/quiz-vatmsorats-longthanh-atcc |

---

## 🎯 Tính năng

- ✅ **1.780 câu hỏi** phủ toàn bộ lĩnh vực CNS/ATM — cập nhật 2026
- 🔀 **Random 50 câu** ngẫu nhiên mỗi lần thi thử
- ⏱️ **50 phút** mỗi bài thi
- 📚 **Practice Mode** — ôn tập không giới hạn thời gian, hiển thị đáp án ngay
- 📊 **Progress Bar** — 50 ô phân đoạn theo dõi tiến độ làm bài
- ⏰ **Cảnh báo Timer** — đổi màu và toast khi còn 5 phút, 1 phút
- 📋 **Ôn lại câu sai** — xem lại đáp án sai/đúng kèm tài liệu tham khảo
- 💾 **Resume bài thi** — refresh trang không mất tiến độ
- ⌨️ **Phím tắt** — `1/2/3/4` chọn đáp án, `←/→` chuyển câu
- 🛩️ **Radar live** — aircraft targets di chuyển và sweep fade như PSR/SSR thật
- 📱 **Responsive** — dùng được trên điện thoại và máy tính
- 🎨 **Giao diện HUD** — phong cách radar/aviation
- 📈 **Google Analytics 4** — theo dõi lượt truy cập và thi
- 🏗️ **Cấu trúc tách file** — index.html 19KB · app.js · questions.js · style.css

---

## 📚 Ngân hàng câu hỏi — Cập nhật 2026

| Module | Số câu | Vị trí | Nguồn |
|---|---|---|---|
| 📡 VHF | 428 | Long Thành + Tân Sơn Nhất | NGÂN HÀNG VHF 2026 (KTTWRTSN) — 6 sheet |
| 📻 Radar (PSR/SSR) | 251 | Long Thành | Giữ nguyên |
| 🛡️ SMS & Báo cáo | 17 | Long Thành + Tân Sơn Nhất | Giữ nguyên |
| 🛰️ ADS-B (Leonardo) | 30 | Long Thành | Giữ nguyên |
| 🎙️ Ghi âm | 66 | Tân Sơn Nhất | Giữ nguyên |
| 🛰️ ADS-B (Thales) | 298 | Tân Sơn Nhất | Giữ nguyên |
| 🖥️ RDP/FDP | 365 | Long Thành | Trắc nghiệm mạng + ĐGNL 2026 |
| ☎️ VCCS | 237 | Tân Sơn Nhất | VCCS 2026 (KTTWRTSN) |
| 📻 Radar-TSN (PSR/SSR) | 111 | Tân Sơn Nhất | Giữ nguyên |
| 🧑‍💼 Kíp trưởng CNS | 230 | Tân Sơn Nhất | Giữ nguyên |
| ⚙️ A-SGMCS | 145 | Tân Sơn Nhất | A-SMGCS TSN 2026 |
| **Tổng** | **1.780** | | |

---

## 🏗️ Cấu trúc project

```
quiz-vatmsorats-longthanh-atcc/
├── index.html          # 🖥️ Giao diện thi chính (19 KB)
├── admin.html          # 📊 Dashboard analytics (Looker Studio)
├── check.html          # 🔍 Công cụ kiểm tra ngân hàng đề
├── css/
│   └── style.css       # 🎨 Stylesheet
├── js/
│   ├── questions.js    # ⚠️ Database câu hỏi (1.780 câu)
│   └── app.js          # ⚡ Logic quiz + Radar engine
└── README.md
```

---

## 📊 Analytics & Monitoring

Theo dõi tự động qua **Google Analytics 4**:

- 👁️ Lượt truy cập website
- 🚀 Số người bắt đầu thi từng module (`quiz_start`)
- ✅ Số người hoàn thành bài thi (`quiz_complete`)
- 📉 Tỷ lệ bỏ giữa chừng (`quiz_abandon`)

Xem dashboard: [admin.html](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/admin.html)

---

## 🔧 Chạy local

```bash
git clone https://github.com/LongThanhno1/quiz-vatmsorats-longthanh-atcc.git
```

Mở bằng [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (VS Code) để tránh lỗi CORS.

---

## ✏️ Cập nhật câu hỏi

Chỉnh sửa `js/questions.js`. Cấu trúc mỗi câu hỏi:

```javascript
{
  id: 1,
  module: "VHF",
  moduleName: "VHF (Thông tin vô tuyến VHF)",
  question: "Nội dung câu hỏi?",
  options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
  correctAnswer: "Đáp án A",
  refDoc: "Tên tài liệu tham khảo"
}
```

Kiểm tra sau khi cập nhật: [check.html](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/check.html)

---

## 🔄 Workflow phát triển

### Git branching

```
main        ← production (GitHub Pages deploy từ đây)
  └── develop  ← nhánh làm việc chính
        └── fix/tên-fix   ← nhánh sửa lỗi
        └── feat/tên-feat ← nhánh tính năng mới
```

### Quy trình chuẩn

```bash
# 1. Làm việc trên develop
git checkout develop

# 2. Thêm tính năng / sửa lỗi
git add .
git commit -m "feat: mô tả tính năng"

# 3. Test local bằng Live Server → check.html pass

# 4. Merge vào main khi xong
git checkout main
git merge develop --no-ff -m "release: vX.X-2026"
git push origin main

# 5. Tag release (tùy chọn)
git tag vX.X-2026
git push origin vX.X-2026
```

> ⚠️ **KHÔNG push thẳng lên `main`** — luôn merge từ `develop` sau khi test xong.

---

## 📥 Workflow cập nhật ngân hàng đề

### Quy trình thêm câu hỏi mới

**Bước 1** — Chuẩn bị dữ liệu

Mỗi câu hỏi cần đủ 7 trường: `id · module · moduleName · question · options · correctAnswer · refDoc`

```javascript
{
  id: 1781,                          // ID tiếp nối sau câu cuối
  module: "VHF",                     // Key module (xem danh sách bên dưới)
  moduleName: "VHF (Thông tin vô tuyến VHF)",
  question: "Nội dung câu hỏi?",
  options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
  correctAnswer: "Đáp án A",         // Phải khớp EXACT với 1 phần tử trong options
  refDoc: "Ten-tai-lieu.pdf"
}
```

**Module key hợp lệ:**

| Key | Tên đầy đủ | Vị trí |
|---|---|---|
| `VHF` | VHF (Thông tin vô tuyến VHF) | Long Thành + Tân Sơn Nhất |
| `Radar` | Radar (PSR/SSR Sơ cấp & Thứ cấp) | Long Thành |
| `SMS` | SMS & Báo cáo an toàn | Long Thành + Tân Sơn Nhất |
| `ADS-B-LT` | ADS-B Long Thành (Leonardo - VATM) | Long Thành |
| `Ghi âm` | Ghi âm (Hệ thống ghi âm chuyên dụng) | Tân Sơn Nhất |
| `ADS-B` | ADS-B (Giám sát tự động phụ thuộc - Thales) | Tân Sơn Nhất |
| `RDP/FDP` | RDP/FDP (Xử lý dữ liệu Radar/Bay) | Long Thành |
| `VCCS` | VCCS (Điều khiển thoại không dây) | Tân Sơn Nhất |
| `Radar-TSN` | Radar Tân Sơn Nhất (PSR/SSR) | Tân Sơn Nhất |
| `KipTruong-TSN` | Kíp trưởng CNS Tân Sơn Nhất | Tân Sơn Nhất |
| `A-SGMCS` | A-SMGCS Tân Sơn Nhất (Hệ thống giám sát mặt đất) | Tân Sơn Nhất |

**Bước 2** — Backup trước khi sửa

```bash
cp js/questions.js js/questions.backup_$(date +%Y%m%d).js
```

**Bước 3** — Append câu mới vào cuối array trong `js/questions.js`

**Bước 4** — Kiểm tra

```bash
# Mở check.html bằng Live Server → xác nhận:
# ✅ Tổng số câu tăng đúng
# ✅ Không có ID trùng / gap
# ✅ correctAnswer khớp options
# ✅ Module key hợp lệ
```

**Bước 5** — Commit

```bash
git add js/questions.js
git commit -m "feat: add X cau [MODULE] - ID Y-Z"
git push origin develop
```

**Bước 6** — Merge lên main sau khi test xong (xem Workflow phát triển)

---

## 📋 Changelog

| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| v2.0-2026 | 30/05/2026 | Refactor tách file · Radar live · Progress bar · Timer warning · Ôn câu sai · Practice mode · Dedup 1858→1780 |
| v1.1-2026 | 29/05/2026 | Cập nhật VHF 144→428 câu (6 sheet) |
| v1.0-2026 | 28/05/2026 | Ngân hàng đề 2026 · GA4 · Admin dashboard · Check tool |
| v3 | 2025 | Giao diện HUD radar · Xem lại câu sai |
| v2 | 2025 | Phân loại module CNS |
| v1 | 2025 | Phiên bản đầu tiên |

---

## 👤 Tác giả

**Đỗ Thanh Long**

Kỹ sư ATSEP — Trung tâm Kiểm soát không lưu Long Thành (Long Thanh ATCC) - Công ty quản lý bay miền nam (VATMSORATS) - Tổng công ty Quản lý bay Việt Nam (VATM)

---

> ⚠️ Đây là công cụ ôn tập **không chính thức**, xây dựng với mục đích hỗ trợ học tập nội bộ. Không thay thế tài liệu đào tạo chính thức của VATM hoặc ICAO.
