#!/bin/bash
# Ejecuta un script local EN la instancia de SINCOCO a través de SSM y espera a
# que termine. Lo usan tanto el despliegue a mano como GitHub Actions, así que
# el camino es exactamente el mismo en los dos casos.
#
#   deploy/remoto.sh deploy/instalar-backend.sh
#   deploy/remoto.sh deploy/cargar-base.sh
#
# Funciona sin abrir SSH: la instancia solo necesita el agente de SSM.
#
# Variables opcionales:
#   SINCOCO_INSTANCE_ID  (por defecto la instancia de producción)
#   AWS_REGION           (por defecto us-east-2)
#   SINCOCO_TIMEOUT      segundos máximos de ejecución (por defecto 900)
set -euo pipefail

INSTANCIA="${SINCOCO_INSTANCE_ID:-i-0c50888c3b1ee7fe6}"
REGION="${AWS_REGION:-us-east-2}"
TIMEOUT="${SINCOCO_TIMEOUT:-900}"

if [ $# -lt 1 ]; then
  echo "uso: $0 <script-local> [argumentos...]" >&2
  exit 2
fi

ORIGEN="$1"
shift
[ -f "$ORIGEN" ] || { echo "no existe el script '$ORIGEN'" >&2; exit 2; }
ARGUMENTOS="$*"

# El script viaja dentro del propio comando: se escribe en /tmp y se ejecuta.
# Los parámetros van en un archivo JSON y no en la línea de comandos, para que
# el contenido (con saltos de línea y comillas) no se rompa en el shell.
DIR_PARAMS="${SINCOCO_TMP_DIR:-deploy/local}"
mkdir -p "$DIR_PARAMS"
PARAMS="$DIR_PARAMS/params-remoto.json"
trap 'rm -f "$PARAMS"' EXIT

ORIGEN="$ORIGEN" ARGUMENTOS="$ARGUMENTOS" PARAMS="$PARAMS" node -e '
const fs = require("fs");
const script = fs.readFileSync(process.env.ORIGEN, "utf8");
const args = process.env.ARGUMENTOS || "";
const marca = "SINCOCO_REMOTO_FIN";
const comando = [
  `cat > /tmp/sincoco-remoto.sh <<'"'"'${marca}'"'"'`,
  script,
  marca,
  "chmod +x /tmp/sincoco-remoto.sh",
  `bash /tmp/sincoco-remoto.sh ${args}`.trim(),
].join("\n");
fs.writeFileSync(process.env.PARAMS, JSON.stringify({ commands: [comando] }));
'

echo "▶ ejecutando $ORIGEN en $INSTANCIA (vía SSM)"
CN=$(aws ssm send-command \
  --document-name AWS-RunShellScript \
  --instance-ids "$INSTANCIA" \
  --region "$REGION" \
  --timeout-seconds "$TIMEOUT" \
  --comment "despliegue SINCOCO: $ORIGEN" \
  --parameters "file://$PARAMS" \
  --query 'Command.CommandId' --output text)

ESTADO=Pendiente
for _ in $(seq 1 $((TIMEOUT / 10))); do
  sleep 10
  ESTADO=$(aws ssm get-command-invocation --command-id "$CN" --instance-id "$INSTANCIA" \
    --region "$REGION" --query 'Status' --output text 2>/dev/null || echo Pendiente)
  case "$ESTADO" in
    Pending | InProgress | Delayed) ;;
    *) break ;;
  esac
done

echo "▶ estado: $ESTADO"
aws ssm get-command-invocation --command-id "$CN" --instance-id "$INSTANCIA" --region "$REGION" \
  --query 'StandardOutputContent' --output text 2>/dev/null || true
SALIDA_ERR=$(aws ssm get-command-invocation --command-id "$CN" --instance-id "$INSTANCIA" --region "$REGION" \
  --query 'StandardErrorContent' --output text 2>/dev/null || true)
[ -n "$SALIDA_ERR" ] && echo "$SALIDA_ERR" >&2

if [ "$ESTADO" != "Success" ]; then
  echo "✖ el despliegue falló en la instancia (estado: $ESTADO)" >&2
  exit 1
fi
echo "✔ $ORIGEN completado"
