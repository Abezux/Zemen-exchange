import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-123";

let io: Server | null = null;
const userSockets = new Map<string, string[]>();

export function initSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:5173",
        "https://zemenexchange.vercel.app",
        "https://zemen-exchange.onrender.com"
      ],
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  io.use((socket: Socket, next) => {
    // Grab JWT from auth payload, query, or cookies if available
    let token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token && socket.handshake.headers.cookie) {
      // Small cookie string helper
      const tokenCookie = socket.handshake.headers.cookie
        .split("; ")
        .find((row) => row.startsWith("token="));
      if (tokenCookie) {
        token = tokenCookie.split("=")[1];
      }
    }

    if (!token) {
      return next(); // Connect anonymously
    }

    try {
      const decoded = jwt.verify(token as string, JWT_SECRET) as any;
      socket.data = { user: decoded };
      next();
    } catch (err) {
      console.error("[Socket IO] Token auth error in handshake middleware:", err);
      next();
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data?.user;
    if (user && user.id) {
      const userId = user.id;
      socket.join(`user_${userId}`);
      console.log(`[Socket IO] User ${userId} (${user.email}) successfully authenticated and joined room 'user_${userId}'`);

      if (!userSockets.has(userId)) {
        userSockets.set(userId, []);
      }
      userSockets.get(userId)?.push(socket.id);

      socket.on("disconnect", () => {
        const sockets = userSockets.get(userId) || [];
        const index = sockets.indexOf(socket.id);
        if (index > -1) {
          sockets.splice(index, 1);
        }
        if (sockets.length === 0) {
          userSockets.delete(userId);
        }
        console.log(`[Socket IO] User ${userId} logged out/disconnected`);
      });
    } else {
      console.log(`[Socket IO] Anonymous socket client connected: ${socket.id}`);
    }
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io has not been initialized yet.");
  }
  return io;
}

export function emitToUser(userId: string, event: string, payload: any) {
  if (io) {
    io.to(`user_${userId}`).emit(event, payload);
    console.log(`[Socket IO] Dispatched realtime event '${event}' to room 'user_${userId}'`);
  } else {
    console.warn(`[Socket IO Warning] Cannot dispatch event '${event}' to user ${userId} because socket.io is not initialized.`);
  }
}
