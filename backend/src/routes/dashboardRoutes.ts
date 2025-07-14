// backend/src/routes/dashboardRoutes.ts
// SUBSTITUA TODO O CONTEÚDO DESTE ARQUIVO POR ISTO:

import { Router } from "express";
// MUDANÇA CRÍTICA: Importa a nova função unificada
import { getUnifiedDashboardData } from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";

const router: Router = Router();

// MUDANÇA CRÍTICA: A rota agora é /all e chama a nova função.
// O front-end está esperando a rota GET /api/dashboard/all
router.get("/all", authMiddleware, getUnifiedDashboardData);

export default router;
