-- ============================================
-- INDEXES.SQL - Indices para optimizar VIEWS
-- ============================================
-- Estudiante: Rudi Fabricio Martínez Jaimes
-- Fecha: 2026-01-31
-- ============================================

-- ============================================
-- EXPLICACION DE INDICES
-- ============================================
/*
Los indices son como un "indice" de un libro: nos ayudan a encontrar 
informacion mas rapido sin tener que revisar toda la tabla.

PostgreSQL usa los indices automaticamente cuando detecta que 
una consulta puede beneficiarse de ellos.

Nota: Ya existen estos indices en schema.sql:
- idx_ordenes_usuario_id (para buscar ordenes por usuario)
- idx_productos_categoria_id (para buscar productos por categoria)
- idx_ordenes_status (para filtrar ordenes por status)

Los siguientes indices ADICIONALES ayudan a nuestras VIEWS:
*/

-- ============================================
-- INDICE 1: orden_detalles por producto_id
-- ============================================
/*
Para que sirve:
    Acelera los JOINs entre orden_detalles y productos.
    Lo usamos en casi todas las VIEWS (ventas por categoria, productos mas vendidos, etc).
    
Sin este indice:
    PostgreSQL tendria que recorrer TODA la tabla orden_detalles para encontrar
    los detalles de cada producto.
    
Con este indice:
    PostgreSQL puede saltar directamente a los registros que necesita.

EXPLAIN para verificar uso:
    EXPLAIN ANALYZE SELECT * FROM orden_detalles WHERE producto_id = 1;
*/
CREATE INDEX IF NOT EXISTS idx_orden_detalles_producto_id 
ON orden_detalles(producto_id);


-- ============================================
-- INDICE 2: ordenes por fecha (created_at)
-- ============================================
/*
Para que sirve:
    Acelera filtros por fecha en reportes.
    Lo usamos en view_resumen_daily y cuando filtramos ordenes por rango de fechas.
    
Sin este indice:
    Para buscar ordenes de un dia especifico, PostgreSQL recorreria toda la tabla.
    
Con este indice:
    PostgreSQL puede buscar por fecha de forma eficiente.

EXPLAIN para verificar uso:
    EXPLAIN ANALYZE SELECT * FROM ordenes 
    WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01';
*/
CREATE INDEX IF NOT EXISTS idx_ordenes_created_at 
ON ordenes(created_at);


-- ============================================
-- INDICE 3: orden_detalles por orden_id
-- ============================================
/*
Para que sirve:
    Acelera los JOINs entre ordenes y orden_detalles.
    Casi siempre que consultamos una orden queremos sus detalles.
    
Sin este indice:
    Al buscar los detalles de una orden, PostgreSQL recorreria toda la tabla.
    
Con este indice:
    PostgreSQL encuentra rapidamente todos los productos de una orden.

EXPLAIN para verificar uso:
    EXPLAIN ANALYZE SELECT * FROM orden_detalles WHERE orden_id = 1;
*/
CREATE INDEX IF NOT EXISTS idx_orden_detalles_orden_id 
ON orden_detalles(orden_id);


-- ============================================
-- VERIFICACION DE INDICES
-- ============================================
/*
Para ver todos los indices de una tabla:
    \di+ orden_detalles

Para ver si un indice se usa en una consulta:
    EXPLAIN ANALYZE SELECT ... FROM ...;
    
Buscar "Index Scan" o "Index Only Scan" en el resultado.
Si dice "Seq Scan" significa que NO esta usando el indice.
*/


-- ============================================
-- FIN DE INDICES
-- ============================================
-- Para ejecutar: \i db/indexes.sql
