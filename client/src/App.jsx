import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import MapDashboard from './pages/MapDashboard'
import TemplatesReference from './pages/TemplatesReference'
import { FiMap, FiBook, FiArrowRight } from 'react-icons/fi'

/**
 * Home Page Component
 */
function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Agri360</h1>
          <p className="text-xl text-blue-100 mb-8">
            Advanced Farm Management & Real-time Monitoring System
          </p>
          <p className="text-blue-200 max-w-2xl mx-auto mb-8">
            Interactive mapping with IoT sensors, GPS tracking, weather integration, and terrain analysis
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Active Dashboard Card */}
          <Link
            to="/map-dashboard"
            className="group bg-white rounded-lg shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <FiMap className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Live Dashboard</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Experience the fully functional map dashboard with all features enabled. See real-time data visualization, GPS tracking, weather overlays, and more.
            </p>
            <div className="flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-4 transition-all">
              Open Dashboard
              <FiArrowRight className="w-5 h-5" />
            </div>
          </Link>

          {/* Templates & Architecture Card */}
          <Link
            to="/templates"
            className="group bg-white rounded-lg shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                <FiBook className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Templates & Guide</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Visual reference for project architecture, component structure, data flow, and best practices. Perfect for understanding the codebase.
            </p>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold group-hover:gap-4 transition-all">
              View Architecture
              <FiArrowRight className="w-5 h-5" />
            </div>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-8 text-white">
          <h3 className="text-2xl font-bold mb-6">Project Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Interactive Maps', emoji: '🗺️' },
              { label: 'GPS Tracking', emoji: '📍' },
              { label: 'Weather Data', emoji: '🌤️' },
              { label: 'Zone Management', emoji: '🎯' },
              { label: 'Elevation Analysis', emoji: '⛰️' },
              { label: 'Sensor Heatmaps', emoji: '🔥' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-2xl">{feature.emoji}</span>
                <span>{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map-dashboard" element={<MapDashboard />} />
        <Route path="/templates" element={<TemplatesReference />} />
      </Routes>
    </Router>
  )
}

export default App
