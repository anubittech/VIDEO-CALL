import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl, getStoredToken } from './api';

let socketInstance: Socket | null = null;

export const connectSignalingSocket = (): Socket => {
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  const token = getStoredToken();
  const baseUrl = getApiBaseUrl();

  socketInstance = io(baseUrl, {
    withCredentials: true,
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socketInstance;
};

export const getSignalingSocket = (): Socket | null => {
  return socketInstance;
};

export const disconnectSignalingSocket = (): void => {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
};
