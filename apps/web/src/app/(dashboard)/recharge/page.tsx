'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Check, Ticket, Home, History } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService, type Student, type RechargePackage } from '@/lib/api';
import { Card, Button, Avatar, LoadingSpinner } from '@/components/ui';
import { cn } from '@/lib/utils';

type PaymentMethod = 'credit_card' | 'debit_card' | 'transfer';

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function RechargeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('studentId');
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, [accessToken]);

  useEffect(() => {
    if (selectedStudent) {
      loadPackages(selectedStudent.school.id);
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
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

  const loadPackages = async (schoolId: string) => {
    if (!accessToken) return;

    try {
      const response = await apiService.getRechargePackagesBySchool(schoolId, accessToken);
      if (response.success && response.data?.packages) {
        setPackages(response.data.packages);
      } else {
        setPackages([]);
      }
    } catch {
      setPackages([]);
    }
  };

  const getAmount = (): number => {
    return selectedPackage?.price || 0;
  };

  const handlePayment = async () => {
    const amount = getAmount();

    if (amount < 1000) {
      setError('El monto minimo de recarga es $1.000');
      return;
    }

    if (!selectedStudent || !accessToken) {
      setError('No se pudo procesar el pago');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await apiService.initPayment({
        studentId: selectedStudent.id,
        amount,
        packageId: selectedPackage?.id,
        paymentMethod,
      }, accessToken);

      if (response.success && response.data) {
        setSuccess(true);
      } else {
        setError(response.message || 'No se pudo procesar el pago');
      }
    } catch {
      setError('Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">Comprar Tickets</h1>
        </div>

        <Card className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="h-10 w-10 text-success" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-success mb-2">Compra Exitosa!</h2>
          <p className="text-text-secondary mb-6">
            Tu compra de tickets por {formatCLP(getAmount())} se ha procesado correctamente.
          </p>

          <div className="bg-surface rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Estudiante:</span>
              <span className="font-medium text-text">
                {selectedStudent?.firstName} {selectedStudent?.lastName}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Monto pagado:</span>
              <span className="font-medium text-success">{formatCLP(getAmount())}</span>
            </div>
            {selectedPackage && selectedPackage.ticketCount && (
              <div className="flex justify-between py-2">
                <span className="text-text-secondary">Tickets agregados:</span>
                <span className="font-medium text-primary">
                  +{selectedPackage.ticketCount} {selectedPackage.ticketType || 'general'}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Link href="/dashboard">
              <Button fullWidth>
                <Home className="h-4 w-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="outline" fullWidth>
                <History className="h-4 w-4 mr-2" />
                Ver historial
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-text-secondary hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-text">Comprar Tickets</h1>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-error/10 border border-error">
          <p className="text-error text-center">{error}</p>
        </Card>
      )}

      {students.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-text-secondary mb-4">No tienes estudiantes vinculados</p>
          <Link href="/students/add">
            <Button>Agregar Estudiante</Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* Student Selector */}
          <Card className="p-4">
            <h3 className="font-semibold text-text mb-3">Seleccionar Estudiante</h3>
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

            {/* Selected Student Info */}
            {selectedStudent && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-text">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </p>
                    <p className="text-sm text-text-secondary">{selectedStudent.school.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Tickets actuales</p>
                    {selectedStudent.tickets && selectedStudent.tickets.length > 0 ? (
                      selectedStudent.tickets.map((ticket, idx) => (
                        <p key={idx} className="text-sm font-bold text-text">
                          {ticket.quantity}x {ticket.type}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-text-secondary">Sin tickets</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Packages Section */}
          {packages.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-text mb-3">Paquetes de tickets disponibles</h3>
              <div className="space-y-3">
                {packages.map((pkg) => {
                  const isSelected = selectedPackage?.id === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={cn(
                        'w-full flex justify-between items-center p-4 rounded-lg border transition-colors text-left',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-surface hover:border-primary/50'
                      )}
                    >
                      <div>
                        <p className="font-medium text-text">{pkg.name}</p>
                        {pkg.description && (
                          <p className="text-sm text-text-secondary">{pkg.description}</p>
                        )}
                        {pkg.type === 'ticket' && pkg.ticketCount && (
                          <p className="text-sm text-primary mt-1">
                            {pkg.ticketCount} tickets incluidos
                          </p>
                        )}
                      </div>
                      <span className={cn(
                        'text-lg font-bold',
                        isSelected ? 'text-primary' : 'text-text'
                      )}>
                        {formatCLP(pkg.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Coupon Section - Placeholder */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-text-secondary" />
                <h3 className="font-semibold text-text">Cupones de descuento</h3>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium uppercase">
                Proximamente
              </span>
            </div>
            <div className="text-center py-6 bg-surface rounded-lg border border-dashed border-border">
              <Ticket className="h-12 w-12 text-border mx-auto mb-2" />
              <p className="text-sm text-text-secondary">
                Pronto podras aplicar cupones de descuento en tus recargas
              </p>
              <p className="text-xs text-text-secondary mt-1 italic">
                Mantente atento a las promociones de tu colegio
              </p>
            </div>
          </Card>

          {/* Payment Method */}
          <Card className="p-4">
            <h3 className="font-semibold text-text mb-3">Metodo de pago</h3>
            <div className="space-y-2">
              {[
                { value: 'credit_card' as const, label: 'Tarjeta de credito', icon: CreditCard },
                { value: 'debit_card' as const, label: 'Tarjeta de debito', icon: CreditCard },
                { value: 'transfer' as const, label: 'Transferencia bancaria', icon: CreditCard },
              ].map((method) => {
                const isSelected = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        isSelected ? 'border-primary' : 'border-border'
                      )}
                    >
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <method.icon className="h-5 w-5 text-text-secondary" />
                    <span className="text-text">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Summary */}
          {getAmount() > 0 && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h3 className="font-semibold text-primary mb-3">Resumen</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Precio:</span>
                  <span className="font-medium text-text">{formatCLP(getAmount())}</span>
                </div>
                {selectedPackage && selectedPackage.ticketCount && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Tickets a agregar:</span>
                    <span className="font-medium text-success">
                      +{selectedPackage.ticketCount} {selectedPackage.ticketType || 'general'}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Pay Button */}
          <Button
            fullWidth
            size="lg"
            onClick={handlePayment}
            loading={processing}
            disabled={processing || getAmount() < 1000}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            {processing ? 'Procesando...' : `Pagar ${formatCLP(getAmount())}`}
          </Button>

          <p className="text-xs text-text-secondary text-center italic">
            Este es un ambiente de prueba. No se realizaran cargos reales.
          </p>
        </>
      )}
    </div>
  );
}

export default function RechargePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <RechargeContent />
    </Suspense>
  );
}
