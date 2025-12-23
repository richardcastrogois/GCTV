// backend/src/routes/clientRoutes.ts

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
  reactivateClient,
  updatePaymentStatus,
  editPayment,
  deletePayment,
  updateClientObservations,
  updateVisualPaymentStatus,
  getExpiredClients,
  deactivateExpiredClients,
} from "../controllers/clientController";
import { authMiddleware } from "../middleware/authMiddleware";

const router: Router = Router();

// OTIMIZAÇÃO: O middleware de log foi removido para não poluir os logs de produção.
// A depuração deve ser feita nos controllers ou no middleware principal, se necessário.

// Rotas de utilidade (planos e métodos de pagamento)
router.get("/plans", authMiddleware, getPlans);
router.get("/payment-methods", authMiddleware, getPaymentMethods);

// Endpoint especial chamado pelo Cron da Vercel às 05:00 (ver vercel.json)
router.get("/deactivate-expired", deactivateExpiredClients);

// Rotas principais de clientes (CRUD)
router.get("/", authMiddleware, getClients);
router.get("/expired", authMiddleware, getExpiredClients);
router.get("/:id", authMiddleware, getClientById);
router.post("/", authMiddleware, createClient);
router.put("/:id", authMiddleware, updateClient);
router.delete("/:id", authMiddleware, deleteClient);

// Rotas de ações específicas do cliente
router.put("/renew/:id", authMiddleware, renewClient);
router.put("/reactivate/:id", authMiddleware, reactivateClient);
router.put("/observations/:id", authMiddleware, updateClientObservations);

// Rotas para o histórico de pagamentos
router.put("/payment-status/:id", authMiddleware, updatePaymentStatus);
router.put("/payments/edit/:id", authMiddleware, editPayment);
router.delete("/payments/delete/:id", authMiddleware, deletePayment);

// Rota para o status visual de pagamento
router.put(
  "/visual-payment-status/:id",
  authMiddleware,
  updateVisualPaymentStatus
);

export default router;
