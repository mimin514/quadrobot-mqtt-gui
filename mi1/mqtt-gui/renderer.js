// Trạng thái nhận dữ liệu
let receiving = true;
let nummax=50;
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

  ['roll', 'pitch', 'yaw'].forEach(id => document.getElementById(id).textContent = 0);
  logMessage('Dữ liệu đã được reset');
}

// Hiển thị biểu đồ chân
function showLeg(leg) {
  ['FL', 'FR', 'RL', 'RR'].forEach(l =>
    document.getElementById(`chartContainer${l}`).classList.add('hidden')
  );
  document.getElementById(`chartContainer${leg}`).classList.remove('hidden');
}

// Hiển thị biểu đồ theo loại
function showChart(chartType) {
  const charts = ['PID', 'FL', 'FR', 'RL', 'RR'];
  charts.forEach(type => {
    const container = document.getElementById('chartContainer' + type);
    if (container) container.classList.add('hidden');
  });
  const target = document.getElementById('chartContainer' + chartType);
  if (target) target.classList.remove('hidden');
}

// Kết nối MQTT
const mqtt = require('mqtt');
const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');
client.on('connect', () => {
  console.log('MQTT connected');
  logMessage('MQTT connected');
  client.subscribe('imu/data');
});

// Cấu hình biểu đồ chính (PID)
const ctx1 = document.getElementById('imuChart1').getContext('2d');
const imuChart1 = new Chart(ctx1, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Roll', data: [], borderColor: 'orange ', fill: false },
      { label: 'Pitch', data: [], borderColor: 'blue', fill: false },
      { label: 'Yaw', data: [], borderColor: 'red', fill: false }
    ]
  },
  options: {
    animation: false,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'category',
        display: true,
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10
        }
      },
      y: {
        min: -30,
        max: 30
      }
    },
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          modifierKey: 'ctrl', // hoặc 'alt', 'shift' để người dùng giữ để cuộn
        },
        zoom: {
          wheel: {
            enabled: true
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
        },
        limits: {
          x: { min: 0 }
        }
      },
      title: {
        display: true,
        text: 'Pitch, Roll, Yaw'
      },
      legend: {
        display: true,
        onClick: (e, legendItem, legend) => {
          const chart = legend.chart;
          const index = legendItem.datasetIndex;
          const meta = chart.getDatasetMeta(index);
          meta.hidden = !meta.hidden;
          chart.update();
        }
      }
    }
    
  }
  
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
      maintainAspectRatio: false,
      scales: {
        x: { display: true },
        y: { min: 0, max: 180 }
      },
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
            modifierKey: 'ctrl'  // để người dùng giữ Ctrl rồi kéo chuột
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
          },
          limits: {
            x: { min: 0 }
          }
        },
        title: { display: true, text: title },
        legend: {
          display: true,
          onClick: (e, legendItem, legend) => {
            const chart = legend.chart;
            const index = legendItem.datasetIndex;
            const meta = chart.getDatasetMeta(index);
            meta.hidden = !meta.hidden;
            chart.update();
          }
        }
      }
      
    }
  };
}

const chartFL = new Chart(document.getElementById('chartFL'), createLegChartConfig('Front Left'));
const chartFR = new Chart(document.getElementById('chartFR'), createLegChartConfig('Front Right'));
const chartRL = new Chart(document.getElementById('chartRL'), createLegChartConfig('Rear Left'));
const chartRR = new Chart(document.getElementById('chartRR'), createLegChartConfig('Rear Right'));

function addDataToChart(chart, d1, d2, d3) {
  const now = new Date().toLocaleTimeString();

  chart.data.labels.push(now);
  chart.data.datasets[0].data.push(d1);
  chart.data.datasets[1].data.push(d2);
  chart.data.datasets[2].data.push(d3);
  const total = chart.data.labels.length;
  if (!chart.options.scales.x.min || total - nummax > chart.options.scales.x.min) {
    chart.options.scales.x.min = total > nummax ? total - nummax : 0;
    chart.options.scales.x.max = total - 1;
  }

  chart.update('none');
}

function addDataToChart1(roll, pitch, yaw) {
  const time = new Date().toLocaleTimeString();
  imuChart1.data.labels.push(time);
  imuChart1.data.datasets[0].data.push(roll);
  imuChart1.data.datasets[1].data.push(pitch);
  imuChart1.data.datasets[2].data.push(yaw);

  const total = imuChart1.data.labels.length;
  if (!imuChart1.options.scales.x.min || total - nummax > imuChart1.options.scales.x.min) {
    imuChart1.options.scales.x.min = total > nummax ? total - nummax : 0;
    imuChart1.options.scales.x.max = total - 1;
  }

  imuChart1.update('none'); // 'none' to skip animation
}


// Nhận dữ liệu từ MQTT
client.on('message', (topic, message) => {
  if (!receiving) return;

  const payload = message.toString();
  if (!payload.startsWith('IMU:')) return;

  const values = payload.replace('IMU:', '').split(';');
  const data = {};
  values.forEach(pair => {
    const [key, value] = pair.split('=');
    data[key] = parseFloat(value);
  });

  document.getElementById('roll').textContent = data.Roll;
  document.getElementById('pitch').textContent = data.Pitch;
  document.getElementById('yaw').textContent = data.Yaw;
  addDataToChart1(data.Roll, data.Pitch, data.Yaw);

  addDataToChart(chartFL, data.FLAngle1, data.FLAngle2, data.FLAngle3);
  addDataToChart(chartFR, data.FRAngle1, data.FRAngle2, data.FRAngle3);
  addDataToChart(chartRL, data.RLAngle1, data.RLAngle2, data.RLAngle3);
  addDataToChart(chartRR, data.RRAngle1, data.RRAngle2, data.RRAngle3);
});
