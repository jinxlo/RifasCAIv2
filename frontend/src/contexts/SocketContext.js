import React, { createContext, useContext, useEffect } from 'react';
import socketService from '../services/socket';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socketService.updateAuthToken(token);
      socketService.connect();
    }

    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketService}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;