/**
 * VANDAP_VHF — Dữ liệu câu hỏi Vấn đáp Module VHF
 * Nguồn: 72. NHCH TH VHF.docx
 * Parse: Toàn bộ câu hỏi thực hành đánh giá năng lực VHF
 * Phiên bản: 1.0 — 2026
 *
 * Cấu trúc:
 *   flashcards[]   — Thẻ lật + Keyword Matching (Nhóm A)
 *   procedures[]   — Sắp xếp quy trình Drag & Drop (Nhóm B: Bảo dưỡng/Đo kiểm)
 *   incidents[]    — Sắp xếp quy trình ứng phó sự cố (Nhóm C)
 */

const VANDAP_VHF = {
  module: "VHF",
  moduleName: "VHF (Thông tin vô tuyến VHF)",
  version: "1.0",
  refDoc: "72. NHCH TH VHF.docx",

  // ══════════════════════════════════════════════════════
  // NHÓM A — FLASHCARD + KEYWORD MATCHING
  // ══════════════════════════════════════════════════════
  flashcards: [
    {
      id: "fc_01",
      question: "Trình bày những thông số kỹ thuật chính của máy thu, máy phát VHF tại cơ sở đang khai thác?",
      answerFull: [
        "Các thông số chung: Tần số hoạt động; Phân cách kênh; Kiểu điều chế; Độ ổn định tần số; Nguồn cung cấp AC/DC; Giao tiếp kết nối với anten, ghi âm, VCCS; Chế độ làm việc và điều kiện môi trường.",
        "Các thông số phần phát: Công suất phát, bước chỉnh công suất; Mức điều chế; Méo điều chế; Line Input.",
        "Các thông số phần thu: Độ nhạy; Mức thu Squelch; Méo hài; Line Output."
      ],
      keywords: [
        "Tần số hoạt động",
        "Phân cách kênh",
        "Kiểu điều chế",
        "Độ ổn định tần số",
        "Nguồn AC/DC",
        "Công suất phát",
        "Mức điều chế",
        "Méo điều chế",
        "Line Input",
        "Độ nhạy",
        "Squelch",
        "Line Output"
      ],
      difficulty: "medium",
      refDoc: "Tài liệu kỹ thuật hãng sản xuất; HDKT cơ sở"
    },
    {
      id: "fc_02",
      question: "Nêu danh mục các hệ thống VHF và các hệ thống thiết bị phụ trợ liên quan tại vị trí đang khai thác?",
      answerFull: [
        "Hệ thống VHF: hãng sản xuất/ký mã hiệu, năm sản xuất/đưa vào khai thác, số lượng máy, tần số hoạt động, tầm phủ, công suất, độ nhạy.",
        "Hệ thống VCCS (nếu có): hãng sản xuất, số lượng bàn khai thác, giao tiếp vô tuyến, giao tiếp thoại.",
        "Hệ thống ghi âm (nếu có): hãng sản xuất, số lượng máy, số kênh ghi âm.",
        "Hệ thống đường truyền cáp quang/Viba/VSAT (nếu có): hãng sản xuất, tốc độ truyền dẫn.",
        "Hệ thống nguồn điện AC/DC: Máy nổ, UPS, nguồn DC."
      ],
      keywords: [
        "VHF",
        "VCCS",
        "Ghi âm",
        "Cáp quang",
        "Viba",
        "VSAT",
        "UPS",
        "Nguồn DC",
        "Máy nổ",
        "Tầm phủ",
        "Tần số hoạt động"
      ],
      difficulty: "medium",
      refDoc: "HDKT cơ sở; Hướng dẫn khai thác vận hành thiết bị"
    },
    {
      id: "fc_03",
      question: "Vẽ và thuyết minh sơ đồ đấu nối thiết bị VHF và các hệ thống phụ trợ liên quan tại vị trí đang khai thác?",
      answerFull: [
        "Vẽ sơ đồ hệ thống VHF và các thiết bị phụ trợ liên quan: anten, bộ lọc, chống sét, VCCS, ghi âm, đường truyền.",
        "Chỉ rõ các đầu kết nối và dạng giao tiếp tín hiệu trên các đường kết nối.",
        "Nêu tính năng, tham số chính: hãng sản xuất, năm đưa vào khai thác, số lượng thiết bị, tần số hoạt động, công suất, độ nhạy."
      ],
      keywords: [
        "Anten",
        "Bộ lọc",
        "Chống sét",
        "VCCS",
        "Ghi âm",
        "Feeder",
        "Đường truyền",
        "Giao tiếp tín hiệu",
        "Đầu kết nối"
      ],
      difficulty: "hard",
      refDoc: "HDKT cơ sở; Hướng dẫn khai thác vận hành thiết bị"
    },
    {
      id: "fc_04",
      question: "Trình bày các thông số vận hành theo quy định đơn vị của các thiết bị VHF A/G đang khai thác?",
      answerFull: [
        "Trình bày các thông số vận hành theo Bảng thông số vận hành của thiết bị VHF A/G đang khai thác.",
        "Nêu chu kỳ kiểm tra: hàng ngày, hàng tuần, hàng tháng, hàng quý.",
        "Nêu cách thức kiểm tra từng thông số.",
        "Nêu giá trị chuẩn và giải giá trị chấp nhận được của từng thông số."
      ],
      keywords: [
        "Bảng thông số vận hành",
        "Chu kỳ kiểm tra",
        "Giá trị chuẩn",
        "Giải giá trị chấp nhận",
        "Hàng ngày",
        "Hàng tháng",
        "Thông số vận hành"
      ],
      difficulty: "medium",
      refDoc: "Bảng thông số vận hành hệ thống VHF A/G; HDKT cơ sở"
    },
    {
      id: "fc_05",
      question: "Nêu chức trách, nhiệm vụ của nhân viên khai thác kỹ thuật VHF tại vị trí đang khai thác?",
      answerFull: [
        "Tham chiếu: Hướng dẫn ca kíp trực; HDKT cơ sở; Quy định Quản lý kỹ thuật của Tổng Công ty và các Quy định quản lý nội bộ của Công ty, cơ sở, các văn bản hiệp đồng.",
        "Thực hiện công việc giao nhận ca trực.",
        "Vận hành, kiểm tra, giám sát thiết bị VHF trong ca.",
        "Xử lý sự cố, báo cáo kịp thời.",
        "Ghi chép hồ sơ nhật ký trực ca."
      ],
      keywords: [
        "Giao nhận ca",
        "Vận hành",
        "Giám sát",
        "Xử lý sự cố",
        "Báo cáo",
        "Nhật ký trực ca",
        "Ca kíp trực"
      ],
      difficulty: "easy",
      refDoc: "Hướng dẫn ca kíp trực; HDKT cơ sở; QĐ Quản lý kỹ thuật"
    },
    {
      id: "fc_06",
      question: "Nêu các đầu mối cần phối hợp, liên hệ và hiệp đồng trong ca kíp trực?",
      answerFull: [
        "Các đầu mối báo cáo trực tiếp: Lãnh đạo Đội/Đài/Trạm, Trực khối, Kỹ thuật, An toàn.",
        "Các đầu mối phối hợp, hiệp đồng: Không lưu (KSVKL), Quân sự, Cảng hàng không.",
        "Các đầu mối bên ngoài: Cục tần số, đơn vị cung cấp dịch vụ VNPT/Viettel."
      ],
      keywords: [
        "KSVKL",
        "Lãnh đạo Đội",
        "Trực khối",
        "An toàn",
        "Quân sự",
        "Cảng hàng không",
        "Cục tần số",
        "VNPT",
        "Viettel"
      ],
      difficulty: "easy",
      refDoc: "Hướng dẫn ca kíp trực; Văn bản hiệp đồng"
    },
    {
      id: "fc_07",
      question: "Trình bày về công tác ghi chép hồ sơ kỹ thuật ca kíp trực (nhật ký trực ca, thống kê hỏng hóc...)?",
      answerFull: [
        "Nắm rõ danh mục, nội dung các hồ sơ tài liệu cần ghi chép trong ca kíp trực.",
        "Nhật ký trực ca: ghi đầy đủ diễn biến, sự kiện trong ca.",
        "Thống kê hỏng hóc: ghi nhận thiết bị, thời gian, nguyên nhân, biện pháp xử lý.",
        "Báo cáo thường xuyên và đột xuất theo quy định."
      ],
      keywords: [
        "Nhật ký trực ca",
        "Hồ sơ kỹ thuật",
        "Thống kê hỏng hóc",
        "Ghi chép",
        "Báo cáo thường xuyên",
        "Báo cáo đột xuất"
      ],
      difficulty: "easy",
      refDoc: "Hướng dẫn ca kíp trực; HDKT cơ sở; QĐ Quản lý kỹ thuật"
    }
  ],

  // ══════════════════════════════════════════════════════
  // NHÓM B — SẮP XẾP QUY TRÌNH (BẢO DƯỠNG & ĐO KIỂM)
  // ══════════════════════════════════════════════════════
  procedures: [
    {
      id: "proc_01",
      title: "Kiểm tra thiết bị VHF A/G trước khi bảo dưỡng",
      description: "Quy trình kiểm tra ban đầu thiết bị VHF trước khi tiến hành bảo dưỡng định kỳ",
      difficulty: "medium",
      safety: true,
      safetyNote: "Phải kiểm tra nguồn DC dự phòng trước khi tắt CB nguồn AC",
      safetySteps: [1, 2],
      estimatedTime: "30 phút",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Kiểm tra nhiệt độ và độ ẩm phòng thiết bị" },
        { id: 2, text: "Kiểm tra nguồn AC/DC: tắt CB AC, quan sát hoạt động bằng nguồn DC 5 phút" },
        { id: 3, text: "Trả thiết bị lại hoạt động bình thường với cả 2 nguồn AC và DC" },
        { id: 4, text: "Kiểm tra hệ thống dây điện, cáp RF, cáp điều khiển, tiếp đất, chống sét" },
        { id: 5, text: "Kiểm tra KRONE và các kết nối: ăn mòn, hư hỏng, đứt cáp" },
        { id: 6, text: "Kiểm tra ắc qui, UPS, điều hòa không khí" },
        { id: 7, text: "Kiểm tra ăng-ten, chống sét, dây cáp bên ngoài; tra dầu mỡ, vặn ốc vít" },
        { id: 8, text: "Ghi lại thông số máy thu, máy phát trước bảo dưỡng vào Bảng giá trị" },
        { id: 9, text: "Đề xuất, kiến nghị trước khi bảo dưỡng (nếu có)" }
      ]
    },
    {
      id: "proc_02",
      title: "Vệ sinh máy VHF A/G và các thiết bị liên quan",
      description: "Quy trình vệ sinh toàn bộ máy VHF và thiết bị phụ trợ (anten, chống sét, bộ lọc, feeder, cấp nguồn)",
      difficulty: "easy",
      safety: true,
      safetyNote: "Phải thông báo giải trợ và tắt nguồn trước khi tháo máy",
      safetySteps: [0, 1, 2],
      estimatedTime: "60 phút",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo đơn vị liên quan và thực hiện giải trợ thiết bị" },
        { id: 2, text: "Kiểm tra thông số hoạt động; Tắt nguồn thiết bị" },
        { id: 3, text: "Tháo dây nguồn, cáp feeder, cáp điều khiển; Tháo máy ra khỏi tủ máy" },
        { id: 4, text: "Dùng giẻ ẩm, chổi lông, máy hút bụi vệ sinh khe thông gió, quạt, bề mặt thiết bị" },
        { id: 5, text: "Vệ sinh các nút điều khiển, đầu nối mặt trước và mặt sau máy" },
        { id: 6, text: "Vệ sinh bên trong thiết bị nếu cần thiết" },
        { id: 7, text: "Kiểm tra ăng-ten, chống sét, bộ lọc, feeder, cấp nguồn; vệ sinh đầu nối hoen rỉ" },
        { id: 8, text: "Bôi dầu mỡ, Silicon; gia cố ăng-ten; làm lại đầu nối nếu cần" },
        { id: 9, text: "Lắp đặt lại máy và thiết bị; đấu nối lại cáp nguồn, dây điều khiển, feeder" },
        { id: 10, text: "Bật nguồn; Kiểm tra thông số hoạt động; Đưa máy trở lại hoạt động bình thường" }
      ]
    },
    {
      id: "proc_03",
      title: "Đo kiểm tra tần số phát bằng thiết bị đo",
      description: "Quy trình đo kiểm tra tần số phát VHF: chuẩn bị, kết nối, thực hiện đo, đánh giá kết quả",
      difficulty: "medium",
      safety: true,
      safetyNote: "Phải giải trợ thiết bị trước khi kết nối thiết bị đo",
      safetySteps: [0],
      estimatedTime: "20 phút",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo đơn vị liên quan và thực hiện giải trợ thiết bị" },
        { id: 2, text: "Chuẩn bị thiết bị đo và cài đặt tham số thiết bị đo phù hợp" },
        { id: 3, text: "Vẽ sơ đồ kết nối máy VHF với thiết bị đo" },
        { id: 4, text: "Kết nối thiết bị và thực hiện các bước đo kiểm tra tần số phát" },
        { id: 5, text: "Đọc giá trị tần số phát; đánh giá kết quả tốt/xấu" },
        { id: 6, text: "Lắp đặt lại máy và thiết bị; Bật nguồn; Kiểm tra thông số; Đưa vào khai thác" }
      ]
    },
    {
      id: "proc_04",
      title: "Đo kiểm tra tần số thu bằng thiết bị đo",
      description: "Quy trình đo kiểm tra tần số thu VHF: chuẩn bị, kết nối, thực hiện đo, đánh giá kết quả",
      difficulty: "medium",
      safety: true,
      safetyNote: "Phải giải trợ thiết bị trước khi kết nối thiết bị đo",
      safetySteps: [0],
      estimatedTime: "20 phút",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo đơn vị liên quan và thực hiện giải trợ thiết bị" },
        { id: 2, text: "Chuẩn bị thiết bị đo và cài đặt tham số thiết bị đo phù hợp" },
        { id: 3, text: "Vẽ sơ đồ kết nối máy VHF với thiết bị đo" },
        { id: 4, text: "Kết nối thiết bị và thực hiện các bước đo kiểm tra tần số thu" },
        { id: 5, text: "Đọc giá trị tần số thu; đánh giá kết quả tốt/xấu" },
        { id: 6, text: "Lắp đặt lại máy và thiết bị; Bật nguồn; Kiểm tra thông số; Đưa vào khai thác" }
      ]
    },
    {
      id: "proc_05",
      title: "Đo kiểm tra công suất phát bằng thiết bị đo",
      description: "Quy trình đo công suất phát ra anten VHF: chuẩn bị thiết bị đo, kết nối, đo công suất Pt",
      difficulty: "medium",
      safety: true,
      safetyNote: "Phải giải trợ và dùng tải giả nếu không đo trực tiếp trên anten",
      safetySteps: [0],
      estimatedTime: "20 phút",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo đơn vị liên quan và thực hiện giải trợ thiết bị" },
        { id: 2, text: "Chuẩn bị thiết bị đo: lựa chọn đúng đầu cảm biến, dây tín hiệu RF phù hợp" },
        { id: 3, text: "Vẽ sơ đồ kết nối máy VHF với thiết bị đo và anten (hoặc tải giả)" },
        { id: 4, text: "Kết nối thiết bị và thực hiện đo công suất phát ra anten Pt" },
        { id: 5, text: "Đọc và đánh giá giá trị công suất phát: tốt/xấu theo bảng thông số vận hành" },
        { id: 6, text: "Lắp đặt lại máy và thiết bị; Bật nguồn; Kiểm tra thông số; Đưa vào khai thác" }
      ]
    },
    {
      id: "proc_06",
      title: "Đo kiểm tra hệ số sóng đứng VSWR",
      description: "Quy trình đo VSWR: đo công suất phát Pt và công suất phản xạ Ppx, tính VSWR, đánh giá phối hợp trở kháng",
      difficulty: "hard",
      safety: true,
      safetyNote: "Phải giải trợ và kết nối chính xác đầu đo chiều phát/phản xạ",
      safetySteps: [0],
      estimatedTime: "30 phút",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo đơn vị liên quan và thực hiện giải trợ thiết bị" },
        { id: 2, text: "Chuẩn bị thiết bị đo: lựa chọn đúng đầu cảm biến, dây tín hiệu RF phù hợp" },
        { id: 3, text: "Vẽ sơ đồ kết nối máy VHF với thiết bị đo và anten (hoặc tải giả)" },
        { id: 4, text: "Kết nối thiết bị và thực hiện đo công suất phát ra anten Pt" },
        { id: 5, text: "Kết nối thiết bị và thực hiện đo công suất phản xạ từ anten Ppx" },
        { id: 6, text: "Tính VSWR từ Pt và Ppx; đánh giá phối hợp trở kháng tốt/không tốt" },
        { id: 7, text: "Lắp đặt lại máy và thiết bị; Bật nguồn; Kiểm tra thông số; Đưa vào khai thác" }
      ]
    },
    {
      id: "proc_07",
      title: "Đo độ nhạy máy thu SINAD bằng thiết bị đo",
      description: "Quy trình đo kiểm tra độ nhạy máy thu VHF theo chỉ tiêu SINAD, sử dụng máy tạo tín hiệu cao tần và máy phân tích âm tần",
      difficulty: "hard",
      safety: true,
      safetyNote: "Phải giải trợ trước khi kết nối. Không điều chỉnh mức tín hiệu RF vượt ngưỡng cho phép",
      safetySteps: [0, 11],
      estimatedTime: "45 phút",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1,  text: "Thông báo đơn vị liên quan và thực hiện giải trợ thiết bị" },
        { id: 2,  text: "Chuẩn bị thiết bị đo: máy tạo tín hiệu cao tần, máy phân tích âm tần, adapter, dây RF" },
        { id: 3,  text: "Vẽ sơ đồ kết nối máy VHF với thiết bị đo" },
        { id: 4,  text: "Cài đặt máy tạo tín hiệu: tần số RF = tần số hoạt động; mức RF và điều chế theo bảng thông số" },
        { id: 5,  text: "Cập nhật thông số mức RSSI, nhiệt độ từ chức năng Measurement của máy thu" },
        { id: 6,  text: "Trên máy phân tích âm tần: chọn lọc CCITT.NB, chọn chế độ đo SINAD" },
        { id: 7,  text: "Bấm nút SQ để tắt Squelch (chỉ thị SQ trên mặt máy tắt)" },
        { id: 8,  text: "Bật phát tín hiệu RF trên máy tạo tín hiệu cao tần" },
        { id: 9,  text: "Xoay núm Volume chiều tăng; kiểm tra có tín hiệu âm tần 1kHz nghe được không" },
        { id: 10, text: "Điều chỉnh mức RF (mỗi bước 0.1–0.5 µV) đến khi SINAD đạt giá trị bảng thông số vận hành" },
        { id: 11, text: "Ghi lại giá trị mức RF cuối cùng và giá trị RSSI tương ứng trên màn hình BITE" },
        { id: 12, text: "Xoay núm Volume chiều giảm hết cỡ; Tắt phát RF; Đưa máy thu về trạng thái ban đầu" }
      ]
    },
    {
      id: "proc_08",
      title: "Thay thế tấm/khối mạch hệ thống thiết bị VHF",
      description: "Quy trình thay thế card/module mạch bị hỏng trong hệ thống VHF",
      difficulty: "medium",
      safety: true,
      safetyNote: "Phải tắt nguồn trước khi tháo. Khi chưa rõ nguyên nhân, phải thận trọng khi thay tấm khối mới",
      safetySteps: [0, 4],
      estimatedTime: "30 phút",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo đơn vị liên quan và thực hiện giải trợ thiết bị" },
        { id: 2, text: "Tắt nguồn thiết bị" },
        { id: 3, text: "Tháo tấm/khối mạch cũ bị hỏng ra khỏi thiết bị" },
        { id: 4, text: "Kiểm tra phát hiện nguyên nhân gây hỏng hóc (kiểm tra kỹ trước khi thay mới)" },
        { id: 5, text: "Thay thế tấm/khối mạch mới vào đúng vị trí" },
        { id: 6, text: "Bật nguồn thiết bị" },
        { id: 7, text: "Hiệu chỉnh thiết bị; Kiểm tra thông số hoạt động; Đưa vào khai thác" }
      ]
    },
    {
      id: "proc_09",
      title: "Thay thế máy thu/phát VHF dự phòng khi máy chính hỏng",
      description: "Quy trình đưa máy VHF dự phòng vào thay thế máy chính bị hỏng để duy trì liên lạc",
      difficulty: "medium",
      safety: true,
      safetyNote: "Phải thông báo KSVKL và đảm bảo liên lạc liên tục trong quá trình thay thế",
      safetySteps: [0],
      estimatedTime: "20 phút",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo KSVKL và các cá nhân liên quan để phối hợp xử lý" },
        { id: 2, text: "Tắt nguồn; Tháo các kết nối của máy đang bị hỏng ra khỏi hệ thống" },
        { id: 3, text: "Thay thế máy thu/phát VHF dự phòng vào hệ thống" },
        { id: 4, text: "Đấu nối nguồn, các cáp tín hiệu cho máy dự phòng" },
        { id: 5, text: "Mở nguồn và kiểm tra hoạt động: tần số, công suất phát, độ sâu điều chế, mức thu" },
        { id: 6, text: "Phối hợp cùng KSVKL liên lạc thử sóng với máy bay" },
        { id: 7, text: "Thực hiện báo cáo, thông báo các cá nhân liên quan và ghi nhật ký sổ sách" }
      ]
    }
  ],

  // ══════════════════════════════════════════════════════
  // NHÓM C — QUY TRÌNH ỨNG PHÓ SỰ CỐ (INCIDENTS)
  // ══════════════════════════════════════════════════════
  incidents: [
    {
      id: "inc_01",
      title: "Ứng phó khi có mùi khét/chập điện trong phòng máy",
      description: "Xử lý tình huống phát hiện mùi khét do chập điện tại phòng thiết bị hoặc Cabin TWR",
      difficulty: "hard",
      safety: true,
      safetyNote: "TUYỆT ĐỐI không cấp nguồn cho thiết bị khi chưa xử lý xong sự cố chập điện",
      safetySteps: [1, 2],
      criticalLevel: "CRITICAL",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo KSVKL và nhân viên liên quan; thực hiện giải trợ thông tin (nếu cần)" },
        { id: 2, text: "Nắm rõ sơ đồ cấp điện, tủ phân phối, MCB, lộ tuyến cấp điện trong phòng máy" },
        { id: 3, text: "Phối hợp kiểm tra xác định nơi có mùi khét; Phát hiện nơi bị chập điện" },
        { id: 4, text: "Cắt điện cầu dao/MCB liên quan đến khu vực bị chập điện" },
        { id: 5, text: "Xử lý: sửa chữa hoặc thay thế (KHÔNG cấp nguồn khi chưa xử lý xong)" },
        { id: 6, text: "Báo cáo, thông báo các cá nhân liên quan; Ghi chép sổ sách sau xử lý" }
      ]
    },
    {
      id: "inc_02",
      title: "Ứng phó khi có sự cố sét đánh vào khu vực thiết bị",
      description: "Xử lý tình huống sét đánh vào khu vực có hệ thống thiết bị đang hoạt động",
      difficulty: "hard",
      safety: true,
      safetyNote: "Ưu tiên đảm bảo công tác điều hành bay trước, sau đó mới đánh giá hỏng hóc",
      safetySteps: [1],
      criticalLevel: "CRITICAL",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo KSVKL và các cá nhân liên quan để phối hợp xử lý" },
        { id: 2, text: "Kiểm tra và thực hiện giải trợ thông tin: triển khai thiết bị dự phòng" },
        { id: 3, text: "Kiểm tra tình trạng tất cả thiết bị; Đánh giá sơ bộ hỏng hóc" },
        { id: 4, text: "Báo cáo, thông báo các cá nhân liên quan; Ghi chép sổ sách sau xử lý" }
      ]
    },
    {
      id: "inc_03",
      title: "Ứng phó khi có cảnh báo cháy hoặc xảy ra cháy nổ",
      description: "Xử lý tình huống cháy nổ tại phòng thiết bị theo quy định điều lệnh chữa cháy",
      difficulty: "hard",
      safety: true,
      safetyNote: "Ưu tiên an toàn nhân sự và giải trợ thông tin trước khi dập lửa",
      safetySteps: [0, 1, 2],
      criticalLevel: "CRITICAL",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo KSVKL và các cá nhân liên quan (nhân viên trực, hỗ trợ kỹ thuật)" },
        { id: 2, text: "Khẩn trương thực hiện giải trợ thông tin nếu có hỏng hóc" },
        { id: 3, text: "Xác định nhanh chóng nguyên nhân xảy ra cháy; Cách ly nơi bị cháy" },
        { id: 4, text: "Dập đám cháy bằng các phương tiện hiện có (bình bọt, khăn ẩm...)" },
        { id: 5, text: "Kiểm tra tình trạng tất cả thiết bị; Đánh giá sơ bộ hỏng hóc" },
        { id: 6, text: "Báo cáo, thông báo các cá nhân liên quan; Ghi chép sổ sách sau xử lý" }
      ]
    },
    {
      id: "inc_04",
      title: "Ứng phó kẹt key máy VHF do đầu gần (tại máy VHF)",
      description: "Xử lý tình huống kẹt key do máy VHF tại chỗ, không phải do tàu bay",
      difficulty: "medium",
      safety: true,
      safetyNote: "Phải đảm bảo KSVKL có phương tiện liên lạc thay thế trước khi xử lý",
      safetySteps: [0, 1],
      criticalLevel: "HIGH",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo KSVKL và nhân viên liên quan; Phối hợp xử lý" },
        { id: 2, text: "Kiểm tra tần số dự phòng/121.5 MHz; Đề nghị KSVKL dùng tần số dự phòng tạm thời" },
        { id: 3, text: "Xác định máy bị kẹt key: qua đèn báo, màn hình thiết bị, hệ thống giám sát/VCCS" },
        { id: 4, text: "Thực hiện quy trình đưa máy VHF bị kẹt key ra khỏi dây chuyền hoạt động" },
        { id: 5, text: "Kiểm tra và đưa máy VHF dự phòng vào thay thế vị trí máy bị kẹt key" },
        { id: 6, text: "Phối hợp KSVKL xác nhận hết tình trạng kẹt key; Chuyển về tần số chính" },
        { id: 7, text: "Thực hiện sửa chữa máy VHF bị kẹt key; Báo cáo và ghi nhật ký" }
      ]
    },
    {
      id: "inc_05",
      title: "Ứng phó kẹt key VHF do đầu xa (tàu bay hoặc nguồn nhiễu)",
      description: "Xử lý tình huống kẹt key do tàu bay hoặc nguồn nhiễu bên ngoài",
      difficulty: "medium",
      safety: false,
      safetyNote: "",
      criticalLevel: "HIGH",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo KSVKL và nhân viên liên quan" },
        { id: 2, text: "Kiểm tra tần số dự phòng/121.5 MHz; Đề nghị KSVKL dùng tần số dự phòng tạm thời" },
        { id: 3, text: "Xác định kẹt key đầu xa qua đèn báo, màn hình thiết bị, hệ thống giám sát/VCCS" },
        { id: 4, text: "Yêu cầu KSVKL báo với tàu bay kiểm tra và xử lý tình trạng kẹt key" },
        { id: 5, text: "Phối hợp KSVKL xác nhận hết kẹt key trên tần số chính; Chuyển về tần số chính" },
        { id: 6, text: "Báo cáo, thông báo các cá nhân liên quan; Ghi chép sổ sách sau xử lý" }
      ]
    },
    {
      id: "inc_06",
      title: "Ứng phó mất liên lạc tất cả tàu bay trên tần số chính",
      description: "Xử lý tình huống KSVKL thông báo không liên lạc được với tất cả tàu bay trên tần số chính",
      difficulty: "hard",
      safety: true,
      safetyNote: "Ưu tiên đảm bảo liên lạc an toàn bay; triển khai ngay tần số/máy dự phòng",
      safetySteps: [0, 1],
      criticalLevel: "CRITICAL",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo KSVKL và các cá nhân liên quan (nhân viên trực, trạm xa, hỗ trợ kỹ thuật)" },
        { id: 2, text: "Kiểm tra máy dự phòng/tần số dự phòng/121.5 MHz; Đề nghị KSVKL dùng tần số dự phòng/HF/CPDLC" },
        { id: 3, text: "Phối hợp nhân viên kỹ thuật trạm xa khoanh vùng sự cố: đầu gần hay đầu trạm xa" },
        { id: 4, text: "Thực hiện quy trình xử lý sự cố/sửa chữa để khôi phục hoạt động tần số chính" },
        { id: 5, text: "Phối hợp KSVKL xác nhận hết tình trạng mất liên lạc; Chuyển về tần số chính" },
        { id: 6, text: "Báo cáo, thông báo các cá nhân liên quan; Ghi chép sổ sách sau xử lý" }
      ]
    },
    {
      id: "inc_07",
      title: "Ứng phó sự cố tại trạm VHF xa ảnh hưởng tần số chính",
      description: "Xử lý khi nhân viên kỹ thuật tại trạm VHF xa thông báo phát hiện sự cố thiết bị liên quan đến tần số chính",
      difficulty: "hard",
      safety: true,
      safetyNote: "Ưu tiên đảm bảo liên lạc an toàn bay trước khi khoanh vùng sự cố",
      safetySteps: [0, 1],
      criticalLevel: "CRITICAL",
      refDoc: "72. NHCH TH VHF.docx",
      steps: [
        { id: 1, text: "Thông báo KSVKL và các cá nhân liên quan (nhân viên trực, trạm xa, hỗ trợ kỹ thuật)" },
        { id: 2, text: "Kiểm tra máy dự phòng/tần số dự phòng/121.5 MHz; Đề nghị KSVKL dùng tần số dự phòng/HF/CPDLC" },
        { id: 3, text: "Chủ trì phối hợp, hướng dẫn nhân viên trạm xa khoanh vùng sự cố: đầu gần hay đầu xa" },
        { id: 4, text: "Thực hiện quy trình xử lý sự cố/sửa chữa để khôi phục tần số chính" },
        { id: 5, text: "Phối hợp KSVKL kiểm tra liên lạc trên tần số chính và chuyển về tần số chính" },
        { id: 6, text: "Báo cáo, thông báo các cá nhân liên quan; Ghi chép sổ sách sau xử lý" }
      ]
    }
  ]
};

// Export cho môi trường Node.js (nếu cần)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VANDAP_VHF;
}
