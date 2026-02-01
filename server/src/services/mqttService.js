const mqtt = require('mqtt');
const Sensor = require('../models/Sensor.model');
const SensorReading = require('../models/SensorReading.model');
const Alert = require('../models/Alert.model');
const { sendNotification } = require('./notificationService');

class MQTTService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
  }

  connect() {
    const options = {
      clientId: `agri360_server_${Date.now()}`,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clean: true,
      reconnectPeriod: 1000
    };

    this.client = mqtt.connect(process.env.MQTT_BROKER_URL, options);

    this.client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      this.connected = true;
      this.subscribeToTopics();
    });

    this.client.on('message', async (topic, message) => {
      await this.handleMessage(topic, message.toString());
    });

    this.client.on('error', (error) => {
      console.error('MQTT Error:', error);
      this.connected = false;
    });

    this.client.on('close', () => {
      console.log('MQTT connection closed');
      this.connected = false;
    });
  }

  subscribeToTopics() {
    // Subscribe to sensor data topics
    this.subscribe('sensors/+/data');
    this.subscribe('sensors/+/status');
    this.subscribe('irrigation/+/control');
    this.subscribe('alerts/+');
  }

  subscribe(topic) {
    if (this.connected) {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`Subscribed to ${topic}`);
          this.subscriptions.set(topic, true);
        }
      });
    }
  }

  async handleMessage(topic, message) {
    try {
      const data = JSON.parse(message);
      const topicParts = topic.split('/');
      const deviceType = topicParts[0];
      const deviceId = topicParts[1];
      const messageType = topicParts[2];

      switch (deviceType) {
        case 'sensors':
          await this.handleSensorMessage(deviceId, messageType, data);
          break;
        case 'irrigation':
          await this.handleIrrigationMessage(deviceId, messageType, data);
          break;
        case 'alerts':
          await this.handleAlertMessage(deviceId, data);
          break;
        default:
          console.log(`Unknown topic: ${topic}`);
      }
    } catch (error) {
      console.error('Error handling MQTT message:', error);
    }
  }

  async handleSensorMessage(deviceId, messageType, data) {
    try {
      const sensor = await Sensor.findOne({ deviceId });
      
      if (!sensor) {
        console.log(`Unknown sensor: ${deviceId}`);
        return;
      }

      switch (messageType) {
        case 'data':
          await this.processSensorData(sensor, data);
          break;
        case 'status':
          await this.updateSensorStatus(sensor, data);
          break;
      }
    } catch (error) {
      console.error('Error handling sensor message:', error);
    }
  }

  async processSensorData(sensor, data) {
    // Create sensor reading
    const reading = await SensorReading.create({
      sensor: sensor._id,
      farm: sensor.farm,
      value: data.value,
      unit: data.unit || sensor.configuration.unit,
      timestamp: new Date(data.timestamp || Date.now()),
      location: sensor.location,
      metadata: {
        deviceBattery: data.battery,
        signalStrength: data.signal,
        rawData: data
      }
    });

    // Update sensor current reading
    sensor.currentReading = {
      value: data.value,
      timestamp: reading.timestamp,
      unit: reading.unit
    };

    sensor.readingsHistory.push({
      value: data.value,
      timestamp: reading.timestamp,
      unit: reading.unit
    });

    // Keep only last 100 readings in memory
    if (sensor.readingsHistory.length > 100) {
      sensor.readingsHistory = sensor.readingsHistory.slice(-100);
    }

    sensor.connectivity.lastSeen = new Date();
    await sensor.save();

    // Check thresholds and create alerts if needed
    await this.checkSensorThresholds(sensor, data.value);

    // Emit real-time update via Socket.IO
    if (global.io) {
      global.io.to(sensor.farm.toString()).emit('sensor:update', {
        sensorId: sensor._id,
        reading: reading.toObject()
      });
    }

    console.log(`Processed reading from ${sensor.name}: ${data.value}${reading.unit}`);
  }

  async checkSensorThresholds(sensor, value) {
    const config = sensor.configuration;
    
    if (config.minThreshold !== undefined && value < config.minThreshold) {
      await this.createThresholdAlert(sensor, 'below', value, config.minThreshold);
    }
    
    if (config.maxThreshold !== undefined && value > config.maxThreshold) {
      await this.createThresholdAlert(sensor, 'above', value, config.maxThreshold);
    }
  }

  async createThresholdAlert(sensor, type, current, threshold) {
    const alert = await Alert.create({
      type: 'sensor_threshold',
      title: `Sensor ${type} threshold`,
      description: `${sensor.name} (${sensor.type}) is ${type} threshold: ${current}${sensor.currentReading.unit} (Threshold: ${threshold}${sensor.currentReading.unit})`,
      severity: type === 'below' && sensor.type === 'soil_moisture' ? 'critical' : 'warning',
      source: {
        type: 'sensor',
        id: sensor._id,
        name: sensor.name
      },
      farm: sensor.farm,
      location: sensor.location,
      thresholds: {
        min: sensor.configuration.minThreshold,
        max: sensor.configuration.maxThreshold,
        current: current,
        unit: sensor.currentReading.unit
      },
      priority: 3
    });

    // Send notification
    await sendNotification({
      type: 'sensor_alert',
      farmId: sensor.farm,
      alertId: alert._id,
      message: alert.description,
      severity: alert.severity
    });
  }

  async updateSensorStatus(sensor, statusData) {
    sensor.status = statusData.status || sensor.status;
    sensor.batteryLevel = statusData.battery || sensor.batteryLevel;
    sensor.connectivity.signalStrength = statusData.signal || sensor.connectivity.signalStrength;
    
    if (statusData.status === 'error') {
      await this.createSensorErrorAlert(sensor, statusData.error);
    }

    await sensor.save();

    // Emit status update
    if (global.io) {
      global.io.to(sensor.farm.toString()).emit('sensor:status', {
        sensorId: sensor._id,
        status: sensor.status,
        battery: sensor.batteryLevel
      });
    }
  }

  async createSensorErrorAlert(sensor, error) {
    await Alert.create({
      type: 'sensor_offline',
      title: 'Sensor Error',
      description: `${sensor.name} (${sensor.type}) is reporting error: ${error}`,
      severity: 'warning',
      source: {
        type: 'sensor',
        id: sensor._id,
        name: sensor.name
      },
      farm: sensor.farm,
      location: sensor.location,
      priority: 2
    });
  }

  async handleIrrigationMessage(deviceId, messageType, data) {
    // Handle irrigation control messages
    console.log(`Irrigation message from ${deviceId}:`, data);
    
    if (global.io) {
      global.io.emit('irrigation:update', {
        deviceId,
        ...data
      });
    }
  }

  async handleAlertMessage(deviceId, data) {
    // Handle direct alert messages from devices
    console.log(`Alert from ${deviceId}:`, data);
  }

  publish(topic, message) {
    if (this.connected) {
      this.client.publish(topic, JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

module.exports = new MQTTService();