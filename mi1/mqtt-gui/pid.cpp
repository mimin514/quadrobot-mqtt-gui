#include <ros/ros.h>
#include "std_msgs/Float32.h"
#include <algorithm>
#include <mqtt/async_client.h>
#include <sstream>

class PIDController {
public:
    double Kp, Ki, Kd;  // Public để cập nhật từ bên ngoài
private:
    double Delta_t;
    double pre_error;
    double pre_pre_error;
    double pre_output;

public:
    PIDController(double kp, double ki, double kd, double delta_t)
        : Kp(kp), Ki(ki), Kd(kd), Delta_t(delta_t),
          pre_error(0.0), pre_pre_error(0.0), pre_output(0.0) {}

    double compute(double setpoint, double measurement) {
        double error = setpoint - measurement;

        double p_part = Kp * (error - pre_error);
        double i_part = Ki * Delta_t / 2.0 * (error + pre_error);
        double d_part = Kd / Delta_t * (error - 2.0 * pre_error + pre_pre_error);

        double output = p_part + i_part + d_part + pre_output;

        pre_pre_error = pre_error;
        pre_error = error;
        pre_output = output;

        return std::max(std::min(output, 30.0), -30.0);
    }
};

class MotorControllerNode;  // forward declare

// Callback class kế thừa mqtt::callback
class MqttCallback : public virtual mqtt::callback {
private:
    MotorControllerNode* controller;

public:
    MqttCallback(MotorControllerNode* ctrl) : controller(ctrl) {}

    void message_arrived(mqtt::const_message_ptr msg) override;
};

class MotorControllerNode {
private:
    ros::NodeHandle nh;
    ros::Publisher motor1_pub, motor2_pub;
    ros::Publisher chan_trai_truoc_pub, chan_phai_truoc_pub;
    ros::Subscriber roll_sub, pitch_sub;

    PIDController pid_roll, pid_pitch;

    float target_roll = 0.0, target_pitch = 0.0;
    double output_roll = 0.0, output_pitch = 0.0;
    float setpoint_roll = 0.0;
    float setpoint_pitch = 0.0;
    float height = 0.0;  // giả sử dùng để điều khiển chân sau hoặc chiều cao
    mqtt::async_client mqtt_client;
    MqttCallback mqtt_cb;

public:
    MotorControllerNode()
        : pid_roll(5.0, 0.1, 0.001, 0.1),
          pid_pitch(5.0, 0.1, 0.001, 0.1),
          mqtt_client("tcp://broker.hivemq.com:1883", "pid_subscriber_client"),
          mqtt_cb(this)
    {
        motor1_pub = nh.advertise<std_msgs::Float32>("motor1_control", 10);
        motor2_pub = nh.advertise<std_msgs::Float32>("motor2_control", 10);
        chan_trai_truoc_pub = nh.advertise<std_msgs::Float32>("motor_trai_truoc", 10);
        chan_phai_truoc_pub = nh.advertise<std_msgs::Float32>("motor_phai_truoc", 10);
        roll_sub = nh.subscribe("roll", 10, &MotorControllerNode::rollCallback, this);
        pitch_sub = nh.subscribe("pitch", 10, &MotorControllerNode::pitchCallback, this);

        mqtt_client.set_callback(mqtt_cb);
        mqtt::connect_options connOpts;
        connOpts.set_clean_session(true);
        mqtt_client.connect(connOpts)->wait();
        mqtt_client.subscribe("imu/control", 1)->wait();

        ROS_INFO("MQTT connected and subscribed to imu/control.");
    }

    void onMqttMessage(mqtt::const_message_ptr msg) {
        std::string payload = msg->get_payload();
        if (payload.find("SET:") == 0) {
            try {
                std::string content = payload.substr(4);
                std::istringstream ss(content);
                std::string token;
                while (std::getline(ss, token, ';')) {
                    auto pos = token.find('=');
                    if (pos != std::string::npos) {
                        std::string key = token.substr(0, pos);
                        double value = std::stod(token.substr(pos + 1));
                        if (key == "Kp") {
                            pid_roll.Kp = value;
                            pid_pitch.Kp = value;
                        }
                        else if (key == "Ki") {
                            pid_roll.Ki = value;
                            pid_pitch.Ki = value;
                        }
                        else if (key == "Kd") {
                            pid_roll.Kd = value;
                            pid_pitch.Kd = value;
                        }
                        else if (key == "Roll") {
                            setpoint_roll = value;
                        } else if (key == "Pitch") {
                            setpoint_pitch = value;
                        }
                         else if (key == "Height") {
                            height = value;
                        }
                        
                    }
                }
                ROS_INFO_STREAM("Received MQTT payload: " << payload);
                ROS_INFO_STREAM("Updated PID → Kp: " << pid_roll.Kp
                                << ", Ki: " << pid_roll.Ki
                                << ", Kd: " << pid_roll.Kd
                                << ", Roll SP: " << setpoint_roll
                                << ", Pitch SP: " << setpoint_pitch
                                << ", Height: " << height);
            } catch (const std::exception& e) {
                ROS_WARN_STREAM("Failed to parse MQTT message: " << e.what());
                
            }
        }
    }
    

    void rollCallback(const std_msgs::Float32::ConstPtr& msg) {
        float roll = msg->data;
        output_roll = pid_roll.compute(target_roll, roll);
        std_msgs::Float32 control_msg;
        control_msg.data = output_roll;
        motor1_pub.publish(control_msg);
        ROS_INFO_STREAM("Roll: " << roll << " | Motor1 Control: " << output_roll);
    }

    void pitchCallback(const std_msgs::Float32::ConstPtr& msg) {
        float pitch = msg->data;
        output_pitch = pid_pitch.compute(target_pitch, pitch);
        std_msgs::Float32 control_msg;
        control_msg.data = output_pitch;
        motor2_pub.publish(control_msg);
        ROS_INFO_STREAM("Pitch: " << pitch << " | Motor2 Control: " << output_pitch);
        publishTraiTruoc();
        publishPhaiTruoc();
    }

    float Can_bang_trai_truoc() {
        return std::max(std::min(output_pitch - output_roll, 30.0), -30.0);
    }

    float Can_bang_phai_truoc() {
        return std::max(std::min(output_pitch + output_roll, 30.0), -30.0);
    }

    void publishTraiTruoc() {
        std_msgs::Float32 msg;
        msg.data = Can_bang_trai_truoc();
        chan_trai_truoc_pub.publish(msg);
        ROS_INFO_STREAM("Chan trai truoc: " << msg.data);
    }

    void publishPhaiTruoc() {
        std_msgs::Float32 msg;
        msg.data = Can_bang_phai_truoc();
        chan_phai_truoc_pub.publish(msg);
        ROS_INFO_STREAM("Chan phai truoc: " << msg.data);
    }

    void run() {
        ros::spin();
        mqtt_client.disconnect()->wait();
        ROS_INFO("MQTT disconnected.");
    }
};

// Định nghĩa ngoài class
void MqttCallback::message_arrived(mqtt::const_message_ptr msg) {
    controller->onMqttMessage(msg);
}



int main(int argc, char** argv) {
    ros::init(argc, argv, "pid");
    MotorControllerNode controller;
    controller.run();
    return 0;
}




// #include <ros/ros.h>
// #include "std_msgs/Float32.h" // Để sử dụng kiểu dữ liệu Float32
// #include <algorithm>  // Để sử dụng std::max và std::min

// class PIDController {
// private:
//     double Kp, Ki, Kd;
//     double Delta_t;
//     double pre_error;
//     double pre_pre_error;
//     double pre_output;

// public:
//     PIDController(double kp, double ki, double kd, double delta_t)
//         : Kp(kp), Ki(ki), Kd(kd), Delta_t(delta_t),
//           pre_error(0.0), pre_pre_error(0.0), pre_output(0.0) {}

//     double compute(double setpoint, double measurement) {
//         double error = setpoint - measurement;

//         double p_part = Kp  * (error - pre_error);
//         double i_part = Ki * Delta_t / 2.0 * (error + pre_error);
//         double d_part = Kd / Delta_t * (error - 2.0 * pre_error + pre_pre_error);

//         double output = p_part + i_part + d_part + pre_output;

//         // Cập nhật trạng thái trước đó
//         pre_pre_error = pre_error;
//         pre_error = error;
//         pre_output = output;

//         // Giới hạn đầu ra từ -30 đến 30
//         output = std::max(std::min(output, 30.0), -30.0);
//         return output;
//     }
// };

// class MotorControllerNode {
//     private:
//         ros::NodeHandle nh;
//         ros::Publisher motor1_pub;
//         ros::Publisher motor2_pub;
//         ros::Subscriber roll_sub;
//         ros::Subscriber pitch_sub;
//         ros::Publisher chan_trai_truoc_pub;
//         ros::Publisher chan_phai_truoc_pub;
    
//         PIDController pid_roll;
//         PIDController pid_pitch;
    
//         float target_roll = 0.0;
//         float target_pitch = -2.0;
//         double output_roll = 0.0;
//         double output_pitch = 0.0;
//     public:
//         MotorControllerNode()
//             : pid_roll(0.1, 0.5, 0.0005, 0.05),   // PID cho roll
//               pid_pitch(0.1, 0.5, 0.0005, 0.05)  // PID cho pitch
//         {
//             motor1_pub = nh.advertise<std_msgs::Float32>("motor1_control", 10);
//             motor2_pub = nh.advertise<std_msgs::Float32>("motor2_control", 10);
//             chan_trai_truoc_pub = nh.advertise<std_msgs::Float32>("motor_trai_truoc", 10);
//             chan_phai_truoc_pub = nh.advertise<std_msgs::Float32>("motor_phai_truoc", 10);
//             roll_sub = nh.subscribe("roll", 10, &MotorControllerNode::rollCallback, this);
//             pitch_sub = nh.subscribe("pitch", 10, &MotorControllerNode::pitchCallback, this);
//         }
    
//         void rollCallback(const std_msgs::Float32::ConstPtr& msg) {
//             float roll = msg->data;
//             output_roll = pid_roll.compute(target_roll, roll);
    
//             std_msgs::Float32 control_msg;
//             control_msg.data = output_roll;
//             motor1_pub.publish(control_msg);
    
//             ROS_INFO_STREAM("Roll: " << roll << " | Motor1 Control: " << output_roll);
//         }
    
//         void pitchCallback(const std_msgs::Float32::ConstPtr& msg) {
//             float pitch = msg->data;
//             output_pitch = pid_pitch.compute(target_pitch, pitch);
    
//             std_msgs::Float32 control_msg;
//             control_msg.data = output_pitch;
//             motor2_pub.publish(control_msg);
    
//             ROS_INFO_STREAM("Pitch: " << pitch << " | Motor2 Control: " << output_pitch);
//             publishTraiTruoc();
//             publishPhaiTruoc();
//         }
//         float Can_bang_trai_truoc() {
//             float trai_truoc = output_pitch - output_roll;
        
//             if (trai_truoc > 30)
//                 trai_truoc = 30;
//             else if (trai_truoc < -30)
//                 trai_truoc = -30;
        
//             return trai_truoc;
//         }
//         float Can_bang_phai_truoc() {
//             float phai_truoc = output_pitch + output_roll;
        
//             if (phai_truoc > 30)
//                 phai_truoc = 30;
//             else if (phai_truoc < -30)
//                 phai_truoc = -30;
        
//             return phai_truoc;
//         }

//         void publishTraiTruoc() {
//             float value = Can_bang_trai_truoc();
//             std_msgs::Float32 msg;
//             msg.data = value;
        
//             // Giả sử bạn đã tạo publisher tên là motor_trai_truoc_pub
//             chan_trai_truoc_pub.publish(msg);
        
//             ROS_INFO_STREAM("Chan trai truoc: " << value);
//         }
//         void publishPhaiTruoc() {
//             float value = Can_bang_phai_truoc();
//             std_msgs::Float32 msg;
//             msg.data = value;
        
            
//             chan_phai_truoc_pub.publish(msg);
        
//             ROS_INFO_STREAM("Chan phai truoc: " << value);
//         }
//         void run() {
//             ros::spin();
//         }
//     };
    


    

    
    
//     int main(int argc, char** argv) {
//         ros::init(argc, argv, "pid");
    
//         MotorControllerNode controller;
//         controller.run();
    
//         return 0;
//     }
    



