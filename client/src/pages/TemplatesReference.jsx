import React from 'react';
import { Link } from 'react-router-dom';
import { FiMap, FiFileText, FiArrowRight, FiBook, FiLayout } from 'react-icons/fi';

/**
 * Templates Reference Page
 * Shows blueprint/template structure of both MapDashboard and EnhancedFarmMap
 * Helps developers understand project architecture
 */

const TemplatesReference = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-4">
          <FiBook className="w-8 h-8 text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-900">Project Templates & Architecture</h1>
        </div>
        <p className="text-lg text-gray-600">
          Visual reference for Agri360 component structure and data flow
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* MapDashboard Template */}
          <TemplateCard
            icon={<FiLayout className="w-8 h-8" />}
            title="MapDashboard Template"
            description="Main dashboard container with tabbed interface for map features"
            features={[
              'Lazy-loaded map components',
              'React Query for data fetching',
              'Farm selector dropdown',
              'Multiple feature tabs',
              'Real-time statistics',
            ]}
            color="blue"
            route="/map-dashboard"
            buttonText="View Active Dashboard"
          />

          {/* Blueprint/Architecture Template */}
          <TemplateCard
            icon={<FiBook className="w-8 h-8" />}
            title="Architecture Blueprint"
            description="Detailed commented template showing project structure and best practices"
            features={[
              'Component architecture diagram',
              'Data flow documentation',
              'Performance optimization notes',
              'Reusable helper components',
              'Extensibility guidelines',
            ]}
            color="indigo"
            showCode={true}
          />
        </div>

        {/* Architecture Overview Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Component Architecture</h2>
          
          <div className="space-y-6">
            {/* MapDashboard Structure */}
            <div className="border-l-4 border-blue-500 pl-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">MapDashboard Hierarchy</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
{`MapDashboard (Main Container)
├── Header Section
│   ├── Title & Description
│   └── Farm Selector Dropdown
├── Tab Navigation
│   ├── Overview Map
│   ├── GPS Tracking
│   └── Weather Overlay
├── Active Tab Content
│   ├── EnhancedFarmMap (Lazy)
│   ├── GpsTracking (Lazy)
│   └── WeatherOverlay (Lazy)
├── Statistics Cards
│   ├── Sensors Active
│   ├── Zones Created
│   ├── GPS Devices
│   └── Map Features
└── Features Guide
    └── Feature Cards (Grid Layout)`}
              </pre>
            </div>

            {/* Data Flow */}
            <div className="border-l-4 border-green-500 pl-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Flow</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
{`API Endpoints
    ↓
useQuery (React Query)
    ↓
Component State
    ↓
Props to Child Components
    ↓
UI Rendering

Example:
GET /farms → farms state → Farm selector
GET /sensors → sensors state → EnhancedFarmMap props`}
              </pre>
            </div>

            {/* Performance Strategies */}
            <div className="border-l-4 border-purple-500 pl-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance Optimizations</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-50 p-4 rounded">
                  <h4 className="font-semibold text-purple-900 mb-2">Code Splitting</h4>
                  <p className="text-sm text-purple-700">React.lazy() for heavy map components reduces initial bundle</p>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-semibold text-blue-900 mb-2">Caching</h4>
                  <p className="text-sm text-blue-700">React Query caches API responses automatically</p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <h4 className="font-semibold text-green-900 mb-2">Conditional Loading</h4>
                  <p className="text-sm text-green-700">Queries only run when dependencies change</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Code Comparison */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Implementation Patterns</h2>
          
          <div className="space-y-8">
            {/* Lazy Loading Pattern */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm">1</span>
                Lazy Loading Components
              </h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
{`// Import with lazy
const EnhancedFarmMap = lazy(() => 
  import('../components/map/EnhancedFarmMap')
);

// Use with Suspense
<Suspense fallback={<div>Loading...</div>}>
  <EnhancedFarmMap {...props} />
</Suspense>`}
              </pre>
            </div>

            {/* React Query Pattern */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm">2</span>
                React Query for Data Fetching
              </h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
{`const { data: farms, isLoading } = useQuery({
  queryKey: ['farms'],
  queryFn: async () => {
    const res = await axios.get('/farms');
    return res.data.data;
  }
});`}
              </pre>
            </div>

            {/* Tab Management Pattern */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-sm">3</span>
                Dynamic Tab System
              </h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
{`const mapTabs = [
  { 
    id: 'overview', 
    name: 'Overview Map', 
    icon: <FiMap />,
    component: <EnhancedFarmMap {...props} />
  },
  // ... more tabs
];

// Render active tab
mapTabs.find(t => t.id === activeTab)?.component`}
              </pre>
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              to="/" 
              className="flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
            >
              <span className="font-semibold text-gray-900">← Home</span>
              <FiArrowRight className="w-5 h-5 text-gray-400" />
            </Link>
            
            <Link 
              to="/map-dashboard" 
              className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-300 transition-all"
            >
              <span className="font-semibold text-blue-900">Active Dashboard →</span>
              <FiArrowRight className="w-5 h-5 text-blue-600" />
            </Link>

            <button 
              onClick={() => {
                const element = document.getElementById('blueprint');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-300 transition-all"
            >
              <span className="font-semibold text-indigo-900">Blueprint ↓</span>
              <FiArrowRight className="w-5 h-5 text-indigo-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Reusable Template Card Component
 */
function TemplateCard({ 
  icon, 
  title, 
  description, 
  features, 
  color = 'blue',
  route,
  buttonText,
  showCode = false
}) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      button: 'bg-blue-600 hover:bg-blue-700',
      icon: 'text-blue-600'
    },
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-900',
      button: 'bg-indigo-600 hover:bg-indigo-700',
      icon: 'text-indigo-600'
    }
  };

  const colors = colorMap[color];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-8 transition-all hover:shadow-lg`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={colors.icon}>{icon}</div>
        <h3 className={`text-xl font-bold ${colors.text}`}>{title}</h3>
      </div>
      
      <p className="text-gray-700 mb-6">{description}</p>
      
      <div className="mb-6">
        <h4 className={`font-semibold ${colors.text} mb-3`}>Key Features:</h4>
        <ul className="space-y-2">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-gray-700">
              <span className={`w-1.5 h-1.5 rounded-full ${colors.icon} bg-current`}></span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
      
      {route ? (
        <Link 
          to={route}
          className={`${colors.button} text-white px-6 py-2 rounded-lg font-semibold transition-colors inline-flex items-center gap-2`}
        >
          {buttonText} <FiArrowRight className="w-4 h-4" />
        </Link>
      ) : (
        <a 
          href="#blueprint"
          className={`${colors.button} text-white px-6 py-2 rounded-lg font-semibold transition-colors inline-flex items-center gap-2`}
        >
          View Blueprint <FiArrowRight className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}

export default TemplatesReference;
