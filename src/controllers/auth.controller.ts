import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { hashPassword, verifyPassword, signToken } from "../services/auth.service";
import { RegisterInput, LoginInput } from "../validators/auth.validator";

export async function register(
  req: Request<object, object, RegisterInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, message: "Email already in use" });
      return;
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, password: hashed } });
    const token = signToken({ userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email } },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request<object, object, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });

    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email } },
    });
  } catch (err) {
    next(err);
  }
}
