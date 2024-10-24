import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
    this.isConnected = false;
    this.initialize();
  }

  initialize() {
    console.log('Initializing socket connection...');

    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: false,
      auth: {
        token: localStorage.getItem('token')
      },
    });

    this.setupEventHandlers();
    this.setupRaffleEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      toast?.success('Conexión en tiempo real establecida');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      this.handleConnectionError(error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;

      if (reason === 'io server disconnect') {
        console.log('Server disconnected the client');
        this.connect();
      }

      toast?.error('Conexión perdida. Intentando reconectar...');
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      toast?.success('Conexión reestablecida');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt:', attemptNumber);
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      this.handleReconnectionError(error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      this.handleReconnectionFailure();
    });
  }

  setupRaffleEventHandlers() {
    this.socket.on('raffle_created', (data) => {
      console.log('New raffle created:', data);
      this.emit('eventReceived', { type: 'raffle_created', data });
    });

    this.socket.on('raffle_updated', (data) => {
      console.log('Raffle updated:', data);
      this.emit('eventReceived', { type: 'raffle_updated', data });
    });

    this.socket.on('payment_confirmed', (data) => {
      console.log('Payment confirmed:', data);
      this.emit('eventReceived', { type: 'payment_confirmed', data });
    });

    this.socket.on('payment_rejected', (data) => {
      console.log('Payment rejected:', data);
      this.emit('eventReceived', { type: 'payment_rejected', data });
    });

    this.socket.on('tickets_reserved', (data) => {
      console.log('Tickets reserved:', data);
      this.emit('eventReceived', { type: 'tickets_reserved', data });
    });

    this.socket.on('tickets_released', (data) => {
      console.log('Tickets released:', data);
      this.emit('eventReceived', { type: 'tickets_released', data });
    });
  }

  handleConnectionError(error) {
    if (error.message === 'xhr poll error') {
      console.error('Network connection issue');
      toast?.error('Error de conexión con el servidor');
    } else if (error.message === 'Invalid namespace') {
      console.error('Invalid socket namespace');
      toast?.error('Error de configuración del socket');
    }
  }

  handleReconnectionError(error) {
    console.error('Reconnection error:', error);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      toast?.error('No se pudo reestablecer la conexión');
    }
  }

  handleReconnectionFailure() {
    toast?.error('No se pudo reestablecer la conexión. Por favor, recarga la página.');
  }

  // Public methods
  connect() {
    console.log('Connecting socket...');
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    }
  }

  disconnect() {
    console.log('Disconnecting socket...');
    if (this.socket && this.isConnected) {
      this.socket.disconnect();
    }
  }

  emit(eventName, data) {
    if (!this.isConnected) {
      console.warn('Socket is not connected. Event not emitted:', eventName);
      return false;
    }
    this.socket.emit(eventName, data);
    return true;
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
    this.socket.on(eventName, callback);
  }

  off(eventName, callback) {
    if (callback && this.listeners.has(eventName)) {
      const callbacks = this.listeners.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
    this.socket.off(eventName, callback);
  }

  isSocketConnected() {
    return this.isConnected;
  }

  getSocket() {
    return this.socket;
  }

  updateAuthToken(token) {
    if (this.socket) {
      this.socket.auth = { token };
      if (this.isConnected) {
        this.disconnect();
        this.connect();
      }
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

// Development helpers
if (process.env.NODE_ENV === 'development') {
  window.socketService = socketService;
}

// Public method to update token and reconnect socket
export const updateSocketAuth = () => {
  const token = localStorage.getItem('token');
  if (token) {
    socketService.updateAuthToken(token);
    if (!socketService.isConnected) {
      socketService.connect();
    }
  } else {
    socketService.disconnect();
  }
};

export default socketService;