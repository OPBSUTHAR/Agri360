/**
 * ===================================================================
 * AGRI360 - MAP DASHBOARD TEMPLATE / BLUEPRINT
 * ===================================================================
 * 
 * This file serves as a project blueprint showing the core structure
 * and data flow of the Agri360 application.
 * 
 * PROJECT OVERVIEW:
 * - Farm management & real-time monitoring system
 * - Interactive maps with IoT sensor data visualization
 * - GPS tracking, weather integration, terrain analysis
 * - Multi-feature tabbed interface
 * 
 * ===================================================================
 */

import React, { useState, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FiMap, FiNavigation, FiCloud, FiThermometer, FiLayers, FiActivity, FiZap } from 'react-icons/fi';

// ===================================================================
// 1. LAZY-LOADED COMPONENTS (Code Splitting for Performance)
// ===================================================================
// These heavy components load only when their tab is clicked
const EnhancedFarmMap = lazy(() => import('../components/map/EnhancedFarmMap'));
const GpsTracking = lazy(() => import('../components/map/GpsTracking'));
const WeatherOverlay = lazy(() => import('../components/map/WeatherOverlay'));
// TODO: Uncomment when ready to add these features
// const ZoneManager = lazy(() => import('../components/map/ZoneManager'));
// const ElevationAnalysis = lazy(() => import('../components/map/ElevationAnalysis'));

// ===================================================================
// 2. MAIN COMPONENT: MapDashboard
// ===================================================================
const MapDashboard = () => {
  // ---------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------
  const [activeTab, setActiveTab] = useState('overview');        // Current active tab
  const [selectedFarm, setSelectedFarm] = useState(null);        // Selected farm ID
  const [zones, setZones] = useState([]);                        // Farm zones (crops, irrigation areas)

  // ---------------------------------------------------------------
  // DATA FETCHING (React Query for caching & state management)
  // ---------------------------------------------------------------
  
  // Fetch all farms from API
  const { data: farms, isLoading: farmsLoading } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/farms`);
      return response.data.data;
    }
  });

  // Fetch sensors for selected farm
  const { data: sensors } = useQuery({
    queryKey: ['sensors', selectedFarm],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/sensors`, {
        params: { farmId: selectedFarm }
      });
      return response.data.data;
    },
    enabled: !!selectedFarm // Only run query if farm is selected
  });

  // ---------------------------------------------------------------
  // EVENT HANDLERS (Zone Management)
  // ---------------------------------------------------------------
  const handleZoneCreated = (zone) => {
    setZones(prev => [...prev, zone]);
  };

  const handleZoneUpdate = (updatedZone) => {
    setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z));
  };

  const handleZoneDelete = (zoneId) => {
    setZones(prev => prev.filter(z => z.id !== zoneId));
  };

  // ---------------------------------------------------------------
  // TAB CONFIGURATION (Dynamic Feature Tabs)
  // ---------------------------------------------------------------
  const mapTabs = [
    {
      id: 'overview',
      name: 'Overview Map',
      icon: <FiMap />,
      component: (
        <Suspense fallback={<LoadingPlaceholder text="Loading map..." />}>
          <EnhancedFarmMap
            farms={farms || []}
            sensors={sensors || []}
            selectedFarm={selectedFarm}
            onFarmSelect={setSelectedFarm}
            onZoneCreated={handleZoneCreated}
            zones={zones}
            height="600px"
            activeFeatures={{
              heatmap: true,      // Sensor data heatmap
              routing: true,      // Route optimization
              drawing: true,      // Zone drawing tools
              weather: true,      // Weather overlay
              elevation: false,   // Elevation profile
              gps: true          // GPS tracking
            }}
          />
        </Suspense>
      )
    },
    {
      id: 'gps',
      name: 'GPS Tracking',
      icon: <FiNavigation />,
      component: (
        <Suspense fallback={<LoadingPlaceholder text="Loading GPS..." />}>
          <GpsTracking
            devices={[
              { id: '1', name: 'Tractor-1', type: 'tractor', online: true, position: { lat: 20.5937, lng: 78.9629 }, speed: 15, battery: 85 },
              { id: '2', name: 'Harvester-1', type: 'harvester', online: true, position: { lat: 20.5950, lng: 78.9600 }, speed: 20, battery: 65 },
              { id: '3', name: 'Drone-1', type: 'drone', online: false, position: { lat: 20.5920, lng: 78.9650 }, speed: 0, battery: 30 }
            ]}
            realTime={false}
          />
        </Suspense>
      )
    },
    {
      id: 'weather',
      name: 'Weather',
      icon: <FiCloud />,
      component: (
        <Suspense fallback={<LoadingPlaceholder text="Loading weather..." />}>
          <WeatherOverlay
            location={selectedFarm && farms?.find(f => f._id === selectedFarm)?.location 
              ? { 
                  lat: farms.find(f => f._id === selectedFarm).location.coordinates[0][0][1], 
                  lng: farms.find(f => f._id === selectedFarm).location.coordinates[0][0][0] 
                }
              : { lat: 20.5937, lng: 78.9629 }
            }
            autoUpdate={false}
          />
        </Suspense>
      )
    }
    // TODO: Uncomment to add more features
    // {
    //   id: 'zones',
    //   name: 'Zone Manager',
    //   icon: <FiTarget />,
    //   component: <ZoneManager ... />
    // },
    // {
    //   id: 'elevation',
    //   name: 'Elevation Analysis',
    //   icon: <FiTrendingUp />,
    //   component: <ElevationAnalysis ... />
    // }
  ];

  // ---------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------
  if (farmsLoading) {
    return <LoadingSpinner />;
  }

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* HEADER SECTION */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Map Features</h1>
          <p className="text-gray-600">
            Interactive mapping with heatmaps, GPS tracking, weather overlays, and terrain analysis
          </p>
        </div>
        
        {/* Farm Selector Dropdown */}
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

      {/* ============================================================ */}
      {/* TAB NAVIGATION */}
      {/* ============================================================ */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {mapTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                transition-colors duration-200
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

      {/* ============================================================ */}
      {/* ACTIVE TAB CONTENT */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg shadow">
        <Suspense fallback={<LoadingPlaceholder text="Loading feature..." />}>
          {mapTabs.find(tab => tab.id === activeTab)?.component}
        </Suspense>
      </div>

      {/* ============================================================ */}
      {/* QUICK STATISTICS CARDS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FiThermometer className="w-6 h-6" />} title="Sensors Active" value={sensors?.length || 0} color="blue" />
        <StatCard icon={<FiLayers className="w-6 h-6" />} title="Zones Created" value={zones.length} color="green" />
        <StatCard icon={<FiActivity className="w-6 h-6" />} title="GPS Devices" value={3} color="purple" />
        <StatCard icon={<FiZap className="w-6 h-6" />} title="Map Features" value={mapTabs.length} color="orange" />
      </div>

      {/* ============================================================ */}
      {/* FEATURES GUIDE */}
      {/* ============================================================ */}
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
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// 3. HELPER COMPONENTS
// ===================================================================

// Reusable Loading Spinner
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Loading Placeholder
function LoadingPlaceholder({ text = "Loading..." }) {
  return <div className="p-6 text-center text-gray-600">{text}</div>;
}

// Reusable Statistic Card
function StatCard({ icon, title, value, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Feature Card
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="font-bold mb-1">{title}</h4>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  );
}

// ===================================================================
// EXPORT
// ===================================================================
export default MapDashboard;

/**
 * ===================================================================
 * ARCHITECTURE NOTES
 * ===================================================================
 * 
 * 1. COMPONENT STRUCTURE:
 *    - MapDashboard (main container)
 *    ├─ EnhancedFarmMap (lazy-loaded)
 *    ├─ GpsTracking (lazy-loaded)
 *    ├─ WeatherOverlay (lazy-loaded)
 *    └─ ZoneManager, ElevationAnalysis (TODO)
 * 
 * 2. DATA FLOW:
 *    API → useQuery (React Query) → State → Components
 *    - Farms list fetched on mount
 *    - Sensors fetched when farm selected
 *    - Zones managed locally
 * 
 * 3. PERFORMANCE OPTIMIZATIONS:
 *    - React.lazy() for code splitting
 *    - Suspense for loading states
 *    - React Query for caching
 *    - Conditional API calls (enabled: !!selectedFarm)
 * 
 * 4. STATE MANAGEMENT:
 *    - Local state (useState) for UI
 *    - React Query for server data
 *    - No Redux/Context needed (yet)
 * 
 * 5. STYLING:
 *    - Tailwind CSS for all styles
 *    - React Icons for SVG icons
 *    - Consistent color scheme
 * 
 * 6. EXTENSIBILITY:
 *    - Add more tabs by adding to mapTabs array
 *    - Lazy-load new components for performance
 *    - Reusable helper components (StatCard, FeatureCard)
 * 
 * ===================================================================
 */
