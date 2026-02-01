/**
 * lib/schemas.ts - Validación con Zod
 * 
 * Zod nos ayuda a validar los datos que recibimos del usuario.
 * Esto es importante para seguridad porque:
 * 1. Evitamos que nos envíen datos maliciosos
 * 2. Nos aseguramos que los tipos sean correctos
 * 3. Podemos definir rangos válidos
 * 
 * Ejemplo: si esperamos un número del 1 al 100, Zod rechaza "999" o "abc"
 */

import { z } from 'zod';

/**
 * Schema para paginación
 * - page: número de página (mínimo 1)
 * - limit: cuántos resultados por página (1-100)
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

/**
 * Schema para filtro de Top N productos
 * - topN: cuántos productos mostrar (1-50)
 */
export const TopNSchema = z.object({
  topN: z.coerce.number().int().min(1).max(50).default(10),
});

export type TopNParams = z.infer<typeof TopNSchema>;

/**
 * Schema para filtro por rango de fechas
 * - startDate: fecha inicial (opcional)
 * - endDate: fecha final (opcional)
 */
export const DateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type DateRangeParams = z.infer<typeof DateRangeSchema>;

/**
 * Schema para filtro por status de orden
 * - status: uno de los valores permitidos (whitelist)
 */
export const OrderStatusSchema = z.object({
  status: z.enum(['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado']).optional(),
});

export type OrderStatusParams = z.infer<typeof OrderStatusSchema>;

/**
 * Schema para filtro por categoría
 * - categoriaId: ID de la categoría (número positivo)
 */
export const CategoryFilterSchema = z.object({
  categoriaId: z.coerce.number().int().positive().optional(),
});

export type CategoryFilterParams = z.infer<typeof CategoryFilterSchema>;

/**
 * Función helper para validar y parsear parámetros de búsqueda
 * 
 * @param searchParams - Los parámetros de la URL
 * @param schema - El schema de Zod a usar
 * @returns Los datos validados o un error
 */
export function parseSearchParams<T extends z.ZodTypeAny>(
  searchParams: Record<string, string | string[] | undefined>,
  schema: T
): z.infer<T> {
  // Convertimos los searchParams a un objeto simple
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      params[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      params[key] = value[0];
    }
  }
  
  // Validamos con Zod (lanza error si no es válido)
  return schema.parse(params);
}
