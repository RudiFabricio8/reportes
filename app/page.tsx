/**
 * app/page.tsx - Dashboard principal
 * 
 * Esta es la página de inicio que muestra:
 * - KPIs principales del negocio
 * - Links a los 5 reportes disponibles
 */

import Link from 'next/link';
import { getDashboardKPIs } from '@/lib/queries';

// Información de cada reporte para mostrar cards
const reportes = [
    {
        id: 1,
        titulo: 'Ventas por Categoría',
        descripcion: 'Analiza las ventas agrupadas por categoría de producto. Ve cuáles categorías generan más ingresos.',
        features: ['Funciones agregadas', 'GROUP BY + HAVING', '% del total'],
        color: 'blue',
    },
    {
        id: 2,
        titulo: 'Productos Más Vendidos',
        descripcion: 'Ranking de productos ordenados por cantidad vendida. Incluye filtro Top N y paginación.',
        features: ['Window Function (ROW_NUMBER)', 'Paginación', 'Filtro Top N'],
        color: 'purple',
    },
    {
        id: 3,
        titulo: 'Resumen de Usuarios',
        descripcion: 'Información de cada usuario: total gastado, número de órdenes, tipo de cliente.',
        features: ['COALESCE', 'CASE', 'LEFT JOIN'],
        color: 'green',
    },
    {
        id: 4,
        titulo: 'Órdenes por Status',
        descripcion: 'Agrupa las órdenes por su estado (pendiente, pagado, enviado, etc). Usa CTE para calcular totales.',
        features: ['CTE (WITH)', 'CASE', 'Filtro status'],
        color: 'yellow',
    },
    {
        id: 5,
        titulo: 'Ventas Diarias',
        descripcion: 'Resumen de ventas día por día con acumulado progresivo. Filtra por rango de fechas.',
        features: ['Window Function (SUM OVER)', 'Paginación', 'Filtro fechas'],
        color: 'cyan',
    },
];

export default async function DashboardPage() {
    // Obtenemos los KPIs desde la base de datos (Server Component)
    let kpis;
    let error = null;

    try {
        kpis = await getDashboardKPIs();
    } catch (e) {
        console.error('Error obteniendo KPIs:', e);
        error = 'No se pudo conectar a la base de datos. Verifica que PostgreSQL esté corriendo.';
        kpis = {
            totalVentas: 0,
            totalOrdenes: 0,
            totalProductos: 0,
            totalUsuarios: 0,
            ticketPromedio: 0,
            categoriaTop: 'N/A',
            productoTop: 'N/A',
        };
    }

    // Formateamos números para mostrar con separadores
    const formatMoney = (num: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);

    return (
        <div>
            {/* Header */}
            <header className="page-header">
                <h1 className="page-title">Dashboard de Reportes</h1>
                <p className="page-subtitle">
                    Visualización de datos desde VIEWS de PostgreSQL
                </p>
            </header>

            {/* Error message si no hay conexión */}
            {error && (
                <div className="error-message" style={{ marginBottom: '1.5rem' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Grid de KPIs */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Ventas Totales</div>
                    <div className="kpi-value blue">{formatMoney(kpis.totalVentas)}</div>
                    <div className="kpi-change">Todas las órdenes</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-label">Total Órdenes</div>
                    <div className="kpi-value purple">{kpis.totalOrdenes}</div>
                    <div className="kpi-change">Pedidos registrados</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-label">Ticket Promedio</div>
                    <div className="kpi-value green">{formatMoney(kpis.ticketPromedio)}</div>
                    <div className="kpi-change">Por orden</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-label">Usuarios Registrados</div>
                    <div className="kpi-value cyan">{kpis.totalUsuarios}</div>
                    <div className="kpi-change">En el sistema</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-label">Categoría Top</div>
                    <div className="kpi-value yellow" style={{ fontSize: '1.25rem' }}>
                        {kpis.categoriaTop}
                    </div>
                    <div className="kpi-change">Mayor ingreso</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-label">Producto Top</div>
                    <div className="kpi-value blue" style={{ fontSize: '1rem' }}>
                        {kpis.productoTop}
                    </div>
                    <div className="kpi-change">Más vendido</div>
                </div>
            </div>

            {/* Sección de reportes */}
            <div className="content-card">
                <div className="card-header">
                    <h2 className="card-title">📊 Reportes Disponibles</h2>
                </div>

                <div className="reports-grid">
                    {reportes.map((reporte) => (
                        <Link
                            key={reporte.id}
                            href={`/reports/${reporte.id}`}
                            className="report-card"
                        >
                            <span className="report-card-number">{reporte.id}</span>
                            <h3 className="report-card-title">{reporte.titulo}</h3>
                            <p className="report-card-desc">{reporte.descripcion}</p>

                            <div className="report-card-features">
                                {reporte.features.map((feature, i) => (
                                    <span key={i} className={`badge badge-${reporte.color}`}>
                                        {feature}
                                    </span>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
