# Đấu Trí — Điều khiển từng bước

Game kiến thức 4 đội, 3 vòng. Bộ câu hỏi mặc định trống; admin tự thêm câu hỏi hoặc nhập JSON. Giao diện quản trò lần lượt hỏi việc cần làm; không yêu cầu MC tự tính điểm hay nhớ trạng thái luật.

## Chạy

```bash
npm install
npm run dev
```

Mở http://localhost:5173/. Người mới nên chọn **Tập thử một câu trước**. Nút **Màn hình người chơi** mở tab trình chiếu riêng. Không có câu hỏi mẫu được nạp sẵn.

```bash
npm test
npm run build
```

## Cách quản trò thao tác

Trước câu đầu, MC xác nhận 5 quy ước bổ sung đang chọn. Các quy ước này không phải luật gốc.

1. **Đội nào trả lời trước?** Chọn một đội rồi bấm nút đọc gợi ý. Câu hỏi được chọn sẵn theo thứ tự; dùng Đổi câu hỏi khi cần chọn khác.
2. **Đọc gợi ý rồi chốt thẻ.** Bấm **Đã đọc xong gợi ý** sau khi đọc, rồi hỏi đội chọn Không dùng thẻ, Cược lớn hay An toàn. Thẻ chỉ tiêu hao khi bấm mở câu hỏi; việc thay đổi lựa chọn trước đó chưa tiêu hao thẻ.
3. **Nghe câu trả lời.** Đáp án riêng nằm ngay trên hai nút Trả lời đúng / Trả lời sai. Website tự tính điểm. Đồng hồ hết giờ vẫn chờ MC chấm.
4. **Công bố kết quả.** Xem điểm vừa thay đổi, bấm công bố đáp án, rồi sang câu tiếp theo. Chọn chủ nhà cho từng câu. Điểm và thẻ giữ xuyên các vòng.

Gợi ý, câu hỏi chính và đáp án phải được admin soạn sẵn thành ba phần riêng. Đọc gợi ý không tạo ra câu hỏi mới. Trong lúc đọc gợi ý và chọn thẻ, người chơi chưa thấy câu hỏi chính và đồng hồ chưa chạy. Chỉ khi bấm Mở câu hỏi mới bắt đầu 30 / 45 / 60 giây.

Chỉ khi phát sinh yêu cầu, màn hình mới hỏi thêm:

- **Thách đố:** bấm Dùng Thách đố và chọn đội chủ nhà chỉ định. Website kiểm tra hạn giờ, trừ thẻ và xử lý cháy thẻ.
- **Cướp điểm:** sau chủ nhà sai, chọn đội giơ thẻ nhanh nhất hoặc bấm Không đội nào giơ thẻ. Mỗi câu tối đa một lượt.
- **Câu phụ:** sau tiêu chí điểm và số thẻ vẫn hòa, MC đọc/nhập câu phụ, nhận chuông và chấm đúng/sai; không dùng thẻ.

Bấm nhầm có thể chọn **Quay lại thao tác trước**. Trận và tối đa 30 trạng thái hoàn tác được lưu trên trình duyệt. Phần điều khiển không có phím tắt chấm điểm để tránh bấm nhầm khi chưa quen.

## Chế độ tập

`/?practice=1` dùng điểm, thẻ, lịch sử và kênh trình chiếu riêng. Trận thật không bị ghi đè. Câu tập sao chép bộ câu hỏi admin đã soạn; thời gian chờ cướp điểm là 60 giây để người mới kịp đọc hướng dẫn. Có thể chọn Tập thêm một câu hoặc Về trận thật. Nút Tập thử một câu trước tạo lượt tập mới.

Hai tab trình chiếu và MC đồng bộ trên cùng origin/cùng máy qua BroadcastChannel, không phải đồng bộ nhiều thiết bị qua mạng. Đáp án chỉ xuất hiện trên màn hình người chơi sau thao tác công bố.

## Chuẩn bị trước trận

Trong menu **Quản lý**:

- Đặt tên đội & quy ước: đặt tên 4 đội và chốt 5 quy ước bổ sung dưới đây.
- Soạn bộ câu hỏi: thêm/sửa/xóa, nhập/xuất JSON, chọn vòng/độ khó, gợi ý/đáp án và URL hình ảnh.
- Xem lịch sử điểm; xem hướng dẫn; bật/tắt âm thanh; tạo trận mới có xác nhận.

Năm tình huống luật gốc chưa xác định phải được MC/ban tổ chức thống nhất: cách chọn chủ nhà; xử lý khi đội bị Thách đố trả lời đúng; hạn chờ cướp điểm; xử lý không đội nào cướp; và cách tổ chức câu phụ khi hơn hai đội hòa. Đây là quy ước bổ sung, không được coi là luật gốc.

## Mã nguồn

- `src/GuidedControl.tsx`: màn hình quản trò theo từng bước và chế độ tập.
- `src/guided.css`: giao diện điều khiển đơn giản, responsive.
- `src/shared.css`: thành phần quản lý và trình chiếu dùng chung.
- `src/Presentation.tsx`: màn hình người chơi và bấm chuông câu phụ.
- `src/Manage.tsx`: bộ câu hỏi và cài đặt.
- `src/game.ts`: dữ liệu, điểm, thẻ và xếp hạng.
- `src/controller.ts`: chuyển trạng thái và điều kiện luật.
- `src/useGame.ts`: lưu trận, hoàn tác, đồng bộ tab; cách ly dữ liệu tập.
- `src/game.test.ts`, `src/controller.test.ts`: kiểm thử luật và luồng điều hành.

## Tài khoản admin và chuẩn bị ở nhà

Mở `/account` để đăng nhập tài khoản được cấp và soạn bộ đề riêng. Câu hỏi, tên đội và quy ước tự lưu lên tài khoản; ở máy tổ chức, đăng nhập lại rồi bấm **Dùng bộ đề để tổ chức**. Dữ liệu đang chơi không tự bị thay thế.

Cần kết nối Firebase Authentication + Firestore trước khi dùng thật. Xem [hướng dẫn kích hoạt và cấp tài khoản](docs/TAI_KHOAN_ADMIN.md), `.env.example` và `firestore.rules`. Khi chưa cấu hình, trang tài khoản báo chưa kết nối; chức năng lưu trên máy vẫn dùng được.

Có kiểm thử đơn vị cho lưu bộ đề và chống ghi đè; cần kiểm tra đăng nhập, email và Firestore Rules trên project Firebase thật.

## Deploy lên Vercel

Import GitHub repository `Hungne16/CROWNCLASH` vào Vercel, dùng nhánh `main` và Root Directory là thư mục gốc của repo.

- Framework: Vite.
- Node.js: 22.x (đã khai báo trong package.json).
- Build Command: npm run build.
- Output Directory: dist.
- Chế độ lưu trên máy không cần backend. Chức năng tài khoản cần bốn biến `VITE_FIREBASE_*` trong `.env.example`, bật Email/Password và publish Firestore Rules.

File vercel.json đã cấu hình SPA rewrite để có thể mở trực tiếp hoặc tải lại đường dẫn /presentation. Câu hỏi do admin soạn và trận đấu vẫn được lưu trong trình duyệt; dữ liệu từ localhost không tự chuyển sang tên miền Vercel. Có thể dùng Xuất JSON / Nhập JSON để chuyển bộ câu hỏi.

## Hoạt ảnh thẻ quyền năng

- Mở `/animation-preview` (hoặc nút Thử hoạt ảnh thẻ trên dashboard) để thử bốn thẻ; không thay đổi trận thật.
- Mở màn hình `/presentation` trước khi kích hoạt thẻ. Hai tab phải cùng trình duyệt và cùng origin; chế độ tập dùng kênh riêng.
- Dùng thẻ hợp lệ trong dashboard: engine tạo eventId, dashboard hiện trạng thái, Presentation phát timeline GSAP khoảng 3,8 giây. Skip Animation dừng cả hai tab. Không dừng/reset đồng hồ và không tự cộng điểm.
- Trên Presentation có nút bật/tắt âm thanh thẻ. Trình duyệt có thể yêu cầu bấm vào trang trước khi cho phát âm thanh. Whoosh/impact được tổng hợp bằng Web Audio, không tải file âm thanh ngoài.
- Ảnh gốc của người dùng được chuyển WebP đúng tỷ lệ 1024×1536, không cắt. Cả bốn thẻ dùng mặt sau Crown Clash do người dùng cung cấp. Không có video nên hiện chỉ dùng GSAP.
- Reload, request-state và undo không phát lại sự kiện cũ. Hỗ trợ reduced motion, watchdog kết thúc và cleanup GSAP/canvas/audio khi Skip hoặc unmount.

Giao diện dùng Inter Variable tự host (hỗ trợ tiếng Việt). Chữ phụ mang tính giới thiệu được lược bỏ; nhãn thao tác, thông báo lưu, luật và cảnh báo được giữ.


### GIF kết quả thẻ

Sau khi MC chấm đáp án, engine tạo `cardOutcome` từ điểm đã ghi nhận. Presentation phát hoạt ảnh do người dùng cung cấp kèm đội được chấm, delta thật và tổng điểm. Safe sai hiển thị 0 điểm; Challenge ghi điểm cho đội trả lời và ghi riêng đội thách đấu. Câu không dùng thẻ không phát GIF.

Bốn GIF được mã hóa thành animated WebP, giữ nguyên toàn bộ khung hình và thời lượng khoảng 10 giây. Chỉ tải tài nguyên tương ứng khi xem kết quả; trong lúc tải hoặc khi ảnh lỗi dùng mặt thẻ tĩnh. Reduced motion dùng ảnh tĩnh và kết thúc sớm. MC có thể Skip, tiếp tục điều khiển hoặc dùng Steal trong thời hạn engine; hoạt ảnh kết quả không chặn lượt dùng thẻ tiếp theo. Undo/chuyển câu hủy hiệu ứng cũ, reload không phát lại.

Trong `/animation-preview`, chọn Triệu hồi / Trả lời đúng / Trả lời sai rồi bấm thẻ để thử. Điểm ở Preview chỉ là ví dụ, không tác động trận thật.
