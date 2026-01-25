import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'current';
  className?: string;
}

function LoadingSpinner({ size = 'md', color = 'primary', className }: LoadingSpinnerProps) {
  return (
    <svg
      className={cn(
        'animate-spin',
        {
          'h-4 w-4': size === 'sm',
          'h-6 w-6': size === 'md',
          'h-10 w-10': size === 'lg',
        },
        {
          'text-primary': color === 'primary',
          'text-white': color === 'white',
          'text-current': color === 'current',
        },
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Cargando"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export interface FullPageLoaderProps {
  message?: string;
}

function FullPageLoader({ message = 'Cargando...' }: FullPageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
      {message && (
        <p className="mt-4 text-text-secondary">{message}</p>
      )}
    </div>
  );
}

export { LoadingSpinner, FullPageLoader };
