import { createApp, analytics, genie, server } from '@databricks/appkit';
import { GENIE_ALIAS, genieSpaceId, type Features } from '../shared/features';

// "Ask HawkerReach" (Spec 6): registered only behind its flag, so with it off the app is exactly as before.
const genieSpace = genieSpaceId(process.env);

createApp({
  plugins: [
    analytics(),
    server(),
    ...(genieSpace ? [genie({ spaces: { [GENIE_ALIAS]: genieSpace }, timeout: 60_000 })] : []),
  ],
  onPluginsReady(appkit) {
    appkit.server.extend((app) => {
      app.get('/api/features', (_req, res) => {
        const features: Features = { genie: genieSpace !== null };
        res.json(features);
      });
    });
  },
}).catch(console.error);
