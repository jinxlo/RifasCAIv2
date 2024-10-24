import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { io } from 'socket.io-client';

// Inicializa el cliente de Socket.IO con el token de autenticación
const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('token')
  }
});

// Hacer que el socket sea accesible globalmente mediante el contexto
export const SocketContext = React.createContext();

// Create root container
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <SocketContext.Provider value={{ socket }}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SocketContext.Provider>
  </React.StrictMode>
);
