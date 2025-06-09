"use strict";
//backend/src/routes/clientRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clientController_1 = require("../controllers/clientController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Middleware para logar todas as requisições neste router
router.use((req, res, next) => {
    console.log(`Recebida requisição para ClientRoutes: ${req.method} ${req.originalUrl}`);
    next();
});
// Rotas públicas (se houver, como planos e métodos de pagamento)
router.get("/plans", clientController_1.getPlans); // Assumindo que esta não precisa de auth, se precisar, adicione authMiddleware
router.get("/payment-methods", clientController_1.getPaymentMethods); // Idem
// Rotas protegidas por autenticação
router.get("/", authMiddleware_1.authMiddleware, clientController_1.getClients);
router.get("/expired", authMiddleware_1.authMiddleware, clientController_1.getExpiredClients); // Exemplo de rota para clientes expirados
router.get("/:id", authMiddleware_1.authMiddleware, clientController_1.getClientById);
router.post("/", authMiddleware_1.authMiddleware, clientController_1.createClient);
router.put("/:id", authMiddleware_1.authMiddleware, clientController_1.updateClient);
router.delete("/:id", authMiddleware_1.authMiddleware, clientController_1.deleteClient);
router.put("/renew/:id", authMiddleware_1.authMiddleware, clientController_1.renewClient);
router.put("/reactivate/:id", authMiddleware_1.authMiddleware, clientController_1.reactivateClient);
router.put("/observations/:id", authMiddleware_1.authMiddleware, clientController_1.updateClientObservations);
// Rotas para o histórico de pagamento REAL
router.put("/payment-status/:id", authMiddleware_1.authMiddleware, clientController_1.updatePaymentStatus); // Adiciona um novo pagamento
router.put("/payments/edit/:id", authMiddleware_1.authMiddleware, clientController_1.editPayment); // Edita um pagamento existente
router.delete("/payments/delete/:id", authMiddleware_1.authMiddleware, clientController_1.deletePayment); // Remove um pagamento
// NOVA ROTA para o status visual de pagamento
router.put("/visual-payment-status/:id", authMiddleware_1.authMiddleware, clientController_1.updateVisualPaymentStatus);
exports.default = router;
