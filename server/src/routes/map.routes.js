const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const weatherService = require('../services/weatherService');

// Weather data endpoint
router.get('/weather', protect, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const weather = await weatherService.getCurrentWeather(parseFloat(lat), parseFloat(lon));
    const forecast = await weatherService.getForecast(parseFloat(lat), parseFloat(lon));

    res.json({
      success: true,
      data: {
        current: weather,
        forecast: forecast
      }
    });
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data'
    });
  }
});

// Elevation data endpoint
router.get('/elevation', protect, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    // Using Open-Elevation API
    const response = await axios.get(`https://api.open-elevation.com/api/v1/lookup`, {
      params: {
        locations: `${lat},${lon}`
      }
    });

    res.json({
      success: true,
      data: {
        elevation: response.data.results[0].elevation,
        location: { lat, lon }
      }
    });
  } catch (error) {
    console.error('Elevation API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch elevation data'
    });
  }
});

// Routing endpoint
router.post('/route', protect, async (req, res) => {
  try {
    const { waypoints } = req.body;
    
    if (!waypoints || waypoints.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 waypoints are required'
      });
    }

    // Using OSRM routing engine
    const coordinates = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
    const response = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coordinates}`, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: true
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Routing API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate route'
    });
  }
});

// Satellite imagery endpoint
router.get('/satellite/:date', protect, async (req, res) => {
  try {
    const { date } = req.params;
    const { lat, lon, zoom } = req.query;

    // This would integrate with satellite imagery services
    // For demo, return mock data
    res.json({
      success: true,
      data: {
        date,
        url: `https://api.satellite.com/tile/${zoom}/${lat}/${lon}/${date}`,
        provider: 'Sentinel-2',
        resolution: '10m'
      }
    });
  } catch (error) {
    console.error('Satellite API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch satellite imagery'
    });
  }
});

module.exports = router;