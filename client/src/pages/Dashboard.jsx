import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  FiDroplet, 
  FiThermometer, 
  FiSun, 
  FiWind,
  FiAlertCircle,
  FiActivity,
  FiMapPin,
  FiCalendar,
  FiMap,
  FiNavigation,
  FiZoomIn,
  FiZoomOut
} from 'react-icons/fi';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, Tooltip as MapTooltip, ZoomControl } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Custom icons for different sensor types
const createSensorIcon = (type, status) => {
  const iconSize = [30, 30];
  const iconAnchor = [15, 30];
  
  // Different colors based on status
  let color = '#4CAF50'; // Green for active
  if (status === 'warning') color = '#FF9800';
  if (status === 'error') color = '#F44336';
  if (status === 'offline') color = '#9E9E9E';
  
  // Different icons based on sensor type
  let iconChar = '📡';
  switch(type) {
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
  
  return new DivIcon({
    html: `
      <div style="
        background: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      ">
        ${iconChar}
      </div>
    `,
    className: 'custom-sensor-icon',
    iconSize: iconSize,
    iconAnchor: iconAnchor
  });
};

// Custom farm boundary icon
const farmBoundaryStyle = {
  color: '#4CAF50',
  weight: 3,
  opacity: 0.8,
  fillColor: '#4CAF50',
  fillOpacity: 0.2
};

// Irrigation zone style
const irrigationZoneStyle = {
  color: '#2196F3',
  weight: 2,
  opacity: 0.6,
  fillColor: '#2196F3',
  fillOpacity: 0.1,
  dashArray: '5, 5'
};

const Dashboard = () => {
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default: India center
  const [mapZoom, setMapZoom] = useState(5);
  const [mapLayers, setMapLayers] = useState({
    satellite: false,
    topography: false,
    hybrid: false
  });

  // Fetch user farms
  const { data: farms, isLoading: farmsLoading } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/farms`);
      return response.data.data;
    }
  });

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', selectedFarm, timeRange],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/dashboard/stats`, {
        params: {
          farmId: selectedFarm,
          timeRange
        }
      });
      return response.data.data;
    },
    enabled: !!selectedFarm
  });

  // Fetch sensors for the selected farm
  const { data: sensors, isLoading: sensorsLoading } = useQuery({
    queryKey: ['sensors', selectedFarm],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/sensors`, {
        params: { farmId: selectedFarm }
      });
      return response.data.data;
    },
    enabled: !!selectedFarm
  });

  // Set default farm and map center
  useEffect(() => {
    if (farms && farms.length > 0 && !selectedFarm) {
      const firstFarm = farms[0];
      setSelectedFarm(firstFarm._id);
      
      // Set map center to farm location
      if (firstFarm.location?.coordinates) {
        const coordinates = firstFarm.location.coordinates[0][0];
        setMapCenter([coordinates[1], coordinates[0]]);
        setMapZoom(15);
      }
    }
  }, [farms]);

  const currentFarm = farms?.find(farm => farm._id === selectedFarm);

  // Tile layer URL based on selected layer
  const getTileLayerUrl = () => {
    if (mapLayers.satellite) {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    } else if (mapLayers.topography) {
      return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
    } else if (mapLayers.hybrid) {
      return 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}';
    } else {
      // Default OpenStreetMap
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getTileLayerAttribution = () => {
    if (mapLayers.satellite) {
      return 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    } else if (mapLayers.topography) {
      return 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)';
    } else if (mapLayers.hybrid) {
      return '© Google Maps';
    } else {
      return '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
  };

  // Render farm boundary polygon
  const renderFarmBoundary = () => {
    if (!currentFarm?.location?.coordinates) return null;
    
    const coordinates = currentFarm.location.coordinates[0].map(coord => [coord[1], coord[0]]);
    
    return (
      <Polygon
        pathOptions={farmBoundaryStyle}
        positions={coordinates}
      >
        <Popup>
          <div className="p-2">
            <h3 className="font-bold text-lg">{currentFarm.name}</h3>
            <p>Type: Farm Boundary</p>
            <p>Area: {currentFarm.size?.value || 'N/A'} {currentFarm.size?.unit || ''}</p>
            <p>Status: <span className="text-green-600 font-medium">{currentFarm.status}</span></p>
          </div>
        </Popup>
      </Polygon>
    );
  };

  // Render irrigation zones
  const renderIrrigationZones = () => {
    // This would come from API in real implementation
    const demoZones = [
      {
        id: 1,
        name: 'Zone A - Vegetables',
        coordinates: [[
          [mapCenter[0] + 0.001, mapCenter[1] + 0.001],
          [mapCenter[0] + 0.001, mapCenter[1] - 0.001],
          [mapCenter[0] - 0.001, mapCenter[1] - 0.001],
          [mapCenter[0] - 0.001, mapCenter[1] + 0.001]
        ]],
        status: 'active',
        crop: 'Tomatoes'
      }
    ];

    return demoZones.map(zone => (
      <Polygon
        key={zone.id}
        pathOptions={irrigationZoneStyle}
        positions={zone.coordinates}
      >
        <Popup>
          <div className="p-2">
            <h4 className="font-bold">{zone.name}</h4>
            <p>Crop: {zone.crop}</p>
            <p>Status: <span className="text-blue-600">{zone.status}</span></p>
          </div>
        </Popup>
      </Polygon>
    ));
  };

  // Render soil moisture heatmap
  const renderSoilMoistureHeatmap = () => {
    if (!sensors || sensors.length === 0) return null;
    
    const soilMoistureSensors = sensors.filter(s => s.type === 'soil_moisture');
    
    return soilMoistureSensors.map(sensor => {
      let color = '#4CAF50'; // Good
      if (sensor.currentReading?.value < 30) color = '#FF9800'; // Low
      if (sensor.currentReading?.value < 20) color = '#F44336'; // Very low
      
      return (
        <Circle
          key={sensor._id}
          center={[sensor.location.latitude, sensor.location.longitude]}
          radius={15}
          pathOptions={{
            fillColor: color,
            color: color,
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.4
          }}
        >
          <Popup>
            <div className="p-2">
              <h4 className="font-bold">{sensor.name}</h4>
              <p>Soil Moisture: {sensor.currentReading?.value || '--'}%</p>
              <p>Status: {
                sensor.currentReading?.value > 40 ? '✅ Optimal' :
                sensor.currentReading?.value > 30 ? '⚠️ Low' : '❌ Very Low'
              }</p>
            </div>
          </Popup>
        </Circle>
      );
    });
  };

  if (farmsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Dashboard</h1>
          <p className="text-gray-600">
            {currentFarm ? `Monitoring ${currentFarm.name}` : 'Select a farm to view data'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Farm Selector */}
          <select
            value={selectedFarm || ''}
            onChange={(e) => {
              const farmId = e.target.value;
              setSelectedFarm(farmId);
              const farm = farms.find(f => f._id === farmId);
              if (farm?.location?.coordinates) {
                const coords = farm.location.coordinates[0][0];
                setMapCenter([coords[1], coords[0]]);
                setMapZoom(15);
              }
            }}
            className="input-field max-w-xs"
          >
            <option value="">Select a farm</option>
            {farms?.map(farm => (
              <option key={farm._id} value={farm._id}>{farm.name}</option>
            ))}
          </select>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input-field max-w-xs"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {!selectedFarm ? (
        <div className="card text-center py-12">
          <FiMapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Farm Selected</h3>
          <p className="text-gray-600 mb-6">Select a farm from the dropdown to view monitoring data</p>
          <button className="btn-primary">Add New Farm</button>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Temperature</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.currentReadings?.temperature || '--'}°C
                  </p>
                </div>
                <FiThermometer className="w-10 h-10 text-red-500" />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <span className="text-green-500">+2°C</span> from yesterday
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Soil Moisture</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.currentReadings?.soil_moisture || '--'}%
                  </p>
                </div>
                <FiDroplet className="w-10 h-10 text-blue-500" />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Irrigation {stats?.irrigationStatus || 'Idle'}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Humidity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.currentReadings?.humidity || '--'}%
                  </p>
                </div>
                <FiWind className="w-10 h-10 text-green-500" />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Ideal for crop growth
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.activeAlerts || 0}
                  </p>
                </div>
                <FiAlertCircle className="w-10 h-10 text-yellow-500" />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {stats?.criticalAlerts || 0} critical
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Farm Map & Sensors</h3>
              
              <div className="flex flex-wrap gap-2">
                {/* Map Layer Controls */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
                  <button
                    onClick={() => setMapLayers({ satellite: false, topography: false, hybrid: false })}
                    className={`px-3 py-1 rounded ${!mapLayers.satellite && !mapLayers.topography && !mapLayers.hybrid ? 'bg-white shadow' : ''}`}
                    title="Standard Map"
                  >
                    <FiMap className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setMapLayers({ satellite: true, topography: false, hybrid: false })}
                    className={`px-3 py-1 rounded ${mapLayers.satellite ? 'bg-white shadow' : ''}`}
                    title="Satellite View"
                  >
                    <FiSun className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setMapLayers({ satellite: false, topography: true, hybrid: false })}
                    className={`px-3 py-1 rounded ${mapLayers.topography ? 'bg-white shadow' : ''}`}
                    title="Topography"
                  >
                    <FiNavigation className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Legend */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Active Sensor</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Alert</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-700"></div>
                    <span>Irrigation Zone</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url={getTileLayerUrl()}
                  attribution={getTileLayerAttribution()}
                  maxZoom={19}
                />
                
                <ZoomControl position="topright" />
                
                {/* Farm Boundary */}
                {renderFarmBoundary()}
                
                {/* Irrigation Zones */}
                {renderIrrigationZones()}
                
                {/* Soil Moisture Heatmap */}
                {renderSoilMoistureHeatmap()}
                
                {/* Sensor Markers */}
                {sensors?.map(sensor => {
                  // Determine sensor status
                  let status = 'active';
                  if (sensor.status === 'error' || sensor.status === 'offline') status = 'error';
                  if (sensor.currentReading?.value < sensor.configuration?.minThreshold) status = 'warning';
                  if (sensor.currentReading?.value > sensor.configuration?.maxThreshold) status = 'warning';
                  
                  return (
                    <Marker
                      key={sensor._id}
                      position={[sensor.location.latitude, sensor.location.longitude]}
                      icon={createSensorIcon(sensor.type, status)}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <h4 className="font-bold text-lg">{sensor.name}</h4>
                          <div className="mt-2 space-y-1">
                            <p><strong>Type:</strong> {sensor.type.replace('_', ' ')}</p>
                            <p><strong>Value:</strong> {sensor.currentReading?.value || '--'}{sensor.currentReading?.unit}</p>
                            <p><strong>Status:</strong> 
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                status === 'active' ? 'bg-green-100 text-green-800' :
                                status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {sensor.status}
                              </span>
                            </p>
                            <p><strong>Battery:</strong> {sensor.batteryLevel || '--'}%</p>
                            <p><strong>Last Update:</strong> {
                              sensor.currentReading?.timestamp 
                                ? new Date(sensor.currentReading.timestamp).toLocaleTimeString()
                                : '--'
                            }</p>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <button 
                              className="w-full btn-primary text-sm py-1"
                              onClick={() => console.log('View sensor details:', sensor._id)}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                
                {/* Map Controls */}
                <div className="leaflet-bottom leaflet-right">
                  <div className="leaflet-control leaflet-bar bg-white p-2 rounded shadow">
                    <div className="text-xs text-gray-600">
                      <strong>Farm Area:</strong> {currentFarm?.size?.value || 'N/A'} {currentFarm?.size?.unit || ''}
                    </div>
                    <div className="text-xs text-gray-600">
                      <strong>Sensors:</strong> {sensors?.length || 0} active
                    </div>
                  </div>
                </div>
              </MapContainer>
            </div>
            
            {/* Map Info */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800">Farm Coordinates</h4>
                <p className="text-sm text-blue-600 mt-1">
                  {mapCenter[0].toFixed(6)}, {mapCenter[1].toFixed(6)}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800">Map Layers</h4>
                <p className="text-sm text-green-600 mt-1">
                  {mapLayers.satellite ? 'Satellite View' : 
                   mapLayers.topography ? 'Topography View' : 
                   'Standard Map View'}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800">Sensor Coverage</h4>
                <p className="text-sm text-purple-600 mt-1">
                  {sensors?.filter(s => s.status === 'active').length || 0} of {sensors?.length || 0} sensors active
                </p>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Temperature Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Temperature Trends</h3>
              <div className="h-64">
                <Line
                  data={{
                    labels: ['6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'],
                    datasets: [{
                      label: 'Temperature (°C)',
                      data: [22, 24, 27, 30, 32, 30, 28],
                      borderColor: 'rgb(239, 68, 68)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      fill: true,
                      tension: 0.4
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: true }
                    },
                    scales: {
                      y: {
                        beginAtZero: false,
                        title: {
                          display: true,
                          text: '°C'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Soil Moisture Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Soil Moisture Levels</h3>
              <div className="h-64">
                <Bar
                  data={{
                    labels: ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
                    datasets: [{
                      label: 'Soil Moisture (%)',
                      data: [42, 38, 45, 35, 50],
                      backgroundColor: [
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(34, 197, 94, 0.7)'
                      ],
                      borderColor: [
                        'rgb(59, 130, 246)',
                        'rgb(59, 130, 246)',
                        'rgb(59, 130, 246)',
                        'rgb(239, 68, 68)',
                        'rgb(34, 197, 94)'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                          display: true,
                          text: '% Moisture'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sensor Details Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sensor Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sensor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Battery</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Update</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sensorsLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center">
                        Loading sensors...
                      </td>
                    </tr>
                  ) : sensors?.length > 0 ? (
                    sensors.map(sensor => (
                      <tr key={sensor._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{sensor.name}</div>
                              <div className="text-sm text-gray-500">{sensor.deviceId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {sensor.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {sensor.currentReading?.value || '--'}
                            <span className="text-gray-500 ml-1">{sensor.currentReading?.unit}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            sensor.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : sensor.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sensor.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  sensor.batteryLevel > 60 ? 'bg-green-500' :
                                  sensor.batteryLevel > 30 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${sensor.batteryLevel || 0}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-sm text-gray-900">{sensor.batteryLevel || '--'}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sensor.currentReading?.timestamp
                            ? new Date(sensor.currentReading.timestamp).toLocaleTimeString()
                            : '--'
                          }
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No sensors found for this farm
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;