import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { prisma } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import monitorRoutes from "./routes/monitor.routes";
import { openApiSpec } from "./docs/openapi";

export function createApp(): Express {
  const app = express();

  // Trust the first proxy hop (Fly.io / Railway / Vercel edge) so that
  // express-rate-limit and pino-http see the real client IP from X-Forwarded-For.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(pinoHttp({ logger }));
  app.use(express.json());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
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
      res.json({ success: true, status: "healthy", uptime: process.uptime(), db: "ok" });
    } catch {
      res.status(503).json({ success: false, status: "degraded", db: "unreachable" });
    }
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get("/api/docs.json", (_req, res) => res.json(openApiSpec));

  app.use("/api/auth", authRoutes);
  app.use("/api/monitors", monitorRoutes);

  app.use(errorHandler);

  return app;
}
