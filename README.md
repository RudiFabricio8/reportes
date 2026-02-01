# 📊 Dashboard de Reportes SQL

**Tarea 6: Lab Reportes – Next.js Reports Dashboard**  
Estudiante: [Tu nombre]  
Fecha: 2026-01-31

## 🎯 Descripción

Esta aplicación es un dashboard de reportes que consume VIEWS de PostgreSQL. Todo corre con Docker Compose.

## 🚀 Cómo ejecutar

```bash
# 1. Clonar el repositorio
git clone https://github.com/RudiFabricio8/reportes.git
cd reportes

# 2. Levantar todo con Docker
docker compose up --build

# 3. Abrir en el navegador
# http://localhost:3000
```

**¡Eso es todo!** Docker se encarga de:
- Crear la base de datos PostgreSQL
- Ejecutar los scripts SQL (schema, seed, views, indexes, roles)
- Construir y levantar la app Next.js

## 📁 Estructura del Proyecto

```
├── app/                    # App Next.js (App Router)
│   ├── layout.tsx         # Layout con sidebar
│   ├── page.tsx           # Dashboard principal
│   ├── globals.css        # Estilos
│   └── reports/[id]/      # Páginas de reportes
├── lib/                    # Utilidades
│   ├── db.ts              # Conexión PostgreSQL
│   ├── queries.ts         # Funciones de consulta
│   └── schemas.ts         # Validación Zod
├── db/                     # Scripts SQL
│   ├── schema.sql         # Estructura de tablas
│   ├── seed.sql           # Datos de prueba
│   ├── reports_vw.sql     # Las 5 VIEWS
│   ├── indexes.sql        # Índices de optimización
│   └── roles.sql          # Usuario app_reader
├── docker-compose.yml      # Orquestación
└── Dockerfile             # Build de Next.js
```

## 📊 Las 5 VIEWS

| # | View | Funciones SQL | Filtros |
|---|------|---------------|---------|
| 1 | `view_ventas_por_categoria` | SUM, COUNT, AVG, GROUP BY, **HAVING** | - |
| 2 | `view_productos_mas_vendidos` | SUM, COUNT, **ROW_NUMBER()**, GROUP BY, HAVING | Top N, Paginación |
| 3 | `view_usuarios_con_compras` | SUM, COUNT, AVG, **COALESCE**, **CASE**, LEFT JOIN | Paginación |
| 4 | `view_ordenes_por_status` | COUNT, SUM, AVG, MIN, MAX, **CTE (WITH)**, **CASE** | Status |
| 5 | `view_resumen_daily` | SUM, COUNT, AVG, **SUM() OVER()** | Fechas, Paginación |

### Cumplimiento de Requisitos

- ✅ Mínimo 5 VIEWS
- ✅ Funciones agregadas (SUM, COUNT, AVG, MIN, MAX)
- ✅ GROUP BY en todas
- ✅ HAVING en 2 views (1 y 2)
- ✅ CASE o COALESCE en 2+ views (3 y 4)
- ✅ CTE (WITH) en 1 view (4)
- ✅ Window Function en 2 views (2: ROW_NUMBER, 5: SUM OVER)
- ✅ Columnas con aliases legibles

## 🔍 Índices Creados

| Índice | Tabla | Columna | Para qué sirve |
|--------|-------|---------|----------------|
| `idx_orden_detalles_producto_id` | orden_detalles | producto_id | Acelera JOINs con productos |
| `idx_ordenes_created_at` | ordenes | created_at | Filtra por fecha rápido |
| `idx_orden_detalles_orden_id` | orden_detalles | orden_id | Acelera JOINs con órdenes |

**¿Cómo verificar que se usan?**
```sql
EXPLAIN ANALYZE SELECT * FROM view_productos_mas_vendidos;
-- Buscar "Index Scan" en el resultado
```

## 🔐 Seguridad

1. **Usuario app_reader**: La app se conecta con un usuario que solo puede hacer SELECT a las VIEWS
2. **Sin acceso a tablas**: `app_reader` NO puede leer las tablas directamente
3. **Credenciales en variables de entorno**: Nunca hardcodeadas en el código
4. **Validación Zod**: Todos los filtros se validan antes de usarse
5. **Queries parametrizadas**: Usamos `$1, $2...` en lugar de concatenar strings

### Verificar que app_reader funciona:

```bash
# Conectar como app_reader
docker exec -it postgres_container psql -U app_reader -d actividad_db

# Esto DEBE funcionar:
SELECT * FROM view_ventas_por_categoria LIMIT 1;

# Esto DEBE fallar:
SELECT * FROM productos LIMIT 1;
-- ERROR: permission denied for table productos
```

## 🎨 Características de la App

- **Dashboard** con KPIs principales
- **5 reportes** con tablas y métricas destacadas
- **Filtros validados** con Zod (Top N, fechas, status)
- **Paginación server-side** en 3 reportes
- **Diseño moderno** con tema oscuro
- **Responsive** para móviles

## 🧪 Verificación

```bash
# 1. Verificar que los contenedores corren
docker compose ps

# 2. Verificar las VIEWS
docker exec -it postgres_container psql -U postgres -d actividad_db -c "SELECT * FROM view_ventas_por_categoria;"

# 3. Verificar el rol
docker exec -it postgres_container psql -U postgres -d actividad_db -c "\du app_reader"

# 4. Verificar la app
curl http://localhost:3000
```

## 📝 Commits Sugeridos

1. `feat(db): agregar VIEWS para reportes`
2. `feat(db): agregar índices para optimización`
3. `feat(db): agregar rol de solo lectura`
4. `feat(app): configurar proyecto Next.js`
5. `feat(app): agregar dashboard y reportes`
6. `feat(docker): agregar Docker Compose`
7. `docs: agregar README`

## 💡 Decisiones Técnicas

1. **¿Por qué Next.js App Router?** Es más moderno y permite Server Components para consultar la BD directamente
2. **¿Por qué pool de conexiones?** Es más eficiente que crear una conexión por cada query
3. **¿Por qué Zod?** Valida en runtime y da tipos de TypeScript
4. **¿Por qué standalone output?** Hace la imagen Docker más pequeña
