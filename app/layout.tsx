/**
 * app/layout.tsx - Layout principal con sidebar de navegación
 */

import './globals.css';
import Link from 'next/link';

export const metadata = {
    title: 'Dashboard de Reportes SQL',
    description: 'Visualización de reportes usando VIEWS de PostgreSQL',
};

// Definimos los reportes con sus iconos y rutas
const reportes = [
    { id: 1, nombre: 'Ventas por Categoría', icon: '📊', path: '/reports/1' },
    { id: 2, nombre: 'Productos Top', icon: '🏆', path: '/reports/2' },
    { id: 3, nombre: 'Usuarios', icon: '👥', path: '/reports/3' },
    { id: 4, nombre: 'Órdenes por Status', icon: '📦', path: '/reports/4' },
    { id: 5, nombre: 'Ventas Diarias', icon: '📈', path: '/reports/5' },
];

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <div className="app-container">
                    {/* Sidebar */}
                    <aside className="sidebar">
                        <Link href="/" className="sidebar-logo">
                            📊 Reportes SQL
                        </Link>

                        <nav className="sidebar-nav">
                            <Link href="/" className="nav-link">
                                <span className="nav-icon">🏠</span>
                                <span>Dashboard</span>
                            </Link>

                            {reportes.map((reporte) => (
                                <Link
                                    key={reporte.id}
                                    href={reporte.path}
                                    className="nav-link"
                                >
                                    <span className="nav-icon">{reporte.icon}</span>
                                    <span>{reporte.nombre}</span>
                                </Link>
                            ))}
                        </nav>
                    </aside>

                    {/* Contenido principal */}
                    <main className="main-content">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
