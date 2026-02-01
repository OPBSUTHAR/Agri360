/**
 * Utility functions for OpenStreetMap integration
 */

// Calculate distance between two coordinates in kilometers
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Calculate area of a polygon in hectares
export const calculatePolygonArea = (coordinates) => {
  if (!coordinates || coordinates.length < 3) return 0;
  
  let area = 0;
  const n = coordinates.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = coordinates[i][0];
    const yi = coordinates[i][1];
    const xj = coordinates[j][0];
    const yj = coordinates[j][1];
    
    area += xi * yj;
    area -= yi * xj;
  }
  
  area = Math.abs(area) / 2;
  
  // Convert to hectares (assuming coordinates are in degrees)
  // This is a rough approximation - for production use a proper geodesic calculation
  const areaInHectares = area * 111.32 * 111.32 * Math.cos(coordinates[0][1] * Math.PI / 180);
  return areaInHectares;
};

// Generate GeoJSON from farm data
export const farmToGeoJSON = (farm) => {
  if (!farm.location?.coordinates) return null;
  
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
      crops: farm.crops,
      status: farm.status,
      sensorCount: farm.sensors?.length || 0
    }
  };
};

// Generate GeoJSON from sensor data
export const sensorsToGeoJSON = (sensors) => {
  return {
    type: 'FeatureCollection',
    features: sensors.map(sensor => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [sensor.location.longitude, sensor.location.latitude]
      },
      properties: {
        id: sensor._id,
        name: sensor.name,
        type: sensor.type,
        value: sensor.currentReading?.value,
        unit: sensor.currentReading?.unit,
        status: sensor.status,
        battery: sensor.batteryLevel
      }
    }))
  };
};

// Get tile layer URL based on type
export const getTileLayer = (type = 'standard') => {
  const layers = {
    standard: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    topography: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap contributors & CartoDB'
    },
    hydrological: {
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team'
    }
  };
  
  return layers[type] || layers.standard;
};

// Get bounding box for all farms
export const getBoundingBox = (farms) => {
  if (!farms || farms.length === 0) {
    return [[-180, -90], [180, 90]]; // Default world bounds
  }
  
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  
  farms.forEach(farm => {
    if (farm.location?.coordinates) {
      farm.location.coordinates[0].forEach(coord => {
        const [lon, lat] = coord;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      });
    }
  });
  
  return [[minLat, minLon], [maxLat, maxLon]];
};

// Format coordinates for display
export const formatCoordinates = (lat, lon, precision = 6) => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  
  return {
    decimal: `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`,
    dms: `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`,
    simple: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  };
};

// Get map zoom level based on area size
export const getZoomForArea = (areaHectares) => {
  if (areaHectares < 1) return 18; // Very small area
  if (areaHectares < 10) return 16; // Small area
  if (areaHectares < 100) return 14; // Medium area
  if (areaHectares < 1000) return 12; // Large area
  return 10; // Very large area
};

// Export map data
export const exportMapData = (farms, sensors, format = 'geojson') => {
  const data = {
    farms: farms.map(farmToGeoJSON).filter(Boolean),
    sensors: sensorsToGeoJSON(sensors)
  };
  
  switch (format) {
    case 'geojson':
      return JSON.stringify(data, null, 2);
    case 'csv':
      // Simple CSV export
      let csv = 'Type,Name,Latitude,Longitude,Value,Status\n';
      
      // Farm data
      farms.forEach(farm => {
        if (farm.location?.coordinates) {
          const center = farm.location.coordinates[0][0];
          csv += `Farm,${farm.name},${center[1]},${center[0]},,${farm.status}\n`;
        }
      });
      
      // Sensor data
      sensors.forEach(sensor => {
        csv += `Sensor,${sensor.name},${sensor.location.latitude},${sensor.location.longitude},${sensor.currentReading?.value || ''},${sensor.status}\n`;
      });
      
      return csv;
    case 'kml': {
      // Simple KML structure
      const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Agri360 Farm Data</name>
    ${farms.map(farm => `
    <Placemark>
      <name>${farm.name}</name>
      <description>Farm: ${farm.name}</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${farm.location?.coordinates?.[0].map(coord => `${coord[0]},${coord[1]},0`).join(' ')}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    `).join('')}
  </Document>
</kml>`;
      return kml;
    }
    default:
      return JSON.stringify(data, null, 2);
  }
};