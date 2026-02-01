/**
 * Geographic utilities for farm calculations
 */

// Calculate area of a polygon in square meters
exports.calculateArea = (coordinates) => {
  if (!coordinates || coordinates.length < 3) return 0;
  
  let area = 0;
  const n = coordinates.length;
  
  // Using the shoelace formula
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = coordinates[i][0] * Math.PI / 180;
    const yi = coordinates[i][1] * Math.PI / 180;
    const xj = coordinates[j][0] * Math.PI / 180;
    const yj = coordinates[j][1] * Math.PI / 180;
    
    area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
  }
  
  area = Math.abs(area) * 6378137 * 6378137 / 2;
  return Math.abs(area);
};

// Convert area to different units
exports.convertArea = (areaM2, unit) => {
  const conversions = {
    m2: 1,
    hectares: 0.0001,
    acres: 0.000247105,
    sqkm: 0.000001
  };
  
  return areaM2 * (conversions[unit] || 1);
};

// Calculate center point of polygon
exports.getCenter = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return { latitude: 0, longitude: 0 };
  }
  
  let sumLat = 0;
  let sumLon = 0;
  
  coordinates.forEach(coord => {
    sumLon += coord[0];
    sumLat += coord[1];
  });
  
  return {
    longitude: sumLon / coordinates.length,
    latitude: sumLat / coordinates.length
  };
};

// Generate GeoJSON for farm
exports.farmToGeoJSON = (farm) => {
  return {
    type: 'Feature',
    geometry: {
      type: farm.location.type || 'Polygon',
      coordinates: farm.location.coordinates
    },
    properties: {
      id: farm._id,
      name: farm.name,
      size: farm.size,
      status: farm.status,
      cropCount: farm.crops?.length || 0,
      sensorCount: farm.sensors?.length || 0
    }
  };
};

// Check if point is inside polygon
exports.isPointInPolygon = (point, polygon) => {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
};

// Calculate optimal sensor placement
exports.calculateOptimalSensorPlacement = (polygon, sensorCount) => {
  const center = this.getCenter(polygon);
  const sensors = [];
  
  // Simple circular placement around center
  for (let i = 0; i < sensorCount; i++) {
    const angle = (i * 2 * Math.PI) / sensorCount;
    const distance = 0.001; // ~100 meters in degrees
    
    sensors.push({
      longitude: center.longitude + distance * Math.cos(angle),
      latitude: center.latitude + distance * Math.sin(angle)
    });
  }
  
  return sensors;
};