// backend/src/routes/authRoutes.ts

import { Router } from "express";
import { login, refreshToken } from "../controllers/authController";

// Cria uma nova instância do roteador do Express.
const router: Router = Router();

// --- OTIMIZAÇÃO E BOAS PRÁTICAS ---
// Este arquivo segue o padrão ideal: é limpo, direto e tem uma única responsabilidade.
// Ele apenas define os endpoints de autenticação e os associa às suas respectivas
// funções no controller. Não há lógica de negócio aqui, o que o torna leve e fácil de manter.

// Rota para o login do usuário.
router.post("/login", login);

// Rota para renovar o token de acesso usando o refresh token.
router.post("/refresh-token", refreshToken);

// Exporta o roteador para ser usado no arquivo principal do servidor (index.ts).
export default router;
