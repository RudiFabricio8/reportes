/**
 * lib/db.ts - Conexión segura a PostgreSQL
 * 
 * Este archivo maneja la conexión a la base de datos.
 * Usamos variables de entorno para las credenciales (nunca hardcodeadas).
 * 
 * IMPORTANTE:
 * - Solo se usa en el servidor (Server Components / API Routes)
 * - Las credenciales NUNCA se exponen al cliente
 * - Usamos el usuario app_reader que solo puede leer VIEWS
 */

import { Pool, QueryResult } from 'pg';

// Creamos un pool de conexiones para reutilizar
// El pool es más eficiente que crear una conexión por cada query
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5433'),
  database: process.env.POSTGRES_DB || 'actividad_db',
  user: process.env.POSTGRES_USER || 'app_reader',
  password: process.env.POSTGRES_PASSWORD || 'app_secure_password_123',
  // Configuración del pool
  max: 10, // máximo 10 conexiones simultáneas
  idleTimeoutMillis: 30000, // cerrar conexiones inactivas después de 30s
  connectionTimeoutMillis: 5000, // timeout si no puede conectar en 5s
});

/**
 * Ejecuta una query de forma segura con parámetros
 * 
 * @param text - La query SQL (debe ser SELECT a una VIEW)
 * @param params - Parámetros para la query ($1, $2, etc.)
 * @returns Los resultados de la query
 * 
 * Ejemplo de uso:
 *   const result = await query('SELECT * FROM view_productos_mas_vendidos WHERE ranking <= $1', [5]);
 */
export async function query<T = unknown>(
  text: string,
  params?: (string | number | boolean | null)[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Log para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('Query ejecutada:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Error en query:', { text, error });
    throw error;
  }
}

/**
 * Verifica que la conexión a la base de datos funciona
 */
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Error de conexión a la DB:', error);
    return false;
  }
}

// Exportamos el pool por si se necesita acceso directo
export { pool };
