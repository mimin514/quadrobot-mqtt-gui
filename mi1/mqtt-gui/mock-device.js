const mqtt = require('mqtt');
const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

let kp = 1.0, ki = 0.0, kd = 0.0;
let manualRoll = null, manualPitch = null, manualYaw = null;

let integral = 0, lastError = 0;
let target = 0;
let receiving = true; // Trạng thái nhận dữ liệu
let intervalId; // Lưu ID của setInterval

client.on('connect', () => {
  console.log('Mock device connected');
  client.subscribe('imu/control');

  intervalId = setInterval(() => {
    if (!receiving) return; // Nếu không nhận dữ liệu, thoát khỏi hàm

    // Giả lập dữ liệu IMU
    let current = Math.random() * 20 - 10; // Simulate current yaw
    let error = target - current;
    integral += error;
    let derivative = error - lastError;
    lastError = error;

    let output = kp * error + ki * integral + kd * derivative;

    const roll = manualRoll !== null ? manualRoll : (Math.random() * 10 - 5).toFixed(1);
    const pitch = manualPitch !== null ? manualPitch : (Math.random() * 10 - 5).toFixed(1);
    const yaw = manualYaw !== null ? manualYaw : (Math.random() * 10 - 5).toFixed(1);

    // Giả lập 3 biến góc cho từng chân robot
    const legs = ['FL', 'FR', 'RL', 'RR'];
    const legData = legs.map(leg => {
      const legAngle1 = (20 + Math.random() * 30).toFixed(1);
      const legAngle2 = (60 + Math.random() * 30).toFixed(1);
      const legAngle3 = (40 + Math.random() * 30).toFixed(1);
      return `${leg}Angle1=${legAngle1};${leg}Angle2=${legAngle2};${leg}Angle3=${legAngle3}`;
    }).join(';');

    // Gửi dữ liệu qua MQTT
    const msg = `Roll=${roll};Pitch=${pitch};Yaw=${yaw};${legData}`;
    client.publish('imu/data', msg);
    console.log('Published:', msg);
  }, 1000);
});

client.on('message', (topic, message) => {
  const payload = message.toString();
  if (payload.startsWith('SET:')) {
    const values = payload.replace('SET:', '').split(';');
    values.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key === 'Kp') kp = parseFloat(value);
      if (key === 'Ki') ki = parseFloat(value);
      if (key === 'Kd') kd = parseFloat(value);
  
    });
    console.log(`Updated PID → Kp=${kp}, Ki=${ki}, Kd=${kd}`);
  } else if (payload === 'STOP') {
    receiving = false; // Dừng nhận dữ liệu
    console.log('Dừng gửi dữ liệu');
  } else if (payload === 'START') {
    receiving = true; // Tiếp tục nhận dữ liệu
    console.log('Tiếp tục gửi dữ liệu');
  }
  else if (payload.startsWith('PRY:')) {
    // Nhận giá trị thủ công
    const pairs = payload.replace('PRY:', '').split(';');
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key === 'Roll') manualRoll = parseFloat(value);
      if (key === 'Pitch') manualPitch = parseFloat(value);
      if (key === 'Yaw') manualYaw = parseFloat(value);
    });
    console.log(`Nhận thủ công: Roll=${manualRoll}, Pitch=${manualPitch}, Yaw=${manualYaw}`);
  }
});