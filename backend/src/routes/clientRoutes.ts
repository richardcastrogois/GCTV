//backend/src/routes/clientRoutes.ts

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
  updateVisualPaymentStatus, // IMPORTAR A NOVA FUNÇÃO
  getExpiredClients, // Adicionado getExpiredClients se for usado em alguma rota
} from "../controllers/clientController";
import { authMiddleware } from "../middleware/authMiddleware";

const router: Router = Router();

// Middleware para logar todas as requisições neste router
router.use((req, res, next) => {
  console.log(
    `Recebida requisição para ClientRoutes: ${req.method} ${req.originalUrl}`
  );
  next();
});

router.get("/plans", authMiddleware, getPlans);
router.get("/payment-methods", authMiddleware, getPaymentMethods);

// Rotas protegidas por autenticação
router.get("/", authMiddleware, getClients);
router.get("/expired", authMiddleware, getExpiredClients); // Exemplo de rota para clientes expirados
router.get("/:id", authMiddleware, getClientById);
router.post("/", authMiddleware, createClient);
router.put("/:id", authMiddleware, updateClient);
router.delete("/:id", authMiddleware, deleteClient);
router.put("/renew/:id", authMiddleware, renewClient);
router.put("/reactivate/:id", authMiddleware, reactivateClient);
router.put("/observations/:id", authMiddleware, updateClientObservations);

// Rotas para o histórico de pagamento REAL
router.put("/payment-status/:id", authMiddleware, updatePaymentStatus); // Adiciona um novo pagamento
router.put("/payments/edit/:id", authMiddleware, editPayment); // Edita um pagamento existente
router.delete("/payments/delete/:id", authMiddleware, deletePayment); // Remove um pagamento

// NOVA ROTA para o status visual de pagamento
router.put(
  "/visual-payment-status/:id",
  authMiddleware,
  updateVisualPaymentStatus
);

export default router;