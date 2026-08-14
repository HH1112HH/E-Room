# Báo cáo lộ trình phát triển & kiểm tra MVP E-Room (Tuần T5 → T9: 03/08 → 06/09/2026)

> Báo cáo mô tả chi tiết những gì nhóm đã và sẽ làm trong 5 tuần phát triển MVP (T5–T9): công việc từng ngày, cấu trúc phần lõi và phần giao diện của ứng dụng, cùng quy trình kiểm tra tình trạng ứng dụng và cách xử lý khi ứng dụng không hoạt động.

---

## 1. Tổng quan phạm vi MVP

**Mục tiêu MVP:** một trang web luyện nói tiếng Anh có AI, đăng ký được, vào phòng được, nói được, AI nghe → viết ra chữ → chấm điểm phát âm → gợi ý sửa lỗi. Sản phẩm chạy thực tế trên Internet, cho người dùng thử nghiệm.

**Nguyên tắc xây dựng trong 5 tuần:**
1. Hoàn thành chức năng lõi trước, các phần phụ trợ sau.
2. Mỗi ngày có mốc "xong" cụ thể; đạt mốc mới chuyển sang việc kế tiếp.
3. Giữ số lượng thành phần hệ thống tối thiểu để giảm rủi ro lỗi.
4. Mọi chức năng AI đều có phương án dự phòng: AI lỗi thì ứng dụng vẫn hoạt động, chỉ thiếu tính năng AI.

---

## 2. Cấu trúc ứng dụng: Phần lõi và Phần giao diện

### 2.1 Phần lõi (xử lý phía máy chủ — backend)

| Thành phần | Công nghệ | Chức năng |
|---|---|---|
| Máy chủ API | FastAPI (Python) | Nhận yêu cầu từ giao diện, xử lý, trả kết quả |
| Xác thực tài khoản | JWT | Đăng ký, đăng nhập, thẻ truy cập hết hạn tự động |
| Kho dữ liệu | MySQL | Lưu người dùng, phòng, tin nhắn, buổi học |
| Bộ nhớ tạm + hàng đợi | Redis | Xếp hàng xử lý âm thanh, lưu tạm phiên làm việc |
| Nhận dạng giọng nói (STT) | faster-whisper (mô hình turbo / large-v3) | Nghe file ghi âm → trả về văn bản + mốc thời gian từng từ |
| Chấm điểm phát âm | Điểm từ độ tin cậy của Whisper + từ điển phát âm CMU | Chấm 0–10, xác định từ phát âm chưa đúng |
| Sửa lỗi bằng AI | Mô hình ngôn ngữ Gemma (chạy tại máy chủ, Ollama) | Phân tích lỗi, gợi ý cách sửa, nội dung đọc mẫu |
| Phương án dự phòng AI | Từ điển CMU | AI lỗi → trả gợi ý từ từ điển, không màn hình trắng |
| Hộp thoại thời gian thực | WebSocket | Chat 2 chiều, đẩy transcript và kết quả chấm điểm tức thì |

### 2.2 Phần giao diện (trang web hiển thị cho người dùng — frontend)

| Trang | Đường dẫn | Chức năng |
|---|---|---|
| Đăng ký / Đăng nhập | `/register`, `/login` | Tạo tài khoản, đăng nhập, đăng xuất |
| Trang chủ | `/` | Danh sách phòng đang mở, tạo phòng mới theo chủ đề |
| Phòng luyện nói | `/rooms/:id` | Chat văn bản, nút ghi âm, transcript hiện theo thời gian thực, thẻ chấm điểm + gợi ý sửa lỗi |
| Hồ sơ người dùng | `/profile` | Lịch sử buổi học, điểm tổng hợp |

**Yêu cầu giao diện MVP:** 4 trang trên hoạt động đầy đủ, bố cục rõ ràng (Bootstrap 5), thông báo lỗi hiển thị bằng tiếng Việt thay vì màn hình trắng, dữ liệu tự động cập nhật khi có kết quả AI mới.

---

## 3. Lịch trình công việc từng ngày (T5 → T9)

### Tuần T5 (03/08 – 09/08/2026) — Dựng khung nền tảng

| Ngày | Công việc | Mốc hoàn thành |
|---|---|---|
| 03/08 | Họp nhóm: chốt phạm vi 4 chức năng lõi, phân công vai trò (frontend / backend / AI / dữ liệu), tạo kho code GitHub | Có biên bản phân công + danh sách tính năng loại khỏi MVP |
| 05/08 | Cài đặt môi trường: Python, uv, Node.js, Docker Desktop, Git, VS Code; kiểm tra card đồ họa bằng `nvidia-smi` | 7 phần mềm cài xong; xác định được card đồ họa có đủ để chạy mô hình turbo/large-v3 |
| 06/08 | Vẽ bản thiết kế 4 màn hình (Figma): đăng nhập, danh sách phòng, phòng luyện nói, hồ sơ | Đủ 4 màn hình thiết kế |
| 07/08 | Dựng khung: máy chủ API (cổng 8000), trang web (cổng 3000), kho dữ liệu MySQL + Redis chạy bằng Docker | Trang web gọi được API máy chủ |
| 08/08 | Xây dựng đăng ký/đăng nhập (JWT); tạo 4 bảng dữ liệu: users, rooms, messages, sessions | Tự đăng ký → đăng nhập → đổi tên được, dữ liệu lưu vào MySQL |
| 09/08 | Hoàn thiện bản thiết kế + bản chạy thử → **nộp sản phẩm T5** | Đủ hồ sơ nộp |

### Tuần T6 (10/08 – 16/08/2026) — Phát triển phần lõi AI: nghe → chữ → điểm

| Ngày | Công việc | Mốc hoàn thành |
|---|---|---|
| 10/08 | Hoàn tất phần tài khoản còn dang dở; kiểm tra lại 4 bảng dữ liệu | Đăng ký/đăng nhập/sửa hồ sơ chạy mượt |
| 11/08 | Cài faster-whisper + thư viện GPU (CUDA/cuDNN); tải mô hình small.en; chạy thử trên 1 file ghi âm | Máy chủ nhận diện được giọng nói thành chữ |
| 12/08 | Viết API nhận file ghi âm: upload → xử lý → trả văn bản + mốc thời gian | Gửi file 10 giây → nhận chữ trong vài giây |
| 13/08 | Ghi âm 3 câu mẫu (1 chuẩn, 2 cố tình sai); viết bài kiểm tra tự động cho pipeline âm thanh | Bài kiểm tra tự động đạt (xanh) |
| 14/08 | Nâng mô hình lên **turbo** (hoặc **large-v3** nếu card ≥ 10GB) qua cấu hình `WHISPER_MODEL`; đo tốc độ xử lý | Đổi mô hình không phát sinh lỗi, không sửa code |
| 15/08 | Xây dựng chấm điểm 0–10 (độ tin cậy của Whisper + từ điển CMU); bài kiểm tra tự động | Đọc câu khó → điểm giảm đúng, từ sai được đánh dấu |
| 16/08 | Quay video demo: ghi âm → chữ + điểm → **nộp sản phẩm T6** | Đủ hồ sơ nộp |

### Tuần T7 (17/08 – 23/08/2026) — Hoàn thiện giao diện + thời gian thực

| Ngày | Công việc | Mốc hoàn thành |
|---|---|---|
| 17/08 | Hoàn thiện 4 trang giao diện (Bootstrap, chế độ tối, thông báo lỗi tiếng Việt) | 4 trang hoạt động đủ |
| 18/08 | Chat 2 chiều qua WebSocket + nút ghi âm + hiển thị transcript | 2 người chat được, ghi âm ra chữ |
| 19/08 | Thẻ chấm bài: điểm + lỗi + gợi ý sửa (AI, có phương án dự phòng) | Nói sai → thẻ hiện đúng, không màn hình trắng |
| 20/08 | Gọi thoại/video thời gian thực giữa 2 máy (LiveKit) | 2 máy gọi được nhau |
| 21/08 | Truyền âm thanh thời gian thực: nói → AI viết chữ hiện trong < 3 giây (VAD cắt câu, hàng đợi) | Chữ hiện dưới 3 giây |
| 22/08 | Chạy bảng kiểm tra 12 kịch bản (mục 4.1); sửa toàn bộ lỗi | 12/12 đạt |
| 23/08 | Chuẩn bị link demo + mô tả → **nộp sản phẩm T7 (MVP hoàn chỉnh)** | Đủ hồ sơ nộp |

### Tuần T8 (24/08 – 31/08/2026) — Đưa ứng dụng lên Internet + thử nghiệm thực tế

| Ngày | Công việc | Mốc hoàn thành |
|---|---|---|
| 24/08 | Lập danh sách 10–15 người dùng thử (bạn học tiếng Anh, CLB); soạn bảng câu hỏi khảo sát | Có danh sách + bản nháp khảo sát |
| 26/08 | Triển khai: thuê máy chủ (8 CPU, 16GB RAM, GPU ≥ 8GB), cài đặt Docker, cấu hình Nginx, bật HTTPS, đặt tên miền, sao lưu tự động hằng ngày | Truy cập từ điện thoại 4G: vào phòng + ghi âm được |
| 27/08 | Gửi link cho người dùng thử; theo dõi lỗi ngày đầu; sửa lỗi khẩn cấp | Không có lỗi nghiêm trọng trong 24h đầu |
| 28/08 | Thu bảng khảo sát + phỏng vấn nhanh 5 người (ghi nguyên văn ý kiến) | ≥ 10 phiếu điền đầy đủ |
| 29/08 | Tổng hợp số liệu; chọn 2–3 vấn đề được nhắc nhiều nhất | Xác định danh sách lỗi ưu tiên |
| 30/08 | Sửa 2–3 lỗi ưu tiên (chỉ sửa, không thêm tính năng mới); chạy lại kiểm tra | Mỗi lỗi sửa xong → kiểm tra lại đạt |
| 31/08 | Viết báo cáo kiểm chứng + danh sách cải tiến → **nộp sản phẩm T8** | Đủ hồ sơ nộp |

### Tuần T9 (01/09 – 06/09/2026) — Chi phí, giá bán, khách hàng

| Ngày | Công việc | Mốc hoàn thành |
|---|---|---|
| 01/09 | Lập bảng chi phí vận hành 1 tháng (máy chủ, tên miền, điện, nhân công) | Bảng chi phí chi tiết từng khoản |
| 02/09 | Khảo sát giá đối thủ (Cambly, ELSA, Italki); phác thảo 3 gói giá | Khung giá nháp |
| 04/09 | Lập danh sách 20 khách hàng tiềm năng + kênh tiếp cận chi phí thấp | Danh sách đủ 20 người, có kênh liên hệ |
| 05/09 | Viết kịch bản chào hàng 5 phút (chào hỏi → demo → xử lý từ chối); diễn tập ≥ 2 lần | Kịch bản hoàn chỉnh, diễn tập xong |
| 06/09 | Chốt bảng chi phí + giá bán + kế hoạch tiếp thị → **nộp sản phẩm T9** | Đủ hồ sơ nộp |

---

## 4. Kiểm tra tình trạng ứng dụng

### 4.1 Bảng kiểm tra 12 kịch bản (chạy ngày 22/08, trước khi nộp MVP)

| # | Kịch bản kiểm tra | Kết quả đạt |
|---|---|---|
| 1 | Đăng ký → đăng nhập → đăng xuất | Chạy mượt; chưa đăng nhập vào phòng thì bị chặn |
| 2 | Tạo phòng → vào → rời | Trạng thái phòng cập nhật đúng |
| 3 | 2 người nhắn tin | Tin đến trong vài giây, đúng thứ tự |
| 4 | Ghi âm 10 giây | Chữ hiện trong dưới 5 giây |
| 5 | Đọc 1 câu khó | Điểm giảm đúng, gợi ý sửa hợp lý |
| 6 | 3 người dùng AI cùng lúc | Không ai bị treo quá 30 giây |
| 7 | Ngắt mạng → vào lại phòng | Trạng thái đúng, không rối |
| 8 | Tắt dịch vụ AI (giả lập sự cố) | Phòng vẫn chat + gọi được, chỉ thiếu tính năng AI |
| 9 | Tắt kho dữ liệu rồi mở lại | Không mất dữ liệu, tự khởi động lại |
| 10 | Kiểm tra ổ đĩa, dọn file tạm | Ổ đĩa không đầy |
| 11 | 2 người cùng ghi âm một lúc | Cả 2 đều có kết quả, không mất dữ liệu |
| 12 | Chạy toàn bộ bài kiểm tra tự động | Tất cả đạt |

### 4.2 Kiểm tra tình trạng ứng dụng hằng ngày (từ khi lên Internet, tuần T8 trở đi)

Mỗi ngày 2 lần: **08:00** và **20:00**, mỗi lần 15 phút, do người trực trong ngày thực hiện.

| # | Hạng mục kiểm tra | Cách kiểm tra | Dùng được | Không dùng được → xử lý |
|---|---|---|---|---|
| 1 | Trang web mở được | Mở link trên điện thoại và máy tính | Trang hiện ra trong vài giây | Thử lại sau 5 phút; kiểm tra tin báo động của hệ thống theo dõi; báo nhóm |
| 2 | Đăng nhập chạy | Thử tài khoản kiểm tra đã tạo sẵn | Vào được trong vài giây | Đọc nhật ký lỗi; kiểm tra kho dữ liệu đang chạy |
| 3 | Tạo phòng, vào phòng | Tự tạo 1 phòng, vào rồi rời | Chạy mượt | Thử lại lần 2; chụp màn hình; đọc nhật ký lỗi |
| 4 | Ghi âm ra chữ | Ghi âm 10 giây | Chữ hiện < 5 giây | Trên 30 giây được coi là hỏng; kiểm tra dịch vụ AI còn chạy |
| 5 | Chấm điểm phát âm | Nói 1 câu, xem thẻ kết quả | Điểm + gợi ý hiện đủ | Kiểm tra phương án dự phòng (gợi ý từ từ điển) có hoạt động |
| 6 | Chat 2 người | Nhắn từ 2 thiết bị | Tin đến nhanh, đúng thứ tự | Kiểm tra kết nối WebSocket |
| 7 | Số lỗi phát sinh trong ngày | Mở bảng tổng hợp lỗi trên máy chủ | 0–3 lỗi nhỏ | Nhiều lỗi cùng lúc → họp nhóm ngay |
| 8 | Máy chủ còn tài nguyên | Mở bảng tài nguyên máy chủ | Ổ cứng còn > 20%, nhiệt độ bình thường | Ổ đầy → dọn file tạm; máy nóng → giảm tải hoặc nâng cấp |
| 9 | Sao lưu đêm qua | Kiểm tra thông báo sao lưu thành công | Có thông báo mỗi đêm | Sao lưu tay ngay; 2 đêm liên tiếp lỗi = ưu tiên xử lý số 1 |
| 10 | Người dùng mới + phản hồi | Đếm tài khoản mới; đọc phản hồi | Có người dùng đều đặn | 3 ngày không có người mới → kiểm tra link gửi đi |

**Ghi chép:** mỗi lần kiểm tra ghi 1 dòng vào sổ theo dõi: ngày, giờ, người trực, hạng mục lỗi, cách xử lý. Số liệu này dùng cho báo cáo T8.

### 4.3 Nhật ký lỗi (log) — cách đọc

- Máy chủ ghi nhật ký liên tục kèm thời gian, lưu tại giao diện quản trị máy chủ.
- Khi ứng dụng không hoạt động: mở nhật ký, đọc 10 dòng cuối tại thời điểm xảy ra lỗi.
- Các dấu hiệu lỗi cần chú ý: dòng chứa `Error`, `Traceback`, `cudnn...dll not found`, `Connection refused` → chụp màn hình gửi nhóm.

### 4.4 Quy trình xử lý khi ứng dụng không hoạt động (5 bước)

1. Chụp màn hình hiện trạng lỗi.
2. Thử lại sau 5 phút (nhiều lỗi tạm thời tự hết).
3. Mở nhật ký lỗi, đọc 10 dòng cuối tại thời điểm lỗi.
4. Khởi động lại dịch vụ lỗi bằng lệnh đã ghi trong sổ tay vận hành của nhóm.
5. Nếu chưa hết: báo nhóm và người hướng dẫn, kèm ảnh chụp và nội dung nhật ký. Không tự sửa lan man khi chưa xác định nguyên nhân.

### 4.5 Các tác vụ nền (tự động, cần theo dõi)

| Tác vụ | Cơ chế | Người theo dõi |
|---|---|---|
| Cảnh báo khi máy chủ ngừng hoạt động | Hệ thống theo dõi (uptime-kuma) gửi tin nhắn Telegram | Người trực |
| Sao lưu dữ liệu mỗi đêm | Lệnh hẹn giờ tự chạy, đẩy bản sao sang nơi khác | Người trực (kiểm tra mục 9 bảng 4.2) |
| Dọn file âm thanh tạm mỗi tuần | Lệnh hẹn giờ xóa file tạm | Thành viên được phân công |

---

## 5. Kế hoạch giảm tải khi chậm tiến độ

| Mức độ chậm | Cắt bỏ | Giữ nguyên |
|---|---|---|
| ≤ 2 ngày | Chế độ tối, đa ngôn ngữ, hiệu ứng giao diện | Toàn bộ chức năng lõi |
| ≤ 4 ngày | Video call → chỉ còn thoại + chat | Nói chuyện + chấm điểm |
| ≤ 1 tuần | Truyền âm thanh thời gian thực → quay lại gửi file | Luồng lõi: ghi âm → chữ → điểm |
| AI không chạy được trên GPU | Dùng mô hình small.en chạy CPU | Luồng lõi vẫn hoạt động, chậm hơn |

**Quy tắc cố định:** luồng "ghi âm → ra chữ → ra điểm" không bao giờ được cắt bỏ.

---

## 6. Danh sách kiểm tra tổng (in ra, đánh dấu khi hoàn thành)

```
Tuần T5 (03/08 – 09/08)
[ ] 03/08 — chốt phạm vi, phân công, tạo kho code
[ ] 05/08 — cài môi trường + kiểm tra GPU (nvidia-smi)
[ ] 06/08 — thiết kế 4 màn hình (Figma)
[ ] 07/08 — máy chủ API + trang web + kho dữ liệu chạy được
[ ] 08/08 — đăng ký/đăng nhập + 4 bảng dữ liệu
[ ] 09/08 — nộp bản thiết kế + bản chạy thử

Tuần T6 (10/08 – 16/08)
[ ] 10/08 — phần tài khoản hoàn chỉnh
[ ] 11/08 — faster-whisper + CUDA/cuDNN: nghe ra chữ
[ ] 12/08 — API nhận file ghi âm → trả chữ + mốc thời gian
[ ] 13/08 — 3 câu mẫu + bài kiểm tra tự động đạt
[ ] 14/08 — nâng mô hình turbo (hoặc large-v3) không lỗi
[ ] 15/08 — chấm điểm 0–10 hoạt động
[ ] 16/08 — nộp bản mẫu thô

Tuần T7 (17/08 – 23/08)
[ ] 17/08 — 4 trang giao diện hoàn chỉnh
[ ] 18/08 — chat 2 chiều + ghi âm ra chữ
[ ] 19/08 — thẻ chấm bài + phương án dự phòng
[ ] 20/08 — gọi thoại/video giữa 2 máy
[ ] 21/08 — chữ hiện < 3 giây theo thời gian thực
[ ] 22/08 — bảng kiểm tra 12 kịch bản: 12/12 đạt
[ ] 23/08 — nộp MVP hoàn chỉnh + link demo

Tuần T8 (24/08 – 31/08)
[ ] 24/08 — danh sách người thử + bảng câu hỏi
[ ] 26/08 — đưa ứng dụng lên Internet + HTTPS + sao lưu
[ ] 27/08 — gửi link, kiểm tra 2 lần/ngày
[ ] 28/08 — thu ≥ 10 phiếu + 5 phỏng vấn
[ ] 29–30/08 — tổng hợp + sửa 2–3 lỗi ưu tiên
[ ] 31/08 — nộp báo cáo kiểm chứng + danh sách cải tiến

Tuần T9 (01/09 – 06/09)
[ ] 01/09 — bảng chi phí vận hành 1 tháng
[ ] 02/09 — khảo giá đối thủ + khung 3 gói
[ ] 04/09 — danh sách 20 khách hàng + kênh liên hệ
[ ] 05/09 — kịch bản chào hàng + diễn tập
[ ] 06/09 — nộp bảng chi phí + giá bán + kế hoạch tiếp thị

Từ tuần T8 trở đi, mỗi ngày:
[ ] 08:00 — kiểm tra 15 phút (mục 4.2)
[ ] 20:00 — kiểm tra 15 phút + đọc phản hồi người dùng
[ ] Ghi sổ theo dõi
[ ] Lỗi → xử lý theo 5 bước (mục 4.4)
```