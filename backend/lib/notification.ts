import prisma from "./prisma.ts";
import { emitToUser } from "./socket.ts";

export type NotificationType =
  | "ORDER_CREATED"
  | "ORDER_PAID"
  | "ORDER_RELEASED"
  | "ORDER_CANCELLED"
  | "ORDER_EXPIRED"
  | "ORDER_DISPUTED"
  | "SYSTEM_NOTIFICATION";

/**
 * Creates a notification in the database, broadcasts it in realtime via sockets,
 * and manages ready-to-push Firebase Cloud Messaging integration.
 */
export async function sendNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: any
) {
  try {
    // 1. Create & Persist notification record in Firestore/PostgreSQL database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metaPayload: metadata ? JSON.stringify(metadata) : null,
        isRead: false
      }
    });

    console.log(`[Notification Service] Saved Notification: [${type}] for User ${userId}`);

    // 2. Broadcast via WebSockets/Socket.IO to active user room
    emitToUser(userId, "notification:new", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      metaPayload: notification.metaPayload,
      createdAt: notification.createdAt
    });

    // 3. Browser Push Integration preparation (FCM / Firebase Cloud Messaging structure-ready)
    const pushTokens = await prisma.pushToken.findMany({
      where: { userId }
    });

    if (pushTokens.length > 0) {
      console.log(`[FCM Push Service] Dispatching background device push to ${pushTokens.length} active FCM tokens for User ID: ${userId}`);
      for (const tokenInstance of pushTokens) {
        // FCM API Invocation Mock and Logging:
        // admin.messaging().send({ token: tokenInstance.token, notification: { title, body: message }, data: metadata })
        console.log(`[Push Notification FCM Simulation] Succeeded. Token: ${tokenInstance.token.slice(0, 16)}... Title: "${title}"`);
      }
    }

    return notification;
  } catch (error) {
    console.error(`[Notification Service Error] Failed to send notification to User ${userId}:`, error);
    return null;
  }
}
