import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logger } from "../config/logger";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ success: false, message: "Resource already exists" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ success: false, message: "Resource not found" });
      return;
    }
  }

  if (err instanceof Error) {
    logger.error({ err }, "unhandled error");
    res.status(500).json({ success: false, message: "Internal server error" });
    return;
  }

  logger.error({ err }, "unknown error");
  res.status(500).json({ success: false, message: "Internal server error" });
}
