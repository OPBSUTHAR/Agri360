const Sensor = require('../models/Sensor.model');
const SensorReading = require('../models/SensorReading.model');
const Farm = require('../models/Farm.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

// @desc    Get all sensors for a farm
// @route   GET /api/sensors
// @access  Private
exports.getSensors = asyncHandler(async (req, res, next) => {
  const { farmId, type, status } = req.query;
  
  let query = {};
  
  if (farmId) {
    query.farm = farmId;
  }
  
  if (type) {
    query.type = type;
  }
  
  if (status) {
    query.status = status;
  }

  const sensors = await Sensor.find(query)
    .populate('farm', 'name location')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: sensors.length,
    data: sensors
  });
});

// @desc    Get single sensor
// @route   GET /api/sensors/:id
// @access  Private
exports.getSensor = asyncHandler(async (req, res, next) => {
  const sensor = await Sensor.findById(req.params.id)
    .populate('farm', 'name location')
    .populate('alerts');

  if (!sensor) {
    return next(new ErrorResponse(`Sensor not found with id of ${req.params.id}`, 404));
  }

  // Get latest readings
  const latestReadings = await SensorReading.find({ sensor: sensor._id })
    .sort({ timestamp: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    data: {
      sensor,
      readings: latestReadings
    }
  });
});

// @desc    Create new sensor
// @route   POST /api/sensors
// @access  Private
exports.createSensor = asyncHandler(async (req, res, next) => {
  // Check if farm exists
  const farm = await Farm.findById(req.body.farm);
  if (!farm) {
    return next(new ErrorResponse(`Farm not found with id of ${req.body.farm}`, 404));
  }

  // Check if device ID already exists
  const existingSensor = await Sensor.findOne({ deviceId: req.body.deviceId });
  if (existingSensor) {
    return next(new ErrorResponse(`Device ID ${req.body.deviceId} already exists`, 400));
  }

  req.body.owner = req.user.id;
  
  const sensor = await Sensor.create(req.body);

  // Add sensor to farm
  farm.sensors.push(sensor._id);
  await farm.save();

  res.status(201).json({
    success: true,
    data: sensor
  });
});

// @desc    Update sensor
// @route   PUT /api/sensors/:id
// @access  Private
exports.updateSensor = asyncHandler(async (req, res, next) => {
  let sensor = await Sensor.findById(req.params.id);

  if (!sensor) {
    return next(new ErrorResponse(`Sensor not found with id of ${req.params.id}`, 404));
  }

  sensor = await Sensor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: sensor
  });
});

// @desc    Delete sensor
// @route   DELETE /api/sensors/:id
// @access  Private
exports.deleteSensor = asyncHandler(async (req, res, next) => {
  const sensor = await Sensor.findById(req.params.id);

  if (!sensor) {
    return next(new ErrorResponse(`Sensor not found with id of ${req.params.id}`, 404));
  }

  // Remove sensor from farm
  await Farm.findByIdAndUpdate(sensor.farm, {
    $pull: { sensors: sensor._id }
  });

  await sensor.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get sensor readings
// @route   GET /api/sensors/:id/readings
// @access  Private
exports.getSensorReadings = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, limit = 100, aggregate = 'raw' } = req.query;
  
  let query = { sensor: req.params.id };
  
  // Date range filter
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  let readings;
  
  if (aggregate === 'hourly') {
    // Aggregate by hour
    const aggregation = await SensorReading.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          },
          avgValue: { $avg: '$value' },
          minValue: { $min: '$value' },
          maxValue: { $max: '$value' },
          count: { $sum: 1 },
          timestamp: { $first: '$timestamp' }
        }
      },
      { $sort: { '_id': 1 } },
      { $limit: parseInt(limit) }
    ]);
    
    readings = aggregation.map(item => ({
      timestamp: item.timestamp,
      value: item.avgValue,
      min: item.minValue,
      max: item.maxValue,
      count: item.count
    }));
  } else {
    // Raw readings
    readings = await SensorReading.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
  }

  res.status(200).json({
    success: true,
    count: readings.length,
    data: readings
  });
});

// @desc    Send command to sensor
// @route   POST /api/sensors/:id/command
// @access  Private
exports.sendSensorCommand = asyncHandler(async (req, res, next) => {
  const sensor = await Sensor.findById(req.params.id);
  
  if (!sensor) {
    return next(new ErrorResponse(`Sensor not found with id of ${req.params.id}`, 404));
  }

  const { command, parameters } = req.body;
  
  // Publish command via MQTT
  if (global.mqttService && global.mqttService.connected) {
    global.mqttService.publish(`sensors/${sensor.deviceId}/command`, {
      command,
      parameters,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({
      success: true,
      message: 'Command sent to sensor'
    });
  } else {
    return next(new ErrorResponse('MQTT service not available', 503));
  }
});

// @desc    Calibrate sensor
// @route   POST /api/sensors/:id/calibrate
// @access  Private
exports.calibrateSensor = asyncHandler(async (req, res, next) => {
  const sensor = await Sensor.findById(req.params.id);
  
  if (!sensor) {
    return next(new ErrorResponse(`Sensor not found with id of ${req.params.id}`, 404));
  }

  const { knownValue, calibrationFactor } = req.body;
  
  // Update calibration
  if (calibrationFactor) {
    sensor.configuration.calibrationFactor = calibrationFactor;
  }
  
  sensor.status = 'calibrating';
  await sensor.save();

  // Send calibration command
  if (global.mqttService && global.mqttService.connected) {
    global.mqttService.publish(`sensors/${sensor.deviceId}/calibrate`, {
      knownValue,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    success: true,
    data: sensor
  });
});