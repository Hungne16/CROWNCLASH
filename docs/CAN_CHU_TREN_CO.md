# Căn chữ trên cờ

Mở Quản lý → Edit Overlay · Căn chữ trên cờ, hoặc `/leaderboard?edit=1`.
Chọn lá cờ, tạm dừng video và tua đến frame cần kiểm tra. Kéo vùng chữ
để di chuyển, kéo góc vuông để đổi kích thước. Có thể nhập trực tiếp tọa độ,
kích thước, cỡ chữ, góc xoay và giãn dòng. Bấm Lưu cấu hình để áp dụng cho
màn chiếu cùng trình duyệt. Lưu & thoát ẩn toàn bộ công cụ và viền.

Cấu hình lưu trên máy theo origin website, không phải tài khoản Firebase.
Dùng Xuất JSON và Nhập JSON khi chuyển sang máy tổ chức hoặc từ localhost
sang website public. Cấu hình chỉnh tay chỉ áp dụng khi bấm Lưu; thao tác
Mặc định khôi phục vùng đo sẵn để xem trước, vẫn cần bấm Lưu.

Màn `/leaderboard` nhận điểm trực tiếp từ dashboard cùng trình duyệt.
Màn `/presentation` tự dùng cảnh này khi tổng kết vòng và kết thúc trận.
Điểm giảm dần quyết định thứ tự cờ: đỏ 4, xanh lá 2, tím 1, xanh dương 3.
Khi bằng điểm, dùng thẻ còn lại theo luật hiện tại và kết quả sudden death;
trường hợp vẫn bằng nhau giữ thứ tự đội ổn định để hiển thị, không sửa điểm.

## Căn theo video

Video gốc 1280×720, 24 fps, 10 giây. Đã kiểm tra frame 0, 4 và 8 giây.
Vùng chữ nằm dưới huy hiệu và trên ngôi sao/chóp viền cờ. Cờ đỏ có vùng
trống nhỏ hơn nên mặc định dùng chữ nhỏ hơn; không mở rộng ra mép vải chỉ
để tăng cỡ chữ. Đây là vùng cố định an toàn qua các frame được kiểm tra,
không phải theo dõi biến dạng vải theo từng pixel. Không có dao động nhân tạo.

Tọa độ được lưu chuẩn hóa 0–1, cấu hình riêng cho từng cờ tại
`src/leaderboard/geometry.ts`. Cả lớp video và chữ căn giữa:

```
s = max(viewportWidth / 1280, viewportHeight / 720)
offsetX = (viewportWidth - 1280 * s) / 2
offsetY = (viewportHeight - 720 * s) / 2
screenX = offsetX + centerX * 1280 * s
screenY = offsetY + centerY * 720 * s
```

Chữ không được neo độc lập vào viewport. Ở màn hình dọc, object-fit cover
có thể cắt các cờ ngoài cùng giống như chính video; nên trình chiếu 16:9.
Tên dài tự giảm cỡ chữ; thay đổi điểm/thứ hạng dùng GSAP fade, có hỗ trợ
prefers-reduced-motion. Video giữ nguyên, phát muted và loop; poster giữ
bố cục khi video chưa tải xong.
