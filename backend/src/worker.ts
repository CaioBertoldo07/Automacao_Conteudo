/**
 * Worker process entry point — Phase 6/9.
 * Run separately from the API: `npm run worker` (dev) or `node dist/worker.js` (prod).
 */
import { startContentWorker } from "./workers/content.worker";
import { startMediaWorker } from "./workers/media.worker";
import { startAutomationWorker } from "./workers/automation.worker";
import { automationQueue } from "./queues/automation.queue";

const worker = startContentWorker();
console.log(`[Worker] content-generation worker iniciado (concurrency=3)`);

const mediaWorker = startMediaWorker();
console.log(`[Worker] media-analysis worker iniciado (concurrency=2)`);

const automationWorker = startAutomationWorker();
console.log("[Worker] automation worker iniciado (concurrency=1)");

// Repeatable daily job at 03:00 — idempotent (jobId prevents duplicates on restart).
automationQueue.add(
  "daily-automation-check",
  { type: "CHECK_ALL_COMPANIES" },
  {
    repeat: { pattern: "0 3 * * *" },
    jobId: "daily-automation-check",
  },
);

// Keep the process alive.
process.on("uncaughtException", (err) => {
  console.error("[Worker] Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Worker] Unhandled rejection:", reason);
});
