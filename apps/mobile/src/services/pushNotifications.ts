import { Platform } from 'react-native';
import { apiService } from './api';

// Simple push notification service
// In production, this would use expo-notifications
// For web/development, we generate a mock token

class PushNotificationService {
  private pushToken: string | null = null;

  async registerForPushNotifications(accessToken: string): Promise<{
    success: boolean;
    token?: string;
    message?: string;
  }> {
    try {
      // For web platform, generate a mock token
      // In production with native apps, we would use expo-notifications
      const platform = Platform.OS as 'ios' | 'android' | 'web';

      // Generate a unique token for this device/session
      // In production, this would come from expo-notifications
      const token = await this.getOrCreateToken();

      if (!token) {
        return {
          success: false,
          message: 'No se pudo obtener token de notificaciones',
        };
      }

      // Register token with API
      const result = await apiService.registerPushToken(token, platform, accessToken);

      if (result.success) {
        this.pushToken = token;
        console.log('[PushNotifications] Token registrado:', token.substring(0, 20) + '...');
        return {
          success: true,
          token,
        };
      }

      return {
        success: false,
        message: result.message || 'Error al registrar token',
      };
    } catch (error) {
      console.error('[PushNotifications] Error:', error);
      return {
        success: false,
        message: 'Error al configurar notificaciones',
      };
    }
  }

  async unregisterPushNotifications(accessToken: string): Promise<boolean> {
    try {
      if (!this.pushToken) {
        return true;
      }

      const result = await apiService.deletePushToken(this.pushToken, accessToken);
      if (result.success) {
        this.pushToken = null;
        console.log('[PushNotifications] Token eliminado');
      }
      return result.success;
    } catch (error) {
      console.error('[PushNotifications] Error al eliminar token:', error);
      return false;
    }
  }

  private async getOrCreateToken(): Promise<string | null> {
    // For development/web: generate a mock token
    // Format: platform_timestamp_random
    const platform = Platform.OS;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);

    // Create a unique token identifier
    const token = `expo_${platform}_${timestamp}_${random}`;

    return token;
  }

  getCurrentToken(): string | null {
    return this.pushToken;
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    // For now, always return true since we have mock implementation
    // In production, check for actual device capabilities
    return true;
  }
}

export const pushNotificationService = new PushNotificationService();
