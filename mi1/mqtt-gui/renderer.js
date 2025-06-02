// Kết nối MQTT
const mqtt = require('mqtt');
const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

// Trạng thái nhận dữ liệu
let receiving = true;
let nummax = 50;

// Ghi log ra màn hình
function logMessage(message) {
  const logContainer = document.getElementById('logContainer');
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.textContent = `[${timestamp}] ${message}`;
  logContainer.appendChild(logEntry);

  if (logContainer.children.length > nummax) {
    logContainer.removeChild(logContainer.children[0]);
  }
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Gửi PID qua MQTT
function sendPID() {
  const kp = document.getElementById('kpInput').value;
  const ki = document.getElementById('kiInput').value;
  const kd = document.getElementById('kdInput').value;

  document.getElementById('currentKp').textContent = kp;
  document.getElementById('currentKi').textContent = ki;
  document.getElementById('currentKd').textContent = kd;

  const frame = `SET:Kp=${kp};Ki=${ki};Kd=${kd}`;
  logMessage(`Đã gửi PID: Kp=${kp}, Ki=${ki}, Kd=${kd}`);

  client.publish('imu/control', frame, (err) => {
    if (err) {
      console.error('Gửi PID thất bại:', err);
      logMessage(`Gửi PID thất bại: ${err.message}`);
    } else {
      console.log('Gửi PID thành công:', frame);
      logMessage(`Gửi PID thành công: ${frame}`);
    }
  });
    const pitch = document.getElementById('pitchSliderNum').value;
  const roll = document.getElementById('rollSliderNum').value;
  const yaw = document.getElementById('yaw').textContent || 0; // hoặc thêm input yaw nếu muốn
  const frame1 = `PRY:Roll=${roll};Pitch=${pitch};Yaw=${yaw}`;
  logMessage(`Đã gửi Pitch/Roll/Yaw: Roll=${roll}, Pitch=${pitch}, Yaw=${yaw}`);
  client.publish('imu/control', frame1, (err) => {
    if (err) {
      logMessage(`Gửi Pitch/Roll/Yaw thất bại: ${err.message}`);
    } else {
      logMessage(`Gửi Pitch/Roll/Yaw thành công: ${frame1}`);
    }
  });
}

// Bật/tắt nhận dữ liệu
function toggleReceiving() {
  const button = document.getElementById('toggleButton');
  receiving = !receiving;
  if (receiving) {
    client.publish('imu/control', 'START');
    button.textContent = "Dừng";
    button.style.backgroundColor = "red";
    logMessage('Đang nhận dữ liệu');
  } else {
    client.publish('imu/control', 'STOP');
    button.textContent = "Tiếp tục";
    button.style.backgroundColor = "green";
    logMessage('Đã dừng nhận dữ liệu');
  }
}

// Reset dữ liệu
function resetData() {
  imuChart1.data.labels = [];
  imuChart1.data.datasets.forEach(ds => ds.data = []);
  imuChart1.update();

  [chartFL, chartFR, chartRL, chartRR].forEach(chart => {
    chart.data.labels = [];
    chart.data.datasets.forEach(ds => ds.data = []);
    chart.update();
  });

  ['roll', 'pitch', 'yaw', 'height'].forEach(id => document.getElementById(id).textContent = 0);
  logMessage('Dữ liệu đã được reset');
}
function isUserAtEnd(chart) {
  const xScale = chart.scales['x'];
  return Math.abs(xScale.max - chart.data.labels.length) < 1;
}

client.on('message', (topic, message) => {
  if (!isUserAtEnd(imuChart1)) return;  // Không cập nhật nếu người dùng đang xem lại

  // cập nhật dữ liệu như bình thường
});
function resetView() {
  imuChart1.resetZoom(); // hoặc tự scroll về cuối
}

// Hiển thị biểu đồ theo tab
function showChart(chartType) {
  const charts = ['PID', 'FL', 'FR', 'RL', 'RR'];
  charts.forEach(type => {
    const container = document.getElementById('chartContainer' + type);
    if (container) container.classList.add('hidden');
  });
  const target = document.getElementById('chartContainer' + chartType);
  if (target) target.classList.remove('hidden');
}
function syncSliderAndNumber(idPrefix) {
  const slider = document.getElementById(idPrefix + 'Slider');
  const number = document.getElementById(idPrefix + 'SliderNum');

  slider.addEventListener('input', () => {
    number.value = slider.value;
  });

  number.addEventListener('input', () => {
    slider.value = number.value;
  });
}
syncSliderAndNumber('pitch');
syncSliderAndNumber('roll');
syncSliderAndNumber('height'); // nếu bạn cần gửi height
// const MAX_POINTS = 50;

// if (imuChart1.data.labels.length > MAX_POINTS) {
//   imuChart1.data.labels.shift();
//   imuChart1.data.datasets.forEach(dataset => dataset.data.shift());
// }

// Tạo biểu đồ Chart.js
const imuChart1 = new Chart(document.getElementById('imuChart1'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Roll', data: [], borderColor: 'red', borderWidth: 1, fill: false },
      { label: 'Pitch', data: [], borderColor: 'blue', borderWidth: 1, fill: false },
      { label: 'Yaw', data: [], borderColor: 'green', borderWidth: 1, fill: false }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { pinch: { enabled: true }, wheel: { enabled: true }, mode: 'x' }
      }
    }
  }
});

// Tạo biểu đồ cho từng chân
function createLegChart(canvasId, label) {
  return new Chart(document.getElementById(canvasId), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: label, data: [], borderColor: 'orange', borderWidth: 1, fill: false }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        zoom: {
          pan: { enabled: true, mode: 'x' },
          zoom: { pinch: { enabled: true }, wheel: { enabled: true }, mode: 'x' }
        }
      }
    }
  });
}

const chartFL = createLegChart('chartFL', 'Front Left');
const chartFR = createLegChart('chartFR', 'Front Right');
const chartRL = createLegChart('chartRL', 'Rear Left');
const chartRR = createLegChart('chartRR', 'Rear Right');

// Lắng nghe dữ liệu MQTT
client.on('connect', () => {
  logMessage('Đã kết nối đến MQTT Broker');
  client.subscribe('imu/data');
});

client.on('message', (topic, message) => {
  if (!receiving) return;

  const data = message.toString();
  logMessage(`Nhận: ${data}`);

  // Bỏ tiền tố "IMU:" nếu có
  let payload = data.startsWith('IMU:') ? data.slice(4) : data;

  // Tách thành các cặp key=value
  const pairs = payload.split(';').map(s => s.trim()).filter(s => s.includes('='));
  const values = {};
  pairs.forEach(pair => {
    const [key, val] = pair.split('=');
    values[key] = val;
  });

  // Map dữ liệu IMU
  const R = parseFloat(values['Roll']) || 0;
  const P = parseFloat(values['Pitch']) || 0;
  const Y = parseFloat(values['Yaw']) || 0;

  // Lấy dữ liệu góc chân robot (chỉ lấy Angle1 cho đơn giản)
  const FL = parseFloat(values['FLAngle1']) || 0;
  const FR = parseFloat(values['FRAngle1']) || 0;
  const RL = parseFloat(values['RLAngle1']) || 0;
  const RR = parseFloat(values['RRAngle1']) || 0;

  const time = new Date().toLocaleTimeString();

  // Cập nhật biểu đồ IMU
  imuChart1.data.labels.push(time);
  imuChart1.data.datasets[0].data.push(R);
  imuChart1.data.datasets[1].data.push(P);
  imuChart1.data.datasets[2].data.push(Y);
  imuChart1.update();

  // Cập nhật biểu đồ từng chân
  chartFL.data.labels.push(time);
  chartFL.data.datasets[0].data.push(FL);
  chartFL.update();

  chartFR.data.labels.push(time);
  chartFR.data.datasets[0].data.push(FR);
  chartFR.update();

  chartRL.data.labels.push(time);
  chartRL.data.datasets[0].data.push(RL);
  chartRL.update();

  chartRR.data.labels.push(time);
  chartRR.data.datasets[0].data.push(RR);
  chartRR.update();

  // Cập nhật giá trị trên UI
  document.getElementById('roll').textContent = R;
  document.getElementById('pitch').textContent = P;
  document.getElementById('yaw').textContent = Y;
});

