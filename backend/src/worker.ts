/**
 * Worker process entry point — Phase 6.
 * Run separately from the API: `npm run worker` (dev) or `node dist/worker.js` (prod).
 */
import { startContentWorker } from "./workers/content.worker";

const worker = startContentWorker();
console.log(`[Worker] content-generation worker iniciado (concurrency=3)`);

// Keep the process alive.
process.on("uncaughtException", (err) => {
  console.error("[Worker] Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Worker] Unhandled rejection:", reason);
});
