import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm',
        padding && 'p-4',
        className
      )}
    >
      {children}
    </div>
  );
}

export { Card };
