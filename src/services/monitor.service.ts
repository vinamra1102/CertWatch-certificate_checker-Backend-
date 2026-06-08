import { prisma } from "../config/db";
import { getCertInfo } from "./cert.service";

export async function listMonitors(userId: string) {
  return prisma.monitor.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createMonitor(userId: string, domain: string) {
  const certInfo = await getCertInfo(domain);

  return prisma.monitor.create({
    data: {
      domain,
      userId,
      status: certInfo.status,
      issuer: certInfo.issuer,
      expiryDate: certInfo.expiryDate,
      daysRemaining: certInfo.daysRemaining,
      lastCheckedAt: new Date(),
    },
  });
}

export async function getMonitor(userId: string, id: string) {
  return prisma.monitor.findFirst({ where: { id, userId } });
}

export async function deleteMonitor(userId: string, id: string) {
  return prisma.monitor.deleteMany({ where: { id, userId } });
}

export async function checkMonitor(userId: string, id: string) {
  const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
  if (!monitor) return null;

  const certInfo = await getCertInfo(monitor.domain);

  return prisma.monitor.update({
    where: { id },
    data: {
      status: certInfo.status,
      issuer: certInfo.issuer,
      expiryDate: certInfo.expiryDate,
      daysRemaining: certInfo.daysRemaining,
      lastCheckedAt: new Date(),
    },
  });
}
