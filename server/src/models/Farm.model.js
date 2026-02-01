const mongoose = require('mongoose');

const GeoSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Polygon', 'Point'],
    default: 'Polygon'
  },
  coordinates: {
    type: [[[Number]]], // For Polygon
    required: true
  }
});

const FarmSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a farm name'],
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  location: {
    type: GeoSchema,
    required: true,
    index: '2dsphere'
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  size: {
    value: { type: Number, required: true },
    unit: { type: String, enum: ['acres', 'hectares'], default: 'acres' }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  crops: [{
    name: String,
    type: { type: String, enum: ['vegetable', 'fruit', 'grain', 'other'] },
    plantingDate: Date,
    harvestDate: Date,
    status: { type: String, enum: ['planted', 'growing', 'ready', 'harvested'] }
  }],
  soilType: {
    type: String,
    enum: ['clay', 'sandy', 'loamy', 'peaty', 'chalky', 'silty']
  },
  irrigationSystem: {
    type: String,
    enum: ['drip', 'sprinkler', 'center_pivot', 'manual', 'smart']
  },
  weatherStation: {
    installed: { type: Boolean, default: false },
    stationId: String,
    lastUpdate: Date
  },
  sensors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor'
  }],
  irrigationSchedules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IrrigationSchedule'
  }],
  images: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image'
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for geospatial queries
FarmSchema.index({ location: '2dsphere' });

// Update timestamp on save
FarmSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Farm', FarmSchema);