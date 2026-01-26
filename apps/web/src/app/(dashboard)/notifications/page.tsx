'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService, type Notification } from '@/lib/api';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { cn } from '@/lib/utils';

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return formatDateTime(dateStr);
}

function getNotificationIcon(type: string | undefined) {
  switch (type) {
    case 'purchase_alert':
      return '🛒';
    case 'low_balance_alert':
      return '⚠️';
    case 'order_status_update':
      return '📦';
    default:
      return '🔔';
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!accessToken) return;

    try {
      setError(null);
      const response = await apiService.getNotifications(accessToken);
      if (response.success && response.data) {
        setNotifications(response.data);
      }
    } catch {
      setError('Error al cargar notificaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.read && accessToken) {
      await apiService.markNotificationRead(notification.id, accessToken);
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    }

    // Navigate based on notification type
    const notifData = notification.data as Record<string, string> | undefined;
    if (notifData?.type === 'purchase_alert' && notifData.orderId) {
      router.push(`/history?orderId=${notifData.orderId}`);
    } else if (notifData?.type === 'low_balance_alert') {
      router.push('/dashboard');
    } else if (notifData?.type === 'order_status_update' && notifData.orderId) {
      router.push(`/history?orderId=${notifData.orderId}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!accessToken) return;
    await apiService.markAllNotificationsRead(accessToken);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-text-secondary hover:text-text"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text">Notificaciones</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-error text-white text-xs font-medium rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary font-medium hover:underline"
            >
              Marcar todas
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              'p-2 text-text-secondary hover:text-text',
              refreshing && 'animate-spin'
            )}
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-error/10 border border-error">
          <p className="text-error text-center">{error}</p>
        </Card>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="h-12 w-12 text-text-secondary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text mb-2">Sin notificaciones</h3>
          <p className="text-text-secondary">
            No tienes notificaciones por el momento.
            Te avisaremos cuando haya actividad en las cuentas de tus hijos.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                'p-4 cursor-pointer hover:border-primary/50 transition-colors',
                !notification.read && 'border-l-4 border-l-primary'
              )}
              onClick={() => handleNotificationPress(notification)}
            >
              <div className="flex gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xl">
                    {getNotificationIcon((notification.data as Record<string, unknown> | undefined)?.type as string | undefined)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      'font-semibold text-text truncate',
                      !notification.read && 'font-bold'
                    )}>
                      {notification.title}
                    </span>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                    {notification.body}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span>{formatDateTime(notification.createdAt)}</span>
                    <span>({formatRelativeTime(notification.createdAt)})</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
