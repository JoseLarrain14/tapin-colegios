'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ShoppingCart, Calculator, BarChart3, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService, type Student } from '@/lib/api';
import { Card, Button, Avatar, LoadingSpinner } from '@/components/ui';
import { cn } from '@/lib/utils';

type Period = 'daily' | 'weekly' | 'monthly';

interface StatsData {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalSpent: number;
    transactionCount: number;
    averagePerTransaction: number;
    currentBalance: number;
  };
  chartData: Array<{
    label: string;
    spent: number;
    count: number;
  }>;
}

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function getPeriodLabel(p: Period) {
  switch (p) {
    case 'daily':
      return 'Hoy';
    case 'weekly':
      return 'Semana';
    case 'monthly':
      return 'Mes';
  }
}

function SpendingStatsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('studentId');
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [period, setPeriod] = useState<Period>('daily');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, [accessToken]);

  const loadStats = useCallback(async () => {
    if (!accessToken || !selectedStudent) return;

    setRefreshing(true);
    setError(null);

    try {
      const statsResponse = await apiService.getWalletStats(selectedStudent.id, period, accessToken);
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        // If no stats available, show empty state
        setStats({
          period,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          summary: {
            totalSpent: 0,
            transactionCount: 0,
            averagePerTransaction: 0,
            currentBalance: 0,
          },
          chartData: [],
        });
      }
    } catch {
      // On error, show empty state
      setStats({
        period,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        summary: {
          totalSpent: 0,
          transactionCount: 0,
          averagePerTransaction: 0,
          currentBalance: 0,
        },
        chartData: [],
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [accessToken, selectedStudent, period]);

  useEffect(() => {
    if (selectedStudent) {
      setLoading(true);
      loadStats();
    }
  }, [selectedStudent, period, loadStats]);

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
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch {
      setError('Error al cargar estudiantes');
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
  };

  const handleRefresh = () => {
    loadStats();
  };

  // Calculate max spent for bar chart scaling
  const maxSpent = stats?.chartData?.length
    ? Math.max(...stats.chartData.map(d => d.spent), 1)
    : 1;

  if (loading && !refreshing) {
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
          <h1 className="text-2xl font-bold text-text">Estadisticas de Gastos</h1>
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

      {/* Period Selector */}
      <div className="flex gap-2">
        {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={cn(
              'flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors',
              period === p
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:bg-border'
            )}
          >
            {getPeriodLabel(p)}
          </button>
        ))}
      </div>

      {/* Summary Card */}
      {stats && (
        <Card className="p-4">
          <h3 className="font-semibold text-text mb-4">Resumen</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-full bg-error/10">
                  <ShoppingCart className="h-5 w-5 text-error" />
                </div>
              </div>
              <p className="text-xs text-text-secondary">Total Gastado</p>
              <p className="text-lg font-bold text-error">{formatCLP(stats.summary.totalSpent)}</p>
            </div>
            <div className="bg-surface rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-text-secondary">Transacciones</p>
              <p className="text-lg font-bold text-text">{stats.summary.transactionCount}</p>
            </div>
            <div className="col-span-2 bg-surface rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-full bg-warning/10">
                  <Calculator className="h-5 w-5 text-warning" />
                </div>
              </div>
              <p className="text-xs text-text-secondary">Promedio</p>
              <p className="text-lg font-bold text-text">{formatCLP(stats.summary.averagePerTransaction)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Chart */}
      {stats && stats.chartData.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-text mb-4">Desglose</h3>
          <div className="space-y-3">
            {stats.chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-text-secondary w-16 text-right shrink-0">
                  {item.label}
                </span>
                <div className="flex-1 h-5 bg-surface rounded overflow-hidden">
                  <div
                    className="h-full bg-primary rounded transition-all"
                    style={{ width: `${(item.spent / maxSpent) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-text w-16 shrink-0">
                  {formatCLP(item.spent)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {stats && stats.chartData.length === 0 && (
        <Card className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-text-secondary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text mb-2">Sin gastos</h3>
          <p className="text-text-secondary">
            No hay gastos registrados en este periodo.
            Los gastos apareceran aqui cuando se realicen compras.
          </p>
        </Card>
      )}
    </div>
  );
}

export default function SpendingStatsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <SpendingStatsContent />
    </Suspense>
  );
}
