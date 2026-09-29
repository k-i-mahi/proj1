import { io, type Socket } from 'socket.io-client';
import { API_URL, getAccessToken, onSessionChange } from './api';

let socket: Socket | null = null;

/** One shared socket for the app. It reconnects with a fresh token whenever the session changes. */
export const getSocket = (): Socket => {
  if (socket) return socket;
  socket = io(API_URL || undefined, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: (cb) => cb({ token: getAccessToken() }),
  });

  let lastToken = getAccessToken();
  onSessionChange((session) => {
    const token = session?.accessToken ?? null;
    // Only reconnect when the identity changes, not on every silent refresh.
    const identityChanged = !!token !== !!lastToken;
    lastToken = token;
    if (identityChanged && socket) {
      socket.disconnect().connect();
    }
  });

  return socket;
};
