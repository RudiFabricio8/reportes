# Dashboard de Reportes con PostgreSQL y Next.js

Actividad: Lab Reportes – Next.js Reports Dashboard  
Fecha: 31 de Enero de 2026

## Descripción

Esta actividad consiste en el desarrollo de un dashboard de reportes que consume vistas (VIEWS) de una base de datos PostgreSQL. El proyecto está orquestado completamente con Docker Compose.

## Instrucciones de Ejecución

Para ejecutar el proyecto:

1.  Asegurarse de tener Docker instalado.
2.  Ejecutar el siguiente comando en la raíz del proyecto:
    ```bash
    docker compose up --build
    ```
3.  Abrir el navegador en `http://localhost:3000`.

Docker se encarga de crear la base de datos, ejecutar todos los scripts SQL necesarios y levantar la aplicación web.

## Estructura del Proyecto

*   **app/**: Código fuente de la aplicación Next.js.
*   **db/**: Scripts SQL (esquema, datos de prueba, vistas, índices, roles).
*   **docker-compose.yml**: Configuración para levantar los servicios.

## Vistas Creadas

Se implementaron 5 vistas SQL cumpliendo con los requisitos de la actividad (uso de agregaciones, GROUP BY, HAVING, CTE, Window Functions, etc.):

1.  `view_ventas_por_categoria`
2.  `view_productos_mas_vendidos`
3.  `view_usuarios_con_compras`
4.  `view_ordenes_por_status`
5.  `view_resumen_daily`

## Seguridad y Optimización

*   Se crearon 3 índices para optimizar las consultas.
*   Se configuró un rol de base de datos (`app_reader`) con permisos exclusivos de lectura sobre las vistas, sin acceso directo a las tablas, siguiendo buenas prácticas de seguridad.
