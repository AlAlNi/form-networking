# Deployment pipeline

This repository ships an automated GitHub Actions workflow that deploys the
Telegram bot backend, API Gateway specification and static web assets to Yandex
Cloud on every push to the `main` branch.

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
| `YC_STATIC_BUCKET` | _(required)_ | Object Storage bucket used for static hosting. |
| `DEMO_FLAG` | `true` | Value passed to the `DEMO` environment variable. |

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
