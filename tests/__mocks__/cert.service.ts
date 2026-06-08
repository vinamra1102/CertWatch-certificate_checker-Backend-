export const MonitorStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  ERROR: "ERROR",
  UNKNOWN: "UNKNOWN",
} as const;

export type MonitorStatus = (typeof MonitorStatus)[keyof typeof MonitorStatus];

export interface CertInfo {
  status: MonitorStatus;
  issuer: string | null;
  expiryDate: Date | null;
  daysRemaining: number | null;
}

export async function getCertInfo(_domain: string): Promise<CertInfo> {
  return {
    status: MonitorStatus.ACTIVE,
    issuer: "Test CA",
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    daysRemaining: 90,
  };
}
