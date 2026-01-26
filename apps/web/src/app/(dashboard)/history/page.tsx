'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService, type Student, type Order, type Payment, type TicketConsumption } from '@/lib/api';
import { Card, Button, LoadingSpinner, Dialog } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatDateTime, formatRelativeTime, formatCLP } from '@/utils/dateFormat';

interface TransactionItem {
  id: string;
  type: 'order' | 'payment' | 'ticket_consumption';
  title: string;
  description: string;
  amount: number;
  isPositive: boolean;
  timestamp: string;
  status?: string;
  studentName?: string;
  source?: 'app' | 'casino';
  orderItems?: Array<{ name: string; price: number; quantity: number }>;
  cafeteriaName?: string;
  ticketType?: string;
  ticketQuantity?: number;
}

const ITEMS_PER_PAGE = 10;

function HistoryContent() {
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('studentId');

  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [quickDateFilter, setQuickDateFilter] = useState<'today' | 'week' | 'month' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Order detail dialog
  const [selectedOrder, setSelectedOrder] = useState<TransactionItem | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken) return;

    try {
      setError(null);

      // Get students
      const studentsResponse = await apiService.getStudents(accessToken);
      if (studentsResponse.success && studentsResponse.data) {
        const studentList = Array.isArray(studentsResponse.data) ? studentsResponse.data : [];
        setStudents(studentList);

        // Set selected student from URL param
        if (studentIdParam && studentList.length > 0) {
          const targetStudent = studentList.find(s => s.id === studentIdParam);
          if (targetStudent) {
            setSelectedStudent(targetStudent);
          }
        }
      }

      // Get orders
      const ordersResponse = await apiService.getOrders(accessToken);
      const orders = ordersResponse.success && ordersResponse.data
        ? ordersResponse.data.orders || []
        : [];

      // Get payments
      const paymentsResponse = await apiService.getPayments(accessToken);
      const payments = paymentsResponse.success && paymentsResponse.data
        ? paymentsResponse.data.payments || []
        : [];

      // Get ticket consumptions
      const consumptionsResponse = await apiService.getTicketConsumptions(accessToken);
      const consumptions = consumptionsResponse.success && consumptionsResponse.data
        ? consumptionsResponse.data.consumptions || []
        : [];

      // Transform orders
      const orderTransactions: TransactionItem[] = orders.map((order: Order) => ({
        id: order.id,
        type: 'order' as const,
        title: 'Pedido en cafeteria',
        description: `${order.items.length} item${order.items.length !== 1 ? 's' : ''} - ${order.cafeteria.name}`,
        amount: order.total,
        isPositive: false,
        timestamp: order.createdAt,
        status: order.status,
        studentName: `${order.student.firstName} ${order.student.lastName}`,
        source: 'app' as const,
        orderItems: order.items.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        cafeteriaName: order.cafeteria.name,
      }));

      // Transform payments
      const paymentTransactions: TransactionItem[] = payments.map((payment: Payment) => ({
        id: payment.id,
        type: 'payment' as const,
        title: payment.package ? `Compra: ${payment.package.name}` : 'Compra de tickets',
        description: payment.student ? `Para ${payment.student.firstName}` : 'Recarga',
        amount: payment.amount,
        isPositive: true,
        timestamp: payment.createdAt,
        status: payment.status,
        studentName: payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : undefined,
      }));

      // Transform ticket consumptions
      const consumptionTransactions: TransactionItem[] = consumptions.map((consumption: TicketConsumption) => ({
        id: consumption.id,
        type: 'ticket_consumption' as const,
        title: 'Ticket usado',
        description: `${consumption.ticketQuantity} ticket(s) de ${consumption.ticketType}`,
        amount: 0,
        isPositive: false,
        timestamp: consumption.createdAt,
        status: 'completed',
        studentName: `${consumption.student.firstName} ${consumption.student.lastName}`,
        source: consumption.source,
        cafeteriaName: consumption.cafeteria?.name,
        ticketType: consumption.ticketType,
        ticketQuantity: consumption.ticketQuantity,
      }));

      // Combine and sort
      const allTransactions = [...orderTransactions, ...paymentTransactions, ...consumptionTransactions].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setTransactions(allTransactions);
    } catch {
      setError('Error de conexion. Verifica tu internet.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, studentIdParam]);

  useEffect(() => {
    loadData();
  }, []);

  // Filter logic
  const isInSelectedMonth = (timestamp: string) => {
    if (!selectedMonth) return true;
    const date = new Date(timestamp);
    return date.getMonth() === selectedMonth.getMonth() &&
           date.getFullYear() === selectedMonth.getFullYear();
  };

  const isInQuickDateFilter = (timestamp: string) => {
    if (!quickDateFilter) return true;
    const transactionDate = new Date(timestamp);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (quickDateFilter === 'today') {
      return transactionDate >= startOfToday && transactionDate <= endOfToday;
    }
    if (quickDateFilter === 'week') {
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday, 0, 0, 0, 0);
      return transactionDate >= startOfWeek && transactionDate <= endOfToday;
    }
    if (quickDateFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return transactionDate >= startOfMonth && transactionDate <= endOfToday;
    }
    return true;
  };

  const filteredTransactions = transactions.filter(t => {
    if (selectedStudent && t.studentName && !t.studentName.includes(selectedStudent.firstName)) {
      return false;
    }
    if (!quickDateFilter && !isInSelectedMonth(t.timestamp)) {
      return false;
    }
    if (quickDateFilter && !isInQuickDateFilter(t.timestamp)) {
      return false;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStudent, selectedMonth, quickDateFilter]);

  // Available months
  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      const date = new Date(t.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });
    return Array.from(monthsSet).sort().reverse().map(key => {
      const [year, month] = key.split('-').map(Number);
      return new Date(year, month - 1, 1);
    });
  };

  const formatMonth = (date: Date) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'bg-success/20 text-success';
      case 'pending':
      case 'confirmed':
      case 'preparing':
      case 'ready':
        return 'bg-warning/20 text-warning';
      case 'failed':
      case 'cancelled':
        return 'bg-error/20 text-error';
      default:
        return 'bg-border text-text-secondary';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'delivered': return 'Entregado';
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Listo';
      case 'failed': return 'Fallido';
      case 'cancelled': return 'Cancelado';
      case 'processing': return 'Procesando';
      case 'refunded': return 'Reembolsado';
      default: return status || '';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return '&#127869;';
      case 'payment': return '&#128179;';
      case 'ticket_consumption': return '&#127915;';
      default: return '&#128203;';
    }
  };

  const hasActiveFilters = selectedStudent || selectedMonth || quickDateFilter;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-text-secondary">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-error mb-4">{error}</p>
        <Button onClick={loadData}>Reintentar</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Historial</h1>
        <p className="text-text-secondary">Transacciones y movimientos</p>
      </div>

      {/* Reset filters */}
      {hasActiveFilters && (
        <button
          onClick={() => {
            setSelectedStudent(null);
            setSelectedMonth(null);
            setQuickDateFilter(null);
          }}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <X className="h-4 w-4" />
          Restablecer filtros
        </button>
      )}

      {/* Student filter */}
      {students.length > 1 && (
        <Card className="p-4">
          <p className="text-sm font-medium text-text-secondary mb-3">Filtrar por hijo</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedStudent(null)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
                !selectedStudent
                  ? 'bg-primary text-white font-medium'
                  : 'bg-surface text-text-secondary hover:bg-border'
              )}
            >
              Todos
            </button>
            {students.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
                  selectedStudent?.id === student.id
                    ? 'bg-primary text-white font-medium'
                    : 'bg-surface text-text-secondary hover:bg-border'
                )}
              >
                {student.firstName}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Date filter */}
      <Card className="p-4">
        <p className="text-sm font-medium text-text-secondary mb-3">Periodo</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: null, label: 'Todo' },
            { key: 'today', label: 'Hoy' },
            { key: 'week', label: 'Esta semana' },
            { key: 'month', label: 'Este mes' },
          ].map(({ key, label }) => (
            <button
              key={label}
              onClick={() => {
                setQuickDateFilter(key as typeof quickDateFilter);
                setSelectedMonth(null);
              }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
                quickDateFilter === key && !selectedMonth
                  ? 'bg-primary text-white font-medium'
                  : 'bg-surface text-text-secondary hover:bg-border'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Month filter */}
      {getAvailableMonths().length > 0 && !quickDateFilter && (
        <Card className="p-4">
          <p className="text-sm font-medium text-text-secondary mb-3">Filtrar por mes</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedMonth(null)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
                !selectedMonth
                  ? 'bg-primary text-white font-medium'
                  : 'bg-surface text-text-secondary hover:bg-border'
              )}
            >
              Todo
            </button>
            {getAvailableMonths().map((month, index) => (
              <button
                key={index}
                onClick={() => setSelectedMonth(month)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
                  selectedMonth?.getTime() === month.getTime()
                    ? 'bg-primary text-white font-medium'
                    : 'bg-surface text-text-secondary hover:bg-border'
                )}
              >
                {formatMonth(month)}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Summary */}
      <Card className="p-4">
        <h3 className="font-semibold text-text mb-3">
          Resumen
          {quickDateFilter === 'today' && ' - Hoy'}
          {quickDateFilter === 'week' && ' - Esta semana'}
          {quickDateFilter === 'month' && ' - Este mes'}
          {selectedMonth && ` - ${formatMonth(selectedMonth)}`}
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-text-secondary">Total pagado:</span>
            <span className="font-semibold text-text">
              {formatCLP(filteredTransactions.filter(t => t.isPositive).reduce((sum, t) => sum + t.amount, 0))}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-text-secondary">Tickets usados:</span>
            <span className="font-semibold text-text">
              {filteredTransactions
                .filter(t => t.type === 'ticket_consumption')
                .reduce((sum, t) => sum + (t.ticketQuantity || 0), 0)} ticket(s)
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-text-secondary">Recargas:</span>
            <span className="font-semibold text-text">
              {filteredTransactions.filter(t => t.type === 'payment').length}
            </span>
          </div>
        </div>
      </Card>

      {/* Transactions */}
      {filteredTransactions.length > 0 ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-text">Movimientos recientes</h2>
            <span className="text-sm text-text-secondary">
              {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} de {filteredTransactions.length}
            </span>
          </div>

          {paginatedTransactions.map(transaction => (
            <Card
              key={transaction.id}
              className={cn(
                'p-4',
                transaction.type === 'order' && 'cursor-pointer hover:ring-2 hover:ring-primary/20'
              )}
              onClick={() => transaction.type === 'order' && setSelectedOrder(transaction)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl" dangerouslySetInnerHTML={{ __html: getTypeIcon(transaction.type) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text">{transaction.title}</span>
                    {transaction.source && (
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        transaction.source === 'app' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'
                      )}>
                        {transaction.source === 'app' ? 'Via App' : 'En cafeteria'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">{transaction.description}</p>
                  {transaction.studentName && (
                    <p className="text-xs text-text-secondary">{transaction.studentName}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn(
                    'font-bold',
                    transaction.isPositive ? 'text-success' : 'text-error'
                  )}>
                    {transaction.isPositive ? '+' : '-'}{formatCLP(transaction.amount)}
                  </p>
                  {transaction.status && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      getStatusColor(transaction.status)
                    )}>
                      {getStatusText(transaction.status)}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                <div className="text-xs text-text-secondary">
                  {formatDateTime(transaction.timestamp)}
                  <span className="ml-2 text-text-secondary/60">
                    ({formatRelativeTime(transaction.timestamp)})
                  </span>
                </div>
              </div>
              {transaction.type === 'order' && (
                <p className="text-xs text-text-secondary text-center mt-2 italic">
                  Toca para ver detalles
                </p>
              )}
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4 border-t border-border">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center bg-surface transition-colors',
                  currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-border'
                )}
              >
                <ChevronLeft className="h-5 w-5 text-primary" />
              </button>
              <span className="text-sm text-text-secondary px-4">
                Pagina {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center bg-surface transition-colors',
                  currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-border'
                )}
              >
                <ChevronRight className="h-5 w-5 text-primary" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="text-5xl mb-4">&#128203;</div>
          <h3 className="text-lg font-semibold text-text mb-2">Sin transacciones</h3>
          <p className="text-text-secondary">
            Aun no hay transacciones registradas. Cuando realices recargas o pedidos, apareceran aqui.
          </p>
        </Card>
      )}

      {/* Order Detail Dialog */}
      <Dialog
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Detalle del pedido"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-secondary">Estado:</span>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-sm',
                getStatusColor(selectedOrder.status)
              )}>
                {getStatusText(selectedOrder.status)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Fecha:</span>
              <span className="text-text">{formatDateTime(selectedOrder.timestamp)}</span>
            </div>
            {selectedOrder.cafeteriaName && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Cafeteria:</span>
                <span className="text-text">{selectedOrder.cafeteriaName}</span>
              </div>
            )}
            {selectedOrder.studentName && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Estudiante:</span>
                <span className="text-text">{selectedOrder.studentName}</span>
              </div>
            )}

            {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
              <div className="pt-2">
                <p className="font-semibold text-text mb-2">Items del pedido</p>
                {selectedOrder.orderItems.map((item, index) => (
                  <div key={index} className="flex justify-between py-1">
                    <span className="text-text">{item.quantity}x {item.name}</span>
                    <span className="text-text-secondary">{formatCLP(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t-2 border-primary">
              <span className="font-semibold text-text">Total:</span>
              <span className="font-bold text-lg text-primary">{formatCLP(selectedOrder.amount)}</span>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-text-secondary">Cargando historial...</p>
          </div>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
