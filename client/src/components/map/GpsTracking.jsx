import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { FiNavigation, FiClock, FiSpeed, FiMapPin, FiActivity, FiRefreshCw } from 'react-icons/fi';
import { trackMovement } from '../../utils/advancedMapUtils';
import io from 'socket.io-client';

// GPS Tracking Component
const GpsTracking = ({ 
  devices = [],
  realTime = true,
  historyHours = 24,
  onDeviceSelect = () => {}
}) => {
  const [activeDevices, setActiveDevices] = useState(devices);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [trackHistory, setTrackHistory] = useState({});
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize WebSocket connection for real-time tracking
  useEffect(() => {
    if (realTime) {
      const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('GPS Tracking WebSocket connected');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('GPS Tracking WebSocket disconnected');
        setIsConnected(false);
      });

      newSocket.on('gps:update', (data) => {
        updateDevicePosition(data);
      });

      return () => {
        newSocket.close();
      };
    }
  }, [realTime]);

  // Update device position with new GPS data
  function updateDevicePosition(data) {
    setActiveDevices(prevDevices => 
      prevDevices.map(device => 
        device.id === data.deviceId 
          ? { 
              ...device, 
              position: data.position,
              speed: data.speed,
              heading: data.heading,
              timestamp: new Date(data.timestamp),
              battery: data.battery,
              accuracy: data.accuracy
            }
          : device
      )
    );

    // Update track history
    setTrackHistory(prev => {
      const deviceHistory = prev[data.deviceId] || [];
      const newTrack = {
        position: data.position,
        timestamp: new Date(data.timestamp),
        speed: data.speed,
        heading: data.heading
      };
      
      // Keep only last 1000 points
      const updatedHistory = [...deviceHistory, newTrack].slice(-1000);
      
      return {
        ...prev,
        [data.deviceId]: updatedHistory
      };
    });
  };


  // Calculate device statistics
  const calculateDeviceStats = (deviceId) => {
    const history = trackHistory[deviceId] || [];
    if (history.length < 2) return null;

    const totalDistance = history.reduce((total, point, index) => {
      if (index === 0) return 0;
      const prevPoint = history[index - 1];
      
      // Calculate distance between points (simplified)
      const lat1 = prevPoint.position.lat;
      const lng1 = prevPoint.position.lng;
      const lat2 = point.position.lat;
      const lng2 = point.position.lng;
      
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lng2 - lng1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      
      return total + (R * c);
    }, 0);

    const avgSpeed = history.reduce((sum, point) => sum + (point.speed || 0), 0) / history.length;
    const totalTime = history.length > 1 
      ? (history[history.length - 1].timestamp - history[0].timestamp) / 1000 / 60 // minutes
      : 0;

    return {
      totalDistance: totalDistance.toFixed(2),
      avgSpeed: avgSpeed.toFixed(1),
      totalTime: totalTime.toFixed(1),
      points: history.length,
      startTime: history[0]?.timestamp,
      endTime: history[history.length - 1]?.timestamp
    };
  };

  // Create device icon based on status
  const createDeviceIcon = (device) => {
    let color = '#4CAF50'; // Active
    if (device.battery < 20) color = '#F44336'; // Low battery
    if (!device.online) color = '#9E9E9E'; // Offline
    
    const heading = device.heading || 0;
    
    return L.divIcon({
      html: `
        <div style="
          position: relative;
          width: 40px;
          height: 40px;
        ">
          <div style="
            position: absolute;
            width: 30px;
            height: 30px;
            background: ${color};
            border-radius: 50%;
            top: 5px;
            left: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            ${device.type === 'tractor' ? '🚜' : 
              device.type === 'harvester' ? '🌾' : 
              device.type === 'drone' ? '🚁' : '📍'}
          </div>
          <div style="
            position: absolute;
            width: 0;
            height: 0;
            top: 0;
            left: 20px;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 10px solid ${color};
            transform: rotate(${heading}deg);
            transform-origin: center 35px;
          "></div>
        </div>
      `,
      className: 'gps-device-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });
  };

  // Render device tracks
  const renderDeviceTracks = () => {
    return Object.entries(trackHistory).map(([deviceId, history]) => {
      const device = activeDevices.find(d => d.id === deviceId);
      if (!device || history.length < 2) return null;

      const positions = history.map(point => [point.position.lat, point.position.lng]);
      const stats = calculateDeviceStats(deviceId);

      return (
        <React.Fragment key={deviceId}>
          <Polyline
            positions={positions}
            pathOptions={{
              color: device.color || '#4CAF50',
              weight: 3,
              opacity: 0.6,
              dashArray: '5, 5'
            }}
          />
          {device.position && (
            <Marker
              position={[device.position.lat, device.position.lng]}
              icon={createDeviceIcon(device)}
            >
              <Popup>
                <div className="p-3 min-w-[250px]">
                  <h3 className="font-bold text-lg mb-2">{device.name}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Speed:</span>
                      <span className="font-semibold">{device.speed || 0} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heading:</span>
                      <span className="font-semibold">{device.heading || 0}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Battery:</span>
                      <span className={`font-semibold ${device.battery < 20 ? 'text-red-600' : 'text-green-600'}`}>
                        {device.battery || 0}%
                      </span>
                    </div>
                    {stats && (
                      <>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Distance:</span>
                            <span className="font-semibold">{stats.totalDistance} km</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Speed:</span>
                            <span className="font-semibold">{stats.avgSpeed} km/h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Track Points:</span>
                            <span className="font-semibold">{stats.points}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </React.Fragment>
      );
    });
  };

  // Control Panel Component
  const ControlPanel = () => (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">GPS Tracking</h3>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      </div>
      
      <div className="space-y-3">
        <div className="text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Active Devices:</span>
            <span className="font-semibold">{activeDevices.filter(d => d.online).length}/{activeDevices.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Real-time:</span>
            <span className="font-semibold">{realTime ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Devices:</h4>
          {activeDevices.map(device => (
            <div 
              key={device.id}
              className={`p-2 rounded cursor-pointer ${selectedDevice?.id === device.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              onClick={() => {
                setSelectedDevice(device);
                onDeviceSelect(device);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="font-medium">{device.name}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {device.speed || 0} km/h
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Battery: {device.battery || 0}% | Updated: {device.timestamp ? new Date(device.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Statistics Panel
  const StatisticsPanel = () => {
    const totalStats = activeDevices.reduce((stats, device) => {
      const deviceStats = calculateDeviceStats(device.id);
      if (deviceStats) {
        stats.totalDistance += parseFloat(deviceStats.totalDistance);
        stats.totalTime += parseFloat(deviceStats.totalTime);
        stats.avgSpeed = (stats.avgSpeed + parseFloat(deviceStats.avgSpeed)) / (stats.count + 1);
        stats.count++;
      }
      return stats;
    }, { totalDistance: 0, totalTime: 0, avgSpeed: 0, count: 0 });

    return (
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-xs">
        <h4 className="font-bold text-gray-800 mb-3">Tracking Statistics</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="text-2xl font-bold text-blue-600">{totalStats.totalDistance.toFixed(1)}</div>
            <div className="text-sm text-blue-500">Total Distance (km)</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded">
            <div className="text-2xl font-bold text-green-600">{totalStats.avgSpeed.toFixed(1)}</div>
            <div className="text-sm text-green-500">Avg Speed (km/h)</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded">
            <div className="text-2xl font-bold text-purple-600">{totalStats.totalTime.toFixed(0)}</div>
            <div className="text-sm text-purple-500">Total Time (min)</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded">
            <div className="text-2xl font-bold text-orange-600">{activeDevices.length}</div>
            <div className="text-sm text-orange-500">Devices</div>
          </div>
        </div>
      </div>
    );
  };

  // If no center position, use first device or default
  const mapCenter = selectedDevice?.position 
    ? [selectedDevice.position.lat, selectedDevice.position.lng]
    : activeDevices[0]?.position 
    ? [activeDevices[0].position.lat, activeDevices[0].position.lng]
    : [20.5937, 78.9629];

  return (
    <div className="relative h-full">
      <MapContainer
        center={mapCenter}
        zoom={15}
        style={{ height: '600px', width: '100%' }}
        className="rounded-lg"
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
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
        </LayersControl>
        
        {renderDeviceTracks()}
        
        <ControlPanel />
        <StatisticsPanel />
      </MapContainer>
      
      {/* Device Details Panel */}
      {selectedDevice && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg">{selectedDevice.name}</h3>
            <div className={`px-3 py-1 rounded-full text-sm ${selectedDevice.online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {selectedDevice.online ? 'Online' : 'Offline'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <FiSpeed className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <div className="text-xl font-bold">{selectedDevice.speed || 0}</div>
              <div className="text-sm text-blue-600">Speed (km/h)</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded">
              <FiNavigation className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-xl font-bold">{selectedDevice.heading || 0}°</div>
              <div className="text-sm text-green-600">Heading</div>
            </div>
            
            <div className="text-center p-3 bg-orange-50 rounded">
              <FiActivity className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <div className="text-xl font-bold">{selectedDevice.battery || 0}%</div>
              <div className="text-sm text-orange-600">Battery</div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 rounded">
              <FiClock className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <div className="text-xl font-bold">
                {selectedDevice.timestamp ? new Date(selectedDevice.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
              <div className="text-sm text-purple-600">Last Update</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GpsTracking;