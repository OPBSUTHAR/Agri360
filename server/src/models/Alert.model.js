const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'sensor_threshold',
      'sensor_offline',
      'irrigation_failure',
      'weather_alert',
      'disease_detected',
      'pest_infestation',
      'water_shortage',
      'power_outage',
      'maintenance_due',
      'custom'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  source: {
    type: { type: String, enum: ['sensor', 'system', 'ai', 'user'] },
    id: mongoose.Schema.Types.ObjectId,
    name: String
  },
  farm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  data: mongoose.Schema.Types.Mixed,
  thresholds: {
    min: Number,
    max: Number,
    current: Number,
    unit: String
  },
  acknowledged: {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: Date,
    notes: String
  },
  resolved: {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: Date,
    resolution: String
  },
  notifications: [{
    method: { type: String, enum: ['email', 'sms', 'push', 'in-app'] },
    sentAt: Date,
    status: { type: String, enum: ['sent', 'failed', 'pending'] }
  }],
  actions: [{
    type: { type: String, enum: ['irrigation', 'notification', 'maintenance', 'custom'] },
    executed: Boolean,
    executedAt: Date,
    result: String
  }],
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  expiresAt: Date,
  autoResolve: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
AlertSchema.index({ farm: 1, createdAt: -1 });
AlertSchema.index({ severity: 1, createdAt: -1 });
AlertSchema.index({ acknowledged: 1, resolved: 1 });
AlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Alert', AlertSchema);