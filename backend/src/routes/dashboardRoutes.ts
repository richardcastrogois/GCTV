//backend/src/routes/dashboardRoutes.ts

import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";

const router: Router = Router();

// Rota para o dashboard
router.get("/", authMiddleware, getDashboardStats);

export default router;
