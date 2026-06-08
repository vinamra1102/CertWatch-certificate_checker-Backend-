import { prisma } from "../config/db";
import { getCertInfo } from "./cert.service";

export interface PageOptions {
  page: number;
  limit: number;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listMonitors(userId: string, { page, limit }: PageOptions) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.monitor.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.monitor.count({ where: { userId } }),
  ]);

  const meta: PageMeta = {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };

  return { items, meta };
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
