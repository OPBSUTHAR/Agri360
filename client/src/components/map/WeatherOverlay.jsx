import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { 
  FiCloud, 
  FiThermometer, 
  FiWind, 
  FiDroplet, 
  FiSun, 
  FiSunrise, 
  FiSunset,
  FiAlertTriangle,
  FiRefreshCw 
} from 'react-icons/fi';
import axios from 'axios';
import { format } from 'date-fns';

// Weather Overlay Component
const WeatherOverlay = ({ 
  apiKey = null,
  location = { lat: 20.5937, lng: 78.9629 },
  autoUpdate = true,
  updateInterval = 300000 // 5 minutes
}) => {
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [radarData, setRadarData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLayers, setActiveLayers] = useState({
    temperature: true,
    precipitation: true,
    wind: true,
    pressure: false,
    humidity: false
  });

  // Fetch weather data
  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      
      // In production, use actual weather API
      // For demo, use mock data
      const mockWeather = {
        current: {
          temp: 25 + (Math.random() * 10 - 5),
          feels_like: 26,
          humidity: 65 + (Math.random() * 20 - 10),
          pressure: 1013,
          wind_speed: 15 + (Math.random() * 10),
          wind_deg: 45 + (Math.random() * 180),
          weather: [{
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d'
          }],
          rain: { '1h': Math.random() * 5 },
          clouds: Math.random() * 100,
          uvi: 6,
          visibility: 10000,
          dt: Date.now() / 1000
        },
        hourly: Array.from({ length: 24 }, (_, i) => ({
          dt: Date.now() / 1000 + i * 3600,
          temp: 20 + Math.sin(i / 24 * Math.PI) * 10,
          humidity: 60 + Math.random() * 20,
          wind_speed: 10 + Math.random() * 10,
          rain: { '1h': Math.random() * 2 }
        })),
        daily: Array.from({ length: 7 }, (_, i) => ({
          dt: Date.now() / 1000 + i * 86400,
          temp: {
            day: 25 + Math.random() * 5,
            min: 15 + Math.random() * 5,
            max: 30 + Math.random() * 5
          },
          humidity: 60 + Math.random() * 20,
          wind_speed: 10 + Math.random() * 10,
          rain: Math.random() * 10,
          weather: [{
            id: [800, 801, 802, 803, 804][Math.floor(Math.random() * 5)],
            main: ['Clear', 'Clouds', 'Rain', 'Thunderstorm'][Math.floor(Math.random() * 4)],
            description: 'variable conditions'
          }]
        })),
        alerts: Math.random() > 0.7 ? [{
          event: 'Heat Wave',
          description: 'High temperature warning',
          start: Date.now() / 1000,
          end: Date.now() / 1000 + 86400
        }] : []
      };

      setWeatherData(mockWeather.current);
      setForecastData(mockWeather.daily);
      setAlerts(mockWeather.alerts);
      
      // Generate radar data
      const radarPoints = Array.from({ length: 50 }, () => ({
        lat: location.lat + (Math.random() - 0.5) * 0.5,
        lng: location.lng + (Math.random() - 0.5) * 0.5,
        intensity: Math.random(),
        type: Math.random() > 0.7 ? 'rain' : Math.random() > 0.5 ? 'snow' : 'hail'
      }));
      setRadarData(radarPoints);
      
    } catch (error) {
      console.error('Error fetching weather data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-update weather data
  useEffect(() => {
    fetchWeatherData();
    
    if (autoUpdate) {
      const interval = setInterval(fetchWeatherData, updateInterval);
      return () => clearInterval(interval);
    }
  }, [location, autoUpdate, updateInterval]);

  // Render temperature layer
  const renderTemperatureLayer = () => {
    if (!weatherData || !activeLayers.temperature) return null;
    
    return (
      <Circle
        center={[location.lat, location.lng]}
        radius={5000}
        pathOptions={{
          fillColor: getTemperatureColor(weatherData.temp),
          color: getTemperatureColor(weatherData.temp),
          weight: 1,
          opacity: 0.7,
          fillOpacity: 0.3
        }}
      >
        <Popup>
          <div className="p-3 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <FiThermometer className="text-red-500" />
              <h4 className="font-bold">Temperature</h4>
            </div>
            <div className="text-2xl font-bold">{weatherData.temp.toFixed(1)}°C</div>
            <div className="text-sm text-gray-600 mt-1">
              Feels like: {weatherData.feels_like}°C
            </div>
          </div>
        </Popup>
      </Circle>
    );
  };

  // Render precipitation layer
  const renderPrecipitationLayer = () => {
    if (!weatherData || !activeLayers.precipitation) return null;
    
    const rain = weatherData.rain?.['1h'] || 0;
    
    return (
      <Circle
        center={[location.lat, location.lng]}
        radius={rain * 1000} // Scale radius based on rainfall
        pathOptions={{
          fillColor: '#2196F3',
          color: '#2196F3',
          weight: 1,
          opacity: 0.6,
          fillOpacity: 0.2
        }}
      >
        <Popup>
          <div className="p-3 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <FiDroplet className="text-blue-500" />
              <h4 className="font-bold">Precipitation</h4>
            </div>
            <div className="text-2xl font-bold">{rain.toFixed(1)} mm</div>
            <div className="text-sm text-gray-600 mt-1">
              Last hour | Humidity: {weatherData.humidity}%
            </div>
          </div>
        </Popup>
      </Circle>
    );
  };

  // Render wind layer
  const renderWindLayer = () => {
    if (!weatherData || !activeLayers.wind) return null;
    
    const windSpeed = weatherData.wind_speed;
    const windDirection = weatherData.wind_deg;
    
    // Create wind arrow
    const arrowEndLat = location.lat + Math.sin(windDirection * Math.PI / 180) * 0.01;
    const arrowEndLng = location.lng + Math.cos(windDirection * Math.PI / 180) * 0.01;
    
    return (
      <React.Fragment>
        <Circle
          center={[location.lat, location.lng]}
          radius={windSpeed * 100} // Scale based on wind speed
          pathOptions={{
            fillColor: '#FF9800',
            color: '#FF9800',
            weight: 1,
            opacity: 0.5,
            fillOpacity: 0.1
          }}
        />
        {/* Wind direction arrow would be implemented here */}
      </React.Fragment>
    );
  };

  // Render radar layer
  const renderRadarLayer = () => {
    if (!radarData || !activeLayers.precipitation) return null;
    
    return radarData.map((point, index) => (
      <Circle
        key={index}
        center={[point.lat, point.lng]}
        radius={point.intensity * 2000}
        pathOptions={{
          fillColor: getPrecipitationColor(point.type, point.intensity),
          color: getPrecipitationColor(point.type, point.intensity),
          weight: 0,
          opacity: 0.3,
          fillOpacity: point.intensity * 0.5
        }}
      />
    ));
  };

  // Render weather alerts
  const renderAlertLayer = () => {
    return alerts.map((alert, index) => (
      <Circle
        key={index}
        center={[location.lat, location.lng]}
        radius={10000}
        pathOptions={{
          fillColor: '#F44336',
          color: '#F44336',
          weight: 3,
          opacity: 0.8,
          fillOpacity: 0.1,
          dashArray: '10, 10'
        }}
      >
        <Popup>
          <div className="p-3 min-w-[250px]">
            <div className="flex items-center gap-2 mb-2">
              <FiAlertTriangle className="text-red-500" />
              <h4 className="font-bold text-red-700">{alert.event}</h4>
            </div>
            <p className="text-sm">{alert.description}</p>
            <div className="mt-2 text-xs text-gray-600">
              From: {format(new Date(alert.start * 1000), 'PPpp')}<br/>
              To: {format(new Date(alert.end * 1000), 'PPpp')}
            </div>
          </div>
        </Popup>
      </Circle>
    ));
  };

  // Helper functions
  const getTemperatureColor = (temp) => {
    if (temp < 0) return '#2196F3';    // Blue
    if (temp < 10) return '#4CAF50';   // Green
    if (temp < 25) return '#FFEB3B';   // Yellow
    if (temp < 35) return '#FF9800';   // Orange
    return '#F44336';                  // Red
  };

  const getPrecipitationColor = (type, intensity) => {
    const colors = {
      rain: ['#E3F2FD', '#90CAF9', '#42A5F5', '#1E88E5', '#0D47A1'],
      snow: ['#F5F5F5', '#E0E0E0', '#BDBDBD', '#757575', '#424242'],
      hail: ['#FFF3E0', '#FFCC80', '#FF9800', '#F57C00', '#E65100']
    };
    
    const colorSet = colors[type] || colors.rain;
    const index = Math.min(Math.floor(intensity * colorSet.length), colorSet.length - 1);
    return colorSet[index];
  };

  return (
    <div className="space-y-4">
      {/* Weather Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Weather Overlay</h3>
          <button
            onClick={fetchWeatherData}
            className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
            disabled={loading}
          >
            <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>
        
        {/* Layer Controls */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          {Object.entries(activeLayers).map(([layer, active]) => (
            <label key={layer} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActiveLayers(prev => ({
                  ...prev,
                  [layer]: e.target.checked
                }))}
                className="rounded text-blue-600"
              />
              <span className="capitalize text-sm">{layer}</span>
            </label>
          ))}
        </div>
        
        {/* Current Weather Summary */}
        {weatherData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded">
            <div className="text-center">
              <FiThermometer className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{weatherData.temp.toFixed(1)}°C</div>
              <div className="text-sm text-gray-600">Temperature</div>
            </div>
            
            <div className="text-center">
              <FiDroplet className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{weatherData.humidity}%</div>
              <div className="text-sm text-gray-600">Humidity</div>
            </div>
            
            <div className="text-center">
              <FiWind className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{weatherData.wind_speed}</div>
              <div className="text-sm text-gray-600">Wind (km/h)</div>
            </div>
            
            <div className="text-center">
              <FiCloud className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{weatherData.clouds}%</div>
              <div className="text-sm text-gray-600">Cloud Cover</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Weather Map */}
      <div className="h-[500px] rounded-lg overflow-hidden">
        <MapContainer
          center={[location.lat, location.lng]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          className="rounded-lg"
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Standard Map">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© OpenStreetMap contributors'
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Esri, Maxar, Earthstar Geographics, and the GIS User Community'
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="Temperature Map">
              <TileLayer
                url={`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey || 'demo'}`}
                attribution='OpenWeatherMap'
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="Precipitation Map">
              <TileLayer
                url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey || 'demo'}`}
                attribution='OpenWeatherMap'
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          
          {/* Weather Layers */}
          {renderTemperatureLayer()}
          {renderPrecipitationLayer()}
          {renderWindLayer()}
          {renderRadarLayer()}
          {renderAlertLayer()}
        </MapContainer>
      </div>
      
      {/* Forecast */}
      {forecastData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-bold text-lg mb-4">7-Day Forecast</h4>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
            {forecastData.slice(0, 7).map((day, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded">
                <div className="font-medium">
                  {format(new Date(day.dt * 1000), 'EEE')}
                </div>
                <div className="text-2xl font-bold my-2">
                  {day.temp.day.toFixed(0)}°
                </div>
                <div className="text-sm text-gray-600">
                  {day.weather[0].main}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  💧 {day.rain?.toFixed(1) || 0}mm
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherOverlay;