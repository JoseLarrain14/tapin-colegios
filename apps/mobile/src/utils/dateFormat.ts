// Date formatting utilities for Chilean Spanish locale
// Feature #151: Timestamps Format Correctly

/**
 * Format a date to user-friendly Chilean Spanish format
 * Example: "13 ene 2026, 14:30"
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Fecha invalida';
  }

  const months = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ];

  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

/**
 * Format a date to show only the date part
 * Example: "13 de enero de 2026"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Fecha invalida';
  }

  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day} de ${month} de ${year}`;
}

/**
 * Format a date to show only the time part
 * Example: "14:30"
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return '--:--';
  }

  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

/**
 * Format a date relative to now (e.g., "hace 5 minutos", "ayer")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Fecha invalida';
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'hace un momento';
  } else if (diffMins < 60) {
    return diffMins === 1 ? 'hace 1 minuto' : `hace ${diffMins} minutos`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? 'hace 1 hora' : `hace ${diffHours} horas`;
  } else if (diffDays === 1) {
    return 'ayer';
  } else if (diffDays < 7) {
    return `hace ${diffDays} dias`;
  } else {
    return formatDateTime(d);
  }
}

/**
 * Format a date as a short date (e.g., "13/01/2026")
 */
export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return '--/--/----';
  }

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format currency in Chilean Peso format
 * Example: "$15.000"
 */
export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
