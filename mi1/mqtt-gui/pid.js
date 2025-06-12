const mqtt = require('mqtt');
const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

let Kp = 1, Ki = 0, Kd = 0;
let setpoint_roll = 0, setpoint_pitch = 0, height = 0;
let Delta_t = 0.1;

// PID state cho Roll
let pre_error_roll = 0, pre_pre_error_roll = 0, pre_output_roll = 0;
// PID state cho Pitch
let pre_error_pitch = 0, pre_pre_error_pitch = 0, pre_output_pitch = 0;

// Giá trị cảm biến mô phỏng
let roll = 0, pitch = 0;

client.on('connect', () => {
  console.log('PID node connected');
  client.subscribe('imu/control');

  // Vòng lặp mô phỏng cảm biến và PID
  setInterval(() => {
    // Tạo dữ liệu cảm biến mô phỏng (ví dụ dao động quanh setpoint)
    roll += (Math.random() - 0.5) * 2;   // dao động nhẹ
    pitch += (Math.random() - 0.5) * 2;

    // PID cho Roll
    let error_roll = setpoint_roll - roll;
    let p_part_roll = Kp * (error_roll - pre_error_roll);
    let i_part_roll = Ki * Delta_t / 2.0 * (error_roll + pre_error_roll);
    let d_part_roll = Kd / Delta_t * (error_roll - 2.0 * pre_error_roll + pre_pre_error_roll);
    let output_roll = p_part_roll + i_part_roll + d_part_roll + pre_output_roll;
    pre_pre_error_roll = pre_error_roll;
    pre_error_roll = error_roll;
    pre_output_roll = output_roll;
    output_roll = Math.max(Math.min(output_roll, 30.0), -30.0);

    // PID cho Pitch
    let error_pitch = setpoint_pitch - pitch;
    let p_part_pitch = Kp * (error_pitch - pre_error_pitch);
    let i_part_pitch = Ki * Delta_t / 2.0 * (error_pitch + pre_error_pitch);
    let d_part_pitch = Kd / Delta_t * (error_pitch - 2.0 * pre_error_pitch + pre_pre_error_pitch);
    let output_pitch = p_part_pitch + i_part_pitch + d_part_pitch + pre_output_pitch;
    pre_pre_error_pitch = pre_error_pitch;
    pre_error_pitch = error_pitch;
    pre_output_pitch = output_pitch;
    output_pitch = Math.max(Math.min(output_pitch, 30.0), -30.0);

    // Gửi dữ liệu cảm biến lên imu/data để giao diện vẽ biểu đồ
client.publish(
    'imu/data',
    `Roll=${roll.toFixed(2)};Pitch=${pitch.toFixed(2)};Yaw=0;RollSP=${setpoint_roll};PitchSP=${setpoint_pitch};HeightSP=${height};RollPID=${output_roll.toFixed(2)};PitchPID=${output_pitch.toFixed(2)}`
  );

    // Gửi kết quả điều khiển lên topic điều khiển
    client.publish('motor1_control', output_roll.toString());
    client.publish('motor2_control', output_pitch.toString());

    // Log ra console
    console.log(`Roll=${roll.toFixed(2)} | Pitch=${pitch.toFixed(2)} | Out_Roll=${output_roll.toFixed(2)} | Out_Pitch=${output_pitch.toFixed(2)}`);
  }, 1000);
});

client.on('message', (topic, message) => {
  const payload = message.toString();
  if (topic === 'imu/control' && payload.startsWith('SET:')) {
    const values = payload.replace('SET:', '').split(';');
    values.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key === 'Kp') Kp = parseFloat(value);
      if (key === 'Ki') Ki = parseFloat(value);
      if (key === 'Kd') Kd = parseFloat(value);
      if (key === 'Roll') setpoint_roll = parseFloat(value);
      if (key === 'Pitch') setpoint_pitch = parseFloat(value);
      if (key === 'Height') height = parseFloat(value);
    });
// client.publish(
//   'imu/data',
//   `Roll=${roll.toFixed(2)};Pitch=${pitch.toFixed(2)};Yaw=0;RollSP=${setpoint_roll};PitchSP=${setpoint_pitch};HeightSP=${height}`
// );
    console.log(`Updated PID: Kp=${Kp}, Ki=${Ki}, Kd=${Kd}, Roll_SP=${setpoint_roll}, Pitch_SP=${setpoint_pitch}, Height=${height}`);
  }
});