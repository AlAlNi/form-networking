# Deployment pipeline

The GitHub Actions workflows described in `README.md` deploy the Cloud Function,
API Gateway and optional static client to Yandex Cloud. They rely on OIDC
federation (`id-token: write`) instead of long-lived service account keys. Use
this file as a quick reference when you need to run the gateway deployment
locally.

## Manual gateway deployment

To verify the API Gateway locally, publish the Cloud Function first and export
its ID into the shell:

```bash
export FUNCTION_ID=$(yc serverless function get --name form-networking --format json | jq -r .id)
export YC_FOLDER_ID=<your-folder-id>
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

The production workflow (`cd.yml`) writes the following values to the step
summary after a successful deployment:

- Cloud Function ID.
- API Gateway ID and public domain.
- Public URL that serves the embedded web client (when `YC_STATIC_BUCKET` is
  configured).

Use these values to keep infrastructure documentation in sync with the current
revision.

## Manual verification

To inspect the deployed resources manually, run the following commands once the
`yc` CLI is authenticated via OIDC or a short-lived token:

```bash
yc serverless function get --name ${YC_FUNCTION_NAME:-form-networking} --format json
yc serverless api-gateway get --name ${YC_API_GATEWAY_NAME:-form-networking-gw} --format json
```

For a full description of the CI/CD setup, required service accounts and GitHub
settings, see the "form-networking CI/CD" section in the repository README.
