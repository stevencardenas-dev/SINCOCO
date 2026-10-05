#!/bin/bash
# Aplica al RDS de SINCOCO las MIGRACIONES de esquema (docs/migracion_*.sql).
# Se ejecuta EN LA INSTANCIA (vía SSM), igual que cargar-base.sh: el RDS no es
# accesible desde Internet, así que GitHub Actions no puede hablar con MySQL
# directamente; manda este script por SSM y la instancia hace el trabajo.
#
#   aws ssm send-command --document-name AWS-RunShellScript \
#     --instance-ids <id> --parameters commands=file://...
#
# A propósito NO se usa `set -x`: este script lee credenciales y el trace de
# bash acabaría guardándolas en el historial de comandos de SSM.
#
# Diferencias con cargar-base.sh, que son el motivo de que exista este script:
#   - NUNCA carga docs/schema.sql (empieza con DROP TABLE) ni borra datos.
#   - Solo aplica los docs/migracion_*.sql, que se protegen solos (comprueban
#     information_schema antes de tocar nada), así que es idempotente y "fluido":
#     si añades una migración nueva al repo, la próxima ejecución la aplica.
#   - No reinicia el backend: es una corrección de esquema, no un despliegue.
#
# Requisitos previos: el paquete sincoco-migraciones.tar.gz en el bucket de
# despliegue (lo sube .github/workflows/migrar-base.yml) y el .env de producción
# ya instalado en /opt/sincoco/backend/.env.
set -eo pipefail

BUCKET=sincoco-deploy-388371826611
REGION=us-east-2
DEST=/tmp/sincoco-migraciones

# --- 1. Traer las migraciones desde S3 ------------------------------------
# El paquete solo lleva docs/, así que no toca nada de lo que hay instalado.
rm -rf "$DEST" && mkdir -p "$DEST"
aws s3 cp "s3://$BUCKET/sincoco-migraciones.tar.gz" /tmp/sincoco-migraciones.tar.gz \
  --region "$REGION"
tar -xzf /tmp/sincoco-migraciones.tar.gz -C "$DEST"

# --- 2. Credenciales ------------------------------------------------------
# Salen del .env que dejó instalar-backend.sh; se pasan a mysql por MYSQL_PWD
# para que no aparezcan ni en el historial ni en `ps`.
set -a
# shellcheck disable=SC1091
. /opt/sincoco/backend/.env
set +a
export MYSQL_PWD="$DB_PASSWORD"
MYSQL="mysql -h $DB_HOST -u $DB_USER"

# --- 3. Aplicar cada migración, en orden alfabético ------------------------
# El nombre manda en el orden. Es el mismo que usa cargar-base.sh: catálogos
# antes que password_reset. Si un sprint añade otra migración, basta con dejarla
# en docs/migracion_<algo>.sql y encajará en este orden.
migraciones=$(ls "$DEST"/docs/migracion_*.sql 2>/dev/null || true)
if [ -z "$migraciones" ]; then
  echo "no hay migraciones que aplicar"
else
  for archivo in $migraciones; do
    echo "▶ aplicando $(basename "$archivo")"
    $MYSQL "$DB_NAME" < "$archivo"
  done
fi

# --- 4. Verificación -------------------------------------------------------
# Las tablas y columnas que deben existir tras migrar. Si algo falta, el mysql de
# arriba habría fallado antes; esto es la confirmación legible en el log de SSM.
echo "--- estado tras migrar ---"
$MYSQL "$DB_NAME" -e "
  SELECT 'cargos' t, COUNT(*) n FROM cargos
  UNION ALL SELECT 'especialidades', COUNT(*) FROM especialidades
  UNION ALL SELECT 'restablecimientos_password', COUNT(*) FROM restablecimientos_password
  UNION ALL SELECT 'trabajadores', COUNT(*) FROM trabajadores;"

# Las columnas de sesión única: sin ellas el backend nuevo responde 401 en
# cada petición (requireAuth consulta `usuarios.sesion_actual`).
echo "--- columnas de sesión única ---"
$MYSQL "$DB_NAME" -e "
  SELECT column_name, column_type FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'usuarios'
     AND column_name IN ('sesion_actual', 'sesion_iniciada_en', 'sesion_actividad');"

# La matriz rol -> permisos: tras migrar debe salir ADMINISTRADOR 27,
# GERENTE 20, MAESTRO_OBRA 10 y ENCARGADO_BODEGA 0. Si el administrador se queda
# por debajo, la pantalla de asignaciones responderá 403 aunque el código esté
# bien desplegado.
echo "--- permisos por rol ---"
$MYSQL "$DB_NAME" -e "
  SELECT r.nombre rol, COUNT(rp.permiso_id) permisos
  FROM roles r LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
  GROUP BY r.id, r.nombre ORDER BY permisos DESC;"

unset MYSQL_PWD
echo "✔ migraciones aplicadas"
