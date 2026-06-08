import "./config/env"; // fail-fast env validation
import { env } from "./config/env";
import { prisma } from "./config/db";
import { logger } from "./config/logger";
import { createApp } from "./app";
import { startCertCheckScheduler } from "./jobs/certChecker.job";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

const scheduler = env.NODE_ENV === "test" ? null : startCertCheckScheduler();

async function shutdown() {
  logger.info("Shutting down gracefully...");
  scheduler?.stop();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default app;
