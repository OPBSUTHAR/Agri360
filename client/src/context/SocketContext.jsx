import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
        auth: {
          token: localStorage.getItem('token')
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
        
        // Join farm rooms if user has farms
        if (user.farms && user.farms.length > 0) {
          user.farms.forEach(farm => {
            newSocket.emit('join:farm', farm._id);
          });
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        toast.error('Real-time connection failed');
      });

      // Listen for notifications
      newSocket.on('notification:new', (notification) => {
        toast(notification.message, {
          icon: notification.severity === 'critical' ? '🔴' : 
                notification.severity === 'warning' ? '🟡' : '🔵',
          duration: notification.severity === 'critical' ? 10000 : 5000
        });
      });

      // Listen for sensor updates
      newSocket.on('sensor:update', (data) => {
        console.log('Sensor update:', data);
        // You can dispatch this to your state management
      });

      // Listen for irrigation updates
      newSocket.on('irrigation:update', (data) => {
        console.log('Irrigation update:', data);
        // You can dispatch this to your state management
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setConnected(false);
      };
    }
  }, [user]);

  const joinFarmRoom = (farmId) => {
    if (socket && connected) {
      socket.emit('join:farm', farmId);
    }
  };

  const leaveFarmRoom = (farmId) => {
    if (socket && connected) {
      socket.emit('leave:farm', farmId);
    }
  };

  const sendIrrigationCommand = (data) => {
    if (socket && connected) {
      socket.emit('irrigation:control', data);
    }
  };

  const value = {
    socket,
    connected,
    joinFarmRoom,
    leaveFarmRoom,
    sendIrrigationCommand
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};