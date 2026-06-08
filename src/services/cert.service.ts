import sslChecker from "ssl-checker";

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

export async function getCertInfo(domain: string): Promise<CertInfo> {
  try {
    const result = await (sslChecker as unknown as (d: string, opts: object) => Promise<{
      valid: boolean;
      daysRemaining: number;
      validTo: string;
      issuer: Record<string, string> | string | null;
    }>)(domain, { method: "GET", port: 443 });

    const daysRemaining = result.daysRemaining ?? null;
    let status: MonitorStatus = MonitorStatus.ACTIVE;

    if (!result.valid) {
      status = MonitorStatus.ERROR;
    } else if (daysRemaining !== null && daysRemaining <= 0) {
      status = MonitorStatus.EXPIRED;
    }

    const rawIssuer = result.issuer;
    const issuer =
      rawIssuer == null
        ? null
        : typeof rawIssuer === "string"
        ? rawIssuer
        : (rawIssuer as Record<string, string>).O ?? JSON.stringify(rawIssuer);

    return {
      status,
      issuer,
      expiryDate: result.validTo ? new Date(result.validTo) : null,
      daysRemaining,
    };
  } catch {
    return {
      status: MonitorStatus.ERROR,
      issuer: null,
      expiryDate: null,
      daysRemaining: null,
    };
  }
}
