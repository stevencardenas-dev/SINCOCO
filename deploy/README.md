# Despliegue de SINCOCO en AWS

Despliegue de producción sobre la cuenta `388371826611` (región **us-east-2**),
con recursos dimensionados a la capa gratuita.

## Arquitectura

```
                      https://d2u6xogluht7jo.cloudfront.net
                                   │
                ┌──────────────────┴───────────────────┐
         /*     │                            /api/*    │
                ▼                                      ▼
      S3 sincoco-frontend-…            EC2 sincoco-ec2 (t3.micro, Ubuntu 24.04)
      (build de Vite, privado,                    │  nginx :80  →  127.0.0.1:3005
       leído por CloudFront vía OAC)              │  (systemd: sincoco-backend)
                                                  ▼
                                     RDS sincoco-db (MySQL 8.0.46, db.t4g.micro)
                                     privado, solo acepta 3306 desde la EC2
```

Una sola distribución de CloudFront resuelve el problema de *mixed content*: el
navegador solo habla HTTPS con CloudFront, que sirve el frontend desde S3 y
enruta `/api/*` hacia la EC2 hablando HTTP por dentro de la red de AWS. Como
todo queda en el mismo origen, el frontend usa rutas relativas (`/api`) y **no
hay CORS que configurar**.

El puerto 80 de la EC2 está abierto (CloudFront necesita alcanzarlo), pero nginx
solo responde si la petición trae el header `X-Origin-Verify` con el secreto que
CloudFront añade al reenviar. Pedir `http://18.225.67.26/api/...` directamente
devuelve **403**.

## Los enlaces profundos del SPA y por qué NO se usan CustomErrorResponses

Al recargar `/proyectos/12`, S3 no tiene ese objeto y devolvería un error. La
solución habitual es un `CustomErrorResponses` de la distribución que mapea
403/404 a `/index.html`… **pero eso rompe el API**: los 403 del RBAC (por
ejemplo cuando `bodega` pide `/api/usuarios`) también se convertirían en el
`index.html` con estado **200**, y el frontend nunca vería que le faltan
permisos. Se comprobó durante el despliegue: el RBAC funcionaba en el backend y
el navegador recibía HTML con 200.

En su lugar, la reescritura vive en la **CloudFront Function
`sincoco-spa-rewrite`** (`deploy/spa-rewrite.js`), asociada únicamente al
comportamiento por defecto (el estático) y no al de `/api/*`. Así cada camino
tiene su propia semántica de errores.

## Recursos

| Recurso | Nombre / identificador | Notas |
|---|---|---|
| EC2 | `i-0c50888c3b1ee7fe6` (`sincoco-ec2`) | t3.micro, Ubuntu 24.04, 16 GB gp3, IMDSv2 obligatorio |
| IP elástica | `18.225.67.26` (`eipalloc-019d24dab138f5a2f`) | el origen de CloudFront no cambia si reinicias la instancia |
| Security group app | `sincoco-ec2-sg` (`sg-0d163fcb94489cf3d`) | 80 al mundo (CloudFront), 22 solo a una IP de administración |
| Security group DB | `sincoco-rds-sg` (`sg-041af3b79637401c2`) | 3306 solo desde `sincoco-ec2-sg` |
| RDS | `sincoco-db` | MySQL 8.0.46, db.t4g.micro, 20 GB gp2, sin acceso público, protección contra borrado |
| S3 frontend | `sincoco-frontend-388371826611` | privado, acceso solo por CloudFront (OAC `E2GFKHK7O2Z7MH`) |
| S3 despliegue | `sincoco-deploy-388371826611` | guarda `sincoco-backend.tar.gz` |
| CloudFront | `E3ISG1W90B8Z49` → `d2u6xogluht7jo.cloudfront.net` | `PriceClass_100`, HTTPS obligatorio |
| CloudFront Function | `sincoco-spa-rewrite` | solo en el comportamiento estático: reescribe rutas sin extensión a `index.html` |
| Rol de instancia | `sincoco-ssm-role` (`sincoco-ssm-profile`) | SSM + lectura del bucket y de los parámetros de despliegue |
| Proveedor OIDC | `token.actions.githubusercontent.com` | permite a GitHub Actions autenticarse sin claves guardadas |
| Rol de despliegue | `sincoco-github-deploy` | asumible **solo** desde la rama `main` de este repositorio |

Administración sin SSH: la instancia se gestiona con **SSM Run Command**, así que
no hacen falta claves `.pem` ni abrir el puerto 22 a Internet.

## Secretos

Nada de esto está en el repositorio:

- `deploy/local/` (ignorado por git) guarda los secretos generados y los JSON de
  los comandos usados: `secrets.env`, `cf-distribution.json`, etc.
- En AWS, el `.env` completo del backend vive **cifrado** en SSM Parameter Store
  como `SecureString` en `/sincoco/backend-env`, y el secreto del header de
  origen en `/sincoco/origin-verify`. La instancia los lee al instalar con su rol.

## Despliegue paso a paso

Requisitos: AWS CLI con credenciales de la cuenta y permisos suficientes.

```bash
# 1. Secretos y .env de producción (solo la primera vez)
mkdir -p deploy/local && cat > deploy/local/secrets.env <<'EOF'
JWT_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
ORIGIN_VERIFY=$(openssl rand -hex 24)
EOF
source deploy/local/secrets.env

# 2. Publicar los secretos en SSM (nunca por parámetros de comando)
aws ssm put-parameter --name /sincoco/backend-env --type SecureString --overwrite \
  --value "$(printf 'PORT=3005\nDB_HOST=%s\nDB_USER=sincoco\nDB_PASSWORD=%s\nDB_NAME=sincoco\nJWT_SECRET=%s' \
  "$DB_HOST" "$DB_PASSWORD" "$JWT_SECRET")"
aws ssm put-parameter --name /sincoco/origin-verify --type SecureString --overwrite --value "$ORIGIN_VERIFY"

# 3. Empaquetar el backend y subirlo
tar -czf deploy/local/sincoco-backend.tar.gz \
  --exclude='node_modules' --exclude='*/.env' --exclude='.env' \
  backend deploy docs/schema.sql docs/seed_permisos_prueba.sql docs/seed_usuarios_prueba.sql docs/seed_proyectos_prueba.sql
aws s3 cp deploy/local/sincoco-backend.tar.gz s3://sincoco-deploy-388371826611/

# 4. Instalar/actualizar en la instancia (ver deploy/instalar-backend.sh)
#    El script se ejecuta EN la instancia como root vía SSM.
aws ssm send-command --document-name AWS-RunShellScript \
  --instance-ids i-0c50888c3b1ee7fe6 \
  --parameters commands="$(cat /tmp/comandos-instalacion.json)"

# 5. Frontend
cd frontend && npx vite build && cd ..
aws s3 sync frontend/dist s3://sincoco-frontend-388371826611 --delete --exclude index.html \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp frontend/dist/index.html s3://sincoco-frontend-388371826611/index.html \
  --cache-control "no-cache,must-revalidate" --content-type "text/html; charset=utf-8"
aws cloudfront create-invalidation --distribution-id E3ISG1W90B8Z49 --paths '/index.html' '/*'
```

## CI/CD con GitHub Actions

El workflow **`.github/workflows/desplegar.yml`** es **solo manual**: no hay
disparador `push` ni `pull_request`, así que ningún commit ni merge publica en
producción por sí solo.

Para desplegar:

1. *Actions* → **Desplegar SINCOCO en AWS** → **Run workflow**.
2. Elegir la rama `main` y:
   - **componente**: `todo`, `backend` o `frontend` (despliegue parcial, útil para
     publicar solo un cambio de interfaz sin tocar la instancia).
   - **motivo**: texto libre que queda en el resumen de la ejecución.
   - **saltar_pruebas**: `si` solo en emergencias.
3. El botón *Run workflow* solo acepta ramas que existan en GitHub; **si lo
   lanzas desde otra rama, el job falla a propósito** en el primer paso con un
   mensaje claro (y si lo esquivaras, la política de confianza del rol también lo
   rechazaría, porque el `sub` está fijado a `refs/heads/main`).

Cada ejecución guarda en su resumen **quién lo pidió, qué componente, el motivo
y el commit**, que sirve de bitácora del despliegue sin tener que leer los logs.

> Si el repositorio tiene GitHub Actions deshabilitado (*Settings* → *Actions* →
> *General*), la pestaña no ofrecerá el botón y el workflow no correrá.

### Cómo se autentica, y por qué no hay secretos en GitHub

El workflow pide un token OIDC a GitHub y **asume el rol
`arn:aws:iam::388371826611:role/sincoco-github-deploy`**. No existe ninguna
`AWS_ACCESS_KEY_ID` guardada como secreto del repositorio. Esto importa más de
lo habitual porque **el repositorio es público**: unas claves estáticas serían el
peor sitio donde tenerlas.

La política de confianza (`deploy/iam/github-trust-policy.json`) solo acepta el
sujeto `repo:stevencardenas-dev/SINCOCO:ref:refs/heads/main`, así que ni un fork,
ni otra rama, ni otro repositorio pueden asumir el rol. La política de permisos
(`deploy/iam/github-deploy-policy.json`) es de mínimo privilegio: escribir en los
dos buckets, invalidar esta distribución y mandar el comando a **esta**
instancia. Verificado con `iam:simulate-principal-policy`: `s3:PutObject` y
`ssm:SendCommand` salen `allowed`, mientras que `ec2:TerminateInstances`,
`rds:DeleteDBInstance` e `iam:PutRolePolicy` quedan en `implicitDeny`.

### Qué hace cada job

| Job | Trabajo |
|---|---|
| `pruebas` | Comprueba que se lanza desde `main`, levanta MySQL 8 como servicio, carga esquema + seeds y corre las pruebas de API de HU-01, HU-03, HU-04 y HU-18 contra un backend recién arrancado. |
| `backend` | Empaqueta, sube a S3 y ejecuta `deploy/instalar-backend.sh` en la instancia con `deploy/remoto.sh` (SSM, sin SSH). |
| `frontend` | `npm ci` + build, sincroniza a S3 e invalida `/` y `/index.html` en CloudFront. |
| `resumen` | Escribe en la ejecución quién desplegó, qué componente, con qué motivo y el resultado de cada job. |

Los dos despliegues dependen de `pruebas`: **si un criterio de aceptación se
rompe, no se publica**. Si hay una urgencia, el input `saltar_pruebas=si`
permite desplegar igual. El grupo de concurrencia `desplegar-sincoco` evita que
dos ejecuciones se pisen y nunca cancela un despliegue a medias.

### Desplegar a mano

```bash
bash deploy/remoto.sh deploy/instalar-backend.sh   # backend
deploy/remoto.sh deploy/cargar-base.sh             # base de datos
```

### Límites de la capa gratuita en CI

| Consumo por ejecución | Coste |
|---|---|
| Minutos de GitHub Actions | **0**: el repositorio es público, así que son ilimitados y gratis |
| 2 rutas invalidadas en CloudFront | Las primeras 1.000 rutas/mes son gratis → ~500 despliegues/mes |
| ~14 objetos subidos a S3 | Las primeras 2.000 peticiones PUT/mes son gratis → ~140 despliegues/mes |
| Comandos SSM | Sin coste; no se envía la salida a CloudWatch Logs a propósito |
| Tokens OIDC | Gratis |

Nada de esto enciende recursos nuevos, así que **no altera el consumo de
EC2/RDS**, que es lo que de verdad puede salirse de la capa gratuita.

### Limitaciones conocidas

- El pipeline **no migra el esquema**. Si un sprint añade tablas o columnas hay
  que preparar una migración; relanzar `deploy/cargar-base.sh` no basta (omite el
  esquema si ya existe, y `FORZAR_ESQUEMA=1` **borra los datos**).
- El despliegue del backend **reinicia el servicio** (unos segundos de corte).
- Reiniciar la instancia o cambiar su IP no rompe nada (hay IP elástica), pero
  cambiar el **DNS del origen** obligaría a actualizar CloudFront.

## Base de datos

El esquema y los datos iniciales se cargan **desde la propia instancia** (el RDS
no es accesible desde Internet):

Todo está automatizado en **`deploy/cargar-base.sh`** (se ejecuta en la instancia
vía SSM). Hace falta respetar dos detalles que no son obvios:

1. **`seed_usuarios_prueba.sql` va antes que `seed_permisos_prueba.sql`**: la
   matriz `roles_permisos` se construye con un `SELECT` sobre `roles`, así que
   los roles tienen que existir ya. Al revés, el resultado es `roles_permisos`
   vacía y el RBAC deja a **todos** los usuarios sin permisos (403 en todo).
2. El dump `docs/schema.sql` trae los 4 triggers de inventario con
   `DEFINER=root@localhost`; RDS rechaza crear objetos con un DEFINER ajeno
   (`SUPER`/`SET_USER_ID`). El script los elimina con `sed` antes de cargar, de
   modo que cada trigger queda definido por el usuario que lo crea.

El esquema solo se carga si la base está vacía (empieza con `DROP TABLE`).
Para forzar una recarga: `FORZAR_ESQUEMA=1 bash cargar-base.sh`.

Para ejecutarlo a mano:

```bash
export MYSQL_PWD="$(grep -m1 '^DB_PASSWORD=' /opt/sincoco/backend/.env | cut -d= -f2-)"
EP=$(grep -m1 '^DB_HOST=' /opt/sincoco/backend/.env | cut -d= -f2-)
mysql -h "$EP" -u sincoco < /tmp/schema-rds.sql
mysql -h "$EP" -u sincoco sincoco < /tmp/sincoco-src/docs/seed_usuarios_prueba.sql
mysql -h "$EP" -u sincoco sincoco < /tmp/sincoco-src/docs/seed_permisos_prueba.sql
mysql -h "$EP" -u sincoco sincoco < /tmp/sincoco-src/docs/seed_proyectos_prueba.sql
cd /opt/sincoco/backend && sudo -u ubuntu node scripts/seed.js
```

> Sin `docs/seed_permisos_prueba.sql` el RBAC deja a todo el mundo sin permisos:
> ese archivo es el que llena `roles_permisos` (ADMINISTRADOR 19, GERENTE 5,
> MAESTRO_OBRA 3, ENCARGADO_BODEGA 0).

> `deploy/cargar-base.sh` y `deploy/instalar-backend.sh` no usan `set -x` a
> propósito: el trace de bash escribiría los secretos en el historial de
> comandos de SSM.

## Operación

```bash
# Logs del backend
aws ssm send-command --document-name AWS-RunShellScript --instance-ids i-0c50888c3b1ee7fe6 \
  --parameters 'commands=["tail -n 50 /opt/sincoco/logs/backend.log"]'

# Estado de los servicios
aws ssm send-command --document-name AWS-RunShellScript --instance-ids i-0c50888c3b1ee7fe6 \
  --parameters 'commands=["systemctl is-active sincoco-backend nginx"]'

# Reiniciar tras cambiar el .env de SSM
aws ssm send-command --document-name AWS-RunShellScript --instance-ids i-0c50888c3b1ee7fe6 \
  --parameters 'commands=["systemctl restart sincoco-backend"]'
```

## Coste y avisos

- Cabe en la capa gratuita **mientras `free-tier-ec2` y `documents-db` sigan
  detenidos**: EC2 y RDS conceden 750 h/mes *por cuenta*, no por instancia.
  Encender ambos duplica el consumo y empieza a facturarse.
- Desactivar la IP elástica o dejar de usarla sí genera cargo; asociada a esta
  instancia en ejecución, no.
- `--backup-retention-period 0` evita el almacenamiento de backups; las copias
  son manuales (`mysqldump`) si se quieren.
- Si se recrea la instancia, actualiza el origen de CloudFront con el nuevo DNS
  público (con IP elástica no cambia) y desasocia la IP elástica antes de
  terminar la instancia.

## Desmontaje

```bash
aws cloudfront update-distribution --id E3ISG1W90B8Z49 --if-match <ETag> \
  --distribution-config '{"Enabled":false,...}'   # o deshabilitar desde la consola
aws cloudfront delete-distribution --id E3ISG1W90B8Z49 --if-match <ETag>
aws rds delete-db-instance --db-instance-identifier sincoco-db --skip-final-snapshot \
  --delete-automated-backups   # antes hay que quitar --deletion-protection
aws ec2 terminate-instances --instance-ids i-0c50888c3b1ee7fe6
aws ec2 release-address --allocation-id eipalloc-019d24dab138f5a2f
aws s3 rb s3://sincoco-deploy-388371826611 --force
aws s3 rb s3://sincoco-frontend-388371826611 --force
aws ssm delete-parameter --name /sincoco/backend-env --name /sincoco/origin-verify
```
