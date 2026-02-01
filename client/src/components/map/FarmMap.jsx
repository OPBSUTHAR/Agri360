import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, ZoomControl, LayersControl } from 'react-leaflet';
import { FiMap, FiSun, FiNavigation, FiFilter, FiDownload } from 'react-icons/fi';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const { BaseLayer } = LayersControl;

const FarmMap = ({
  farms = [],
  sensors = [],
  selectedFarm = null,
  onFarmSelect = () => {},
  onSensorClick = () => {},
  height = '500px',
  showControls = true,
  showLegend = true
}) => {
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(5);
  const [activeLayer, setActiveLayer] = useState('standard');

  // Farm boundary style
  const farmBoundaryStyle = {
    color: '#4CAF50',
    weight: 3,
    opacity: 0.8,
    fillColor: '#4CAF50',
    fillOpacity: 0.2
  };

  // Selected farm style
  const selectedFarmStyle = {
    color: '#FF9800',
    weight: 4,
    opacity: 1,
    fillColor: '#FF9800',
    fillOpacity: 0.3
  };

  // Create sensor icon
  const createSensorIcon = (sensor) => {
    let color = '#4CAF50'; // Active
    if (sensor.status === 'error') color = '#F44336';
    if (sensor.status === 'offline') color = '#9E9E9E';
    if (sensor.status === 'warning') color = '#FF9800';

    let iconChar = '📡';
    switch(sensor.type) {
      case 'temperature': iconChar = '🌡️'; break;
      case 'humidity': iconChar = '💧'; break;
      case 'soil_moisture': iconChar = '🌱'; break;
      case 'light_intensity': iconChar = '☀️'; break;
      case 'co2': iconChar = '💨'; break;
      case 'rainfall': iconChar = '🌧️'; break;
      case 'wind_speed': iconChar = '💨'; break;
      case 'camera': iconChar = '📷'; break;
      default: iconChar = '📡';
    }

    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          ${iconChar}
        </div>
      `,
      className: 'custom-sensor-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
  };

  // Center map on selected farm
  useEffect(() => {
    if (selectedFarm && farms.length > 0) {
      const farm = farms.find(f => f._id === selectedFarm);
      if (farm?.location?.coordinates) {
        const coords = farm.location.coordinates[0][0];
        const center = [coords[1], coords[0]];
        setMapCenter(center);
        setMapZoom(15);
        
        if (mapRef.current) {
          mapRef.current.setView(center, 15);
        }
      }
    }
  }, [selectedFarm, farms]);

  // Render farm boundaries
  const renderFarms = () => {
    return farms.map(farm => {
      if (!farm.location?.coordinates) return null;
      
      const coordinates = farm.location.coordinates[0].map(coord => [coord[1], coord[0]]);
      const isSelected = farm._id === selectedFarm;
      
      return (
        <Polygon
          key={farm._id}
          pathOptions={isSelected ? selectedFarmStyle : farmBoundaryStyle}
          positions={coordinates}
          eventHandlers={{
            click: () => onFarmSelect(farm._id)
          }}
        >
          <Popup>
            <div className="p-3 min-w-[200px]">
              <h3 className="font-bold text-lg mb-2">{farm.name}</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Status:</strong> <span className="text-green-600">{farm.status}</span></p>
                <p><strong>Size:</strong> {farm.size?.value || 'N/A'} {farm.size?.unit || ''}</p>
                <p><strong>Crops:</strong> {farm.crops?.map(c => c.name).join(', ') || 'None'}</p>
                <p><strong>Sensors:</strong> {farm.sensors?.length || 0}</p>
              </div>
              <button
                className="mt-3 w-full btn-primary text-sm py-1"
                onClick={() => onFarmSelect(farm._id)}
              >
                View Details
              </button>
            </div>
          </Popup>
        </Polygon>
      );
    });
  };

  // Render sensors
  const renderSensors = () => {
    return sensors.map(sensor => {
      if (!sensor.location) return null;
      
      return (
        <Marker
          key={sensor._id}
          position={[sensor.location.latitude, sensor.location.longitude]}
          icon={createSensorIcon(sensor)}
          eventHandlers={{
            click: () => onSensorClick(sensor)
          }}
        >
          <Popup>
            <div className="p-3 min-w-[220px]">
              <h4 className="font-bold text-lg">{sensor.name}</h4>
              <div className="mt-2 space-y-1 text-sm">
                <p><strong>Type:</strong> {sensor.type.replace('_', ' ')}</p>
                <p><strong>Value:</strong> {sensor.currentReading?.value || '--'}{sensor.currentReading?.unit}</p>
                <p><strong>Battery:</strong> {sensor.batteryLevel || '--'}%</p>
                <p><strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    sensor.status === 'active' ? 'bg-green-100 text-green-800' :
                    sensor.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {sensor.status}
                  </span>
                </p>
              </div>
            </div>
          </Popup>
        </Marker>
      );
    });
  };

  // Render soil moisture circles
  const renderSoilMoisture = () => {
    const soilSensors = sensors.filter(s => s.type === 'soil_moisture');
    
    return soilSensors.map(sensor => {
      const value = sensor.currentReading?.value || 0;
      let color = '#4CAF50'; // Good
      if (value < 30) color = '#FF9800'; // Low
      if (value < 20) color = '#F44336'; // Very low
      
      return (
        <Circle
          key={sensor._id}
          center={[sensor.location.latitude, sensor.location.longitude]}
          radius={20}
          pathOptions={{
            fillColor: color,
            color: color,
            weight: 1,
            opacity: 0.7,
            fillOpacity: 0.3
          }}
        />
      );
    });
  };

  const handleExportMap = () => {
    if (mapRef.current) {
      const mapElement = mapRef.current;
      // In a real app, you would use html2canvas or similar to export
      alert('Map export feature would be implemented here');
    }
  };

  return (
    <div className="relative">
      {/* Map Container */}
      <div 
        className="rounded-lg overflow-hidden border border-gray-200"
        style={{ height }}
      >
        <MapContainer
          ref={mapRef}
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          whenCreated={(map) => {
            mapRef.current = map;
          }}
        >
          <LayersControl position="topright">
            {/* Base Layers */}
            <BaseLayer checked name="Standard Map">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={19}
              />
            </BaseLayer>
            
            <BaseLayer name="Satellite View">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                maxZoom={19}
              />
            </BaseLayer>
            
            <BaseLayer name="Topography">
              <TileLayer
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                attribution='Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
                maxZoom={17}
              />
            </BaseLayer>
            
            <BaseLayer name="Dark Mode">
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='© OpenStreetMap contributors & CartoDB'
                maxZoom={19}
              />
            </BaseLayer>
          </LayersControl>
          
          <ZoomControl position="bottomright" />
          
          {/* Render map features */}
          {renderFarms()}
          {renderSensors()}
          {renderSoilMoisture()}
          
          {/* Custom Controls */}
          {showControls && (
            <div className="leaflet-top leaflet-right">
              <div className="leaflet-control leaflet-bar bg-white rounded-lg shadow-lg p-2 space-y-2">
                <button
                  className="p-2 hover:bg-gray-100 rounded flex items-center gap-2 text-sm"
                  onClick={handleExportMap}
                  title="Export Map"
                >
                  <FiDownload className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <button
                  className="p-2 hover:bg-gray-100 rounded flex items-center gap-2 text-sm"
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.setView([20.5937, 78.9629], 5);
                    }
                  }}
                  title="Reset View"
                >
                  <FiFilter className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-xs">
          <h4 className="font-bold text-gray-800 mb-2">Map Legend</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span>Active Farm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span>Selected Farm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border border-blue-700"></div>
              <span>Sensor Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 opacity-30"></div>
              <span>Soil Moisture Zone</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span>Critical Alert</span>
            </div>
          </div>
        </div>
      )}

      {/* Map Info Bar */}
      <div className="mt-2 text-sm text-gray-600 flex justify-between items-center">
        <div>
          <span className="font-medium">Coordinates:</span> {mapCenter[0].toFixed(6)}, {mapCenter[1].toFixed(6)}
        </div>
        <div>
          <span className="font-medium">Zoom:</span> {mapZoom}x
        </div>
        <div>
          <span className="font-medium">Farms:</span> {farms.length}
          <span className="mx-2">•</span>
          <span className="font-medium">Sensors:</span> {sensors.length}
        </div>
      </div>
    </div>
  );
};

export default FarmMap;