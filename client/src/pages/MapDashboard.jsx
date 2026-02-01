import React, { useState, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  FiMap, 
  FiNavigation, 
  FiThermometer, 
  FiDroplet, 
  FiWind,
  FiCloud,
  FiTarget,
  FiTrendingUp,
  FiLayers,
  FiGrid,
  FiActivity,
  FiZap
} from 'react-icons/fi';
// Lazy-load heavy map components for faster startup and HMR
const EnhancedFarmMap = lazy(() => import('../components/map/EnhancedFarmMap'));
const GpsTracking = lazy(() => import('../components/map/GpsTracking'));
const WeatherOverlay = lazy(() => import('../components/map/WeatherOverlay'));

// import ZoneManager from '../components/map/ZoneManager';
// import ElevationAnalysis from '../components/map/ElevationAnalysis';

const MapDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [selectedSensors, setSelectedSensors] = useState([]);
  const [zones, setZones] = useState([]);

  // Fetch farms
  const { data: farms, isLoading: farmsLoading } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/farms`);
      return response.data.data;
    }
  });

  // Fetch sensors
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

  // Handle zone creation
  const handleZoneCreated = (zone) => {
    setZones(prev => [...prev, zone]);
  };

  // Handle zone update
  const handleZoneUpdate = (updatedZone) => {
    setZones(prev => prev.map(zone => 
      zone.id === updatedZone.id ? updatedZone : zone
    ));
  };

  // Handle zone delete
  const handleZoneDelete = (zoneId) => {
    setZones(prev => prev.filter(zone => zone.id !== zoneId));
  };

  // Map feature tabs
  // Re-enable EnhancedFarmMap and GpsTracking tabs for incremental testing
  const mapTabs = [
    { id: 'overview', name: 'Overview Map', icon: <FiMap />, component: (
      <EnhancedFarmMap
        farms={farms || []}
        sensors={sensors || []}
        selectedFarm={selectedFarm}
        onFarmSelect={setSelectedFarm}
        onZoneCreated={handleZoneCreated}
        zones={zones}
        height="600px"
        activeFeatures={{
          heatmap: true,
          routing: true,
          drawing: true,
          weather: true,
          elevation: false,
          gps: true
        }}
      />
    )},
    { id: 'gps', name: 'GPS Tracking', icon: <FiNavigation />, component: (
      <GpsTracking
        devices={[
          { id: '1', name: 'Tractor-1', type: 'tractor', online: true, position: { lat: 20.5937, lng: 78.9629 }, speed: 15, battery: 85 },
          { id: '2', name: 'Harvester-1', type: 'harvester', online: true, position: { lat: 20.5950, lng: 78.9600 }, speed: 20, battery: 65 },
          { id: '3', name: 'Drone-1', type: 'drone', online: false, position: { lat: 20.5920, lng: 78.9650 }, speed: 0, battery: 30 }
        ]}
        realTime={false}
      />
    )},
    { id: 'weather', name: 'Weather', icon: <FiCloud />, component: (
      <WeatherOverlay
        location={selectedFarm && farms?.find(f => f._id === selectedFarm)?.location 
          ? { lat: farms.find(f => f._id === selectedFarm).location.coordinates[0][0][1], 
              lng: farms.find(f => f._id === selectedFarm).location.coordinates[0][0][0] }
          : { lat: 20.5937, lng: 78.9629 }}
        autoUpdate={false}
      />
    )}
  ];

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
          <h1 className="text-2xl font-bold text-gray-900">Advanced Map Features</h1>
          <p className="text-gray-600">
            Interactive mapping with heatmaps, GPS tracking, weather overlays, and terrain analysis
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Farm Selector */}
          <select
            value={selectedFarm || ''}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="input-field max-w-xs"
          >
            <option value="">Select a farm</option>
            {farms?.map(farm => (
              <option key={farm._id} value={farm._id}>{farm.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Feature Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {mapTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Active Tab Content */}
      <div className="bg-white rounded-lg shadow">
        <Suspense fallback={<div className="p-6 text-center">Loading feature...</div>}>
          {mapTabs.find(tab => tab.id === activeTab)?.component}
        </Suspense>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiThermometer className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sensors Active</p>
              <p className="text-xl font-bold">{sensors?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiLayers className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Zones Created</p>
              <p className="text-xl font-bold">{zones.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiActivity className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">GPS Devices</p>
              <p className="text-xl font-bold">3</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FiZap className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Map Features</p>
              <p className="text-xl font-bold">{mapTabs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Descriptions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold text-lg mb-4">Map Features Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: '🔥', title: 'Heatmaps', desc: 'Visualize sensor data distribution across the farm' },
            { icon: '📍', title: 'GPS Tracking', desc: 'Real-time tracking of farm equipment and vehicles' },
            { icon: '🌤️', title: 'Weather Overlays', desc: 'Live weather data and forecasts on the map' },
            { icon: '🗺️', title: 'Zone Management', desc: 'Create and manage farm zones with custom properties' },
            { icon: '⛰️', title: 'Elevation Analysis', desc: 'Terrain analysis and slope calculations' },
            { icon: '🛣️', title: 'Routing', desc: 'Calculate optimal routes between farm points' },
          ].map(feature => (
            <div key={feature.title} className="p-4 border border-gray-200 rounded-lg">
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h4 className="font-bold mb-1">{feature.title}</h4>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapDashboard;