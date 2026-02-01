const mongoose = require('mongoose');

const SensorSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'Please add a device ID'],
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Please add a sensor name'],
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'temperature',
      'humidity',
      'soil_moisture',
      'soil_ph',
      'light_intensity',
      'co2',
      'rainfall',
      'wind_speed',
      'wind_direction',
      'water_level',
      'nutrient_level',
      'camera'
    ]
  },
  farm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    altitude: { type: Number }
  },
  configuration: {
    samplingRate: { type: Number, default: 300 }, // seconds
    unit: String,
    minThreshold: Number,
    maxThreshold: Number,
    calibrationFactor: Number
  },
  currentReading: {
    value: Number,
    timestamp: Date,
    unit: String
  },
  readingsHistory: [{
    value: Number,
    timestamp: { type: Date, default: Date.now },
    unit: String,
    anomaly: { type: Boolean, default: false }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'calibrating', 'error', 'offline'],
    default: 'active'
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  lastMaintenance: Date,
  nextMaintenance: Date,
  connectivity: {
    type: { type: String, enum: ['wifi', 'lora', 'cellular', 'ethernet'] },
    signalStrength: Number,
    lastSeen: Date
  },
  metadata: {
    manufacturer: String,
    model: String,
    firmwareVersion: String,
    installationDate: Date
  },
  alerts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
SensorSchema.index({ deviceId: 1 });
SensorSchema.index({ farm: 1, type: 1 });
SensorSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Update timestamp on save
SensorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for last 24 hours readings
SensorSchema.virtual('last24HoursReadings').get(function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.readingsHistory.filter(reading => 
    reading.timestamp >= oneDayAgo
  );
});

module.exports = mongoose.model('Sensor', SensorSchema);