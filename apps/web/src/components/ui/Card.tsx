import { type ReactNode, type MouseEventHandler } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

function Card({ children, className, padding = true, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm',
        padding && 'p-4',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export { Card };
