const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  farm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  capturedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor'
  },
  captureDate: {
    type: Date,
    required: true
  },
  location: {
    latitude: Number,
    longitude: Number,
    altitude: Number
  },
  metadata: {
    cameraModel: String,
    resolution: String,
    fileSize: Number,
    format: String,
    exposure: Number,
    iso: Number
  },
  processing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    aiModel: String,
    confidence: Number
  },
  analysisResults: {
    cropHealth: {
      score: { type: Number, min: 0, max: 100 },
      status: { type: String, enum: ['healthy', 'stressed', 'diseased', 'unknown'] },
      diseases: [{
        name: String,
        confidence: Number,
        severity: { type: String, enum: ['low', 'medium', 'high'] },
        treatment: String
      }],
      nutrientDeficiencies: [String]
    },
    growthStage: {
      stage: { type: String, enum: ['seedling', 'vegetative', 'flowering', 'fruiting', 'mature'] },
      percentage: Number,
      estimatedDaysToHarvest: Number
    },
    yieldPrediction: {
      estimatedYield: Number,
      unit: { type: String, default: 'kg/ha' },
      confidence: Number,
      factors: [{
        name: String,
        impact: { type: String, enum: ['positive', 'negative', 'neutral'] }
      }]
    },
    weedDetection: {
      detected: Boolean,
      density: Number,
      types: [String],
      coveragePercentage: Number
    },
    pestDetection: {
      detected: Boolean,
      pests: [{
        name: String,
        count: Number,
        severity: String
      }]
    },
    ndviIndex: {
      value: Number,
      interpretation: String
    }
  },
  annotations: [{
    type: { type: String, enum: ['crop', 'disease', 'pest', 'weed', 'other'] },
    coordinates: [[Number]], // Polygon coordinates
    label: String,
    confidence: Number,
    color: String
  }],
  tags: [String],
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'edit', 'download'] }
  }],
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
ImageSchema.index({ farm: 1, captureDate: -1 });
ImageSchema.index({ 'processing.status': 1 });
ImageSchema.index({ 'analysisResults.cropHealth.status': 1 });
ImageSchema.index({ tags: 1 });

module.exports = mongoose.model('Image', ImageSchema);