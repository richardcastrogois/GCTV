//backend/src/routes/currentMonthRoutes.ts

import { Router } from "express";
import { getCurrentMonthStats } from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";

const router: Router = Router();

// Rota para os dados do mês atual
router.get("/", authMiddleware, getCurrentMonthStats);

export default router;
