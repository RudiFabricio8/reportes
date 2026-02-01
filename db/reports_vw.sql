-- ============================================
-- REPORTS_VW.SQL - VIEWS para Reportes
-- ============================================
-- Estudiante: Rudi Fabricio Martínez Jaimes
-- Fecha: 2026-01-31
-- Descripcion: VIEWS para el dashboard de reportes
-- ============================================

-- ============================================
-- VIEW 1: VENTAS POR CATEGORIA
-- ============================================
/*
Que devuelve: 
    Resumen de ventas agrupadas por categoria de producto.
    
Grain (que representa una fila):
    Una fila = una categoria de productos.
    
Metricas:
    - total_ordenes: cuantas ordenes incluyen productos de esta categoria
    - total_productos_vendidos: cantidad de unidades vendidas
    - ingresos_totales: suma de subtotales
    - ticket_promedio: promedio de venta por orden
    - porcentaje_del_total: que % del total de ventas representa esta categoria
    
Por que usa GROUP BY:
    Agrupamos por categoria para calcular metricas por cada una.
    
Por que usa HAVING:
    Filtramos solo categorias que tengan al menos 1 venta (evitar categorias vacias).

Campos calculados:
    - porcentaje_del_total: calcula el % dividiendo entre el total general
    
VERIFY:
    SELECT * FROM view_ventas_por_categoria;
    SELECT SUM(ingresos_totales) FROM view_ventas_por_categoria; -- debe dar el total de ventas
*/

CREATE OR REPLACE VIEW view_ventas_por_categoria AS
SELECT 
    c.id AS categoria_id,
    c.nombre AS categoria_nombre,
    COUNT(DISTINCT o.id) AS total_ordenes,
    SUM(od.cantidad) AS total_productos_vendidos,
    SUM(od.subtotal) AS ingresos_totales,
    ROUND(AVG(od.subtotal), 2) AS ticket_promedio,
    ROUND(
        (SUM(od.subtotal) * 100.0) / 
        NULLIF((SELECT SUM(subtotal) FROM orden_detalles), 0),
        2
    ) AS porcentaje_del_total
FROM categorias c
INNER JOIN productos p ON p.categoria_id = c.id
INNER JOIN orden_detalles od ON od.producto_id = p.id
INNER JOIN ordenes o ON o.id = od.orden_id
GROUP BY c.id, c.nombre
HAVING SUM(od.subtotal) > 0
ORDER BY ingresos_totales DESC;


-- ============================================
-- VIEW 2: PRODUCTOS MAS VENDIDOS (con Window Function)
-- ============================================
/*
Que devuelve: 
    Ranking de productos mas vendidos, con su posicion en el ranking.
    
Grain (que representa una fila):
    Una fila = un producto que ha sido vendido.
    
Metricas:
    - ranking: posicion del producto (1 = mas vendido)
    - cantidad_vendida: total de unidades vendidas
    - ingresos_generados: total de dinero generado
    - numero_de_ordenes: en cuantas ordenes aparece
    
Por que usa GROUP BY:
    Agrupamos por producto para sumar todas sus ventas.
    
Window Function usada:
    ROW_NUMBER() OVER (ORDER BY cantidad DESC) - asigna un ranking basado en ventas
    
Campos calculados:
    - ingresos_generados: suma de subtotales por producto

VERIFY:
    SELECT * FROM view_productos_mas_vendidos ORDER BY ranking LIMIT 5;
    SELECT * FROM view_productos_mas_vendidos WHERE ranking <= 3; -- top 3
*/

CREATE OR REPLACE VIEW view_productos_mas_vendidos AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY SUM(od.cantidad) DESC) AS ranking,
    p.id AS producto_id,
    p.codigo AS producto_codigo,
    p.nombre AS producto_nombre,
    c.nombre AS categoria,
    SUM(od.cantidad) AS cantidad_vendida,
    SUM(od.subtotal) AS ingresos_generados,
    COUNT(DISTINCT od.orden_id) AS numero_de_ordenes,
    p.precio AS precio_actual,
    p.stock AS stock_actual
FROM productos p
INNER JOIN orden_detalles od ON od.producto_id = p.id
INNER JOIN categorias c ON c.id = p.categoria_id
GROUP BY p.id, p.codigo, p.nombre, p.precio, p.stock, c.nombre
HAVING SUM(od.cantidad) > 0
ORDER BY cantidad_vendida DESC;


-- ============================================
-- VIEW 3: RESUMEN DE USUARIOS CON COMPRAS
-- ============================================
/*
Que devuelve: 
    Resumen de actividad de compras por cada usuario.
    
Grain (que representa una fila):
    Una fila = un usuario (tenga o no compras).
    
Metricas:
    - total_ordenes: cuantas ordenes ha hecho
    - total_gastado: suma de todos sus pedidos
    - promedio_por_orden: cuanto gasta en promedio por orden
    - productos_comprados: cuantos productos diferentes ha comprado
    
Por que usa GROUP BY:
    Agrupamos por usuario para calcular sus metricas individuales.
    
Campos calculados (COALESCE):
    - Usamos COALESCE para mostrar 0 en lugar de NULL cuando no hay compras
    - Esto es importante para usuarios que existen pero nunca han comprado

VERIFY:
    SELECT * FROM view_usuarios_con_compras;
    SELECT * FROM view_usuarios_con_compras WHERE total_ordenes = 0; -- usuarios sin compras
*/

CREATE OR REPLACE VIEW view_usuarios_con_compras AS
SELECT 
    u.id AS usuario_id,
    u.nombre AS usuario_nombre,
    u.email AS usuario_email,
    COALESCE(COUNT(DISTINCT o.id), 0) AS total_ordenes,
    COALESCE(SUM(o.total), 0) AS total_gastado,
    COALESCE(ROUND(AVG(o.total), 2), 0) AS promedio_por_orden,
    COALESCE(COUNT(DISTINCT od.producto_id), 0) AS productos_diferentes_comprados,
    COALESCE(MAX(o.created_at), NULL) AS ultima_compra,
    CASE 
        WHEN COUNT(o.id) >= 3 THEN 'Frecuente'
        WHEN COUNT(o.id) >= 1 THEN 'Ocasional'
        ELSE 'Sin compras'
    END AS tipo_cliente
FROM usuarios u
LEFT JOIN ordenes o ON o.usuario_id = u.id
LEFT JOIN orden_detalles od ON od.orden_id = o.id
GROUP BY u.id, u.nombre, u.email
ORDER BY total_gastado DESC;


-- ============================================
-- VIEW 4: ORDENES POR STATUS (con CTE)
-- ============================================
/*
Que devuelve: 
    Resumen de ordenes agrupadas por su estado (pendiente, pagado, enviado, etc).
    
Grain (que representa una fila):
    Una fila = un estado de orden.
    
Metricas:
    - cantidad_ordenes: cuantas ordenes tienen este status
    - monto_total: suma del total de todas las ordenes con este status
    - monto_promedio: promedio del total por orden
    - porcentaje_ordenes: que % del total de ordenes representa
    
Por que usa GROUP BY:
    Agrupamos por status para ver el resumen de cada estado.
    
CTE usada (WITH):
    Primero calculamos el total general de ordenes en un CTE,
    luego lo usamos para calcular el porcentaje.
    Esto es mas legible que hacer un subquery dentro del SELECT.
    
Campos calculados (CASE):
    - prioridad: asigna un numero de prioridad para ordenar los status logicamente
    - descripcion_status: traduce el status a una descripcion amigable

VERIFY:
    SELECT * FROM view_ordenes_por_status;
    SELECT SUM(cantidad_ordenes) FROM view_ordenes_por_status; -- debe dar total de ordenes
*/

CREATE OR REPLACE VIEW view_ordenes_por_status AS
WITH totales AS (
    SELECT 
        COUNT(*) AS total_ordenes_global,
        SUM(total) AS monto_total_global
    FROM ordenes
)
SELECT 
    o.status,
    CASE o.status
        WHEN 'pendiente' THEN 'Pendiente de pago'
        WHEN 'pagado' THEN 'Pagado - En preparacion'
        WHEN 'enviado' THEN 'En camino'
        WHEN 'entregado' THEN 'Entregado'
        WHEN 'cancelado' THEN 'Cancelado'
        ELSE 'Desconocido'
    END AS descripcion_status,
    COUNT(*) AS cantidad_ordenes,
    SUM(o.total) AS monto_total,
    ROUND(AVG(o.total), 2) AS monto_promedio,
    MIN(o.total) AS orden_minima,
    MAX(o.total) AS orden_maxima,
    ROUND((COUNT(*) * 100.0) / NULLIF(t.total_ordenes_global, 0), 2) AS porcentaje_ordenes,
    ROUND((SUM(o.total) * 100.0) / NULLIF(t.monto_total_global, 0), 2) AS porcentaje_monto,
    CASE o.status
        WHEN 'pendiente' THEN 1
        WHEN 'pagado' THEN 2
        WHEN 'enviado' THEN 3
        WHEN 'entregado' THEN 4
        WHEN 'cancelado' THEN 5
        ELSE 6
    END AS prioridad
FROM ordenes o
CROSS JOIN totales t
GROUP BY o.status, t.total_ordenes_global, t.monto_total_global
ORDER BY prioridad;


-- ============================================
-- VIEW 5: RESUMEN DIARIO DE VENTAS (con Window Function - Acumulado)
-- ============================================
/*
Que devuelve: 
    Resumen de ventas por dia, con un acumulado progresivo.
    
Grain (que representa una fila):
    Una fila = un dia donde hubo al menos una orden.
    
Metricas:
    - ordenes_del_dia: cuantas ordenes se hicieron ese dia
    - ventas_del_dia: suma de ventas de ese dia
    - ventas_acumuladas: suma de ventas desde el inicio hasta ese dia (running total)
    - productos_vendidos: cantidad de productos vendidos ese dia
    
Por que usa GROUP BY:
    Agrupamos por fecha para ver las ventas de cada dia.
    
Window Function usada:
    SUM(ventas) OVER (ORDER BY fecha) - calcula el acumulado progresivo
    Esto nos permite ver como van creciendo las ventas totales dia a dia.
    
Campos calculados:
    - ventas_acumuladas: usa SUM OVER para el running total
    - fecha formateada sin hora

VERIFY:
    SELECT * FROM view_resumen_daily ORDER BY fecha;
    SELECT fecha, ventas_acumuladas FROM view_resumen_daily ORDER BY fecha DESC LIMIT 1; -- ultimo acumulado
*/

CREATE OR REPLACE VIEW view_resumen_daily AS
SELECT 
    DATE(o.created_at) AS fecha,
    COUNT(DISTINCT o.id) AS ordenes_del_dia,
    SUM(o.total) AS ventas_del_dia,
    SUM(SUM(o.total)) OVER (ORDER BY DATE(o.created_at)) AS ventas_acumuladas,
    COALESCE(SUM(od.cantidad), 0) AS productos_vendidos,
    COUNT(DISTINCT o.usuario_id) AS clientes_unicos,
    ROUND(AVG(o.total), 2) AS ticket_promedio_dia
FROM ordenes o
LEFT JOIN orden_detalles od ON od.orden_id = o.id
GROUP BY DATE(o.created_at)
ORDER BY fecha;


-- ============================================
-- FIN DE VIEWS
-- ============================================
-- Para ejecutar: \i db/reports_vw.sql
-- ============================================
