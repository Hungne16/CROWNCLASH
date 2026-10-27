# Tài khoản admin — Firebase

Ứng dụng dùng Firebase Authentication (Email/Password) và Cloud Firestore. Website tiếp tục chạy trên Vercel. Khi chưa có cấu hình, `/account` thông báo chưa kết nối; chế độ trên máy vẫn dùng được.

## 1. Kết nối project

Trong Firebase Console → Project settings → Your apps, đăng ký ứng dụng Web hoặc mở ứng dụng có sẵn. Chép bốn giá trị trong firebaseConfig vào `.env.local` theo `.env.example`: apiKey, authDomain, projectId, appId.

Đây là cấu hình Web, không dùng service account/private key. Khởi động lại dev server sau khi sửa env. Trên Vercel, thêm cùng bốn biến môi trường và redeploy.

## 2. Bật đăng nhập và Firestore

- Authentication → Sign-in method: bật Email/Password.
- Authentication → Settings → Authorized domains: thêm localhost và tên miền Vercel/tên miền riêng đang sử dụng.
- Firestore Database: tạo database mặc định `(default)`. Trong Rules, chép toàn bộ `firestore.rules` và Publish. Nếu dùng Firebase CLI: chọn đúng project rồi `firebase deploy --only firestore:rules --project PROJECT_ID`.
- File `firebase.json` chỉ cấu hình rules; không chuyển hosting khỏi Vercel.

## 3. Cấp tài khoản

Authentication → Users → Add user: nhập email và mật khẩu. Chép UID của user vừa tạo.

Trong Firestore, tạo collection `admins`, document ID chính là UID đó. Thêm hai trường:

- `active`: boolean `true`
- `displayName`: string tên admin

Admin đăng nhập tại `/account`. Mỗi tài khoản lưu bộ đề trong document `adminPreparations/{UID}`; ứng dụng tự tạo document khi lưu lần đầu. Client không được tự cấp quyền. Đổi `active` thành `false` để thu hồi quyền đọc/ghi bộ đề; muốn khóa đăng nhập thì Disable user trong Authentication. Bộ đề đã tải về máy vẫn là dữ liệu trên máy.

## 4. Soạn ở nhà và mở tại sự kiện

Đăng nhập → nhập câu hỏi, tên đội, quy ước → chờ trạng thái Đã lưu. Trên máy tổ chức, đăng nhập cùng tài khoản → Dùng bộ đề để tổ chức → xác nhận tạo trận mới. Điểm, thẻ và lịch sử trận đấu vận hành trên máy tổ chức; không đồng bộ trận đấu đang chạy.

Bản nháp trên máy được tách theo tài khoản. Khi hai thiết bị cùng sửa, transaction kiểm tra revision và yêu cầu chọn bản cần giữ, tránh ghi đè âm thầm. Firestore giới hạn kích thước document; nếu bộ đề quá lớn, web sẽ báo lỗi lưu và giữ bản nháp, cần xuất JSON để dự phòng.

## 5. Quên mật khẩu

Nút Quên mật khẩu gửi email qua Firebase. Mặc định người dùng đặt lại trên trang Firebase rồi quay lại ứng dụng. Nếu muốn dùng trang đặt lại của website, trong Authentication → Templates → Password reset, đổi custom action URL thành `https://TEN_MIEN/account/reset-password`. Trang này nhận `mode=resetPassword&oobCode=...` và không yêu cầu đang đăng nhập.

## Kiểm tra trước khi dùng thật

Thử đăng nhập, lưu/mở bộ đề trên hai máy, reset mật khẩu, thu hồi quyền. Thử hai UID khác nhau: không được đọc/ghi document của nhau; tài khoản chưa có document admins không được truy cập bộ đề. Kiểm thử đơn vị trong repo kiểm tra xử lý revision; không thay thế kiểm tra rules và email trên project thật.

Tài liệu: [Firebase Auth](https://firebase.google.com/docs/auth/web/password-auth), [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [Security Rules](https://firebase.google.com/docs/firestore/security/get-started).
