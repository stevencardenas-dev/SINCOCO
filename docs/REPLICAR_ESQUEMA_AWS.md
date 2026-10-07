# Replicar el esquema de la base de AWS en el repositorio

Guía para sacar un dump de `sincoco` desde el RDS de AWS y comparar su estructura con
`docs/schema.sql`. Sirve para mantener el repositorio fiel a lo que hay en producción.

> **Importante:** el dump con datos contiene usuarios reales, hashes de contraseñas y
> datos personales. **Nunca lo subas al repositorio** (ni a `docs/`, ni a `.local/`).
> Solo se versiona el esquema (`schema.sql`) y los seeds con datos ficticios.

## Antes de empezar

- AWS CLI configurada con un usuario IAM de **solo lectura** para EC2/RDS.
- La clave `.pem` del par de claves de la EC2 (ver [Clave SSH](#clave-ssh)).
- Región: **us-east-2**.
- Valores de referencia (cámbialos si la infraestructura cambia):

| Dato | Valor actual |
|---|---|
| Instancia EC2 | `i-0c50888c3b1ee7fe6` (`sincoco-ec2`) |
| IP pública (Elastic IP) | `18.225.67.26` |
| Security group de la EC2 | `sg-0d163fcb94489cf3d` (`sincoco-ec2-sg`) |
| Usuario SSH | `ubuntu` |
| Base de datos | RDS `sincoco-db`, MySQL 8.4.11, no pública |

## Costo

- El dump en la EC2 no tiene costo adicional, porque la instancia ya está encendida.
- SSH y SSM no cobran por usarse.
- Solo hay costo por transferencia de salida de AWS al bajar el archivo. Con los primeros
  100 GB mensuales gratuitos, una base de unos pocos MB cuesta prácticamente cero.

## Paso 1: abrir SSH solo para tu IP

El puerto 22 normalmente está cerrado. Ábrelo únicamente para tu IP pública:

```bash
MYIP=$(curl -s https://checkip.amazonaws.com | tr -d '\r\n')
aws ec2 authorize-security-group-ingress --region us-east-2 \
  --group-id sg-0d163fcb94489cf3d --protocol tcp --port 22 --cidr "$MYIP/32" \
  --query 'SecurityGroupRules[0].SecurityGroupRuleId' --output text
```

Guarda el `SecurityGroupRuleId` que devuelve (formato `sgr-...`): lo necesitas para cerrarlo.

## Paso 2: generar el dump dentro de la EC2

Conéctate:

```powershell
ssh -i "RUTA\A\free-tier-key.pem" ubuntu@18.225.67.26
```

Ya dentro de la instancia, exporta usando las credenciales que la aplicación ya tiene en
`.env` (no se imprimen en pantalla):

```bash
cd /opt/sincoco/backend && set -a && . ./.env && set +a && \
MYSQL_PWD="$DB_PASSWORD" mysqldump -h "$DB_HOST" -u "$DB_USER" \
  --single-transaction --skip-lock-tables --set-gtid-purged=OFF --no-tablespaces \
  --routines --triggers --events sincoco > /tmp/sincoco-dump.sql \
  && tail -n 2 /tmp/sincoco-dump.sql && ls -lh /tmp/sincoco-dump.sql
```

Por qué cada opción:

- `--skip-lock-tables` y `--no-tablespaces`: el usuario `sincoco` no tiene los privilegios
  `RELOAD` ni `PROCESS`. Sin estas opciones, `mysqldump` falla.
- `--single-transaction`: exporta un snapshot consistente sin bloquear tablas (solo InnoDB).
- `--set-gtid-purged=OFF`: evita líneas de GTID que luego estorban al cargar en otra base.

**Verifica** que la última línea sea `-- Dump completed`. Si no aparece, el archivo está
incompleto: no lo copies.

Para exportar **solo la estructura** (sin datos), agrega `--no-data`.

Sal de la instancia con `exit`.

## Paso 3: copiar el archivo a tu equipo

Desde **PowerShell en tu equipo** (no dentro de la EC2):

```powershell
scp -i "RUTA\A\free-tier-key.pem" ubuntu@18.225.67.26:/tmp/sincoco-dump.sql "C:\Users\TU_USUARIO\Downloads\sincoco-dump.sql"
```

Guárdalo fuera del repositorio.

## Paso 4: cerrar SSH

Cierra el puerto 22 en cuanto termines:

```bash
aws ec2 revoke-security-group-ingress --region us-east-2 \
  --group-id sg-0d163fcb94489cf3d --security-group-rule-ids SGR_ID
```

Reemplaza `SGR_ID` por el `sgr-...` del paso 1.

## Paso 5: comparar con el repositorio

Estos comandos se corren desde la raíz del proyecto, en Git Bash. Comparan tablas,
columnas, llaves, triggers y restricciones, ignorando diferencias de formato que agrega
`mysqldump` (como `CHARACTER SET` y `COLLATE`).

```bash
DUMP=/c/Users/TU_USUARIO/Downloads/sincoco-dump.sql

# Nombres de tablas
diff <(grep -o '^CREATE TABLE `[^`]*`' docs/schema.sql | sort) \
     <(grep -o '^CREATE TABLE `[^`]*`' "$DUMP" | sort)

# Triggers (mysqldump los escribe dentro de comentarios /*!50003 ... */)
diff <(grep -o 'TRIGGER `[^`]*`' docs/schema.sql | sort -u) \
     <(grep -o 'TRIGGER `[^`]*`' "$DUMP" | sort -u)

# Columnas, llaves y restricciones, normalizadas
norm(){ grep -E '^  [`(A-Z]' "$1" | sed -E 's/CHARACTER SET utf8mb4 //g; s/ COLLATE [a-z0-9_]+//g; s/ AUTO_INCREMENT=[0-9]+//; s/ +$//; s/,$//' | grep -v -E '^  DEFAULT' | sort; }
diff <(norm docs/schema.sql) <(norm "$DUMP")
```

Si los tres `diff` no muestran salida, el esquema coincide. Si muestran diferencias,
revisa primero si vienen de una migración (`docs/migraciones/`) que todavía no está
reflejada en `schema.sql`. Ese fue el caso de `sesion_actual`, `sesion_iniciada_en` y
`sesion_actividad`.

Esta comparación no cubre el contenido de los datos ni el orden exacto de las columnas.

## Paso 6: actualizar el repositorio

1. Corrige `docs/schema.sql` con las diferencias reales.
2. Actualiza los conteos de tablas, triggers y `CHECK` en `README.md`.
3. Si cambió la versión del motor, actualízala en `deploy/README.md`.
4. Revisa el diff con `git diff` antes de hacer commit.

## Qué no hacer

- No subas el dump con datos a Git, ni siquiera por accidente.
- No dejes el puerto 22 abierto después de usarlo.
- No pegues contraseñas ni claves en el chat ni en archivos versionados.
- No corras el esquema sobre la base de AWS: `schema.sql` tiene `DROP TABLE IF EXISTS`.

## Clave SSH

El archivo `free-tier-key.pem` solo se descarga una vez, al crear el par de claves. Si
lo perdiste, AWS no puede regenerarlo. En ese caso tienes dos opciones:

- **EC2 Instance Connect** desde la consola: envía una clave temporal, así que no necesitas el `.pem`.
  Sigue requiriendo el puerto 22 abierto para tu IP.
- **Session Manager** desde la consola: no requiere el puerto 22 ni el `.pem`, pero para
  sacar el archivo de la EC2 hay que usar S3 temporal.

Si tienes una copia del `.pem`, guárdala fuera de cualquier carpeta sincronizada
(OneDrive, Git, etc.).
