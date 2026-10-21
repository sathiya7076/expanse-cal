import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { shutdownOcr } from './services/ocrService.js';
import { cleanOrphanUploads } from './utils/cleanup.js';

async function start() {
  await connectDB(env.mongoUri);
  const server = app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));

  const timer = setInterval(() => cleanOrphanUploads().catch((e) => console.error('Upload cleanup failed:', e.message)), 60 * 60 * 1000);
  timer.unref();

  const shutdown = async () => {
    clearInterval(timer);
    server.close();
    await shutdownOcr();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
