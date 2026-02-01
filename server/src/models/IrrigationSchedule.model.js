const mongoose = require('mongoose');

const IrrigationScheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  farm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  zone: {
    name: String,
    coordinates: [[[Number]]], // Polygon for irrigation zone
    area: Number, // in square meters
    cropType: String
  },
  scheduleType: {
    type: String,
    enum: ['automatic', 'manual', 'smart', 'scheduled'],
    default: 'scheduled'
  },
  // For scheduled irrigation
  cronSchedule: {
    type: String,
    default: '0 6 * * *' // Daily at 6 AM
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  duration: {
    type: Number, // in minutes
    required: true
  },
  // For smart irrigation
  conditions: [{
    sensorType: String,
    operator: { type: String, enum: ['<', '<=', '>', '>=', '==', '!='] },
    threshold: Number,
    unit: String
  }],
  // Water requirements
  waterAmount: {
    value: Number,
    unit: { type: String, default: 'liters' }
  },
  flowRate: {
    value: Number,
    unit: { type: String, default: 'liters/minute' }
  },
  // Weather considerations
  considerWeather: {
    type: Boolean,
    default: true
  },
  skipIfRain: {
    type: Boolean,
    default: true
  },
  rainThreshold: {
    type: Number,
    default: 5 // mm
  },
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  lastExecuted: Date,
  nextExecution: Date,
  executionHistory: [{
    startTime: Date,
    endTime: Date,
    status: { type: String, enum: ['success', 'partial', 'failed', 'skipped'] },
    waterUsed: Number,
    reason: String,
    weatherConditions: {
      temperature: Number,
      humidity: Number,
      rainfall: Number
    }
  }],
  // Notifications
  notifications: {
    beforeStart: { type: Boolean, default: true },
    afterCompletion: { type: Boolean, default: true },
    onFailure: { type: Boolean, default: true }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
IrrigationScheduleSchema.index({ farm: 1, status: 1 });
IrrigationScheduleSchema.index({ nextExecution: 1 });
IrrigationScheduleSchema.index({ 'zone.coordinates': '2dsphere' });

// Virtual for next execution date
IrrigationScheduleSchema.virtual('isDue').get(function() {
  if (!this.nextExecution) return false;
  return this.nextExecution <= new Date();
});

module.exports = mongoose.model('IrrigationSchedule', IrrigationScheduleSchema);