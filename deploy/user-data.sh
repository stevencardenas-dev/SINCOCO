#!/bin/bash
# cloud-init de la EC2 de SINCOCO (ver deploy/README.md).
# Solo instala la base: nginx, Node 22 LTS y el cliente MySQL. El código del
# backend, el .env de producción y la configuración de nginx se aplican después
# por SSM (deploy/instalar-backend.sh), de modo que las credenciales nunca
# quedan escritas en el user-data de la instancia.
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y nginx mysql-client curl ca-certificates unzip

# AWS CLI v2: la instancia lo usa para leer el código (S3) y los secretos
# (Parameter Store) durante la instalación por SSM.
curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscliv2.zip
unzip -q -o /tmp/awscliv2.zip -d /tmp
/tmp/aws/install --update

# Node.js 22 LTS desde NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
bash /tmp/nodesource_setup.sh
apt-get install -y nodejs

mkdir -p /opt/sincoco/backend /opt/sincoco/logs
chown -R ubuntu:ubuntu /opt/sincoco

# nginx arranca sin configurar; la vhost de SINCOCO la escribe el paso de SSM.
systemctl enable nginx
systemctl start nginx

node -v > /opt/sincoco/node-version.txt
npm -v >> /opt/sincoco/node-version.txt
