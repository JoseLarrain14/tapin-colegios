'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Ticket, Gift, Star, Coins } from 'lucide-react';
import { Card, Button } from '@/components/ui';

export default function CouponsPage() {
  const router = useRouter();

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
        <h1 className="text-2xl font-bold text-text">Cupones</h1>
      </div>

      {/* Coming Soon Card */}
      <Card className="p-8 text-center bg-primary/5">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-background flex items-center justify-center">
          <Ticket className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-3">Proximamente</h2>
        <p className="text-text mb-2">
          Estamos trabajando en un sistema de cupones y descuentos para que puedas ahorrar en tus compras.
        </p>
        <p className="text-sm text-text-secondary">
          Pronto podras canjear codigos promocionales y acceder a ofertas exclusivas.
        </p>
      </Card>

      {/* Features Preview */}
      <Card className="p-6">
        <h3 className="font-semibold text-text mb-6">Lo que viene</h3>

        <div className="space-y-4">
          <div className="flex items-start gap-4 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <Coins className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-text">Descuentos exclusivos</p>
              <p className="text-sm text-text-secondary">
                Ofertas especiales para usuarios frecuentes
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-text">Codigos promocionales</p>
              <p className="text-sm text-text-secondary">
                Canjea codigos para obtener beneficios
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
              <Star className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium text-text">Programa de fidelidad</p>
              <p className="text-sm text-text-secondary">
                Acumula puntos con cada compra
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Back Button */}
      <Button
        variant="outline"
        fullWidth
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>
    </div>
  );
}
