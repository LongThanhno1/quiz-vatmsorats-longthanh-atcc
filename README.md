# 🛰️ CNS Quiz — VATMSORATS Long Thành ATCC
> Website ôn tập trắc nghiệm CNS/ATM dành cho ATSEP tại Trung tâm Kiểm soát không lưu Long Thành - VATMSORATS Long Thành ATCC.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Truy_cập_ngay-0078d4?style=for-the-badge)](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/)
[![Câu hỏi](https://img.shields.io/badge/📚_Câu_hỏi-1858_câu-10b981?style=for-the-badge)](#)
[![Phiên bản](https://img.shields.io/badge/Phiên_bản-v1.1--2026-f59e0b?style=for-the-badge)](#)
[![Analytics](https://img.shields.io/badge/📊_Analytics-GA4-orange?style=for-the-badge)](#)

---

## 📌 Giới thiệu

Website ôn tập trắc nghiệm **CNS/ATM** (Communication · Navigation · Surveillance) dành cho nhân viên kỹ thuật điện tử hàng không (ATSEP) tại **Trung tâm Kiểm soát không lưu Long Thành - VATMSORATS Long Thành ATCC**.

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

- ✅ **1.858 câu hỏi** phủ toàn bộ lĩnh vực CNS/ATM - cập nhật 2026
- 🔀 **Random 50 câu** ngẫu nhiên mỗi lần thi
- ⏱️ **50 phút** mỗi bài thi
- 📊 **Phân tích kết quả** theo chủ đề sau khi nộp bài
- 💾 **Resume bài thi** — refresh trang không mất tiến độ
- ⌨️ **Phím tắt** — `1/2/3/4` chọn đáp án, `←/→` chuyển câu
- 📱 **Responsive** — dùng được trên điện thoại và máy tính
- 🎨 **Giao diện HUD** — phong cách radar/aviation
- 📈 **Google Analytics 4** — theo dõi lượt truy cập và thi

---

## 📚 Ngân hàng câu hỏi — Cập nhật 2026

| Module | Số câu | Vị trí | Nguồn |
|---|---|---|---|
| 📡 VHF | 428 | Long Thành + Tân Sơn Nhất | NGÂN HÀNG VHF 2026 (KTTWRTSN) — 6 sheet |
| 📻 Radar | 78 | Long Thành | Giữ nguyên |
| 🛡️ SMS | 17 | Long Thành | Giữ nguyên |
| 🛰️ ADS-B-LT | 30 | Long Thành | Giữ nguyên |
| 🎙️ Ghi âm | 66 | Tân Sơn Nhất | Giữ nguyên |
| 🛰️ ADS-B | 301 | Tân Sơn Nhất | Giữ nguyên |
| 🖥️ RDP/FDP | 146 | Long Thành + Tân Sơn Nhất | Trắc nghiệm mạng + ĐGNL 2026 |
| ☎️ VCCS | 246 | Tân Sơn Nhất | VCCS 2026 (KTTWRTSN) |
| 📻 Radar-TSN | 121 | Tân Sơn Nhất | Giữ nguyên |
| 🧑‍💼 Kíp trưởng | 233 | Tân Sơn Nhất | Giữ nguyên |
| ⚙️ A-SGMCS | 192 | Tân Sơn Nhất | A-SMGCS TSN 2026 |
| **Tổng** | **1.858** | | |

---

## 🏗️ Cấu trúc project

```
quiz-vatmsorats-longthanh-atcc/
│
├── index.html          # Giao diện thi chính
├── admin.html          # Dashboard analytics (Looker Studio)
├── check.html          # Công cụ kiểm tra ngân hàng đề
├── css/
│   └── style.css       # Stylesheet tùy chỉnh
├── js/
│   ├── questions.js    # ⚠️ Database câu hỏi (1.858 câu)
│   └── app.js          # Logic quiz
└── README.md
```

---

## 📊 Analytics & Monitoring

Hệ thống theo dõi tự động qua **Google Analytics 4**:

- Lượt truy cập website
- Số người bắt đầu thi từng module (`quiz_start`)
- Số người hoàn thành bài thi (`quiz_complete`)
- Tỷ lệ bỏ giữa chừng (`quiz_abandon`)

**Xem dashboard:** [admin.html](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/admin.html)

---

## 🔧 Chạy local

```bash
# Clone repo
git clone https://github.com/LongThanhno1/quiz-vatmsorats-longthanh-atcc.git

# Mở bằng Live Server (VS Code extension)
# hoặc mở thẳng index.html trong trình duyệt
```

> Khuyến nghị dùng [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) để tránh lỗi CORS.

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

**Kiểm tra sau khi cập nhật:** Truy cập [check.html](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/check.html)

---

## 📋 Changelog

| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| v1.1-2026 | 29/05/2026 | Cập nhật VHF 144→428 câu (6 sheet: Câu hỏi chung, Park Air, R&S, Jotron, HF, Icom) |
| v1.0-2026 | 28/05/2026 | Cập nhật ngân hàng đề 2026 · GA4 · Admin dashboard · Check tool |
| v3 | 2025 | Giao diện HUD radar · Xem lại câu sai |
| v2 | 2025 | Phân loại module CNS |
| v1 | 2025 | Phiên bản đầu tiên |

---

## 👤 Tác giả

**Đỗ Thanh Long**  
Kỹ sư ATSEP — Trung tâm Kiểm soát không lưu Long Thành - Công ty quản lý bay miền nam ( VATMSORATS)  
Tổng công ty Quản lý bay Việt Nam (VATM)

---

## ⚠️ Tuyên bố miễn trừ

Đây là công cụ ôn tập **không chính thức**, xây dựng với mục đích hỗ trợ học tập nội bộ.  
Không thay thế tài liệu đào tạo chính thức của VATM hoặc ICAO.