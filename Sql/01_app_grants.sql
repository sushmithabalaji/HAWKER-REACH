-- Read access for the HawkerReach app: gold only (the app never reads bronze or silver).
-- Replace <app-sp> with the app's service principal client id:
--   databricks apps get hawkerreach -o json | jq -r .service_principal_client_id
GRANT USE CATALOG ON CATALOG hawkerreach TO `<app-sp>`;
GRANT USE SCHEMA ON SCHEMA hawkerreach.gold TO `<app-sp>`;
GRANT SELECT ON SCHEMA hawkerreach.gold TO `<app-sp>`;

-- "Ask HawkerReach" chat (Spec 6, #128). AppKit's genie routes run as the person asking, not as the app,
-- so each viewer (the workspace `users` group) needs the space's tables, and nothing the app's
-- service principal holds changes. Only the seven tables the Genie space reads (docs/genie/space.md).
GRANT USE CATALOG ON CATALOG hawkerreach TO `users`;
GRANT USE SCHEMA ON SCHEMA hawkerreach.gold TO `users`;
GRANT SELECT ON TABLE hawkerreach.gold.centres TO `users`;
GRANT SELECT ON TABLE hawkerreach.gold.centre_closures TO `users`;
GRANT SELECT ON TABLE hawkerreach.gold.closure_scenarios TO `users`;
GRANT SELECT ON TABLE hawkerreach.gold.access_sensitivity TO `users`;
GRANT SELECT ON TABLE hawkerreach.gold.centre_demand TO `users`;
GRANT SELECT ON TABLE hawkerreach.gold.subzone_seniors TO `users`;
GRANT SELECT ON TABLE hawkerreach.gold.model_assumptions TO `users`;
-- Not SQL: the space and the warehouse are workspace permissions (users already has CAN_USE on the warehouse):
--   databricks permissions update genie 01f1d6d1a23a1742ae05a2cda8ed8ce6 --json '{"access_control_list":[{"group_name":"users","permission_level":"CAN_RUN"}]}'
--   databricks permissions update warehouses a8c31c5b693a27fd --json '{"access_control_list":[{"group_name":"users","permission_level":"CAN_USE"}]}'
