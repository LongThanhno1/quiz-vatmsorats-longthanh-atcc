# 🛰️ CNS Quiz — VATMSORATS Long Thành ATCC

> Website ôn tập trắc nghiệm CNS/ATM dành cho ATSEP tại Trung tâm Kiểm soát không lưu Long Thành — VATMSORATS.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Truy_cập_ngay-0078d4?style=for-the-badge)](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/)
[![Câu hỏi](https://img.shields.io/badge/📚_Câu_hỏi-2275_câu-10b981?style=for-the-badge)](#-ngân-hàng-câu-hỏi)
[![Phiên bản](https://img.shields.io/badge/Phiên_bản-v2.1--2026-f59e0b?style=for-the-badge)](#-changelog)
[![SRS](https://img.shields.io/badge/🧠_Ôn_tập-Spaced_Repetition_(SM--2)-8b5cf6?style=for-the-badge)](#-tính-năng)

---

## 📌 Giới thiệu

Website ôn tập trắc nghiệm **CNS/ATM** (Communication · Navigation · Surveillance) dành cho nhân viên kỹ thuật điện tử hàng không (ATSEP) tại **Trung tâm Kiểm soát không lưu Long Thành — VATMSORATS**, thuộc Tổng công ty Quản lý bay Việt Nam (VATM).

Không chỉ là một bộ câu hỏi tĩnh, hệ thống tích hợp **thuật toán ôn tập ngắt quãng (Spaced Repetition — SM-2)** giúp từng người tự động nhận diện câu hỏi mình hay sai và ưu tiên ôn lại đúng lúc, thay vì học lại toàn bộ ngân hàng đề mỗi lần.

> ⚠️ Đây là công cụ ôn tập **nội bộ**, không phải tài liệu chính thức của VATM hay ICAO.

---

## 🚀 Truy cập nhanh

| | Trang | Mô tả |
|---|---|---|
| 🌐 | [Trang ôn tập / thi thử](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/) | Giao diện chính |
| 📊 | [Admin Dashboard](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/admin.html) | Phân tích & Team Readiness *(yêu cầu mã truy cập)* |
| 🔍 | [Kiểm tra ngân hàng đề](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/check.html) | Công cụ validate dữ liệu câu hỏi |
| 📦 | [Source code](https://github.com/LongThanhno1/quiz-vatmsorats-longthanh-atcc) | Repository |

---

## 🎯 Tính năng

### Làm bài
- ✅ **2.275 câu hỏi** phủ 11 module CNS/ATM — cập nhật 2026
- ⏱️ **Thi thử**: 50 câu ngẫu nhiên / 50 phút, có chấm điểm + xem lại câu sai
- 📖 **Ôn tập**: làm hết toàn bộ pool của module, không giới hạn thời gian
- ⌨️ **Phím tắt**: `1/2/3/4` chọn đáp án · `←/→` chuyển câu
- 💾 **Resume bài thi** — refresh trang không mất tiến độ
- 📱 **Responsive** — dùng tốt trên điện thoại lẫn máy tính
- 🌗 **Light/Dark theme** — chuyển đổi tức thì, đồng bộ trên mọi màn hình

### 🧠 Ôn tập thông minh (Spaced Repetition — SM-2)
- Mỗi câu trả lời được chấm và đẩy vào thuật toán SM-2 rút gọn: tính độ dễ (ease factor), khoảng lặp lại (interval, tối đa 90 ngày), và ngày đến hạn ôn tiếp theo
- ⚡ **Ôn nhanh**: chỉ hiện đúng những câu đã đến hạn ôn lại — không phải làm lại cả trăm câu để ôn vài câu hay quên
- 🎯 **Mastery badge**: hiển thị % câu đã "thành thạo" (trả lời đúng liên tục ≥ 3 lần) theo từng module
- ⚠️ **Phát hiện câu khó (leech)**: tự động liệt kê các câu bị trả lời sai nhiều lần (≥ 5 lần), cần chú ý ôn riêng
- 🔄 **Đồng bộ đa thiết bị**: tạo mã đồng bộ (hoặc quét mã QR) để mang tiến độ ôn tập giữa điện thoại và máy tính

### 📊 Phân tích & theo dõi
- 📈 **Google Analytics 4** — theo dõi lượt truy cập, lượt thi, tỷ lệ hoàn thành
- 🎯 **Team Readiness Dashboard** — % thành thạo theo module và danh sách câu sai nhiều nhất của *toàn đội*, hoàn toàn ẩn danh (không gửi tên/định danh cá nhân)

---

## 📚 Ngân hàng câu hỏi

**Tổng: 2.275 câu**, phủ 11 module, cập nhật 2026:

| Module | Số câu | Vị trí |
|---|---|---|
| 📡 VHF | 427 | Long Thành + Tân Sơn Nhất |
| 📻 Radar | 349 | Long Thành |
| 🖥️ RDP/FDP | 365 | Long Thành + Tân Sơn Nhất |
| ☎️ VCCS | 237 | Tân Sơn Nhất |
| 🧑‍💼 Kíp trưởng (TSN) | 230 | Tân Sơn Nhất |
| 🛰️ ADS-B | 298 | Tân Sơn Nhất |
| ⚙️ A-SMGCS | 145 | Long Thành |
| 📻 Radar (TSN) | 111 | Tân Sơn Nhất |
| 🎙️ Ghi âm | 66 | Tân Sơn Nhất |
| 🛰️ ADS-B (LT) | 30 | Long Thành |
| 🛡️ SMS | 17 | Long Thành |

Kiểm tra tính toàn vẹn ngân hàng đề (ID trùng, đáp án khớp, thiếu field…) tại [check.html](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/check.html).

---

## 🏗️ Cấu trúc project

```
quiz-vatmsorats-longthanh-atcc/
│
├── index.html              # Giao diện thi/ôn tập chính
├── admin.html              # Dashboard analytics + Team Readiness (có xác thực)
├── check.html               # Công cụ kiểm tra ngân hàng đề
├── vandap.html              # Module vấn đáp VHF (đang phát triển)
│
├── css/
│   ├── style.css            # Stylesheet chính
│   └── vandap.css           # Stylesheet riêng cho module vấn đáp
│
├── js/
│   ├── app.js                # Logic quiz, SRS (SM-2), đồng bộ, telemetry
│   ├── questions.js          # Database câu hỏi (2.275 câu)
│   ├── vandap-app.js         # Logic module vấn đáp
│   └── vandap-vhf.js         # Dữ liệu vấn đáp VHF
│
├── apps-script/
│   └── webhook.gs            # Google Apps Script — telemetry & Team Readiness
│
├── logo/                     # Logo + favicon
├── Data/                     # Tài liệu nguồn (đề thi gốc dạng .docx)
└── README.md
```

---

## 🔌 Kiến trúc Backend (Google Apps Script)

Toàn bộ phần "server" của hệ thống chạy trên **1 Google Apps Script** duy nhất (`apps-script/webhook.gs`, deploy dưới dạng Web App), phục vụ 2 mục đích:

| Mục đích | Cách hoạt động |
|---|---|
| 🎯 **Team Readiness** (ẩn danh) | Mỗi câu trả lời gửi 4 trường `module / viTri / questionId / isWrong` qua `GET`, ghi vào Google Sheet. `admin.html` đọc lại qua `?action=summary` |
| 🔄 **Đồng bộ cá nhân** | Mỗi máy tự sinh 1 mã đồng bộ (`XXXX-XXXX`). Lịch sử SRS + heatmap được đẩy lên qua `POST action=push`, kéo về qua `POST action=pull`, lưu dưới dạng JSON trên Google Drive (last-write-wins, không merge) |

> 🔒 Cả 2 luồng đều **không gửi tên, chức danh hay bất kỳ thông tin định danh cá nhân nào**.

### Cấu hình (dành cho admin)
1. Deploy `apps-script/webhook.gs` lên Google Apps Script (**Execute as: Me · Who has access: Anyone**)
2. Điền URL `/exec` vào `TEAM_WEBHOOK_URL` trong `js/app.js`
3. Team Readiness Dashboard và tính năng đồng bộ sẽ hoạt động ngay sau khi cấu hình

---

## 🔧 Chạy local

```bash
git clone https://github.com/LongThanhno1/quiz-vatmsorats-longthanh-atcc.git
```

Khuyến nghị mở bằng [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (VS Code extension) để tránh lỗi CORS.

---

## ✏️ Cập nhật câu hỏi

Chỉnh sửa file `js/questions.js`. Mỗi câu hỏi có cấu trúc:

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

**Bắt buộc kiểm tra sau khi cập nhật:** truy cập [check.html](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/check.html) — công cụ validate ID trùng, đáp án không khớp option, thiếu field, v.v.

---

## 📋 Changelog

| Phiên bản | Thay đổi chính |
|---|---|
| **v2.1-2026** | Dọn dẹp & chuyên nghiệp hóa repo · README viết lại · Admin Dashboard redesign (tab Tổng quan/Cấu hình, mật khẩu hash SHA-256) · Favicon |
| v2.0-2026 | Đồng bộ đa thiết bị (mã + QR) · Background/UI cinematic redesign · Phân trang sidebar câu hỏi |
| v1.5-2026 | Nâng cấp SRS lên SM-2 interval-based thật · Ôn nhanh · Mastery badge · Leech detection |
| v1.4-2026 | Team Readiness Dashboard · Webhook telemetry ẩn danh |
| v1.0-2026 | Cập nhật ngân hàng đề 2026 (2.275 câu) · GA4 · Admin dashboard · Check tool |
| v3 (2025) | Giao diện HUD radar · Xem lại câu sai |
| v1–v2 (2025) | Phiên bản đầu tiên · Phân loại module CNS |

---

## 👤 Tác giả

**Đỗ Thanh Long**
Kỹ sư ATSEP — Trung tâm Kiểm soát không lưu Long Thành
Công ty Quản lý bay miền Nam (VATMSORATS) — Tổng công ty Quản lý bay Việt Nam (VATM)

---

## ⚠️ Tuyên bố miễn trừ

Đây là công cụ ôn tập **không chính thức**, xây dựng với mục đích hỗ trợ học tập nội bộ.
Không thay thế tài liệu đào tạo chính thức của VATM hoặc ICAO.
