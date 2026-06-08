import "./config/env"; // fail-fast env validation
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { prisma } from "./config/db";
import { logger } from "./config/logger";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import monitorRoutes from "./routes/monitor.routes";
import { startCertCheckScheduler } from "./jobs/certChecker.job";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi";

const app = express();

app.use(helmet());
app.use(cors());
app.use(pinoHttp({ logger }));
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later" },
  })
);

app.get("/", (_req, res) => {
  res.json({ success: true, message: "Welcome to CertWatch API" });
});

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: "healthy",
      uptime: process.uptime(),
      db: "ok",
    });
  } catch {
    res.status(503).json({
      success: false,
      status: "degraded",
      db: "unreachable",
    });
  }
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get("/api/docs.json", (_req, res) => res.json(openApiSpec));

app.use("/api/auth", authRoutes);
app.use("/api/monitors", monitorRoutes);

app.use(errorHandler);

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
