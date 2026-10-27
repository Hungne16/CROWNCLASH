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

1. **Đội nào trả lời trước?** Chọn một đội rồi bấm nút đọc gợi ý. Câu hỏi được chọn sẵn theo thứ tự; dùng Đổi câu hỏi khi cần chọn khác.
2. **Đọc gợi ý.** Hỏi đội chọn Không dùng thẻ, Cược lớn hay An toàn. Thẻ chỉ tiêu hao khi bấm mở câu hỏi; việc thay đổi lựa chọn trước đó chưa tiêu hao thẻ.
3. **Nghe câu trả lời.** Đáp án riêng nằm ngay trên hai nút Trả lời đúng / Trả lời sai. Website tự tính điểm. Đồng hồ hết giờ vẫn chờ MC chấm.
4. **Công bố kết quả.** Xem điểm vừa thay đổi, bấm công bố đáp án, rồi sang câu tiếp theo. Chọn chủ nhà cho từng câu. Điểm và thẻ giữ xuyên các vòng.

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

## Deploy lên Vercel

Import GitHub repository `Hungne16/CROWNCLASH` vào Vercel, dùng nhánh `main` và Root Directory là thư mục gốc của repo.

- Framework: Vite.
- Node.js: 22.x (đã khai báo trong package.json).
- Build Command: npm run build.
- Output Directory: dist.
- Không cần biến môi trường hoặc backend cho bản một máy điều khiển.

File vercel.json đã cấu hình SPA rewrite để có thể mở trực tiếp hoặc tải lại đường dẫn /presentation. Câu hỏi do admin soạn và trận đấu vẫn được lưu trong trình duyệt; dữ liệu từ localhost không tự chuyển sang tên miền Vercel. Có thể dùng Xuất JSON / Nhập JSON để chuyển bộ câu hỏi.
