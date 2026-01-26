'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Wallet, ShoppingCart, ArrowDownCircle, Settings, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService, type Student, type WalletLog } from '@/lib/api';
import { Card, Button, Avatar, LoadingSpinner } from '@/components/ui';
import { cn } from '@/lib/utils';

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'deposit':
      return ArrowDownCircle;
    case 'purchase':
      return ShoppingCart;
    case 'refund':
      return ArrowDownCircle;
    case 'adjustment':
      return Settings;
    default:
      return Wallet;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'deposit':
      return 'Recarga';
    case 'purchase':
      return 'Compra';
    case 'refund':
      return 'Reembolso';
    case 'adjustment':
      return 'Ajuste';
    default:
      return type;
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'deposit':
    case 'refund':
      return 'text-success bg-success/10';
    case 'purchase':
      return 'text-error bg-error/10';
    case 'adjustment':
      return 'text-warning bg-warning/10';
    default:
      return 'text-text-secondary bg-surface';
  }
}

function WalletHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('studentId');
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [logs, setLogs] = useState<WalletLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, [accessToken]);

  useEffect(() => {
    if (selectedStudent) {
      loadWalletLogs();
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.getStudents(accessToken);
      if (response.success && response.data) {
        setStudents(response.data);
        // If studentId is provided, select that student
        if (studentIdParam) {
          const student = response.data.find(s => s.id === studentIdParam);
          if (student) {
            setSelectedStudent(student);
          } else if (response.data.length > 0) {
            setSelectedStudent(response.data[0]);
          }
        } else if (response.data.length > 0) {
          setSelectedStudent(response.data[0]);
        }
      }
    } catch {
      setError('Error al cargar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const loadWalletLogs = async () => {
    if (!accessToken || !selectedStudent) return;

    setRefreshing(true);
    setError(null);

    try {
      const logsResponse = await apiService.getWalletLogs(selectedStudent.id, accessToken);
      if (logsResponse.success && logsResponse.data) {
        setLogs(logsResponse.data.logs || []);
      } else {
        setLogs([]);
      }
    } catch {
      setError('Error al cargar historial');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadWalletLogs();
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
          <h1 className="text-2xl font-bold text-text">Historial de Tickets</h1>
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
        </Card>
      )}

      {/* Student Selector */}
      {students.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {students.map((student) => {
            const isSelected = selectedStudent?.id === student.id;
            return (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className="flex flex-col items-center min-w-[70px]"
              >
                <div
                  className={cn(
                    'rounded-full p-0.5 transition-colors',
                    isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                  )}
                >
                  <Avatar
                    src={student.photoUrl}
                    name={`${student.firstName} ${student.lastName}`}
                    size="lg"
                  />
                </div>
                <span
                  className={cn(
                    'text-xs mt-1.5 truncate max-w-[70px]',
                    isSelected ? 'text-primary font-medium' : 'text-text-secondary'
                  )}
                >
                  {student.firstName}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Current Tickets Card */}
      {selectedStudent && (
        <Card className="p-6 text-center">
          <p className="text-sm text-text-secondary mb-2">Tickets Actuales</p>
          {selectedStudent.tickets && selectedStudent.tickets.length > 0 ? (
            selectedStudent.tickets.map((ticket, idx) => (
              <p key={idx} className="text-3xl font-bold text-success">
                {ticket.quantity}x {ticket.type}
              </p>
            ))
          ) : (
            <p className="text-3xl font-bold text-text-secondary">Sin tickets</p>
          )}
        </Card>
      )}

      {/* Wallet Logs List */}
      {logs.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text">Movimientos</h3>
          {logs.map((log) => {
            const Icon = getTypeIcon(log.type);
            const colorClass = getTypeColor(log.type);
            const [iconColor, bgColor] = colorClass.split(' ');

            return (
              <Card key={log.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', bgColor)}>
                    <Icon className={cn('h-5 w-5', iconColor)} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text">{getTypeLabel(log.type)}</p>
                    <p className="text-sm text-text-secondary">{log.description || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-bold',
                      log.amount >= 0 ? 'text-success' : 'text-error'
                    )}>
                      {log.amount >= 0 ? '+' : ''}{formatCLP(log.amount)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-text-secondary">{formatDateTime(log.createdAt)}</p>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Wallet className="h-12 w-12 text-text-secondary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text mb-2">Sin movimientos</h3>
          <p className="text-text-secondary">
            Aun no hay compras ni consumos de tickets registrados.
            Las compras y consumos apareceran aqui.
          </p>
        </Card>
      )}
    </div>
  );
}

export default function WalletHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <WalletHistoryContent />
    </Suspense>
  );
}
