// backend/src/routes/currentMonthRoutes.ts

import { Router } from "express";
import { getCurrentMonthStats } from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";

const router: Router = Router();

// --- OTIMIZAÇÃO E BOAS PRÁTICAS ---
// Este arquivo de rota é um exemplo de código limpo e seguro.
// 1. Ele define um endpoint claro e específico.
// 2. Utiliza o 'authMiddleware' para garantir que apenas usuários autenticados
//    possam acessar esta rota, o que é crucial para a segurança.
// 3. Delega toda a lógica de busca de dados para o 'dashboardController'.

// Rota para buscar as estatísticas do mês atual.
router.get("/", authMiddleware, getCurrentMonthStats);

export default router;
