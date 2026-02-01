-- ============================================
-- ROLES.SQL - Configuracion de Seguridad
-- ============================================
-- Estudiante: Rudi Fabricio Martínez Jaimes
-- Fecha: 2026-01-31
-- ============================================

-- ============================================
-- EXPLICACION DE ROLES EN POSTGRESQL
-- ============================================
/*
PostgreSQL usa "roles" para manejar usuarios y permisos.
Un rol puede ser un usuario (puede conectarse) o un grupo.

Principio de minimo privilegio:
    La app solo debe tener los permisos que realmente necesita.
    En nuestro caso, solo necesita LEER las VIEWS, no las tablas.
    
Por que es importante:
    - Si alguien hackea la app, no podra borrar o modificar datos
    - No podra leer las tablas directamente (solo las VIEWS)
    - Es una buena practica de seguridad en el mundo real
*/

-- ============================================
-- PASO 1: Eliminar rol si ya existe (para recrear limpio)
-- ============================================
-- Esto es útil durante desarrollo para poder ejecutar el script varias veces
DO $$
BEGIN
    -- Revocar permisos primero si el rol existe
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_reader') THEN
        -- Revocar todos los permisos del schema public
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_reader';
        EXECUTE 'REVOKE ALL ON SCHEMA public FROM app_reader';
        EXECUTE 'REVOKE CONNECT ON DATABASE actividad_db FROM app_reader';
    END IF;
END $$;

-- Eliminar el rol si existe
DROP ROLE IF EXISTS app_reader;


-- ============================================
-- PASO 2: Crear el rol para la aplicacion
-- ============================================
/*
Opciones usadas:
    - LOGIN: puede conectarse a la base de datos
    - PASSWORD: contraseña para conectarse
    - NOSUPERUSER: NO es superusuario (importante!)
    - NOCREATEDB: NO puede crear bases de datos
    - NOCREATEROLE: NO puede crear otros roles
*/
CREATE ROLE app_reader WITH 
    LOGIN 
    PASSWORD 'app_secure_password_123'
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE;


-- ============================================
-- PASO 3: Dar permiso para conectarse a la DB
-- ============================================
GRANT CONNECT ON DATABASE actividad_db TO app_reader;


-- ============================================
-- PASO 4: Dar permiso para usar el schema public
-- ============================================
/*
En PostgreSQL, las tablas viven dentro de "schemas".
El schema por defecto es "public".
Necesitamos dar permiso de USAGE para que pueda ver los objetos.
*/
GRANT USAGE ON SCHEMA public TO app_reader;


-- ============================================
-- PASO 5: Dar permiso SELECT SOLO a las VIEWS
-- ============================================
/*
Aqui esta el truco de seguridad:
    - Damos SELECT solo a las VIEWS, no a las tablas
    - Asi la app puede consultar datos pero NO puede:
        - Leer las tablas directamente
        - Insertar datos
        - Actualizar datos
        - Eliminar datos
*/

-- Permiso para las VIEWS de reportes
GRANT SELECT ON view_ventas_por_categoria TO app_reader;
GRANT SELECT ON view_productos_mas_vendidos TO app_reader;
GRANT SELECT ON view_usuarios_con_compras TO app_reader;
GRANT SELECT ON view_ordenes_por_status TO app_reader;
GRANT SELECT ON view_resumen_daily TO app_reader;


-- ============================================
-- VERIFICACION DE PERMISOS
-- ============================================
/*
Para verificar que el rol se creo correctamente:
    \du app_reader
    
Para verificar permisos sobre una view:
    \dp view_ventas_por_categoria
    
Para probar que puede leer views:
    SET ROLE app_reader;
    SELECT * FROM view_ventas_por_categoria LIMIT 1;
    -- Debe funcionar
    
Para probar que NO puede leer tablas:
    SET ROLE app_reader;
    SELECT * FROM productos LIMIT 1;
    -- Debe dar error: permission denied for table productos
    
Para volver al rol postgres:
    RESET ROLE;
*/


-- ============================================
-- FIN DE ROLES
-- ============================================
-- Para ejecutar: \i db/roles.sql
-- Nota: Ejecutar DESPUES de reports_vw.sql (las views deben existir)
