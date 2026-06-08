import cron, { ScheduledTask } from "node-cron";
import { prisma } from "../config/db";
import { getCertInfo } from "../services/cert.service";

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
      console.log(
        `[cert-checker] completed in ${Date.now() - start}ms — checked=${result.checked} updated=${result.updated}`
      );
    } catch (err) {
      console.error("[cert-checker] failed:", err);
    }
  });

  console.log(`[cert-checker] scheduled with cron "${SCHEDULE}"`);
  return task;
}
