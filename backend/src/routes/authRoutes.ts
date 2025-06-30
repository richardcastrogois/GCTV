// backend/src/routes/authRoutes.ts

import { Router } from "express";
import { login, refreshToken } from "../controllers/authController";

const router: Router = Router();

router.post("/login", login);
router.post("/refresh-token", refreshToken);

export default router;