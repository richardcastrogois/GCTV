// backend/src/routes/dashboardRoutes.ts

import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";

const router: Router = Router();

// --- OTIMIZAÇÃO E BOAS PRÁTICAS ---
// Assim como as outras rotas, este arquivo está perfeito.
// Ele protege o endpoint com o middleware de autenticação e direciona
// a requisição para a função de controller correta, mantendo o código
// organizado e seguro.

// Rota principal para buscar os dados da dashboard.
router.get("/", authMiddleware, getDashboardStats);

export default router;
