# Deployment pipeline

This repository ships an automated GitHub Actions workflow that deploys the
Telegram bot backend, API Gateway specification and static web assets to Yandex
Cloud on every push to the `main` branch. For manual experiments the
`deploy-apigateway.sh` helper can be used to create or update the API Gateway
locally once the Cloud Function has been published.

## Required secrets

Configure the following repository secrets before enabling the workflow:

| Secret | Description |
| ------ | ----------- |
| `YC_SERVICE_ACCOUNT_KEY_B64` | Base64 encoded service account key similar to `key.json.b64.txt`. |
| `YC_CLOUD_ID` | Target cloud ID. |
| `YC_FOLDER_ID` | Target folder ID. |
| `BOT_TOKEN` | Telegram bot token injected into the function environment. |

## Repository variables

Set the following repository variables to control the deployment targets:

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `YC_FUNCTION_NAME` | `form-networking` | Cloud Function name. |
| `YC_API_GATEWAY_NAME` | `form-networking-gw` | API Gateway name. |
| `YC_FUNCTION_INVOKER_SA_ID` | _(optional)_ | Service account ID used by API Gateway to invoke the function. |
| `YC_STATIC_BUCKET` | _(required)_ | Object Storage bucket used for static hosting. |
| `DEMO_FLAG` | `true` | Value passed to the `DEMO` environment variable. |

`YC_FUNCTION_INVOKER_SA_ID` should reference a service account that lives in the
target folder and has the `serverless.functions.invoker` role on the function
exposed through the API Gateway. When omitted, the workflow falls back to the
service account ID embedded in `YC_SERVICE_ACCOUNT_KEY_B64`.

## Manual gateway deployment

To verify the API Gateway locally, publish the Cloud Function first and export
its ID into the shell:

```bash
export FUNCTION_ID=... # yc serverless function get --name form-networking --format json | jq -r .id
export YC_FOLDER_ID=...
export YC_API_GATEWAY_NAME=form-networking-gw
```

When a dedicated invoker service account is required set
`FUNCTION_INVOKER_SA_ID` (or `YC_FUNCTION_INVOKER_SA_ID`). Afterwards run:

```bash
./infra/deploy-apigateway.sh
```

The script renders `apigw-openapi.yaml` into `apigw-openapi.resolved.yaml` using
the provided identifiers and calls `yc serverless api-gateway create` (or
`update` when the gateway already exists). The final gateway description is
printed in JSON format, including its public domain name.

## Workflow outputs

The workflow logs and exports the following values in the step summary after a
successful deployment:

- Cloud Function ID.
- API Gateway ID and domain (full public URL).
- Static hosting URL for the web client.

These records can be used to document the `function_id` that is injected into
`infra/apigw-openapi.yaml` during the deployment step.

## Manual verification

To inspect the currently deployed resources manually, run the following commands
with `yc` once authenticated with the service account key:

```bash
yc serverless function get --name ${YC_FUNCTION_NAME:-form-networking} --format json
yc serverless api-gateway get --name ${YC_API_GATEWAY_NAME:-form-networking-gw} --format json
```

Both commands output the resource IDs that can be stored in internal
documentation if needed.
