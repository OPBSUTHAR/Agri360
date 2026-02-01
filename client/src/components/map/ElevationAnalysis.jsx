import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { 
  FiTrendingUp, 
  FiMap, 
  FiDownload, 
  FiFilter,
  FiGrid,
  FiNavigation,
  FiActivity
} from 'react-icons/fi';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import axios from 'axios';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Elevation Analysis Component
const ElevationAnalysis = ({ 
  area = null,
  onElevationData = () => {}
}) => {
  const [elevationData, setElevationData] = useState([]);
  const [profilePath, setProfilePath] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [terrainSlope, setTerrainSlope] = useState(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);

  // Fetch elevation data
  const fetchElevationData = async (path) => {
    if (!path || path.length < 2) return;
    
    try {
      setLoading(true);
      
      // For production, use a proper elevation API like Open-Elevation
      // This is a mock implementation
      const mockElevation = path.map((point, index) => ({
        lat: point[0],
        lng: point[1],
        elevation: 100 + 
          Math.sin(point[0] * 100) * 50 + 
          Math.cos(point[1] * 100) * 30 +
          Math.random() * 20,
        distance: index * 100 // Mock distance in meters
      }));
      
      setElevationData(mockElevation);
      
      // Calculate slope
      const slopes = [];
      for (let i = 1; i < mockElevation.length; i++) {
        const elevationChange = mockElevation[i].elevation - mockElevation[i-1].elevation;
        const distance = mockElevation[i].distance - mockElevation[i-1].distance;
        const slope = (elevationChange / distance) * 100; // Percentage
        slopes.push(Math.abs(slope));
      }
      
      const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
      setTerrainSlope({
        average: avgSlope.toFixed(1),
        max: Math.max(...slopes).toFixed(1),
        min: Math.min(...slopes).toFixed(1),
        classification: avgSlope < 5 ? 'Flat' : 
                       avgSlope < 15 ? 'Moderate' : 
                       avgSlope < 30 ? 'Steep' : 'Very Steep'
      });
      
      onElevationData(mockElevation);
      
    } catch (error) {
      console.error('Error fetching elevation data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle map click for drawing profile line
  const handleMapClick = (e) => {
    if (isDrawing) {
      const newPoint = [e.latlng.lat, e.latlng.lng];
      const newPath = [...profilePath, newPoint];
      setProfilePath(newPath);
      
      if (newPath.length >= 2) {
        fetchElevationData(newPath);
      }
    }
  };

  // Clear profile
  const clearProfile = () => {
    setProfilePath([]);
    setElevationData([]);
    setTerrainSlope(null);
    setSelectedPoint(null);
  };

  // Create elevation chart data
  const getChartData = () => {
    return {
      labels: elevationData.map((point, index) => 
        `Point ${index + 1} (${(point.distance / 1000).toFixed(1)}km)`
      ),
      datasets: [
        {
          label: 'Elevation (m)',
          data: elevationData.map(point => point.elevation),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Slope',
          data: elevationData.map((point, index) => {
            if (index === 0) return 0;
            const prev = elevationData[index - 1];
            const elevationChange = point.elevation - prev.elevation;
            const distance = point.distance - prev.distance;
            return Math.abs((elevationChange / distance) * 100);
          }),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Distance along profile'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Elevation (m)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Slope (%)'
        },
        grid: {
          drawOnChartArea: false,
        },
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.datasetIndex === 0) {
              return `Elevation: ${context.parsed.y.toFixed(1)}m`;
            } else {
              return `Slope: ${context.parsed.y.toFixed(1)}%`;
            }
          }
        }
      }
    }
  };

  // Render profile line
  const renderProfileLine = () => {
    if (profilePath.length < 2) return null;
    
    return (
      <Polyline
        positions={profilePath}
        pathOptions={{
          color: '#4CAF50',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 5'
        }}
      />
    );
  };

  // Render elevation points
  const renderElevationPoints = () => {
    return elevationData.map((point, index) => (
      <Marker
        key={index}
        position={[point.lat, point.lng]}
        icon={L.divIcon({
          html: `
            <div style="
              background: ${selectedPoint?.index === index ? '#FF9800' : '#4CAF50'};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
              font-weight: bold;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              cursor: pointer;
            ">
              ${index + 1}
            </div>
          `,
          className: 'elevation-point',
          iconSize: [24, 24],
          iconAnchor: [12, 24]
        })}
        eventHandlers={{
          click: () => setSelectedPoint({ ...point, index })
        }}
      >
        <Popup>
          <div className="p-3 min-w-[200px]">
            <h4 className="font-bold">Point {index + 1}</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Elevation:</strong> {point.elevation.toFixed(1)} m</p>
              <p><strong>Distance:</strong> {(point.distance / 1000).toFixed(2)} km</p>
              <p><strong>Coordinates:</strong> {point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>
            </div>
          </div>
        </Popup>
      </Marker>
    ));
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Elevation Analysis</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setIsDrawing(!isDrawing)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isDrawing 
                  ? 'bg-green-100 text-green-800 border border-green-300' 
                  : 'bg-gray-100 border border-gray-300'
              }`}
            >
              <FiNavigation /> {isDrawing ? 'Drawing... (Click map)' : 'Draw Profile'}
            </button>
            <button
              onClick={clearProfile}
              className="px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-2"
              disabled={profilePath.length === 0}
            >
              Clear
            </button>
          </div>
        </div>
        
        {/* Instructions */}
        {isDrawing && (
          <div className="mb-4 p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-700">
              Click on the map to draw an elevation profile line. Click at least 2 points to generate the profile.
            </p>
          </div>
        )}
        
        {/* Terrain Analysis */}
        {terrainSlope && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{terrainSlope.average}%</div>
              <div className="text-sm text-blue-500">Average Slope</div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{terrainSlope.max}%</div>
              <div className="text-sm text-green-500">Max Slope</div>
            </div>
            <div className="p-3 bg-orange-50 rounded">
              <div className="text-2xl font-bold text-orange-600">{terrainSlope.min}%</div>
              <div className="text-sm text-orange-500">Min Slope</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-600">{terrainSlope.classification}</div>
              <div className="text-sm text-purple-500">Terrain Type</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Map and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Map */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-bold mb-4">Map View</h4>
          <div className="h-[400px] rounded-lg overflow-hidden">
            <MapContainer
              ref={mapRef}
              center={area || [20.5937, 78.9629]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="rounded-lg"
              onclick={handleMapClick}
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Standard Map">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© OpenStreetMap contributors'
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Topography">
                  <TileLayer
                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    attribution='Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Hillshade">
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}"
                    attribution='Esri, USGS | Hillshade by Esri'
                  />
                </LayersControl.BaseLayer>
              </LayersControl>
              
              {renderProfileLine()}
              {renderElevationPoints()}
            </MapContainer>
          </div>
          
          {profilePath.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Profile Length:</strong> {profilePath.length} points</p>
              <p><strong>Total Distance:</strong> {elevationData.length > 0 
                ? (elevationData[elevationData.length - 1].distance / 1000).toFixed(2) 
                : '0'} km</p>
            </div>
          )}
        </div>
        
        {/* Elevation Chart */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-bold mb-4">Elevation Profile</h4>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : elevationData.length > 0 ? (
            <div className="h-[400px]">
              <Line data={getChartData()} options={chartOptions} />
            </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
              <FiTrendingUp className="w-16 h-16 mb-4" />
              <p>Draw a profile line on the map to see elevation data</p>
            </div>
          )}
          
          {/* Selected Point Details */}
          {selectedPoint && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <h5 className="font-bold mb-2">Selected Point Details</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <strong>Elevation:</strong> {selectedPoint.elevation.toFixed(1)} m
                </div>
                <div>
                  <strong>Distance:</strong> {(selectedPoint.distance / 1000).toFixed(2)} km
                </div>
                <div>
                  <strong>Latitude:</strong> {selectedPoint.lat.toFixed(6)}
                </div>
                <div>
                  <strong>Longitude:</strong> {selectedPoint.lng.toFixed(6)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Analysis Results */}
      {elevationData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-bold mb-4">Terrain Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiTrendingUp className="text-blue-500" />
                <h5 className="font-bold">Elevation Range</h5>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Highest Point:</span>
                  <span className="font-bold">
                    {Math.max(...elevationData.map(p => p.elevation)).toFixed(1)} m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Lowest Point:</span>
                  <span className="font-bold">
                    {Math.min(...elevationData.map(p => p.elevation)).toFixed(1)} m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Gain:</span>
                  <span className="font-bold">
                    {elevationData.reduce((total, point, index) => {
                      if (index === 0) return 0;
                      const gain = point.elevation - elevationData[index - 1].elevation;
                      return total + (gain > 0 ? gain : 0);
                    }, 0).toFixed(1)} m
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiActivity className="text-green-500" />
                <h5 className="font-bold">Slope Analysis</h5>
              </div>
              <div className="space-y-1">
                {terrainSlope && (
                  <>
                    <div className="flex justify-between">
                      <span>Terrain Type:</span>
                      <span className="font-bold">{terrainSlope.classification}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Grade:</span>
                      <span className="font-bold">{terrainSlope.average}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Steepest Section:</span>
                      <span className="font-bold">{terrainSlope.max}%</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiGrid className="text-purple-500" />
                <h5 className="font-bold">Recommendations</h5>
              </div>
              <div className="text-sm">
                {terrainSlope && (
                  <>
                    {terrainSlope.classification === 'Flat' && 
                      'Ideal for most crops. Good drainage needed.'}
                    {terrainSlope.classification === 'Moderate' && 
                      'Suitable for terraced farming. Consider erosion control.'}
                    {terrainSlope.classification === 'Steep' && 
                      'Consider contour farming. High erosion risk.'}
                    {terrainSlope.classification === 'Very Steep' && 
                      'Not suitable for farming. Consider other land use.'}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElevationAnalysis;