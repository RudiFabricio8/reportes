/**
 * app/reports/[id]/page.tsx - Página dinámica para cada reporte
 * 
 * Esta página maneja los 5 reportes según el ID en la URL.
 * Cada reporte tiene su propia vista con filtros específicos.
 */

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {
    getVentasPorCategoria,
    getProductosMasVendidos,
    getUsuariosConCompras,
    getOrdenesPorStatus,
    getResumenDaily,
} from '@/lib/queries';
import {
    PaginationSchema,
    TopNSchema,
    DateRangeSchema,
    OrderStatusSchema,
    parseSearchParams
} from '@/lib/schemas';

// Metadatos de cada reporte
const reportesInfo: Record<string, { titulo: string; descripcion: string; grain: string }> = {
    '1': {
        titulo: 'Ventas por Categoría',
        descripcion: 'Muestra las ventas agrupadas por categoría de producto. Cada fila representa una categoría con sus métricas de ventas.',
        grain: 'Una fila = Una categoría de producto',
    },
    '2': {
        titulo: 'Productos Más Vendidos',
        descripcion: 'Ranking de productos ordenados por cantidad vendida. Usa Window Function ROW_NUMBER() para el ranking.',
        grain: 'Una fila = Un producto que ha sido vendido',
    },
    '3': {
        titulo: 'Resumen de Usuarios',
        descripcion: 'Información de cada usuario incluyendo sin compras (usando LEFT JOIN). Usa COALESCE para valores nulos.',
        grain: 'Una fila = Un usuario del sistema',
    },
    '4': {
        titulo: 'Órdenes por Status',
        descripcion: 'Agrupa las órdenes por estado. Usa CTE (WITH) para calcular totales globales antes de agrupar.',
        grain: 'Una fila = Un estado de orden',
    },
    '5': {
        titulo: 'Ventas Diarias',
        descripcion: 'Resumen diario con ventas acumuladas progresivas. Usa SUM() OVER() como Window Function.',
        grain: 'Una fila = Un día con ventas',
    },
};

// Helper para formatear moneda
const formatMoney = (num: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);

// Helper para formatear fecha
const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Props de la página
interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReportePage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const queryParams = await searchParams;
    const info = reportesInfo[id];

    // Si el ID no existe, mostramos error
    if (!info) {
        return (
            <div className="error-message">
                <h1>⚠️ Reporte no encontrado</h1>
                <p>El reporte {id} no existe.</p>
                <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                    Volver al Dashboard
                </Link>
            </div>
        );
    }

    // Renderizamos el reporte correspondiente
    try {
        switch (id) {
            case '1':
                return <Reporte1VentasCategoria info={info} />;
            case '2':
                return <Reporte2ProductosTop info={info} searchParams={queryParams} />;
            case '3':
                return <Reporte3Usuarios info={info} searchParams={queryParams} />;
            case '4':
                return <Reporte4OrdenesPorStatus info={info} searchParams={queryParams} />;
            case '5':
                return <Reporte5VentasDiarias info={info} searchParams={queryParams} />;
            default:
                return <div>Reporte no implementado</div>;
        }
    } catch (error) {
        console.error('Error en reporte:', error);
        return (
            <div className="error-message">
                <h1>⚠️ Error al cargar el reporte</h1>
                <p>No se pudo conectar a la base de datos. Verifica que PostgreSQL esté corriendo.</p>
                <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                    Volver al Dashboard
                </Link>
            </div>
        );
    }
}

// ============================================
// REPORTE 1: Ventas por Categoría
// ============================================
async function Reporte1VentasCategoria({ info }: { info: typeof reportesInfo['1'] }) {
    const data = await getVentasPorCategoria();

    // KPI destacado: categoría con más ventas
    const topCategoria = data[0];
    const totalVentas = data.reduce((sum, d) => sum + Number(d.ingresos_totales), 0);

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">📊 {info.titulo}</h1>
                <p className="page-subtitle">{info.descripcion}</p>
                <p className="page-subtitle" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                    Grain: {info.grain}
                </p>
            </header>

            {/* KPIs */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Total Ventas</div>
                    <div className="kpi-value blue">{formatMoney(totalVentas)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Categoría Líder</div>
                    <div className="kpi-value green">{topCategoria?.categoria_nombre || 'N/A'}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">% del Líder</div>
                    <div className="kpi-value purple">{topCategoria?.porcentaje_del_total || 0}%</div>
                </div>
            </div>

            {/* Tabla */}
            <div className="content-card">
                <div className="card-header">
                    <h2 className="card-title">Datos del Reporte</h2>
                    <span className="badge badge-blue">HAVING: ventas &gt; 0</span>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Categoría</th>
                            <th>Total Órdenes</th>
                            <th>Productos Vendidos</th>
                            <th>Ingresos</th>
                            <th>Ticket Promedio</th>
                            <th>% del Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.categoria_id}>
                                <td><strong>{row.categoria_nombre}</strong></td>
                                <td>{row.total_ordenes}</td>
                                <td>{row.total_productos_vendidos}</td>
                                <td>{formatMoney(Number(row.ingresos_totales))}</td>
                                <td>{formatMoney(Number(row.ticket_promedio))}</td>
                                <td>
                                    <span className="badge badge-green">{row.porcentaje_del_total}%</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================
// REPORTE 2: Productos Más Vendidos (con filtro Top N y paginación)
// ============================================
async function Reporte2ProductosTop({
    info,
    searchParams
}: {
    info: typeof reportesInfo['2'];
    searchParams: Record<string, string | string[] | undefined>;
}) {
    // Validamos parámetros con Zod
    const { topN } = parseSearchParams(searchParams, TopNSchema);
    const { page, limit } = parseSearchParams(searchParams, PaginationSchema);

    const { data, total } = await getProductosMasVendidos(topN, page, limit);
    const totalPages = Math.ceil(total / limit);

    // KPI
    const topProducto = data.find(d => d.ranking === 1);

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">🏆 {info.titulo}</h1>
                <p className="page-subtitle">{info.descripcion}</p>
                <p className="page-subtitle" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                    Grain: {info.grain}
                </p>
            </header>

            {/* KPIs */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Producto #1</div>
                    <div className="kpi-value blue" style={{ fontSize: '1.25rem' }}>
                        {topProducto?.producto_nombre || 'N/A'}
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Unidades Vendidas (#1)</div>
                    <div className="kpi-value green">{topProducto?.cantidad_vendida || 0}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Ingresos (#1)</div>
                    <div className="kpi-value purple">
                        {formatMoney(Number(topProducto?.ingresos_generados || 0))}
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <form className="filters-bar">
                <div className="filter-group">
                    <label className="filter-label">Top N Productos</label>
                    <select
                        name="topN"
                        className="filter-select"
                        defaultValue={topN}
                    >
                        <option value="5">Top 5</option>
                        <option value="10">Top 10</option>
                        <option value="20">Top 20</option>
                        <option value="50">Top 50</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Por Página</label>
                    <select
                        name="limit"
                        className="filter-select"
                        defaultValue={limit}
                    >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                    </select>
                </div>

                <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary">Aplicar Filtros</button>
                </div>
            </form>

            {/* Tabla */}
            <div className="content-card">
                <div className="card-header">
                    <h2 className="card-title">Ranking de Productos</h2>
                    <span className="badge badge-purple">ROW_NUMBER() Window Function</span>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Código</th>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Vendidos</th>
                            <th>Ingresos</th>
                            <th>Órdenes</th>
                            <th>Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.producto_id}>
                                <td>
                                    <span className={`badge ${row.ranking <= 3 ? 'badge-yellow' : 'badge-blue'}`}>
                                        {row.ranking}
                                    </span>
                                </td>
                                <td><code>{row.producto_codigo}</code></td>
                                <td><strong>{row.producto_nombre}</strong></td>
                                <td>{row.categoria}</td>
                                <td>{row.cantidad_vendida}</td>
                                <td>{formatMoney(Number(row.ingresos_generados))}</td>
                                <td>{row.numero_de_ordenes}</td>
                                <td>{row.stock_actual}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Paginación */}
                <div className="pagination">
                    <Link
                        href={`/reports/2?topN=${topN}&page=${page - 1}&limit=${limit}`}
                        className="pagination-btn"
                        style={{ pointerEvents: page <= 1 ? 'none' : 'auto', opacity: page <= 1 ? 0.5 : 1 }}
                    >
                        ← Anterior
                    </Link>
                    <span className="pagination-info">
                        Página {page} de {totalPages} ({total} resultados)
                    </span>
                    <Link
                        href={`/reports/2?topN=${topN}&page=${page + 1}&limit=${limit}`}
                        className="pagination-btn"
                        style={{ pointerEvents: page >= totalPages ? 'none' : 'auto', opacity: page >= totalPages ? 0.5 : 1 }}
                    >
                        Siguiente →
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ============================================
// REPORTE 3: Usuarios con Compras (con paginación)
// ============================================
async function Reporte3Usuarios({
    info,
    searchParams
}: {
    info: typeof reportesInfo['3'];
    searchParams: Record<string, string | string[] | undefined>;
}) {
    const { page, limit } = parseSearchParams(searchParams, PaginationSchema);
    const { data, total } = await getUsuariosConCompras(page, limit);
    const totalPages = Math.ceil(total / limit);

    // KPIs
    const usuariosConCompras = data.filter(u => u.total_ordenes > 0).length;
    const topGastador = data[0];

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">👥 {info.titulo}</h1>
                <p className="page-subtitle">{info.descripcion}</p>
                <p className="page-subtitle" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                    Grain: {info.grain}
                </p>
            </header>

            {/* KPIs */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Total Usuarios</div>
                    <div className="kpi-value blue">{total}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Con Compras</div>
                    <div className="kpi-value green">{usuariosConCompras}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Top Gastador</div>
                    <div className="kpi-value purple" style={{ fontSize: '1.25rem' }}>
                        {topGastador?.usuario_nombre || 'N/A'}
                    </div>
                </div>
            </div>

            {/* Filtros de paginación */}
            <form className="filters-bar">
                <div className="filter-group">
                    <label className="filter-label">Por Página</label>
                    <select name="limit" className="filter-select" defaultValue={limit}>
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                    </select>
                </div>
                <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary">Aplicar</button>
                </div>
            </form>

            {/* Tabla */}
            <div className="content-card">
                <div className="card-header">
                    <h2 className="card-title">Lista de Usuarios</h2>
                    <span className="badge badge-green">COALESCE + CASE</span>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Órdenes</th>
                            <th>Total Gastado</th>
                            <th>Promedio</th>
                            <th>Productos</th>
                            <th>Tipo Cliente</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.usuario_id}>
                                <td><strong>{row.usuario_nombre}</strong></td>
                                <td>{row.usuario_email}</td>
                                <td>{row.total_ordenes}</td>
                                <td>{formatMoney(Number(row.total_gastado))}</td>
                                <td>{formatMoney(Number(row.promedio_por_orden))}</td>
                                <td>{row.productos_diferentes_comprados}</td>
                                <td>
                                    <span className={`badge ${row.tipo_cliente === 'Frecuente' ? 'badge-green' :
                                        row.tipo_cliente === 'Ocasional' ? 'badge-yellow' : 'badge-red'
                                        }`}>
                                        {row.tipo_cliente}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Paginación */}
                <div className="pagination">
                    <Link
                        href={`/reports/3?page=${page - 1}&limit=${limit}`}
                        className="pagination-btn"
                        style={{ pointerEvents: page <= 1 ? 'none' : 'auto', opacity: page <= 1 ? 0.5 : 1 }}
                    >
                        ← Anterior
                    </Link>
                    <span className="pagination-info">
                        Página {page} de {totalPages} ({total} resultados)
                    </span>
                    <Link
                        href={`/reports/3?page=${page + 1}&limit=${limit}`}
                        className="pagination-btn"
                        style={{ pointerEvents: page >= totalPages ? 'none' : 'auto', opacity: page >= totalPages ? 0.5 : 1 }}
                    >
                        Siguiente →
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ============================================
// REPORTE 4: Órdenes por Status (con filtro por status)
// ============================================
async function Reporte4OrdenesPorStatus({
    info,
    searchParams
}: {
    info: typeof reportesInfo['4'];
    searchParams: Record<string, string | string[] | undefined>;
}) {
    const { status } = parseSearchParams(searchParams, OrderStatusSchema);
    const data = await getOrdenesPorStatus(status);

    // KPIs
    const totalOrdenes = data.reduce((sum, d) => sum + Number(d.cantidad_ordenes), 0);
    const totalMonto = data.reduce((sum, d) => sum + Number(d.monto_total), 0);

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">📦 {info.titulo}</h1>
                <p className="page-subtitle">{info.descripcion}</p>
                <p className="page-subtitle" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                    Grain: {info.grain}
                </p>
            </header>

            {/* KPIs */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Total Órdenes</div>
                    <div className="kpi-value blue">{totalOrdenes}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Monto Total</div>
                    <div className="kpi-value green">{formatMoney(totalMonto)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Estados Diferentes</div>
                    <div className="kpi-value purple">{data.length}</div>
                </div>
            </div>

            {/* Filtros */}
            <form className="filters-bar">
                <div className="filter-group">
                    <label className="filter-label">Filtrar por Status</label>
                    <select name="status" className="filter-select" defaultValue={status || ''}>
                        <option value="">Todos los status</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="pagado">Pagado</option>
                        <option value="enviado">Enviado</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                </div>
                <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary">Aplicar Filtro</button>
                </div>
            </form>

            {/* Tabla */}
            <div className="content-card">
                <div className="card-header">
                    <h2 className="card-title">Resumen por Status</h2>
                    <span className="badge badge-yellow">CTE (WITH) + CASE</span>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Descripción</th>
                            <th>Órdenes</th>
                            <th>Monto Total</th>
                            <th>Promedio</th>
                            <th>Mín / Máx</th>
                            <th>% Órdenes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.status}>
                                <td>
                                    <span className={`badge ${row.status === 'entregado' ? 'badge-green' :
                                        row.status === 'enviado' ? 'badge-blue' :
                                            row.status === 'pagado' ? 'badge-purple' :
                                                row.status === 'pendiente' ? 'badge-yellow' : 'badge-red'
                                        }`}>
                                        {row.status}
                                    </span>
                                </td>
                                <td>{row.descripcion_status}</td>
                                <td><strong>{row.cantidad_ordenes}</strong></td>
                                <td>{formatMoney(Number(row.monto_total))}</td>
                                <td>{formatMoney(Number(row.monto_promedio))}</td>
                                <td>
                                    {formatMoney(Number(row.orden_minima))} / {formatMoney(Number(row.orden_maxima))}
                                </td>
                                <td>{row.porcentaje_ordenes}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================
// REPORTE 5: Ventas Diarias (con filtro de fechas y paginación)
// ============================================
async function Reporte5VentasDiarias({
    info,
    searchParams
}: {
    info: typeof reportesInfo['5'];
    searchParams: Record<string, string | string[] | undefined>;
}) {
    const { startDate, endDate } = parseSearchParams(searchParams, DateRangeSchema);
    const { page, limit } = parseSearchParams(searchParams, PaginationSchema);

    const { data, total } = await getResumenDaily(startDate, endDate, page, limit);
    const totalPages = Math.ceil(total / limit);

    // KPIs
    const totalVentas = data.reduce((sum, d) => sum + Number(d.ventas_del_dia), 0);
    const mejorDia = data.reduce((best, d) =>
        Number(d.ventas_del_dia) > Number(best.ventas_del_dia) ? d : best, data[0] || { ventas_del_dia: 0, fecha: new Date() });

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">📈 {info.titulo}</h1>
                <p className="page-subtitle">{info.descripcion}</p>
                <p className="page-subtitle" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                    Grain: {info.grain}
                </p>
            </header>

            {/* KPIs */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Total Período</div>
                    <div className="kpi-value blue">{formatMoney(totalVentas)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Días con Ventas</div>
                    <div className="kpi-value green">{total}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Mejor Día</div>
                    <div className="kpi-value purple" style={{ fontSize: '1rem' }}>
                        {mejorDia ? formatDate(mejorDia.fecha) : 'N/A'}
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <form className="filters-bar">
                <div className="filter-group">
                    <label className="filter-label">Fecha Inicio</label>
                    <input
                        type="date"
                        name="startDate"
                        className="filter-input"
                        defaultValue={startDate || ''}
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Fecha Fin</label>
                    <input
                        type="date"
                        name="endDate"
                        className="filter-input"
                        defaultValue={endDate || ''}
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Por Página</label>
                    <select name="limit" className="filter-select" defaultValue={limit}>
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                    </select>
                </div>
                <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary">Aplicar Filtros</button>
                </div>
            </form>

            {/* Tabla */}
            <div className="content-card">
                <div className="card-header">
                    <h2 className="card-title">Ventas por Día</h2>
                    <span className="badge badge-cyan">SUM() OVER() Window Function</span>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Órdenes</th>
                            <th>Ventas del Día</th>
                            <th>Ventas Acumuladas</th>
                            <th>Productos</th>
                            <th>Clientes</th>
                            <th>Ticket Promedio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i}>
                                <td><strong>{formatDate(row.fecha)}</strong></td>
                                <td>{row.ordenes_del_dia}</td>
                                <td>{formatMoney(Number(row.ventas_del_dia))}</td>
                                <td>
                                    <span className="badge badge-cyan">
                                        {formatMoney(Number(row.ventas_acumuladas))}
                                    </span>
                                </td>
                                <td>{row.productos_vendidos}</td>
                                <td>{row.clientes_unicos}</td>
                                <td>{formatMoney(Number(row.ticket_promedio_dia))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Paginación */}
                <div className="pagination">
                    <Link
                        href={`/reports/5?startDate=${startDate || ''}&endDate=${endDate || ''}&page=${page - 1}&limit=${limit}`}
                        className="pagination-btn"
                        style={{ pointerEvents: page <= 1 ? 'none' : 'auto', opacity: page <= 1 ? 0.5 : 1 }}
                    >
                        ← Anterior
                    </Link>
                    <span className="pagination-info">
                        Página {page} de {totalPages} ({total} resultados)
                    </span>
                    <Link
                        href={`/reports/5?startDate=${startDate || ''}&endDate=${endDate || ''}&page=${page + 1}&limit=${limit}`}
                        className="pagination-btn"
                        style={{ pointerEvents: page >= totalPages ? 'none' : 'auto', opacity: page >= totalPages ? 0.5 : 1 }}
                    >
                        Siguiente →
                    </Link>
                </div>
            </div>
        </div>
    );
}
