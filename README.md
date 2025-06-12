# 🦿 QuadRobot MQTT GUI

Giao diện điều khiển và giám sát robot 4 chân thông qua giao thức **MQTT**.
Hỗ trợ **điều chỉnh thông số PID** và **hiển thị biểu đồ thời gian thực** cho các góc IMU (Roll, Pitch, Yaw) và **3 góc của mỗi chân**.

---

## 🚀 Cách chạy

### 1. Clone repository

```bash
git clone https://github.com/<your-username>/quadrobot-mqtt-gui.git
cd quadrobot-mqtt-gui
```

### 2. Cài đặt package

```bash
npm install
```
```bash
npm install mqtt
```
### 3. Chạy mock device (Node.js)
Mở 1 terminal khác để chạy:
```bash
node mock-device.js
```
hoặc từ file giống pid.cpp
```bash
node pid.js
```
### 4. Chạy giao diện

* **Web**: mở trực tiếp file `index.html` trong trình duyệt:
 ```bash
http-server
```

* **Electron**:
```bash
npx electron .
```


---

## 📡 Cấu hình MQTT

Mặc định sử dụng broker công khai:

```bash
Broker: wss://broker.hivemq.com:8884/mqtt
Topic điều khiển: imu/control
Topic dữ liệu: imu/data
```

🔧 Bạn có thể thay đổi cấu hình MQTT bằng cách sửa trong các file:

* `renderer.js`
* `mock-device.js`
* `pid.js`

---

## 📁 Cấu trúc thư mục

```
quadrobot-mqtt-gui/
├── index.html           # Giao diện chính
├── style.css            # Giao diện người dùng (UI)
├── renderer.js          # Logic nhận dữ liệu và vẽ biểu đồ
├── mock-device.js       # Thiết bị mô phỏng gửi dữ liệu MQTT
├── package.json         # Cấu hình Electron + Node.js
└── README.md            # Tài liệu này
```

---

## 📌 Khởi tạo Git (tuỳ chọn)

```bash
git init
git add .
git commit -m "Initial commit: QuadRobot MQTT GUI"
git remote add origin https://github.com/<your-username>/quadrobot-mqtt-gui.git
git push -u origin main
```
## 📌 Đóng gói thành thư mục chứa file có đuôi exe
```bash
npm run package    

```
## 📸 Giao diện hiện tại
![image](https://github.com/user-attachments/assets/38e510be-0a54-4d64-aae1-b60a1cf09f54)

 
