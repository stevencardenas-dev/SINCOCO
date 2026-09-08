# Migraciones

`schema.sql` es el esquema completo para instalaciones **nuevas**. Estas
migraciones actualizan una base `scopi` **existente** sin perder datos.

Motor objetivo: **MySQL 8.0+**. Cada migración se verifica también en MariaDB
10.11, que es lo que corre el entorno de desarrollo actual.

| # | Archivo | Qué hace |
|---|---|---|
| 001 | `001_rn07_baja_logica.sql` | RN07/RF32: baja lógica en las 9 tablas con historial, `ON DELETE CASCADE` → `RESTRICT` en las 6 FK históricas, y `devoluciones_materiales.salida_origen_id` (RN13). |

## Aplicar

```bash
mysqldump -u root -p scopi > backup_$(date +%F).sql   # siempre primero
mysql -u root -p < migrations/001_rn07_baja_logica.sql
```

## Revertir

```bash
mysql -u root -p < migrations/001_rn07_baja_logica_rollback.sql
```

## Verificación de la 001

Ejecutada sobre una copia de la base real (5 usuarios, 5 trabajadores, 5 roles)
en MySQL 8.0.46 y en MariaDB 10.11:

- datos conservados: 15/15 filas;
- `activo` presente en 9 tablas;
- 6 FK en `RESTRICT`; 5 CASCADE de composición conservados a propósito
  (`roles_permisos`, `detalles_*`→cabecera, `evidencias_avance`→seguimiento);
- `fk_dev_salida` creada;
- `DELETE FROM proyectos` con etapas asociadas → error 1451 (comportamiento
  esperado: el historial no puede destruirse);
- rollback devuelve el esquema al estado previo (0 columnas `activo`,
  11 CASCADE) sin pérdida de datos.

> Nota MySQL/MariaDB: `DROP FOREIGN KEY` y `ADD CONSTRAINT` con el mismo nombre
> no pueden ir en un solo `ALTER TABLE` en MariaDB (errno 121). Por eso van
> como sentencias separadas, lo que funciona en ambos motores.
