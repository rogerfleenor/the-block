// Bootstrap is intentionally minimal at scaffold time.
// The Backend Engineer agent expands this in Phase 1.
import 'dotenv/config';

import { API_PORT } from '@block/shared';
import Fastify from 'fastify';

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
});

app.get('/api/health', async () => ({ ok: true, ts: new Date().toISOString() }));

const port = Number(process.env.API_PORT ?? API_PORT);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
