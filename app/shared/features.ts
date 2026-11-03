// The "Ask HawkerReach" chat (Spec 6, #128) is off unless HAWKERREACH_GENIE_ENABLED is "true" and a Genie space
// is bound. The genie plugin throws on start when a space ID is empty, so the server registers it only then,
// and the browser learns the result from GET /api/features.
export const GENIE_ALIAS = 'hawkerreach';

export interface Features {
  genie: boolean;
}

export function genieSpaceId(env: Record<string, string | undefined>): string | null {
  if (env.HAWKERREACH_GENIE_ENABLED?.trim().toLowerCase() !== 'true') return null;
  return env.DATABRICKS_GENIE_SPACE_ID?.trim() || null;
}
