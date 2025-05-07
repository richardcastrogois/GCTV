import { Router } from "express";
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getPlans,
  getPaymentMethods,
  renewClient,
  getExpiredClients,
  reactivateClient,
  updatePaymentStatus,
} from "../controllers/clientController";
import { authMiddleware } from "../middleware/authMiddleware";

const router: Router = Router();

console.log("Carregando rotas em clientRoutes.ts...");

// Middleware para logar todas as requisições
router.use((req, res, next) => {
  console.log(`Recebida requisição: ${req.method} ${req.originalUrl}`);
  next();
});

// Rotas públicas (não precisam de autenticação)
router.get("/plans", getPlans); // Listar planos ativos
router.get("/payment-methods", getPaymentMethods); // Listar formas de pagamento ativas

// Rotas protegidas por autenticação
router.get("/", authMiddleware, getClients); // Listar todos os clientes
router.get("/expired", authMiddleware, getExpiredClients); // Listar clientes expirados
router.get("/:id", authMiddleware, getClientById); // Buscar cliente por ID
router.post("/", authMiddleware, createClient); // Criar cliente
router.put("/:id", authMiddleware, updateClient); // Atualizar cliente
router.delete("/:id", authMiddleware, deleteClient); // Deletar cliente
router.put("/renew/:id", authMiddleware, renewClient); // Renovar cliente
router.put("/reactivate/:id", authMiddleware, reactivateClient); // Reativar cliente
router.put("/payment-status/:id", authMiddleware, updatePaymentStatus); // Atualizar status de pagamento

console.log("Rotas em clientRoutes.ts carregadas com sucesso.");

export default router;
