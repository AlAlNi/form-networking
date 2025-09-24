#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_PATH="${1:-$SCRIPT_DIR/apigw-openapi.yaml}"
OUTPUT_PATH="${2:-$SCRIPT_DIR/../apigw-openapi.resolved.yaml}"

: "${FUNCTION_ID:?set FUNCTION_ID environment variable with target cloud function ID}"
: "${YC_API_GATEWAY_NAME:?set YC_API_GATEWAY_NAME with API Gateway name}"
: "${YC_FOLDER_ID:?set YC_FOLDER_ID with destination folder ID}"

SERVICE_ACCOUNT_ID="${FUNCTION_INVOKER_SA_ID:-${YC_FUNCTION_INVOKER_SA_ID:-}}"

cmd=(
  node
  "$SCRIPT_DIR/render-apigw.mjs"
  "$TEMPLATE_PATH"
  "$OUTPUT_PATH"
  --function-id
  "$FUNCTION_ID"
)

if [[ -n "$SERVICE_ACCOUNT_ID" ]]; then
  cmd+=(--service-account-id "$SERVICE_ACCOUNT_ID")
fi

"${cmd[@]}"

if yc serverless api-gateway get --name "$YC_API_GATEWAY_NAME" --folder-id "$YC_FOLDER_ID" >/dev/null 2>&1; then
  echo "Updating existing API Gateway $YC_API_GATEWAY_NAME..."
  yc serverless api-gateway update \
    --name "$YC_API_GATEWAY_NAME" \
    --folder-id "$YC_FOLDER_ID" \
    --spec "$OUTPUT_PATH"
else
  echo "Creating API Gateway $YC_API_GATEWAY_NAME..."
  yc serverless api-gateway create \
    --name "$YC_API_GATEWAY_NAME" \
    --folder-id "$YC_FOLDER_ID" \
    --spec "$OUTPUT_PATH"
fi

yc serverless api-gateway get --name "$YC_API_GATEWAY_NAME" --folder-id "$YC_FOLDER_ID" --format json
