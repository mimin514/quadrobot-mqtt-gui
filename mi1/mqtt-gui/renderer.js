let receiving = true; // Trạng thái nhận dữ liệu
function logMessage(message) {
  const logContainer = document.getElementById('logContainer');
  const timestamp = new Date().toLocaleTimeString();

  // Tạo một dòng log mới
  const logEntry = document.createElement('div');
  logEntry.textContent = `[${timestamp}] ${message}`;
  logContainer.appendChild(logEntry);

  // Giới hạn số dòng log hiển thị (5 dòng gần nhất)
  const logs = logContainer.children;
  if (logs.length > 10) {
    logContainer.removeChild(logs[0]); // Xóa dòng đầu tiên nếu vượt quá 5 dòng
  }

  // Tự động cuộn xuống cuối
  logContainer.scrollTop = logContainer.scrollHeight;
}
// Hàm gửi PID
function sendPID() {
  const kp = document.getElementById('kpInput').value;
  const ki = document.getElementById('kiInput').value;
  const kd = document.getElementById('kdInput').value;
  console.log(`Kp: ${kp}, Ki: ${ki}, Kd: ${kd}`); // Kiểm tra giá trị

  // Cập nhật giá trị hiện tại trong các thẻ <span>
  document.getElementById('currentKp').textContent = kp;
  document.getElementById('currentKi').textContent = ki;
  document.getElementById('currentKd').textContent = kd;

  // Gửi dữ liệu PID qua MQTT
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
}

// Hàm bật/tắt nhận dữ liệu
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

function resetData() {
  // Reset dữ liệu trên biểu đồ
  imuChart1.data.labels = [];
  imuChart1.data.datasets.forEach(dataset => {
    dataset.data = [];
  });
  imuChart1.update();

  // Reset các giá trị hiển thị
  document.getElementById('roll').textContent = 0;
  document.getElementById('pitch').textContent = 0;
  document.getElementById('yaw').textContent = 0;

  logMessage('Dữ liệu đã được reset');

}

function showLeg(leg) {
  ['FL', 'FR', 'RL', 'RR'].forEach(l =>
    document.getElementById(`chartContainer${l}`).classList.add('hidden')
  );
  document.getElementById(`chartContainer${leg}`).classList.remove('hidden');
}
function showChart(chartType) {
  const charts = ['PID', 'FL', 'FR', 'RL', 'RR'];
  charts.forEach(type => {
    const container = document.getElementById('chartContainer' + type);
    if (container) {
      container.classList.add('hidden');
    }
  });

  const target = document.getElementById('chartContainer' + chartType);
  if (target) {
    target.classList.remove('hidden');
  }
}

const mqtt = require('mqtt');

// MQTT setup
const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

client.on('connect', () => {
  console.log('MQTT connected');
  logMessage('MQTT connected');
  client.subscribe('imu/data');
});
// Biểu đồ Chart.js - Biểu đồ 1 (Pitch, Roll, Yaw)
const ctx1 = document.getElementById('imuChart1').getContext('2d');
const imuChart1 = new Chart(ctx1, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Roll', data: [], borderColor: 'purple', fill: false },
      { label: 'Pitch', data: [], borderColor: 'green', fill: false },
      { label: 'Yaw', data: [], borderColor: 'blue', fill: false }
    ]
  },
  options: {
    animation: false,
    scales: {
      x: { display: true},
      y: { min: -180, max: 180}
    },
    plugins: {
      title: {
        display: true,
        text: 'PID Chart (Pitch, Roll, Yaw)' // Tiêu đề biểu đồ
      }
    }
  },
 
  
});
function createLegChartConfig(title) {
  return {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Angle 1', data: [], borderColor: 'orange', fill: false },
        { label: 'Angle 2', data: [], borderColor: 'red', fill: false },
        { label: 'Angle 3', data: [], borderColor: 'blue', fill: false }
      ]
    },
    options: {
      animation: false,
      plugins: { title: { display: true, text: title } },
      scales: { y: { min: 0, max: 180 } }
    }
  };
}

const chartFL = new Chart(document.getElementById('chartFL'), createLegChartConfig('Front Left'));
const chartFR = new Chart(document.getElementById('chartFR'), createLegChartConfig('Front Right'));
const chartRL = new Chart(document.getElementById('chartRL'), createLegChartConfig('Rear Left'));
const chartRR = new Chart(document.getElementById('chartRR'), createLegChartConfig('Rear Right'));

function addDataToChart(chart, d1, d2, d3) {
  const now = new Date().toLocaleTimeString();
  if (chart.data.labels.length > 50) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds => ds.data.shift());
  }
  chart.data.labels.push(now);
  chart.data.datasets[0].data.push(d1);
  chart.data.datasets[1].data.push(d2);
  chart.data.datasets[2].data.push(d3);
  chart.update();
}
// Hàm thêm dữ liệu cho biểu đồ 1
function addDataToChart1(roll, pitch, yaw) {
  const time = new Date().toLocaleTimeString();
  if (imuChart1.data.labels.length > 50) {
    imuChart1.data.labels.shift();
    imuChart1.data.datasets.forEach(ds => ds.data.shift());
  }
  imuChart1.data.labels.push(time);
  imuChart1.data.datasets[0].data.push(roll);
  imuChart1.data.datasets[1].data.push(pitch);
  imuChart1.data.datasets[2].data.push(yaw);
  imuChart1.update();
}

// Hàm thêm dữ liệu cho biểu đồ 2
function createLegChartConfig(title) {
  return {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Leg Angle 1', data: [], borderColor: 'orange', fill: false },
        { label: 'Leg Angle 2', data: [], borderColor: 'red', fill: false },
        { label: 'Leg Angle 3', data: [], borderColor: 'blue', fill: false }
      ]
    },
    options: {
      animation: false,
      scales: {
        x: { display: true },
        y: { min: 0, max: 180 }
      },
      plugins: {
        title: {
          display: true,
          text: title
        }
      }
    }
  };
}
// MQTT nhận dữ liệu
client.on('message', (topic, message) => {
  if (!receiving) return;
  const payload = message.toString();
  console.log(`Nhận dữ liệu từ topic ${topic}: ${payload}`);
  if (payload.startsWith('IMU:')) {
    const values = payload.replace('IMU:', '').split(';');
    const data = {};
    values.forEach(pair => {
      const [key, value] = pair.split('=');
      data[key] = parseFloat(value);
    });
    console.log(`Dữ liệu IMU:`, data);

    // Cập nhật dữ liệu cho biểu đồ 1
    document.getElementById('roll').textContent = data.Roll;
    document.getElementById('pitch').textContent = data.Pitch;
    document.getElementById('yaw').textContent = data.Yaw;
    addDataToChart1(data.Roll, data.Pitch, data.Yaw);
    
    addDataToChart(chartFL, data.FLAngle1, data.FLAngle2, data.FLAngle3);
    addDataToChart(chartFR, data.FRAngle1, data.FRAngle2, data.FRAngle3);
    addDataToChart(chartRL, data.RLAngle1, data.RLAngle2, data.RLAngle3);
    addDataToChart(chartRR, data.RRAngle1, data.RRAngle2, data.RRAngle3);
  
  }
});













