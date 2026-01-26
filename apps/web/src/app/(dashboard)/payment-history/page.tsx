'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, CheckCircle, Clock, XCircle, Undo, RefreshCw, X, User, Calendar, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService, type Payment } from '@/lib/api';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { cn } from '@/lib/utils';

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return { bg: 'bg-success/10', text: 'text-success' };
    case 'pending':
    case 'processing':
      return { bg: 'bg-warning/10', text: 'text-warning' };
    case 'failed':
      return { bg: 'bg-error/10', text: 'text-error' };
    case 'refunded':
      return { bg: 'bg-gray-100', text: 'text-text-secondary' };
    default:
      return { bg: 'bg-gray-100', text: 'text-text-secondary' };
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return 'Completado';
    case 'pending':
      return 'Pendiente';
    case 'processing':
      return 'Procesando';
    case 'failed':
      return 'Fallido';
    case 'refunded':
      return 'Reembolsado';
    default:
      return status;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return CheckCircle;
    case 'pending':
    case 'processing':
      return Clock;
    case 'failed':
      return XCircle;
    case 'refunded':
      return Undo;
    default:
      return Clock;
  }
}

function getPaymentMethodLabel(gateway: string) {
  switch (gateway) {
    case 'mock':
      return 'Tarjeta';
    case 'transbank':
      return 'Transbank';
    case 'mercadopago':
      return 'MercadoPago';
    default:
      return gateway;
  }
}

export default function PaymentHistoryPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setError('No se pudo cargar la informacion');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await apiService.getPayments(accessToken);
      if (response.success && response.data) {
        setPayments(response.data.payments);
      } else {
        setError(response.message || 'Error al cargar historial de pagos');
      }
    } catch {
      setError('Error de conexion');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

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
          <div>
            <h1 className="text-2xl font-bold text-text">Historial de Pagos</h1>
            <p className="text-sm text-text-secondary">
              {payments.length} {payments.length === 1 ? 'pago' : 'pagos'}
            </p>
          </div>
        </div>
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

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-error/10 border border-error">
          <p className="text-error text-center">{error}</p>
          <div className="mt-3 flex justify-center">
            <Button onClick={loadData}>Reintentar</Button>
          </div>
        </Card>
      )}

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="p-4 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
              <h3 className="text-lg font-semibold text-text">Detalle del Pago</h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1 text-text-secondary hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Monto:</span>
                <span className="font-semibold text-text">{formatCLP(selectedPayment.amount)}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-text-secondary">Estado:</span>
                {(() => {
                  const StatusIcon = getStatusIcon(selectedPayment.status);
                  const { bg, text } = getStatusColor(selectedPayment.status);
                  return (
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1', bg, text)}>
                      <StatusIcon className="h-3 w-3" />
                      {getStatusLabel(selectedPayment.status)}
                    </span>
                  );
                })()}
              </div>

              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Metodo:</span>
                <span className="font-medium text-text">{getPaymentMethodLabel(selectedPayment.gateway)}</span>
              </div>

              {selectedPayment.student && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">Estudiante:</span>
                  <span className="font-medium text-text">
                    {selectedPayment.student.firstName} {selectedPayment.student.lastName}
                  </span>
                </div>
              )}

              {selectedPayment.package && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">Paquete:</span>
                  <span className="font-medium text-text">{selectedPayment.package.name}</span>
                </div>
              )}

              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Fecha:</span>
                <span className="font-medium text-text">{formatDate(selectedPayment.createdAt)}</span>
              </div>

              {selectedPayment.completedAt && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">Completado:</span>
                  <span className="font-medium text-text">{formatDate(selectedPayment.completedAt)}</span>
                </div>
              )}

              <div className="flex justify-between py-2">
                <span className="text-text-secondary">ID:</span>
                <span className="text-xs text-text-secondary font-mono max-w-[60%] truncate">
                  {selectedPayment.id}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              fullWidth
              onClick={() => setSelectedPayment(null)}
              className="mt-4"
            >
              Cerrar
            </Button>
          </Card>
        </div>
      )}

      {/* Payments List */}
      {payments.length > 0 ? (
        <div className="space-y-3">
          {payments.map((payment) => {
            const StatusIcon = getStatusIcon(payment.status);
            const { bg, text } = getStatusColor(payment.status);

            return (
              <Card
                key={payment.id}
                className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedPayment(payment)}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-text">{formatCLP(payment.amount)}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1', bg, text)}>
                      <StatusIcon className="h-3 w-3" />
                      {getStatusLabel(payment.status)}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-secondary" />
                </div>

                <div className="space-y-1">
                  {payment.student && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <User className="h-4 w-4" />
                      <span>{payment.student.firstName} {payment.student.lastName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <CreditCard className="h-4 w-4" />
                    <span>{getPaymentMethodLabel(payment.gateway)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(payment.createdAt)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <CreditCard className="h-12 w-12 text-text-secondary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text mb-2">Sin pagos</h3>
          <p className="text-text-secondary">
            No hay pagos registrados todavia.
            Los pagos apareceran aqui cuando realices recargas.
          </p>
        </Card>
      )}
    </div>
  );
}
