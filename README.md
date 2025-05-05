# QuadRobot MQTT GUI

Giao diện điều khiển và giám sát robot 4 chân thông qua giao thức MQTT.  
Hỗ trợ điều chỉnh thông số PID và hiển thị biểu đồ thời gian thực cho các góc IMU và các góc chân.

Cách chạy

1. Clone repo:
   ```bash
   git clone https://github.com/<your-username>/quadrobot-mqtt-gui.git
   cd quadrobot-mqtt-gui

bash
npm install
Chạy mock device (Node.js):

bash
Sao chép
Chỉnh sửa
node mock-device.js
Chạy giao diện:

Nếu là web: mở index.html trong trình duyệt

Nếu là Electron:

bash
Sao chép
Chỉnh sửa
npm start
📡 MQTT
Mặc định sử dụng:

bash
Sao chép
Chỉnh sửa
Broker: wss://broker.hivemq.com:8884/mqtt
Topic gửi điều khiển: imu/control
Topic nhận dữ liệu: imu/data
Bạn có thể thay đổi broker bằng cách sửa trong renderer.js và mock-device.js

📂 Cấu trúc thư mục
pgsql
Sao chép
Chỉnh sửa
quadrobot-mqtt-gui/
├── index.html
├── style.css
├── renderer.js
├── mock-device.js
├── package.json (nếu dùng Electron)
└── README.md
✨ Gợi ý mở rộng
Tự động scale biểu đồ theo dữ liệu

Export log ra CSV

Playback dữ liệu đã thu

Điều khiển robot từ xa thông qua nút nhấn hoặc joystick

🧑‍💻 Tác giả
Dự án do [My] phát triển trong khuôn khổ đồ án hệ điều hành / điều khiển robot tại trường Bách Khoa TP.HCM.

📜 Giấy phép
MIT License.

yaml
Sao chép
Chỉnh sửa

---

## ✅ Việc tiếp theo

1. Tạo repo GitHub (trên web hoặc CLI).
2. Copy cấu trúc file vào.
3. Push lần đầu:

```bash
git init
git add .
git commit -m "Initial commit: Quadrobot MQTT GUI"
git remote add origin https://github.com/<your-username>/quadrobot-mqtt-gui.git
git push -u origin main
