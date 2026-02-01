import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { 
  FiGrid, 
  FiEdit, 
  FiTrash2, 
  FiCopy, 
  FiSave, 
  FiFilter,
  FiLayers,
  FiPieChart,
  FiDroplet,
  FiThermometer,
  FiSun,
  FiCheckCircle
} from 'react-icons/fi';
import { analyzeZone, classifyZone, exportZoneData } from '../../utils/advancedMapUtils';
import * as turf from '@turf/turf';

// Zone Manager Component
const ZoneManager = ({ 
  zones = [],
  sensors = [],
  onZoneUpdate = () => {},
  onZoneDelete = () => {},
  onZoneCreate = () => {}
}) => {
  const [editingZone, setEditingZone] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [zoneStats, setZoneStats] = useState({});
  const [filterType, setFilterType] = useState('all');
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Calculate zone statistics
  useEffect(() => {
    const stats = {};
    zones.forEach(zone => {
      stats[zone.id] = analyzeZone(zone, sensors);
    });
    setZoneStats(stats);
  }, [zones, sensors]);

  // Handle zone creation
  const handleCreateZone = (type = 'crop') => {
    const newZone = {
      id: Date.now(),
      name: `New ${type} Zone`,
      type,
      coordinates: [], // Would be drawn on map
      color: getZoneColor(type),
      createdAt: new Date().toISOString(),
      metadata: {
        cropType: '',
        irrigationType: '',
        soilType: '',
        notes: ''
      }
    };
    
    onZoneCreate(newZone);
    setEditingZone(newZone);
  };

  // Handle zone edit
  const handleEditZone = (zone) => {
    setEditingZone({ ...zone });
  };

  // Handle zone save
  const handleSaveZone = () => {
    if (editingZone) {
      onZoneUpdate(editingZone);
      setEditingZone(null);
    }
  };

  // Handle zone delete
  const handleDeleteZone = (zoneId) => {
    if (window.confirm('Are you sure you want to delete this zone?')) {
      onZoneDelete(zoneId);
      if (selectedZone?.id === zoneId) {
        setSelectedZone(null);
      }
    }
  };

  // Get zone color based on type
  const getZoneColor = (type) => {
    const colors = {
      crop: '#4CAF50',
      irrigation: '#2196F3',
      restricted: '#F44336',
      buffer: '#FF9800',
      drainage: '#9C27B0',
      storage: '#795548',
      access: '#607D8B'
    };
    return colors[type] || '#9E9E9E';
  };

  // Calculate zone area in hectares
  const calculateZoneArea = (coordinates) => {
    if (!coordinates || coordinates.length < 3) return 0;
    
    const polygon = turf.polygon([coordinates.map(c => [c.lng, c.lat])]);
    return turf.area(polygon) / 10000; // Convert to hectares
  };

  // Filter zones by type
  const filteredZones = filterType === 'all' 
    ? zones 
    : zones.filter(zone => zone.type === filterType);

  // Render zone polygons
  const renderZones = () => {
    return filteredZones.map(zone => {
      const isSelected = selectedZone?.id === zone.id;
      const isEditing = editingZone?.id === zone.id;
      const stats = zoneStats[zone.id] || {};
      
      const zoneStyle = {
        color: zone.color || getZoneColor(zone.type),
        weight: isSelected ? 4 : isEditing ? 3 : 2,
        opacity: isSelected ? 0.9 : isEditing ? 0.8 : 0.6,
        fillColor: zone.color || getZoneColor(zone.type),
        fillOpacity: isSelected ? 0.3 : isEditing ? 0.25 : 0.2,
        dashArray: zone.type === 'buffer' ? '5, 5' : undefined
      };

      return (
        <Polygon
          key={zone.id}
          pathOptions={zoneStyle}
          positions={zone.coordinates}
          eventHandlers={{
            click: () => setSelectedZone(zone)
          }}
        >
          <Popup>
            <div className="p-3 min-w-[250px]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-lg">{zone.name}</h4>
                <span className={`px-2 py-1 rounded text-xs ${zone.type === 'crop' ? 'bg-green-100 text-green-800' : 
                  zone.type === 'irrigation' ? 'bg-blue-100 text-blue-800' : 
                  'bg-gray-100 text-gray-800'}`}>
                  {zone.type}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <p><strong>Area:</strong> {calculateZoneArea(zone.coordinates).toFixed(2)} hectares</p>
                <p><strong>Sensors:</strong> {stats.sensorCount || 0}</p>
                
                {stats.avgValues && Object.keys(stats.avgValues).length > 0 && (
                  <div className="mt-2">
                    <strong>Average Readings:</strong>
                    {Object.entries(stats.avgValues).map(([type, value]) => (
                      <div key={type} className="flex justify-between">
                        <span>{type}:</span>
                        <span>{value.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                <button
                  className="flex-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm hover:bg-blue-100"
                  onClick={() => handleEditZone(zone)}
                >
                  Edit
                </button>
                <button
                  className="flex-1 px-2 py-1 bg-red-50 text-red-700 rounded text-sm hover:bg-red-100"
                  onClick={() => handleDeleteZone(zone.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </Popup>
        </Polygon>
      );
    });
  };

  // Zone type options
  const zoneTypes = [
    { id: 'crop', name: 'Crop Zone', icon: '🌱', description: 'Areas for specific crops' },
    { id: 'irrigation', name: 'Irrigation Zone', icon: '💧', description: 'Controlled watering areas' },
    { id: 'restricted', name: 'Restricted Zone', icon: '🚫', description: 'No-entry areas' },
    { id: 'buffer', name: 'Buffer Zone', icon: '🛡️', description: 'Protective boundaries' },
    { id: 'drainage', name: 'Drainage Zone', icon: '🌊', description: 'Water management areas' },
    { id: 'storage', name: 'Storage Zone', icon: '📦', description: 'Equipment/material storage' },
    { id: 'access', name: 'Access Zone', icon: '🛣️', description: 'Paths and roads' }
  ];

  return (
    <div className="space-y-4">
      {/* Zone Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Zone Management</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="px-3 py-1 bg-purple-50 text-purple-700 rounded flex items-center gap-2"
            >
              <FiPieChart /> Analysis
            </button>
            <button
              onClick={() => {
                const data = exportZoneData(zones, 'geojson');
                // Download logic here
              }}
              className="px-3 py-1 bg-green-50 text-green-700 rounded flex items-center gap-2"
            >
              <FiSave /> Export
            </button>
          </div>
        </div>
        
        {/* Zone Type Selection */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FiLayers className="text-gray-500" />
            <span className="font-medium">Create New Zone:</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {zoneTypes.map(type => (
              <button
                key={type.id}
                onClick={() => handleCreateZone(type.id)}
                className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="font-medium text-sm">{type.name}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Zone Filter */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FiFilter className="text-gray-500" />
            <span className="font-medium">Filter Zones:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded ${filterType === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}
            >
              All ({zones.length})
            </button>
            {zoneTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id)}
                className={`px-3 py-1 rounded ${filterType === type.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}
              >
                {type.name} ({zones.filter(z => z.type === type.id).length})
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Zone Map */}
      <div className="h-[500px] rounded-lg overflow-hidden">
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={13}
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
          </LayersControl>
          
          {renderZones()}
        </MapContainer>
      </div>
      
      {/* Zone Analysis Panel */}
      {showAnalysis && selectedZone && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-lg">Zone Analysis: {selectedZone.name}</h4>
            <button
              onClick={() => setShowAnalysis(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {zoneStats[selectedZone.id] && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiGrid className="text-blue-500" />
                  <h5 className="font-bold">Zone Information</h5>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Area:</span>
                    <span className="font-semibold">{calculateZoneArea(selectedZone.coordinates).toFixed(2)} ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sensors:</span>
                    <span className="font-semibold">{zoneStats[selectedZone.id].sensorCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Perimeter:</span>
                    <span className="font-semibold">{zoneStats[selectedZone.id].perimeter?.toFixed(2) || 'N/A'} km</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiThermometer className="text-green-500" />
                  <h5 className="font-bold">Sensor Readings</h5>
                </div>
                <div className="space-y-2 text-sm">
                  {zoneStats[selectedZone.id].avgValues && Object.entries(zoneStats[selectedZone.id].avgValues).map(([type, value]) => (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type.replace('_', ' ')}:</span>
                      <span className="font-semibold">{value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="text-orange-500" />
                  <h5 className="font-bold">Recommendations</h5>
                </div>
                <div className="text-sm">
                  {classifyZone(selectedZone, sensors).recommendation}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Zone List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-bold">Zone List ({zones.length} zones)</h4>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {zones.map(zone => {
            const stats = zoneStats[zone.id] || {};
            return (
              <div 
                key={zone.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedZone?.id === zone.id ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedZone(zone)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: zone.color || getZoneColor(zone.type) }}
                    ></div>
                    <div>
                      <div className="font-medium">{zone.name}</div>
                      <div className="text-sm text-gray-600">
                        {zone.type} • {calculateZoneArea(zone.coordinates).toFixed(2)} ha • {stats.sensorCount || 0} sensors
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditZone(zone);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <FiEdit />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteZone(zone.id);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ZoneManager;