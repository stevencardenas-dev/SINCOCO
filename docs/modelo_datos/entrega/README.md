# Diagramas del modelo de datos — Primera Entrega

Copiados sin modificación desde `ANEXOS/DIAGRAMAS BASE DE DATOS/` de la
Primera Entrega, que es el material oficial de evaluación.

| Archivo | Origen | Notas |
|---|---|---|
| `MER.drawio` | `MER` | Modelo entidad-relación. Contiene 32 de las 33 tablas por nombre; `roles_permisos` aparece como relación N:M entre `roles` y `permisos`, no como entidad rotulada. |
| `BDD_NORMALIZADA.drawio` | `BDD normalizada` | Modelo normalizado. Cubre las **33 tablas** del esquema. |
| `DIAGRAMA_DE_CLASES.svg` | `DIAGRAMA DE CLASES.svg` | Diagrama de clases. |

Los originales venían sin extensión (formato draw.io / `app.diagrams.net`).

**No se copió `DIAGRAMA DE CLASES.png`** (13 MB): es el mismo diagrama que el
SVG ya incluido, en mapa de bits y con un peso desproporcionado para el
repositorio. El SVG es vectorial y pesa 460 KB.

Verificado contra `docs/schema.sql` (= `DumpSINCOCO.sql`): las 33 tablas del
esquema están representadas en `BDD_NORMALIZADA.drawio`.
