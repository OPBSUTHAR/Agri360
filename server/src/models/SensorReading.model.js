const mongoose = require('mongoose');

const SensorReadingSchema = new mongoose.Schema({
  sensor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor',
    required: true,
    index: true
  },
  farm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
    index: true
  },
  value: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true,
    default: Date.now
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  metadata: {
    deviceBattery: Number,
    signalStrength: Number,
    rawData: mongoose.Schema.Types.Mixed
  },
  processed: {
    type: Boolean,
    default: false
  },
  anomalies: [{
    type: { type: String, enum: ['spike', 'drop', 'stale'] },
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    description: String
  }],
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  }
}, {
  timestamps: true
});

// Compound indexes for efficient time-series queries
SensorReadingSchema.index({ sensor: 1, timestamp: -1 });
SensorReadingSchema.index({ farm: 1, timestamp: -1 });
SensorReadingSchema.index({ timestamp: -1 });

// Time-series collection options
SensorReadingSchema.set('timeseries', {
  timeField: 'timestamp',
  metaField: 'sensor',
  granularity: 'seconds'
});

module.exports = mongoose.model('SensorReading', SensorReadingSchema);