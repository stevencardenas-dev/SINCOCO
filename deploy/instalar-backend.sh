#!/bin/bash
# Instala o actualiza el backend de SINCOCO EN LA INSTANCIA (se ejecuta por SSM
# como root, ver deploy/README.md). Es idempotente: se puede repetir para
# desplegar una versión nueva.
#
#   aws ssm send-command --document-name AWS-RunShellScript \
#     --instance-ids <id> --parameters commands=file://...
#
# Requisitos previos: el bucket de despliegue con sincoco-backend.tar.gz y los
# parámetros /sincoco/backend-env (el .env completo) y /sincoco/origin-verify.
# Sin `set -x`: el trace guardaría en el historial de SSM el secreto del header
# de origen que se lee de Parameter Store.
set -eo pipefail

BUCKET=sincoco-deploy-388371826611
REGION=us-east-2
DEST=/opt/sincoco

export DEBIAN_FRONTEND=noninteractive

# bcrypt es un módulo nativo: aseguramos cadena de compilación por si no hay
# binario precompilado para esta versión de Node.
command -v gcc >/dev/null || { apt-get update -y && apt-get install -y build-essential python3; }

# La instancia necesita el CLI de AWS para leer el código desde S3 y los
# secretos desde Parameter Store. Ubuntu no lo trae de serie.
command -v aws >/dev/null || {
  apt-get install -y unzip
  curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscliv2.zip
  unzip -q -o /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install --update
}

# --- 1. Código ------------------------------------------------------------
aws s3 cp "s3://$BUCKET/sincoco-backend.tar.gz" /tmp/sincoco-backend.tar.gz --region "$REGION"
rm -rf /tmp/sincoco-src && mkdir -p /tmp/sincoco-src
tar -xzf /tmp/sincoco-backend.tar.gz -C /tmp/sincoco-src

mkdir -p "$DEST/backend" "$DEST/logs"
cp -r /tmp/sincoco-src/backend/. "$DEST/backend/"
chown -R ubuntu:ubuntu "$DEST"

# --- 2. Dependencias y variables de entorno ------------------------------
cd "$DEST/backend"
sudo -u ubuntu npm ci --omit=dev

# El .env de producción se guarda cifrado en SSM Parameter Store; nunca viaja
# por el repositorio ni por el user-data de la instancia.
aws ssm get-parameter --name /sincoco/backend-env --with-decryption \
  --region "$REGION" --query Parameter.Value --output text > "$DEST/backend/.env"
chmod 600 "$DEST/backend/.env"
chown ubuntu:ubuntu "$DEST/backend/.env"

# --- 3. nginx -------------------------------------------------------------
ORIGIN_VERIFY=$(aws ssm get-parameter --name /sincoco/origin-verify --with-decryption \
  --region "$REGION" --query Parameter.Value --output text)
sed "s|__ORIGIN_VERIFY__|$ORIGIN_VERIFY|" /tmp/sincoco-src/deploy/nginx/sincoco.conf \
  > /etc/nginx/sites-available/sincoco
ln -sf /etc/nginx/sites-available/sincoco /etc/nginx/sites-enabled/sincoco
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# --- 4. Servicio systemd --------------------------------------------------
cp /tmp/sincoco-src/deploy/systemd/sincoco-backend.service /etc/systemd/system/sincoco-backend.service
systemctl daemon-reload
systemctl enable sincoco-backend
systemctl restart sincoco-backend

# --- 5. Verificación ------------------------------------------------------
sleep 3
systemctl is-active sincoco-backend
curl -s -o /dev/null -w 'nginx->backend: %{http_code}\n' \
  -H "X-Origin-Verify: $ORIGIN_VERIFY" http://127.0.0.1/api/usuarios || true
echo "instalación terminada"
