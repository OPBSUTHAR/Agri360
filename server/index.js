const app = require('./src/app');
const connectDB = require('./src/config/db');
const { setupMQTT } = require('./src/services/mqttService');
const { setupSocketIO } = require('./src/services/socketService');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Setup MQTT for IoT devices
setupMQTT();

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Setup Socket.IO
setupSocketIO(server);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});