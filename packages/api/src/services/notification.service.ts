import prisma from '../utils/prisma.js';

interface NotificationData {
  type: string;
  [key: string]: any;
}

interface SendNotificationParams {
  userId: string;
  title: string;
  body: string;
  data?: NotificationData;
}

interface PurchaseAlertParams {
  guardianId: string;
  studentName: string;
  amount: number;
  cafeteriaName: string;
  orderId: string;
}

class NotificationService {
  /**
   * Send a notification to a user
   * Creates notification record and would send push notification in production
   */
  async sendNotification({ userId, title, body, data }: SendNotificationParams): Promise<boolean> {
    try {
      // Store notification in database
      await prisma.notification.create({
        data: {
          userId,
          title,
          body,
          data: data ? JSON.stringify(data) : null,
        },
      });

      // Get active push tokens for user
      const pushTokens = await prisma.pushToken.findMany({
        where: {
          userId,
          active: true,
        },
      });

      // In production, send to push notification service (Expo, Firebase, etc.)
      // For now, we just log the notification in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[NotificationService] Notification created for user ${userId}:`, {
          title,
          body,
          tokensCount: pushTokens.length,
        });
      }

      // TODO: In production, integrate with Expo Push Notification Service
      // await this.sendPushNotifications(pushTokens, { title, body, data });

      return true;
    } catch (error) {
      console.error('[NotificationService] Error sending notification:', error);
      return false;
    }
  }

  /**
   * Send purchase alert to guardian when their child makes a purchase
   */
  async sendPurchaseAlert({
    guardianId,
    studentName,
    amount,
    cafeteriaName,
    orderId,
  }: PurchaseAlertParams): Promise<boolean> {
    const formattedAmount = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);

    return this.sendNotification({
      userId: guardianId,
      title: 'Nueva compra',
      body: `${studentName} ha realizado una compra de ${formattedAmount} en ${cafeteriaName}`,
      data: {
        type: 'purchase_alert',
        orderId,
        studentName,
        amount,
        cafeteriaName,
      },
    });
  }

  /**
   * Send low balance alert to guardian
   */
  async sendLowBalanceAlert(
    guardianId: string,
    studentName: string,
    currentBalance: number,
    threshold: number,
  ): Promise<boolean> {
    const formattedBalance = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(currentBalance);

    return this.sendNotification({
      userId: guardianId,
      title: 'Saldo bajo',
      body: `El saldo de ${studentName} es ${formattedBalance}. Recarga pronto para evitar inconvenientes.`,
      data: {
        type: 'low_balance_alert',
        studentName,
        currentBalance,
        threshold,
      },
    });
  }

  /**
   * Send order status update notification
   */
  async sendOrderStatusUpdate(
    guardianId: string,
    studentName: string,
    orderId: string,
    status: string,
  ): Promise<boolean> {
    const statusMessages: Record<string, string> = {
      confirmed: 'ha sido confirmado',
      preparing: 'esta siendo preparado',
      ready: 'esta listo para retirar',
      delivered: 'ha sido entregado',
      cancelled: 'ha sido cancelado',
    };

    const statusMessage = statusMessages[status] || `tiene nuevo estado: ${status}`;

    return this.sendNotification({
      userId: guardianId,
      title: 'Actualizacion de pedido',
      body: `El pedido de ${studentName} ${statusMessage}`,
      data: {
        type: 'order_status_update',
        orderId,
        studentName,
        status,
      },
    });
  }
}

export const notificationService = new NotificationService();
