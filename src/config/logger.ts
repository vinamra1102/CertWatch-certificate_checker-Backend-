import pino from "pino";
import { env } from "./env";

const isDev = env.NODE_ENV === "development";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : isDev ? "debug" : "info",
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
        },
      }
    : {}),
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.password"],
    censor: "[redacted]",
  },
});
