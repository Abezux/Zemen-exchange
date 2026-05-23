import { create } from 'zustand';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  type: "ORDER_CREATED" | "ORDER_PAID" | "ORDER_RELEASED" | "ORDER_CANCELLED" | "ORDER_EXPIRED" | "ORDER_DISPUTED" | "SYSTEM_NOTIFICATION";
  title: string;
  message: string;
  isRead: boolean;
  metaPayload?: string;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  socket: Socket | null;
  unreadCount: number;
  soundEnabled: boolean;
  toastNotification: Notification | null;
  pushToken: string | null;
  pushPermissionStatus: 'default' | 'granted' | 'denied';

  init: (userId: string | undefined) => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toggleSound: () => void;
  dismissToast: () => void;
  requestPushPermission: () => Promise<void>;
  disconnect: () => void;
}

// Low-level synthesizer to play crisp sound alerts without fetching assets
function playAudioAlert(type: string) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "ORDER_CREATED") {
      // Soft modern chime sound (D5 -> A5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880.00, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === "ORDER_PAID") {
      // Encouraging notification alert (G5 -> C6 -> E6)
      osc.type = "sine";
      osc.frequency.setValueAtTime(783.99, now);
      osc.frequency.setValueAtTime(1046.50, now + 0.08);
      osc.frequency.setValueAtTime(1318.51, now + 0.16);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === "ORDER_RELEASED") {
      // Golden success ascending chime (C5 -> E5 -> G5 -> C6)
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      osc.frequency.setValueAtTime(1046.50, now + 0.24);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else {
      // Attention warning buzzer (triangular buzzer, descending pitch)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.setValueAtTime(220.00, now + 0.15); // A3
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (error) {
    console.warn("[Sound Service Warning] Prevented autoplay layout crash", error);
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  socket: null,
  unreadCount: 0,
  soundEnabled: localStorage.getItem("sound_notifications") !== "false",
  toastNotification: null,
  pushToken: localStorage.getItem("fcm_mock_push_token"),
  pushPermissionStatus: (Notification as any)?.permission || "default",

  init: (userId) => {
    // Disconnect old socket if it exists to prevent leaks
    get().disconnect();

    if (!userId) return;

    // Fetch initial notification list
    get().fetchNotifications();

    // Setup Socket connection
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    console.log(`[Socket Client] Initializing connection to: ${socketUrl}`);

    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    newSocket.on("connect", () => {
      console.log("[Socket Client] Real-time gateway connected! Active ID:", newSocket.id);
    });

    // Subscribing to new incoming notification events
    newSocket.on("notification:new", (newNotif: Notification) => {
      console.log("[Socket Client] Realtime notification received:", newNotif);

      set((state) => {
        // Prevent duplicates
        if (state.notifications.some((n) => n.id === newNotif.id)) {
          return state;
        }

        const list = [newNotif, ...state.notifications];
        const unread = list.filter((n) => !n.isRead).length;

        // Trigger sound alert if enabled
        if (state.soundEnabled) {
          playAudioAlert(newNotif.type);
        }

        return {
          notifications: list,
          unreadCount: unread,
          toastNotification: newNotif
        };
      });
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("[Socket Client] Disconnected from server:", reason);
    });

    set({ socket: newSocket });
  },

  fetchNotifications: async () => {
    try {
      const response = await axios.get('/api/user/notifications');
      const list = response.data || [];
      const unread = list.filter((n: any) => !n.isRead).length;
      set({ notifications: list, unreadCount: unread });
    } catch (error) {
      console.error("[Notification Store] Failed to fetch notification history index:", error);
    }
  },

  markAsRead: async (id) => {
    try {
      await axios.patch(`/api/user/notifications/${id}/read`);
      set((state) => {
        const list = state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        const unread = list.filter((n) => !n.isRead).length;
        return { notifications: list, unreadCount: unread };
      });
    } catch (error) {
      console.error("[Notification Store] Failed to mark single notification as read:", error);
    }
  },

  markAllAsRead: async () => {
    try {
      await axios.post('/api/user/notifications/read-all');
      set((state) => {
        const list = state.notifications.map((n) => ({ ...n, isRead: true }));
        return { notifications: list, unreadCount: 0 };
      });
    } catch (error) {
      console.error("[Notification Store] Failed to mark all notifications as read:", error);
    }
  },

  toggleSound: () => {
    set((state) => {
      const newVal = !state.soundEnabled;
      localStorage.setItem("sound_notifications", String(newVal));
      return { soundEnabled: newVal };
    });
  },

  dismissToast: () => set({ toastNotification: null }),

  requestPushPermission: async () => {
    if (!("Notification" in window)) {
      console.warn("[FCM Preparation] Browser does not support desktop push notifications.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      set({ pushPermissionStatus: result });

      if (result === 'granted') {
        // Mock FCM/Push Registration Token Generator
        let activeToken = get().pushToken;
        if (!activeToken) {
          const randomHex = () => Math.random().toString(16).substring(2);
          activeToken = `fcm_mock_${randomHex()}${randomHex()}_token_zemen_v1`;
          localStorage.setItem("fcm_mock_push_token", activeToken);
          set({ pushToken: activeToken });
        }

        // Register with server persistent state
        await axios.post('/api/user/push-token', { token: activeToken });
        console.log("[FCM Prep Success] Push authorization granted. Registered mock token payload with backend.");
      }
    } catch (err) {
      console.error("[FCM Setup Fail] Could not negotiate browser push settings:", err);
    }
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null });
  }
}));
