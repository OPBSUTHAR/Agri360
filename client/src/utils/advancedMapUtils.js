import * as turf from '@turf/turf';

// Heatmap utilities
export const generateHeatmapData = (sensors, type = 'soil_moisture') => {
  return sensors
    .filter(sensor => sensor.type === type && sensor.currentReading)
    .map(sensor => ({
      lat: sensor.location?.latitude,
      lng: sensor.location?.longitude,
      value: sensor.currentReading.value,
      timestamp: sensor.currentReading.timestamp
    }));
};

// Routing utilities
export const calculateOptimalRoute = (waypoints, constraints = {}) => {
  // This would integrate with a routing service
  // For now, calculate straight-line distances
  let totalDistance = 0;
  const distances = [];
  
  for (let i = 1; i < waypoints.length; i++) {
    const dist = turf.distance(
      turf.point([waypoints[i-1].lng, waypoints[i-1].lat]),
      turf.point([waypoints[i].lng, waypoints[i].lat]),
      { units: 'kilometers' }
    );
    distances.push(dist);
    totalDistance += dist;
  }
  
  return {
    totalDistance,
    distances,
    estimatedTime: totalDistance / (constraints.speed || 15) * 60, // minutes
    waypoints
  };
};

// Zone analysis utilities
export const analyzeZone = (zone, sensors) => {
  const zonePolygon = turf.polygon([zone.coordinates.map(c => [c.lng, c.lat])]);
  
  // Find sensors in zone
  const sensorsInZone = sensors.filter(sensor => {
    const point = turf.point([sensor.location.longitude, sensor.location.latitude]);
    return turf.booleanPointInPolygon(point, zonePolygon);
  });
  
  // Calculate zone statistics
  const stats = {
    sensorCount: sensorsInZone.length,
    types: {},
    avgValues: {},
    area: turf.area(zonePolygon) / 10000, // Convert to hectares
    perimeter: turf.length(zonePolygon, { units: 'kilometers' })
  };
  
  // Group by sensor type and calculate averages
  sensorsInZone.forEach(sensor => {
    if (!stats.types[sensor.type]) {
      stats.types[sensor.type] = 0;
      stats.avgValues[sensor.type] = [];
    }
    stats.types[sensor.type]++;
    if (sensor.currentReading?.value) {
      stats.avgValues[sensor.type].push(sensor.currentReading.value);
    }
  });
  
  // Calculate averages
  Object.keys(stats.avgValues).forEach(type => {
    const values = stats.avgValues[type];
    if (values.length > 0) {
      stats.avgValues[type] = values.reduce((a, b) => a + b, 0) / values.length;
    } else {
      delete stats.avgValues[type];
    }
  });
  
  return stats;
};

// Weather data processing
export const processWeatherData = (rawData) => {
  return {
    temperature: rawData.temperature?.map(temp => ({
      lat: temp.lat,
      lng: temp.lng,
      value: temp.value,
      feelsLike: temp.feels_like,
      timestamp: new Date(temp.timestamp)
    })) || [],
    
    precipitation: rawData.precipitation?.map(rain => ({
      lat: rain.lat,
      lng: rain.lng,
      value: rain.precipitation,
      probability: rain.probability,
      type: rain.type
    })) || [],
    
    wind: rawData.wind?.map(wind => ({
      lat: wind.lat,
      lng: wind.lng,
      speed: wind.speed,
      direction: wind.direction,
      gusts: wind.gust
    })) || [],
    
    forecast: rawData.forecast?.map(fc => ({
      lat: fc.lat,
      lng: fc.lng,
      temp_min: fc.temp_min,
      temp_max: fc.temp_max,
      condition: fc.condition,
      timestamp: new Date(fc.timestamp)
    })) || []
  };
};

// GPS tracking utilities
export const trackMovement = (positions, interval = 1000) => {
  const tracks = [];
  let currentTrack = [];
  
  positions.forEach((pos, index) => {
    currentTrack.push([pos.lat, pos.lng]);
    
    // If there's a gap in time, start a new track
    if (index > 0 && pos.timestamp - positions[index-1].timestamp > interval * 5) {
      if (currentTrack.length > 1) {
        tracks.push({
          positions: [...currentTrack],
          startTime: positions[index - currentTrack.length].timestamp,
          endTime: pos.timestamp
        });
      }
      currentTrack = [[pos.lat, pos.lng]];
    }
  });
  
  // Add the last track
  if (currentTrack.length > 1) {
    tracks.push({
      positions: currentTrack,
      startTime: positions[positions.length - currentTrack.length].timestamp,
      endTime: positions[positions.length - 1].timestamp
    });
  }
  
  return tracks;
};

// Elevation utilities
export const calculateElevationProfile = (path, elevationData) => {
  const profile = [];
  let totalDistance = 0;
  let cumulativeDistance = 0;
  
  // Calculate distances between points
  for (let i = 1; i < path.length; i++) {
    const segmentDistance = turf.distance(
      turf.point([path[i-1][1], path[i-1][0]]),
      turf.point([path[i][1], path[i][0]]),
      { units: 'kilometers' }
    );
    totalDistance += segmentDistance;
  }
  
  // Sample points along the path
  const numSamples = 100;
  for (let i = 0; i <= numSamples; i++) {
    const ratio = i / numSamples;
    const distance = totalDistance * ratio;
    
    // Find point along path (simplified)
    const pointIndex = Math.floor(ratio * (path.length - 1));
    const point = path[pointIndex];
    
    // Get elevation (mock - would use actual elevation data)
    const elevation = getElevationAtPoint(point[0], point[1], elevationData);
    
    profile.push({
      distance,
      elevation,
      latitude: point[0],
      longitude: point[1],
      slope: i > 0 ? (elevation - profile[i-1].elevation) / (distance - profile[i-1].distance) : 0
    });
  }
  
  return {
    profile,
    totalDistance,
    minElevation: Math.min(...profile.map(p => p.elevation)),
    maxElevation: Math.max(...profile.map(p => p.elevation)),
    avgSlope: profile.reduce((sum, p) => sum + Math.abs(p.slope), 0) / profile.length
  };
};

const getElevationAtPoint = (lat, lng, elevationData) => {
  // Mock elevation data - in production, use actual elevation service
  return 100 + Math.sin(lat * 100) * 50 + Math.cos(lng * 100) * 30;
};

// Satellite imagery utilities
export const getSatelliteLayers = () => {
  return [
    {
      id: 'esri_satellite',
      name: 'ESRI Satellite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    },
    {
      id: 'google_satellite',
      name: 'Google Satellite',
      url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      attribution: 'Google'
    },
    {
      id: 'bing_aerial',
      name: 'Bing Aerial',
      url: 'https://tiles.virtualearth.net/tiles/a{r}.jpeg?g=1',
      attribution: 'Microsoft Bing'
    },
    {
      id: 'usgs_satellite',
      name: 'USGS Satellite',
      url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
      attribution: 'USGS'
    }
  ];
};

// Zone classification
export const classifyZone = (zoneData, sensors) => {
  const stats = analyzeZone(zoneData, sensors);
  
  if (stats.avgValues.soil_moisture < 30) {
    return { type: 'irrigation', priority: 'high', recommendation: 'Increase irrigation' };
  }
  
  if (stats.avgValues.temperature > 35) {
    return { type: 'heat_stress', priority: 'medium', recommendation: 'Consider shading' };
  }
  
  if (stats.sensorCount === 0) {
    return { type: 'unmonitored', priority: 'low', recommendation: 'Add sensors' };
  }
  
  return { type: 'normal', priority: 'low', recommendation: 'Monitor regularly' };
};

// Export utilities
export const exportZoneData = (zones, format = 'geojson') => {
  const geojson = {
    type: 'FeatureCollection',
    features: zones.map(zone => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [zone.coordinates.map(c => [c.lng, c.lat])]
      },
      properties: {
        name: zone.name,
        type: zone.type,
        area: zone.area,
        created: zone.created || new Date().toISOString()
      }
    }))
  };
  
  switch (format) {
    case 'geojson':
      return JSON.stringify(geojson, null, 2);
    
    case 'kml':
      return convertToKML(geojson);
    
    case 'shapefile':
      // Note: Shapefile export requires server-side processing
      return geojson;
    
    default:
      return JSON.stringify(geojson, null, 2);
  }
};

const convertToKML = (geojson) => {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Agri360 Zones</name>`;
  
  geojson.features.forEach(feature => {
    kml += `
    <Placemark>
      <name>${feature.properties.name}</name>
      <description>
        Type: ${feature.properties.type}
        Area: ${feature.properties.area} hectares
      </description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${feature.geometry.coordinates[0].map(coord => `${coord[0]},${coord[1]},0`).join(' ')}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
      <Style>
        <LineStyle>
          <color>${getKMLColor(feature.properties.type)}</color>
          <width>2</width>
        </LineStyle>
        <PolyStyle>
          <color>${getKMLColor(feature.properties.type, true)}</color>
          <fill>1</fill>
        </PolyStyle>
      </Style>
    </Placemark>`;
  });
  
  kml += `
  </Document>
</kml>`;
  
  return kml;
};

const getKMLColor = (zoneType, fill = false) => {
  const colors = {
    irrigation: fill ? '7d2196F3' : 'ff2196F3',
    crop: fill ? '7d4CAF50' : 'ff4CAF50',
    restricted: fill ? '7dF44336' : 'ffF44336',
    buffer: fill ? '7dFF9800' : 'ffFF9800',
    default: fill ? '7d9C27B0' : 'ff9C27B0'
  };
  
  return colors[zoneType] || colors.default;
};