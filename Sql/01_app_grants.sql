-- Read access for the HawkerReach app: gold only (the app never reads bronze or silver).
-- Replace <app-sp> with the app's service principal client id:
--   databricks apps get hawkerreach -o json | jq -r .service_principal_client_id
GRANT USE CATALOG ON CATALOG hawkerreach TO `<app-sp>`;
GRANT USE SCHEMA ON SCHEMA hawkerreach.gold TO `<app-sp>`;
GRANT SELECT ON SCHEMA hawkerreach.gold TO `<app-sp>`;
