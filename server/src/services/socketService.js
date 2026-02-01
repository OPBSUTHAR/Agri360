const socketIO = require('socket.io');

let io = null;

const setupSocketIO = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  // Store io globally for access in other modules
  global.io = io;

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join farm room for real-time updates
    socket.on('join:farm', (farmId) => {
      socket.join(farmId);
      console.log(`Socket ${socket.id} joined farm ${farmId}`);
    });

    // Leave farm room
    socket.on('leave:farm', (farmId) => {
      socket.leave(farmId);
      console.log(`Socket ${socket.id} left farm ${farmId}`);
    });

    // Handle irrigation control
    socket.on('irrigation:control', async (data) => {
      const { farmId, zone, action, duration } = data;
      
      // Broadcast to other clients in the same farm
      socket.to(farmId).emit('irrigation:control', data);
      
      // Send command to MQTT
      if (global.mqttService) {
        global.mqttService.publish(`irrigation/${farmId}/control`, {
          zone,
          action,
          duration,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle manual sensor reading
    socket.on('sensor:reading', async (data) => {
      const { farmId, sensorId, value } = data;
      
      // Emit to all clients in the farm
      io.to(farmId).emit('sensor:reading', data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { setupSocketIO, getIO };