#!/bin/bash
# Carga el esquema y los datos iniciales en el RDS de SINCOCO.
# Se ejecuta EN LA INSTANCIA (vía SSM): el RDS no es accesible desde Internet.
#
# A propósito NO se usa `set -x`: este script lee credenciales y el trace de
# bash acabaría guardándolas en el historial de comandos de SSM.
set -eo pipefail

cd /tmp/sincoco-src

# Las credenciales salen del .env que la instancia descargó de SSM; se pasan a
# mysql por MYSQL_PWD para que no aparezcan ni en el historial ni en `ps`.
set -a
# shellcheck disable=SC1091
. /opt/sincoco/backend/.env
set +a
export MYSQL_PWD="$DB_PASSWORD"
MYSQL="mysql -h $DB_HOST -u $DB_USER"

# --- 1. Esquema -----------------------------------------------------------
# docs/schema.sql empieza con DROP TABLE de las 33 tablas, así que solo se
# aplica en una base vacía. FORZAR_ESQUEMA=1 lo recarga (¡borra los datos!).
if [ "${FORZAR_ESQUEMA:-0}" = "1" ] || ! $MYSQL "$DB_NAME" -e "SELECT 1 FROM usuarios LIMIT 1" >/dev/null 2>&1; then
  # El dump se hizo con mysqldump en un servidor local y sus triggers llevan
  # DEFINER=`root`@`localhost`. RDS no permite crear objetos con un DEFINER de
  # otro usuario (haría falta SUPER o SET_USER_ID), así que se elimina esa
  # cláusula: sin ella el trigger queda definido por quien lo crea, que es lo
  # que queremos. Afecta a los 4 triggers de inventario del esquema.
  sed 's|/\*!50017 DEFINER=[^*]*\*/||g' docs/schema.sql > /tmp/schema-rds.sql
  echo "cargando esquema (DEFINER restantes: $(grep -c 'DEFINER' /tmp/schema-rds.sql))"
  $MYSQL < /tmp/schema-rds.sql
else
  echo "el esquema ya existe: se omite (usa FORZAR_ESQUEMA=1 para recargarlo)"
fi

# --- 2. Catálogos del personal (cargos y especialidades) --------------------
# Se ejecuta SIEMPRE: en una base que viene del esquema anterior migra el texto
# libre de `trabajadores.cargo` / `especialidad` a las tablas de dominio, y en
# una base nueva no hace nada. Después se completan con el catálogo inicial.
$MYSQL "$DB_NAME" < docs/migraciones/aplicadas/migracion_catalogos.sql

# --- 2b. Recuperación de contraseña (HU-01) --------------------------------
# Crea la tabla de códigos de un solo uso si no existe (bases anteriores).
$MYSQL "$DB_NAME" < docs/migraciones/aplicadas/migracion_password_reset.sql

# --- 2c. Seguridad y RBAC ---------------------------------------------------
# Columnas de sesión única por cuenta, y los permisos de gestión de acceso a
# proyectos y actividades. Son idempotentes: en una base nueva no hacen nada
# (el seed de permisos ya los trae).
$MYSQL "$DB_NAME" < docs/migraciones/aplicadas/migracion_sesion_unica.sql
$MYSQL "$DB_NAME" < docs/migraciones/aplicadas/migracion_roles_gestionar.sql
$MYSQL "$DB_NAME" < docs/migraciones/aplicadas/migracion_rbac_acceso.sql
$MYSQL "$DB_NAME" < docs/migraciones/aplicadas/migracion_usuarios_editar.sql

# Gestión Administrativa (catálogos): el gerente la ve y la opera igual que el
# administrador. En una base nueva el seed de permisos ya la trae.
$MYSQL "$DB_NAME" < docs/migraciones/aplicadas/migracion_catalogo_gerente.sql

# --- 2d. Personal: «Inactivo» = dado de baja (HU-04 · HU-18) ----------------
# Alinea los trabajadores que quedaron en INACTIVO sin baja lógica (y al revés).
$MYSQL "$DB_NAME" < docs/migraciones/aplicadas/migracion_personal_baja.sql

# --- 2e. Categorías de cargos y especialidades (HU-04) ----------------------
# Va antes del seed de catálogos: el seed escribe la columna `categoria`.
$MYSQL "$DB_NAME" < docs/migraciones/aplicadas/migracion_categorias_personal.sql

$MYSQL "$DB_NAME" < docs/seed_catalogos_prueba.sql

# --- 3. Roles, usuarios y trabajadores ------------------------------------
# Va ANTES que la matriz de permisos: seed_permisos_prueba.sql construye
# roles_permisos con un SELECT sobre `roles`, así que los roles deben existir.
# Los trabajadores referencian `cargos`, que ya quedó cargado arriba.
$MYSQL "$DB_NAME" < docs/seed_usuarios_prueba.sql

# --- 4. Catálogo de permisos y matriz rol -> permisos (HU-01) -------------
$MYSQL "$DB_NAME" < docs/seed_permisos_prueba.sql

# --- 5. Cliente de ejemplo ------------------------------------------------
$MYSQL "$DB_NAME" < docs/seed_proyectos_prueba.sql

# --- 5b. Migraciones pendientes en AWS -----------------------------------
# Van después de los seeds: necesitan los roles y permisos ya cargados.
$MYSQL "$DB_NAME" < docs/migraciones/pendientes/migracion_bitacora_inmutable.sql
$MYSQL "$DB_NAME" < docs/migraciones/pendientes/migracion_herramientas.sql

# --- 6. Contraseñas reales ------------------------------------------------
# El SQL deja un hash de marcador: scripts/seed.js lo reemplaza por bcrypt.
(cd /opt/sincoco/backend && sudo -u ubuntu node scripts/seed.js)

# --- 7. Verificación ------------------------------------------------------
$MYSQL "$DB_NAME" -e "
  SELECT 'usuarios' t, COUNT(*) n FROM usuarios
  UNION ALL SELECT 'roles', COUNT(*) FROM roles
  UNION ALL SELECT 'permisos', COUNT(*) FROM permisos
  UNION ALL SELECT 'roles_permisos', COUNT(*) FROM roles_permisos
  UNION ALL SELECT 'trabajadores', COUNT(*) FROM trabajadores
  UNION ALL SELECT 'cargos', COUNT(*) FROM cargos
  UNION ALL SELECT 'especialidades', COUNT(*) FROM especialidades
  UNION ALL SELECT 'clientes', COUNT(*) FROM clientes
  UNION ALL SELECT 'triggers', COUNT(*) FROM information_schema.triggers
    WHERE trigger_schema = 'sincoco';"

echo "--- permisos por rol ---"
$MYSQL "$DB_NAME" -e "
  SELECT r.nombre rol, COUNT(rp.permiso_id) permisos
  FROM roles r LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
  GROUP BY r.id, r.nombre ORDER BY permisos DESC;"

unset MYSQL_PWD
systemctl restart sincoco-backend
sleep 3
systemctl is-active sincoco-backend
