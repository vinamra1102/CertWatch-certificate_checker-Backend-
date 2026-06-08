import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import * as monitorService from "../services/monitor.service";

export async function list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const monitors = await monitorService.listMonitors(req.user!.userId);
    res.json({ success: true, data: monitors });
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const monitor = await monitorService.createMonitor(req.user!.userId, req.body.domain);
    res.status(201).json({ success: true, data: monitor });
  } catch (err) {
    next(err);
  }
}

export async function get(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params["id"] as string;
    const monitor = await monitorService.getMonitor(req.user!.userId, id);
    if (!monitor) {
      res.status(404).json({ success: false, message: "Monitor not found" });
      return;
    }
    res.json({ success: true, data: monitor });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params["id"] as string;
    const result = await monitorService.deleteMonitor(req.user!.userId, id);
    if (result.count === 0) {
      res.status(404).json({ success: false, message: "Monitor not found" });
      return;
    }
    res.json({ success: true, message: "Monitor deleted" });
  } catch (err) {
    next(err);
  }
}

export async function checkNow(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params["id"] as string;
    const monitor = await monitorService.checkMonitor(req.user!.userId, id);
    if (!monitor) {
      res.status(404).json({ success: false, message: "Monitor not found" });
      return;
    }
    res.json({ success: true, data: monitor });
  } catch (err) {
    next(err);
  }
}
