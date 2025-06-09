"use strict";
//backend/src/routes/dashboardRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Rota para o dashboard
router.get("/", authMiddleware_1.authMiddleware, dashboardController_1.getDashboardStats);
exports.default = router;
