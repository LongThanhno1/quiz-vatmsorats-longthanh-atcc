# 🛰️ CNS Quiz — VATM Long Thành ATCC

> Website ôn tập trắc nghiệm chuyên ngành CNS/ATM dành cho nhân viên ATSEP tại Trung tâm Kiểm soát không lưu Long Thành — 1.141 câu hỏi, 11 module, giao diện radar HUD.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Truy_cập_ngay-0078d4?style=for-the-badge)](https://longthanhno1.github.io/my-first-website-cns-quiz/)
[![Câu hỏi](https://img.shields.io/badge/📚_Câu_hỏi-1.141_câu-10b981?style=for-the-badge)](#)
[![Phiên bản](https://img.shields.io/badge/Phiên_bản-v3-f59e0b?style=for-the-badge)](#)

---

## 📌 Giới thiệu

Website ôn tập trắc nghiệm **Communication · Navigation · Surveillance (CNS)** phục vụ kỳ thi năng định nhân viên kỹ thuật điện tử hàng không (ATSEP). Hệ thống rút ngẫu nhiên 50 câu từ ngân hàng đề theo từng module chuyên ngành, đếm ngược 50 phút, bảo mật kết quả cho đến khi nộp bài.

**Đây là công cụ ôn tập nội bộ** dành cho nhân viên kỹ thuật điện tử hàng không (ATSEP) tại **Trung tâm Kiểm soát đường dài Hồ Chí Minh - VATM Long Thành**. Không phải tài liệu chính thức của VATM.

---

## 🚀 Truy cập nhanh

| Hành động | Link |
|---|---|
| 🌐 Mở website | https://longthanhno1.github.io/my-first-website-cns-quiz/ |
| 📦 Source code | https://github.com/LongThanhno1/my-first-website-cns-quiz |

> Không cần cài đặt gì — chỉ cần trình duyệt và kết nối internet.

---

## 🎯 Tính năng

- ✅ **1.141 câu hỏi** phủ toàn bộ 11 module CNS/ATM (Long Thành + Tân Sơn Nhất)
- 🔀 **Random câu hỏi** mỗi lần thi — bốc 50 câu ngẫu nhiên từ pool, thứ tự đáp án cũng được xáo trộn
- ⏱️ **Đếm thời gian** — 50 phút mỗi bài, cảnh báo khi còn dưới 5 phút
- 🔒 **Bảo mật kết quả** — không hiển thị đúng/sai cho đến khi bấm "Nộp bài"
- 📊 **Kết quả chi tiết** — xem lại từng câu sai, đáp án đúng, tài liệu tham khảo
- 📈 **Phân tích theo module** — bảng thống kê điểm số từng chủ đề, highlight module yếu nhất
- 🔄 **Resume bài thi** — tự động lưu tiến độ vào sessionStorage, phục hồi nếu refresh trang
- ⌨️ **Phím tắt** — `1/2/3/4` chọn đáp án, `←/→` chuyển câu, `Escape` mở drawer
- 📱 **Responsive** — tối ưu cả điện thoại (FAB + bottom drawer) và desktop (sidebar cố định)
- 🎨 **Giao diện HUD** — phong cách radar/aviation control room với glassmorphism

---

## 📚 Nội dung câu hỏi

### Vị trí thi: Long Thành

| Module | Tên đầy đủ | Số câu trong DB | Số câu mỗi lần thi |
|---|---|:---:|:---:|
| 📡 VHF | VHF (Thông tin vô tuyến VHF) | 121 | 50 |
| 📻 Radar | Radar Long Thành (PSR/SSR Sơ cấp & Thứ cấp) | 78 | 50 |
| 🛰️ ADS-B-LT | ADS-B Long Thành (Leonardo - VATM) | 30 | 30 |
| 🛡️ SMS | SMS & Báo cáo an toàn hàng không | 17 | 17 |

### Vị trí thi: Tân Sơn Nhất

| Module | Tên đầy đủ | Số câu trong DB | Số câu mỗi lần thi |
|---|---|:---:|:---:|
| 📡 VHF | VHF (Thông tin vô tuyến VHF) | 121 | 50 |
| 🎙️ Ghi âm | Ghi âm (Hệ thống ghi âm chuyên dụng) | 66 | 50 |
| 🛰️ ADS-B | ADS-B Tân Sơn Nhất (Thales - VCSN) | 301 | 50 |
| 🖥️ RDP/FDP | RDP/FDP (Xử lý dữ liệu Radar/Bay) | 46 | 46 |
| ☎️ VCCS | VCCS (Điều khiển thoại không địa) | 61 | 50 |
| 📻 Radar-TSN | Radar Tân Sơn Nhất (PSR/SSR) | 121 | 50 |
| ⚙️ A-SGMCS | A-SMGCS Tân Sơn Nhất (Hệ thống giám sát mặt đất) | 67 | 50 |
| 🧑‍💼 Kíp trưởng | Kíp trưởng CNS Tân Sơn Nhất | 233 | 50 |

**Tổng cộng: 1.141 câu hỏi** · Ngưỡng đạt: 70%

> **Nguồn:** Tổng hợp từ tài liệu đào tạo ATSEP, ICAO Doc 10057, ED-137, và kinh nghiệm thực tế vận hành tại VATM Long Thành & Tân Sơn Nhất.

---

## 🏗️ Cấu trúc project

```
my-first-website-cns-quiz/
│
├── index_refactored.html   # Giao diện chính — entry point của ứng dụng
├── css/
│   └── style.css           # Stylesheet tùy chỉnh (bổ sung Tailwind CDN)
├── js/
│   ├── questions.js        # ⚠️ Database câu hỏi — xem hướng dẫn cập nhật bên dưới
│   └── app.js              # Logic quiz: random, timer, SessionStorage, kết quả
└── README.md
```

> **Thứ tự load script quan trọng:** `questions.js` phải được load **trước** `app.js` vì app.js phụ thuộc vào `questionBank`, `MODULE_CONFIG`, `LOCATION_MODULE_MAP` được khai báo trong questions.js.

---

## 🔧 Chạy local (cho developer)

Không cần build tool hay Node.js. Chỉ cần một static file server:

```bash
# Clone repo
git clone https://github.com/LongThanhno1/my-first-website-cns-quiz.git
cd my-first-website-cns-quiz

# Cách 1: Python (có sẵn trên macOS/Linux/Windows)
python -m http.server 8080
# → Mở http://localhost:8080/index_refactored.html

# Cách 2: VS Code Live Server extension
# Cài extension "Live Server" của Ritwick Dey → chuột phải index_refactored.html → Open with Live Server
```

> ⚠️ **Không mở file `index_refactored.html` trực tiếp bằng `file://`** — trình duyệt sẽ block việc load `questions.js` và `app.js` do chính sách CORS. Cần qua HTTP server.

---

## ✏️ Hướng dẫn cập nhật câu hỏi

> Dành cho người maintain — **không cần biết code**, chỉ cần chỉnh file `js/questions.js`

Mỗi câu hỏi trong `questionBank` có cấu trúc như sau:

```javascript
{
  id: 1,
  module: "VHF",                          // ID module — phải khớp với MODULE_CONFIG
  moduleName: "VHF (Thông tin vô tuyến VHF)",
  question: "Tần số khẩn nguy hàng không VHF là bao nhiêu?",
  options: [
    "121.5 MHz",   // đáp án này là correctAnswer
    "243.0 MHz",
    "118.0 MHz",
    "121.8 MHz"
  ],
  correctAnswer: "121.5 MHz",             // phải khớp chính xác với một phần tử trong options
  refDoc: "Tai-lieu-on-tap-VHF-VATM.pdf" // tên file tài liệu tham khảo (tùy chọn)
}
```

**Để thêm câu hỏi mới:**

1. Mở file `js/questions.js`
2. Tìm đến cuối mảng `questionBank` (trước dấu `]` cuối cùng)
3. Copy một block câu hỏi có sẵn cùng module
4. Paste vào và chỉnh sửa nội dung — đảm bảo có dấu phẩy `,` sau dấu `}` của câu trước
5. Kiểm tra `correctAnswer` phải là chuỗi **khớp chính xác** (kể cả hoa/thường) với một trong các phần tử `options`
6. Mở lại trình duyệt, F5 để kiểm tra

**Lưu ý quan trọng:**

- `correctAnswer` là **chuỗi văn bản**, không phải số index
- Phải có đúng **4 đáp án** trong mảng `options`
- `module` phải là một trong các giá trị ID hợp lệ: `"VHF"`, `"Radar"`, `"SMS"`, `"ADS-B-LT"`, `"Ghi âm"`, `"ADS-B"`, `"RDP/FDP"`, `"VCCS"`, `"Radar-TSN"`, `"KipTruong-TSN"`, `"A-SGMCS"`
- `id` phải là số duy nhất — lấy số cuối cùng trong file và cộng thêm 1

**Để thêm module mới:**

1. Thêm câu hỏi vào `questionBank` với `module` ID mới
2. Thêm cấu hình vào `MODULE_CONFIG` (icon, màu, tên, số câu draw)
3. Thêm module ID vào `LOCATION_MODULE_MAP` theo vị trí thi tương ứng

---

## 📋 Changelog

| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| v3.1 | 2026 | Tách cấu trúc multi-file (HTML + CSS + JS); thêm SessionStorage resume, keyboard navigation, module breakdown; meta tags SEO |
| v3 | 2025 | Giao diện HUD radar glassmorphism; dropdown Chức danh / Vị trí / Module; thêm module A-SMGCS, ADS-B Long Thành, Radar TSN, Kíp trưởng TSN |
| v2 | 2025 | Phân loại câu hỏi theo module CNS; xem lại câu sai sau khi nộp bài; tài liệu tham khảo |
| v1 | 2025 | Phiên bản đầu tiên — quiz cơ bản VHF, ADS-B, Radar |

---

## 👤 Tác giả

**Đỗ Thanh Long**  
Kỹ sư ATSEP — Trung tâm Kiểm soát không lưu Long Thành  
Công ty Quản lý bay miền Nam (VATM SORATS) — Tổng công ty Quản lý bay Việt Nam (VATM)

---

## ⚠️ Tuyên bố miễn trừ

Đây là công cụ ôn tập **không chính thức**, được xây dựng với mục đích hỗ trợ học tập nội bộ.  
Không thay thế tài liệu đào tạo chính thức của VATM hoặc ICAO.