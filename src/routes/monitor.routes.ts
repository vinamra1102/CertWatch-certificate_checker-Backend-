import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createMonitorSchema } from "../validators/monitor.validator";
import { list, create, get, remove, checkNow } from "../controllers/monitor.controller";

const router = Router();

router.use(authenticate);

router.get("/", list);
router.post("/", validate(createMonitorSchema), create);
router.get("/:id", get);
router.delete("/:id", remove);
router.post("/:id/check", checkNow);

export default router;
