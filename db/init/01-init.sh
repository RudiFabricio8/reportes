#!/bin/bash
# ============================================
# Script de inicialización de la base de datos
# ============================================
# Este script se ejecuta automáticamente cuando
# PostgreSQL inicia por primera vez.
#
# Orden de ejecución:
# 1. schema.sql - Crear tablas
# 2. seed.sql - Insertar datos de prueba
# 3. reports_vw.sql - Crear las VIEWS
# 4. indexes.sql - Crear índices de optimización
# 5. roles.sql - Crear usuario app_reader
# ============================================

set -e

echo "=========================================="
echo "Inicializando base de datos..."
echo "=========================================="

# Ejecutamos los scripts en orden
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL

    -- 1. Schema (tablas)
    \echo 'Ejecutando schema.sql...'
    \i /scripts/schema.sql

    -- 2. Seed (datos de prueba)
    \echo 'Ejecutando seed.sql...'
    \i /scripts/seed.sql

    -- 3. Views (reportes)
    \echo 'Ejecutando reports_vw.sql...'
    \i /scripts/reports_vw.sql

    -- 4. Indexes (optimización)
    \echo 'Ejecutando indexes.sql...'
    \i /scripts/indexes.sql

    -- 5. Roles (seguridad)
    \echo 'Ejecutando roles.sql...'
    \i /scripts/roles.sql

    \echo '=========================================='
    \echo 'Base de datos inicializada correctamente!'
    \echo '=========================================='
    
EOSQL

echo "¡Listo! La base de datos está lista para usar."
