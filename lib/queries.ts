/**
 * lib/queries.ts - Queries a las VIEWS
 * 
 * Aquí definimos todas las funciones que consultan las VIEWS.
 * Las queries están "hardcodeadas" (solo permitimos queries específicas)
 * para evitar SQL injection.
 * 
 * Reglas de seguridad:
 * 1. Solo SELECT a VIEWS (nunca a tablas)
 * 2. Parámetros siempre con $1, $2, etc. (nunca concatenar strings)
 * 3. Validar inputs con Zod antes de pasarlos aquí
 */

import { query } from './db';

// ============================================
// Tipos para los resultados de las VIEWS
// ============================================

export interface VentasPorCategoria {
  categoria_id: number;
  categoria_nombre: string;
  total_ordenes: number;
  total_productos_vendidos: number;
  ingresos_totales: number;
  ticket_promedio: number;
  porcentaje_del_total: number;
}

export interface ProductoMasVendido {
  ranking: number;
  producto_id: number;
  producto_codigo: string;
  producto_nombre: string;
  categoria: string;
  cantidad_vendida: number;
  ingresos_generados: number;
  numero_de_ordenes: number;
  precio_actual: number;
  stock_actual: number;
}

export interface UsuarioConCompras {
  usuario_id: number;
  usuario_nombre: string;
  usuario_email: string;
  total_ordenes: number;
  total_gastado: number;
  promedio_por_orden: number;
  productos_diferentes_comprados: number;
  ultima_compra: Date | null;
  tipo_cliente: string;
}

export interface OrdenPorStatus {
  status: string;
  descripcion_status: string;
  cantidad_ordenes: number;
  monto_total: number;
  monto_promedio: number;
  orden_minima: number;
  orden_maxima: number;
  porcentaje_ordenes: number;
  porcentaje_monto: number;
  prioridad: number;
}

export interface ResumenDaily {
  fecha: Date;
  ordenes_del_dia: number;
  ventas_del_dia: number;
  ventas_acumuladas: number;
  productos_vendidos: number;
  clientes_unicos: number;
  ticket_promedio_dia: number;
}

// ============================================
// Funciones para consultar las VIEWS
// ============================================

/**
 * VIEW 1: Ventas por Categoría
 * No requiere filtros, devuelve todas las categorías con ventas
 */
export async function getVentasPorCategoria(): Promise<VentasPorCategoria[]> {
  const result = await query<VentasPorCategoria>(
    'SELECT * FROM view_ventas_por_categoria ORDER BY ingresos_totales DESC'
  );
  return result.rows;
}

/**
 * VIEW 2: Productos Más Vendidos
 * Soporta filtro Top N con paginación
 * 
 * @param topN - Cuántos productos mostrar (default: 10)
 * @param page - Número de página
 * @param limit - Resultados por página
 */
export async function getProductosMasVendidos(
  topN: number = 10,
  page: number = 1,
  limit: number = 10
): Promise<{ data: ProductoMasVendido[]; total: number }> {
  // Primero obtenemos el total de productos (para paginación)
  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM view_productos_mas_vendidos WHERE ranking <= $1',
    [topN]
  );
  const total = parseInt(countResult.rows[0]?.count || '0');
  
  // Calculamos el offset para la paginación
  const offset = (page - 1) * limit;
  
  // Query con paginación
  const result = await query<ProductoMasVendido>(
    `SELECT * FROM view_productos_mas_vendidos 
     WHERE ranking <= $1 
     ORDER BY ranking 
     LIMIT $2 OFFSET $3`,
    [topN, limit, offset]
  );
  
  return { data: result.rows, total };
}

/**
 * VIEW 3: Usuarios con Compras
 * Soporta paginación
 */
export async function getUsuariosConCompras(
  page: number = 1,
  limit: number = 10
): Promise<{ data: UsuarioConCompras[]; total: number }> {
  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM view_usuarios_con_compras'
  );
  const total = parseInt(countResult.rows[0]?.count || '0');
  
  const offset = (page - 1) * limit;
  
  const result = await query<UsuarioConCompras>(
    `SELECT * FROM view_usuarios_con_compras 
     ORDER BY total_gastado DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  return { data: result.rows, total };
}

/**
 * VIEW 4: Órdenes por Status
 * Soporta filtro por status específico
 */
export async function getOrdenesPorStatus(
  status?: string
): Promise<OrdenPorStatus[]> {
  if (status) {
    const result = await query<OrdenPorStatus>(
      'SELECT * FROM view_ordenes_por_status WHERE status = $1 ORDER BY prioridad',
      [status]
    );
    return result.rows;
  }
  
  const result = await query<OrdenPorStatus>(
    'SELECT * FROM view_ordenes_por_status ORDER BY prioridad'
  );
  return result.rows;
}

/**
 * VIEW 5: Resumen Diario
 * Soporta filtro por rango de fechas
 */
export async function getResumenDaily(
  startDate?: string,
  endDate?: string,
  page: number = 1,
  limit: number = 10
): Promise<{ data: ResumenDaily[]; total: number }> {
  let whereClause = '';
  const params: (string | number)[] = [];
  let paramIndex = 1;
  
  // Construimos el WHERE de forma segura
  if (startDate) {
    whereClause += `WHERE fecha >= $${paramIndex}::date `;
    params.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    if (whereClause) {
      whereClause += `AND fecha <= $${paramIndex}::date `;
    } else {
      whereClause += `WHERE fecha <= $${paramIndex}::date `;
    }
    params.push(endDate);
    paramIndex++;
  }
  
  // Count total
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM view_resumen_daily ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || '0');
  
  // Paginación
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  
  const result = await query<ResumenDaily>(
    `SELECT * FROM view_resumen_daily 
     ${whereClause} 
     ORDER BY fecha DESC 
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
  
  return { data: result.rows, total };
}

// ============================================
// Funciones para obtener KPIs (métricas destacadas)
// ============================================

export interface DashboardKPIs {
  totalVentas: number;
  totalOrdenes: number;
  totalProductos: number;
  totalUsuarios: number;
  ticketPromedio: number;
  categoriaTop: string;
  productoTop: string;
}

/**
 * Obtiene los KPIs principales para el dashboard
 */
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  // Total de ventas y órdenes
  const ventasResult = await query<{ total_ventas: number; total_ordenes: number }>(
    `SELECT 
       COALESCE(SUM(ingresos_totales), 0) as total_ventas,
       COALESCE(SUM(total_ordenes), 0) as total_ordenes
     FROM view_ventas_por_categoria`
  );
  
  // Categoría y producto top
  const categoriaTop = await query<{ categoria_nombre: string }>(
    'SELECT categoria_nombre FROM view_ventas_por_categoria LIMIT 1'
  );
  
  const productoTop = await query<{ producto_nombre: string }>(
    'SELECT producto_nombre FROM view_productos_mas_vendidos WHERE ranking = 1'
  );
  
  // Total de usuarios
  const usuariosResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM view_usuarios_con_compras'
  );
  
  // Total de productos vendidos
  const productosResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM view_productos_mas_vendidos'
  );
  
  const totalVentas = ventasResult.rows[0]?.total_ventas || 0;
  const totalOrdenes = ventasResult.rows[0]?.total_ordenes || 0;
  
  return {
    totalVentas: Number(totalVentas),
    totalOrdenes: Number(totalOrdenes),
    totalProductos: parseInt(productosResult.rows[0]?.count || '0'),
    totalUsuarios: parseInt(usuariosResult.rows[0]?.count || '0'),
    ticketPromedio: totalOrdenes > 0 ? Number(totalVentas) / Number(totalOrdenes) : 0,
    categoriaTop: categoriaTop.rows[0]?.categoria_nombre || 'N/A',
    productoTop: productoTop.rows[0]?.producto_nombre || 'N/A',
  };
}
