# Đặc tả tính năng E-Room — Hướng dẫn sử dụng (bản MVP đã deploy)

> E-Room là nền tảng luyện nói tiếng Anh thời gian thực: người học được ghép vào phòng 3–5 người theo chủ đề sở thích, nói chuyện trực tiếp bằng video, và được AI hỗ trợ ngay trong lúc nói.
> Tài liệu này mô tả **từng tính năng hiện có trên trang web**: tính năng dùng để làm gì và người dùng sử dụng như thế nào.

---

## 1. Bắt đầu sử dụng

### 1.1 Đăng ký / Đăng nhập
- **Mô tả:** tạo tài khoản bằng email và mật khẩu, sau đó đăng nhập để vào app.
- **Cách dùng:** vào trang `/login` → chọn đăng ký → điền email + mật khẩu → bấm đăng nhập.
- **Kết quả:** có tài khoản riêng; đăng nhập lại tự động giữ phiên (token tự gia hạn); đăng nhập quá 5 lần sai trong 15 phút sẽ bị tạm khóa.

### 1.2 Khởi tạo hồ sơ (Wizard 5 bước)
- **Mô tả:** ngay sau khi đăng ký, app hỏi 5 thông tin để gợi ý phòng phù hợp.
- **Cách dùng:** điền lần lượt: (1) trình độ tiếng Anh, (2) nghề nghiệp, (3) mục tiêu học, (4) chọn tối đa 10 thẻ sở thích (Marketing, Vibe Coding, Physics, Music...), (5) xác nhận.
- **Kết quả:** hồ sơ hoàn chỉnh; các thẻ sở thích được dùng để hệ thống gợi ý phòng, và ai cũng thấy thẻ của bạn khi vào phòng.

### 1.3 Thay đổi hồ sơ sau này
- Vào trang Hồ sơ (`/profile`) để đổi tên hiển thị, mục tiêu, trình độ và bộ thẻ sở thích bất cứ lúc nào.

---

## 2. Tìm phòng và ghép cặp

### 2.1 Danh sách phòng
- **Mô tả:** xem toàn bộ phòng đang mở trên hệ thống.
- **Cách dùng:** vào mục "Luyện tập" → xem danh sách (chủ đề, thẻ, số người hiện có).
- **Kết quả:** chọn phòng ưng ý → bấm tham gia.

### 2.2 Tạo phòng mới
- **Mô tả:** tự mở phòng theo chủ đề mình muốn nói (được phép với gói Pro trở lên).
- **Cách dùng:** bấm "Tạo phòng" → đặt chủ đề, chọn thẻ → tạo xong thì phòng xuất hiện cho người khác vào.
- **Kết quả:** bạn làm chủ phòng; người khác tìm thấy và vào được phòng.

### 2.3 Ghép phòng tự động (Matchmaking)
- **Mô tả:** tính năng đáng giá nhất khi muốn nói ngay không cần tự tìm.
- **Cách dùng:** bấm "Bắt đầu nói" → hệ thống tự chọn một phòng đang mở có chủ đề gần với thẻ sở thích của bạn.
- **Kết quả:** nếu có phòng phù hợp → được đưa thẳng vào phòng; nếu chưa có → hiện màn hình chờ trong hàng đợi, có phòng phù hợp sẽ tự vào.

---

## 3. Trong phòng luyện nói — các tính năng trực tiếp

### 3.1 Gọi video/audio nhiều người (tính năng chính)
- **Mô tả:** nói chuyện trực tiếp cùng lúc với người khác trong phòng (3–5 người) bằng hình ảnh và tiếng nói.
- **Cách dùng:**
  - Bấm nút **mic** để bật/tắt tiếng của mình, bấm **camera** để bật/tắt hình.
  - Bấm vào ô video của một người để **ghim** (phóng to một người lên màn hình chính).
  - Bấm nút **chia sẻ màn hình** để trình chiếu tài liệu, slide cho cả phòng xem.
  - Bấm **giơ tay** để xin phát biểu — mọi người trong phòng thấy tay bạn giơ.
  - Bấm các **biểu tượng cảm xúc (emoji)** để bày tỏ ngay trong lúc nói (vỗ tay, cười...).
- **Kết quả:** cuộc gọi video nhóm trực tiếp, người khác nghe/nhìn thấy bạn và ngược lại.

### 3.2 Chat văn bản trong phòng
- **Mô tả:** khung chat riêng bên phải: gõ chữ, xem lịch sử tin nhắn.
- **Cách dùng:** gõ tin ở khung chat → Enter để gửi.
- **Kết quả:** tin nhắn hiện theo thời gian thực cho mọi người trong phòng; tin được lưu lại khi vào lại phòng.

### 3.3 Cài đặt phòng (chủ phòng)
- **Mô tả:** người tạo phòng bật/tắt các chức năng AI cho phòng của mình.
- **Cách dùng:** mở bảng Cài đặt phòng → bật/tắt 3 công tắc: *Gợi chuyện tự động (Heartbeat)*, *Sửa lỗi phát âm*, *Nhận diện giọng nói*.
- **Kết quả:** phòng hoạt động theo đúng nhu cầu buổi học (tắt sửa lỗi nếu muốn nói tự do).

---

## 4. Các tính năng AI hỗ trợ trong phòng

### 4.1 Transcript thời gian thực (AI nghe và viết chữ)
- **Mô tả:** trong lúc mọi người nói, AI tự nghe và viết lời thoại thành chữ hiện ngay trên màn hình.
- **Cách dùng:** không cần thao tác gì — chỉ cần nói bình thường; AI tự cắt đoạn khi bạn dừng nói.
- **Kết quả:** cuộc nói chuyện được "ghi chép tự động" theo thời gian thực, ai muốn xem lại chỉ cần nhìn khung transcript.

### 4.2 Chấm điểm phát âm
- **Mô tả:** sau mỗi câu bạn nói, AI chấm điểm phát âm 0–10 và đánh dấu những từ phát âm chưa chuẩn.
- **Cách dùng:** không cần bấm gì; xem điểm hiện trên thẻ kết quả sau khi nói xong.
- **Kết quả:** biết ngay câu này mình nói tốt bao nhiêu, từ nào cần luyện.

### 4.3 Thẻ sửa lỗi phát âm + nghe đọc mẫu
- **Mô tả:** khi điểm dưới 7/10, AI phân tích cụ thể: từ nào sai, sai thế nào, nên sửa ra sao.
- **Cách dùng:** xem thẻ phát âm trong khung hội thoại; bấm nút **phát âm thanh** trên từ lỗi để nghe cách đọc chuẩn.
- **Kết quả:** danh sách từ lỗi + cách sửa + file âm thanh đọc mẫu có thể nghe lại nhiều lần — như có giáo viên kèm từng từ.

### 4.4 Trợ lý chuyên sâu (Expert)
- **Mô tả:** hỏi AI bất kỳ câu hỏi kiến thức nào liên quan chủ đề phòng; AI trả lời có nguồn tham khảo.
- **Cách dùng:** gõ câu hỏi vào khung chat với tiền tố dành cho AI.
- **Kết quả:** câu trả lời chi tiết + nguồn tham khảo hiện ngay trong phòng (dùng tốt khi tranh luận chủ đề chuyên ngành).

### 4.5 Gợi chuyện tự động (Heartbeat)
- **Mô tả:** nếu phòng im lặng 45 giây, AI chủ động hỏi một câu theo chủ đề để cuộc nói không đứt.
- **Cách dùng:** không cần thao tác; chỉ cần đọc câu hỏi hiện lên và trả lời.
- **Kết quả:** phòng không bao giờ "chết im"; người mới cũng dễ bắt chuyện.

---

## 5. Sau buổi học

### 5.1 Hồ sơ cá nhân
- Cập nhật thông tin, xem bộ thẻ sở thích, quản lý tài khoản.

### 5.2 Lịch sử buổi học (Sessions)
- **Mô tả:** xem lại các buổi học đã tham gia.
- **Cách dùng:** vào mục "Buổi học" → danh sách các phiên, tìm kiếm theo từ khóa, lọc theo tháng.
- **Kết quả:** thông tin buổi học (phòng nào, khi nào) để theo dõi sự tiến bộ.

### 5.3 Thông báo
- **Mô tả:** trung tâm thông báo của tài khoản, có đếm số chưa đọc.
- **Cách dùng:** mở trang thông báo → xem và đánh dấu đã đọc từng tin.

---

## 6. Gói trả phí và giới hạn

| Gói | Đặc quyền |
|---|---|
| **Free** | Vào phòng luyện nói, dùng AI nghe + chấm điểm cơ bản (giới hạn 3 lần sửa lỗi/phòng) |
| **Pro** | Tạo phòng mới, tạo tag tùy chỉnh, dùng đầy đủ AI sửa lỗi |
| **Pro+** | Quyền Pro + ghi chú buổi học, chuỗi phòng định kỳ (Series), bảng xếp hạng |

- **Cách dùng:** trang `/pricing` xem giá → bấm nâng cấp → thanh toán.
- **Lưu ý:** phiên bản MVP hiện đang ở chế độ **thanh toán thử nghiệm** (bấm nâng cấp được, chưa trừ tiền thật).

---

## 7. Các tính năng phụ trợ toàn trang

| Tính năng | Mô tả | Cách dùng |
|---|---|---|
| Chế độ tối/sáng | Đổi màu giao diện theo sở thích | Nút chuyển đổi trên thanh đầu trang |
| Hai ngôn ngữ | Giao diện tiếng Việt / tiếng Anh | Nút chọn ngôn ngữ trên thanh đầu trang |
| Kết nối lại tự động | Mất mạng giữa chừng không mất phiên | Không cần thao tác — tự kết nối lại, vào lại phòng là trạng thái vẫn đúng |
| Trang giới thiệu/Blog | Nội dung giới thiệu sản phẩm, bài viết | Truy cập từ trang chủ |

---

## 8. Tóm tắt nhanh — bảng "Tính năng ↔ Người dùng làm gì ↔ Nhận được gì"

| Tính năng | Người dùng làm gì | Nhận được gì |
|---|---|---|
| Ghép phòng tự động | Bấm "Bắt đầu nói" | Phòng phù hợp thẻ sở thích, hoặc hàng đợi |
| Gọi video nhóm | Bật mic/cam | Nói chuyện trực tiếp 3–5 người |
| Ghim / chia sẻ màn hình | Bấm vào màn hình người muốn xem / nút trình chiếu | Theo dõi 1 diễn giả / trình bày slide cho cả phòng |
| Giơ tay / emoji | Bấm nút trên giao diện | Tín hiệu đến mọi người tức thì |
| Transcript thời gian thực | Chỉ cần nói | Cuộc thoại được viết thành chữ ngay |
| Chấm điểm phát âm | Chỉ cần nói | Điểm 0–10 sau mỗi câu |
| Sửa lỗi phát âm + nghe mẫu | Xem thẻ, bấm phát audio | Lỗi từng từ + cách sửa + đọc mẫu |
| Hỏi AI chuyên sâu | Gõ câu hỏi trong chat | Câu trả lời + nguồn tham khảo |
| Gợi chuyện khi im lặng | Trả lời câu hỏi AI đưa ra | Cuộc nói không đứt đoạn |
| Chat văn bản | Gõ tin nhắn | Trao đổi nhanh không cần nói |
| Lịch sử buổi học | Mở trang Buổi học | Theo dõi các buổi đã học |
| Thông báo | Mở trang thông báo | Cập nhật tình hình tài khoản |