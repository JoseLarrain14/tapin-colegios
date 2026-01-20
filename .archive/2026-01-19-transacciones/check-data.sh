#!/bin/bash

# Script para verificar datos de transacciones en la base de datos
# Uso: bash check-data.sh

echo "==================================="
echo "Verificación de Datos - Transacciones"
echo "==================================="
echo ""

DB_PATH="packages/api/prisma/dev.db"

if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Base de datos no encontrada en $DB_PATH"
    exit 1
fi

echo "Base de datos encontrada: $DB_PATH"
echo ""

echo "1. Conteo de Transacciones (transactions):"
sqlite3 "$DB_PATH" "SELECT COUNT(*) as total FROM transactions;" 2>/dev/null || echo "Tabla transactions no existe"
echo ""

echo "2. Conteo de WalletLogs (wallet_logs):"
sqlite3 "$DB_PATH" "SELECT COUNT(*) as total FROM wallet_logs;" 2>/dev/null || echo "Tabla wallet_logs no existe"
echo ""

echo "3. Conteo de Pagos (payments):"
sqlite3 "$DB_PATH" "SELECT COUNT(*) as total FROM payments;" 2>/dev/null || echo "Tabla payments no existe"
echo ""

echo "4. Conteo de StudentTickets (student_tickets):"
sqlite3 "$DB_PATH" "SELECT COUNT(*) as total FROM student_tickets;" 2>/dev/null || echo "Tabla student_tickets no existe"
echo ""

echo "5. Últimas 5 transacciones (transactions):"
sqlite3 "$DB_PATH" -header -column "SELECT id, type, amount, created_at FROM transactions ORDER BY created_at DESC LIMIT 5;" 2>/dev/null || echo "No se pueden obtener transacciones"
echo ""

echo "6. Transacciones de hoy:"
TODAY=$(date +%Y-%m-%d)
sqlite3 "$DB_PATH" "SELECT COUNT(*) as total FROM transactions WHERE DATE(created_at) = '$TODAY';" 2>/dev/null || echo "Error al contar transacciones de hoy"
echo ""

echo "7. Resumen por tipo de transacción:"
sqlite3 "$DB_PATH" -header -column "SELECT type, COUNT(*) as count, SUM(amount) as total_amount FROM transactions GROUP BY type;" 2>/dev/null || echo "No se puede obtener resumen"
echo ""

echo "8. Resumen de WalletLogs por tipo:"
sqlite3 "$DB_PATH" -header -column "SELECT type, COUNT(*) as count, SUM(amount) as total_amount FROM wallet_logs GROUP BY type;" 2>/dev/null || echo "No se puede obtener resumen de wallet_logs"
echo ""

echo "9. Estado de pagos:"
sqlite3 "$DB_PATH" -header -column "SELECT status, COUNT(*) as count FROM payments GROUP BY status;" 2>/dev/null || echo "No se puede obtener estado de pagos"
echo ""

echo "7. Todas las tablas en la base de datos:"
sqlite3 "$DB_PATH" ".tables" 2>/dev/null
echo ""

echo "==================================="
echo "Verificación Completa"
echo "==================================="
echo ""
echo "Si todos los conteos son 0, necesitas ejecutar:"
echo "  cd packages/api"
echo "  npx prisma db seed"
echo ""
