import cron, { ScheduledTask } from "node-cron";
import { prisma } from "../config/db";
import { getCertInfo } from "../services/cert.service";
import { logger } from "../config/logger";

// Run every day at 02:00 server time
const SCHEDULE = "0 2 * * *";

export async function runCertCheckOnce(): Promise<{ checked: number; updated: number }> {
  const monitors = await prisma.monitor.findMany({ select: { id: true, domain: true } });

  let updated = 0;
  for (const m of monitors) {
    const info = await getCertInfo(m.domain);
    await prisma.monitor.update({
      where: { id: m.id },
      data: {
        status: info.status,
        issuer: info.issuer,
        expiryDate: info.expiryDate,
        daysRemaining: info.daysRemaining,
        lastCheckedAt: new Date(),
      },
    });
    updated += 1;
  }

  return { checked: monitors.length, updated };
}

export function startCertCheckScheduler(): ScheduledTask {
  const task = cron.schedule(SCHEDULE, async () => {
    const start = Date.now();
    try {
      const result = await runCertCheckOnce();
      logger.info(
        { durationMs: Date.now() - start, ...result },
        "cert-checker completed"
      );
    } catch (err) {
      logger.error({ err }, "cert-checker failed");
    }
  });

  logger.info({ schedule: SCHEDULE }, "cert-checker scheduled");
  return task;
}
