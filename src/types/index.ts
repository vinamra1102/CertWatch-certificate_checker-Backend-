import { Request } from "express";

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
