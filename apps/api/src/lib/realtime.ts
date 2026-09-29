import type { Server as HttpServer } from 'node:http';
import { SOCKET_EVENTS, isStaff, type Role } from '@civita/shared';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { verifyAccessToken } from './tokens.js';

let io: Server | null = null;

export const rooms = {
  user: (id: string) => `user:${id}`,
  issue: (id: string) => `issue:${id}`,
  issueStaff: (id: string) => `issue:${id}:staff`,
  feed: 'feed',
};

export const initRealtime = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: { origin: env.webOrigins, credentials: true },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    let role: Role | null = null;
    const token = socket.handshake.auth?.token;
    if (typeof token === 'string' && token) {
      try {
        const payload = verifyAccessToken(token);
        role = payload.role;
        void socket.join(rooms.user(payload.sub));
      } catch {
        // Anonymous sockets can still watch public issue activity.
      }
    }
    void socket.join(rooms.feed);

    socket.on(SOCKET_EVENTS.joinIssue, (issueId: unknown) => {
      if (typeof issueId !== 'string' || !/^[a-f\d]{24}$/i.test(issueId)) return;
      void socket.join(rooms.issue(issueId));
      if (isStaff(role)) void socket.join(rooms.issueStaff(issueId));
    });

    socket.on(SOCKET_EVENTS.leaveIssue, (issueId: unknown) => {
      if (typeof issueId !== 'string') return;
      void socket.leave(rooms.issue(issueId));
      void socket.leave(rooms.issueStaff(issueId));
    });
  });

  logger.debug('Realtime server ready');
  return io;
};

/** Emits to a room. A no-op when the socket server isn't running (tests, scripts). */
export const emitTo = (room: string, event: string, payload: unknown): void => {
  io?.to(room).emit(event, payload);
};

export const closeRealtime = async (): Promise<void> => {
  if (io) await io.close();
  io = null;
};
