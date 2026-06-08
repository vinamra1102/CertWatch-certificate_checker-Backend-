import { z } from "zod";

export const createMonitorSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .regex(
      /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/,
      "Invalid domain format (e.g. example.com)"
    ),
});

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
