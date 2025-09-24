# form-networking CI/CD

This repository ships GitHub Actions workflows that deploy the Cloud Function, API Gateway and optional static client for the form-networking project into Yandex Cloud. Three independent pipelines cover feature branches (sandbox), pull requests (testing) and the main branch (production).

## Workflow matrix

| Workflow | Trigger | Target environment | Default function name | Purpose |
| --- | --- | --- | --- | --- |
| `CI Deploy` (`ci.yml`) | `push` to `feature/**` | Sandbox | `form-networking-sandbox` | Builds feature branches against an isolated Cloud Function. |
| `CT Deploy` (`ct.yml`) | `pull_request` to `main` | Testing | `form-networking-test` | Reconciles the test function for review builds created from the canonical repository. |
| `CD Deploy` (`cd.yml`) | `push` to `main`, release publish, manual dispatch | Production | `form-networking` | Updates the production function, API Gateway and optional static bucket. |

All workflows request an OpenID Connect (OIDC) token with `id-token: write` permissions and use the `yc-actions` toolkit to authenticate against Yandex Cloud without long-lived keys.

## Yandex Cloud prerequisites

1. **Decide on the target folder.** Record the folder ID (`b1...`) that will host the serverless resources.
2. **Create service accounts.** Either reuse one account or create dedicated accounts per stage. The table below lists the recommended minimal roles:

   | Account | Roles | When required |
   | --- | --- | --- |
   | Sandbox/Test deployer | `serverless.functions.admin` | Always |
   | Production deployer | `serverless.functions.admin`, `serverless.apiGateway.editor` | Always |
   | Production deployer (static bucket uploads) | `storage.uploader` on the Object Storage bucket | Only if `YC_STATIC_BUCKET` is set |
   | API Gateway invoker (optional) | `serverless.functions.invoker` on the production function | When a dedicated invoker SA is desired |

   Example CLI commands (adjust names and folder ID). The snippets use `jq` to extract resource identifiers:

   ```bash
   export FOLDER_ID=<your-folder-id>

   yc iam service-account create --name form-networking-sandbox --folder-id "$FOLDER_ID" --description "Sandbox deployments from GitHub Actions"
   yc iam service-account create --name form-networking-test --folder-id "$FOLDER_ID" --description "Test deployments from GitHub Actions"
   yc iam service-account create --name form-networking-prod --folder-id "$FOLDER_ID" --description "Production deployments from GitHub Actions"

   for SA in form-networking-sandbox form-networking-test form-networking-prod; do
     ID=$(yc iam service-account get --name "$SA" --format json | jq -r .id)
     yc resource-manager folder add-access-binding "$FOLDER_ID" \
       --role serverless.functions.admin \
       --subject "serviceAccount:$ID"
   done

   PROD_ID=$(yc iam service-account get --name form-networking-prod --format json | jq -r .id)
   yc resource-manager folder add-access-binding "$FOLDER_ID" \
     --role serverless.apiGateway.editor \
     --subject "serviceAccount:$PROD_ID"
   ```

   Grant `storage.uploader` on the Object Storage bucket to the production service account if you plan to publish static assets:

   ```bash
   export BUCKET=<your-bucket-name>
   yc storage bucket add-access-binding "$BUCKET" \
     --role storage.uploader \
     --subject "serviceAccount:$PROD_ID"
   ```

3. **Configure OpenID Connect trust.** In the Yandex Cloud console open `Identity and Access Management -> Workload identity federation` and create a provider for GitHub Actions with the issuer `https://token.actions.githubusercontent.com` and the audience `https://github.com/<OWNER>/<REPO>`. Enable automatic approval so GitHub-issued tokens are accepted without manual review.

   After the provider exists, add principal bindings that map GitHub token subjects to the service accounts created above. Use the console or the `yc iam workload-identity-federation` commands (check the CLI help for your installed version). The required subjects are:

   - `repo:<OWNER>/<REPO>:ref:refs/heads/feature/.*` -> sandbox deployer service account.
   - `repo:<OWNER>/<REPO>:pull_request` -> test deployer service account.
   - `repo:<OWNER>/<REPO>:ref:refs/heads/main` -> production deployer service account.

   > Tip: run [`github/actions-oidc-debugger`](https://github.com/actions/actions-oidc-debugger) from a workflow run to inspect the exact `aud` and `sub` values before finalising the bindings.

4. **API Gateway invoker (optional).** When `FUNCTION_INVOKER_SA_ID` is set, grant that service account the `serverless.functions.invoker` role on the production function once it exists:

   ```bash
   yc serverless function add-access-binding \
     --id <production-function-id> \
     --role serverless.functions.invoker \
     --service-account-id <invoker-sa-id>
   ```

## GitHub configuration

Create the following repository variables to drive the workflows. Values in the "Default" column correspond to the fallbacks baked into the YAML files.

| Name | Type | Description | Default |
| --- | --- | --- | --- |
| `YC_FOLDER_ID` | Variable | Target Yandex Cloud folder ID. | required |
| `YC_SA_ID_SHARED` | Variable | Service account ID reused across stages. | empty |
| `YC_SA_ID_SANDBOX` | Variable | Sandbox deployer service account ID. | empty |
| `YC_SA_ID_TEST` | Variable | Test deployer service account ID. | empty |
| `YC_SA_ID_PROD` | Variable | Production deployer service account ID. | empty |
| `YC_FUNCTION_NAME_SANDBOX` | Variable | Sandbox function name. | `form-networking-sandbox` |
| `YC_FUNCTION_NAME_TEST` | Variable | Test function name. | `form-networking-test` |
| `YC_FUNCTION_NAME_PROD` | Variable | Production function name. | `form-networking` |
| `YC_FUNCTION_RUNTIME` | Variable | Cloud Function runtime identifier. | `nodejs22` |
| `YC_FUNCTION_ENTRYPOINT` | Variable | Entry point in the package. | `index.handler` |
| `YC_FUNCTION_MEMORY_SANDBOX` | Variable | Sandbox function RAM budget. | `256Mb` |
| `YC_FUNCTION_MEMORY_TEST` | Variable | Test function RAM budget. | `256Mb` |
| `YC_FUNCTION_MEMORY_PROD` | Variable | Production function RAM budget. | `256Mb` |
| `YC_FUNCTION_SOURCEROOT` | Variable | Directory that contains the function code. | `server/` |
| `YC_API_GATEWAY_NAME` | Variable | API Gateway resource name. | `form-networking-gw` |
| `YC_STATIC_BUCKET` | Variable | Object Storage bucket for the static client. | empty |
| `YC_FUNCTION_INVOKER_SA_ID` | Variable | Service account ID used by the gateway to call the function. | empty |

If the Cloud Function requires additional secrets (for example Telegram tokens), add them as repository or environment secrets and inject them through the `yc-actions/yc-sls-function` `environment` input.

The workflows reference the GitHub environments `sandbox`, `testing` and `production`. GitHub will auto-create them on the first run, but you can pre-configure environment-specific rules (required reviewers, wait timers, additional secrets) if needed.

## Verifying the pipeline end-to-end

1. **Feature branch:** push a commit to a `feature/...` branch. The `CI Deploy` workflow should publish the sandbox function and append a summary with the function ID.
2. **Pull request:** open a PR from the same repository into `main`. `CT Deploy` redeploys the test function. PRs from forks are skipped to prevent untrusted OIDC tokens.
3. **Merge to main:** merge the PR. `CD Deploy` updates the production function, re-renders the API Gateway and optionally publishes the static client to Object Storage. A release tag emits the same deployment.
4. **Observe Cloud Functions:** confirm in the Yandex Cloud console (or via `yc serverless function get`) that each function has the new revision and that the API Gateway points at the latest function ID.
5. **Check logging:** use the Yandex Cloud monitoring UI or `yc serverless function logs` to ensure the function logs incoming requests after each deployment.

## Diagnostics and troubleshooting

- Use [`github/actions-oidc-debugger`](https://github.com/actions/actions-oidc-debugger) within manual workflow runs to validate the token claims that GitHub issues for your repository.
- Inspect the step summary in each workflow run for the deployed function ID and gateway domain. They help match revisions to GitHub commits.
- When `yc-actions` steps fail with `unauthorized`, double-check the workload identity federation bindings and that the `aud` claim in the debugger matches the federation configuration.
- To inspect deployed resources manually:
  ```bash
  yc serverless function get --name <function-name> --format json
  yc serverless api-gateway get --name ${YC_API_GATEWAY_NAME:-form-networking-gw} --format json
  ```
- Enable Action step debug logs by setting the repository secret `ACTIONS_STEP_DEBUG` to `true` temporarily during incident analysis (remember to remove it afterwards).

With the configuration above, the repository maintains a fully automated CI/CD chain for Yandex Cloud Functions driven by GitHub Actions using short-lived OIDC credentials only.
