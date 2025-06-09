"use strict";
//backend/src/controllers/clientController.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVisualPaymentStatus = exports.updateClientObservations = exports.deletePayment = exports.editPayment = exports.updatePaymentStatus = exports.reactivateClient = exports.renewClient = exports.deleteClient = exports.updateClient = exports.createClient = exports.getPaymentMethods = exports.getPlans = exports.getClientById = exports.getExpiredClients = exports.getClients = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const getClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchTerm = ((_a = req.query.search) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
        let whereClause = { isActive: true };
        let clientIdsFromResult = [];
        if (searchTerm) {
            const searchPattern = `%${searchTerm}%`;
            const isNumeric = /^\d+([.,]\d+)?$/.test(searchTerm.replace(/[,]/g, "."));
            let tempNumericClientIds = [];
            if (isNumeric) {
                const numericQuery = `
          SELECT c.id
          FROM "Client" c
          WHERE c."isActive" = true
            AND (
              LOWER(CAST(c."grossAmount" AS TEXT)) LIKE '${searchPattern}'
              OR LOWER(CAST(c."netAmount" AS TEXT)) LIKE '${searchPattern}'
            )
        `;
                const foundNumericClients = yield prisma.$queryRawUnsafe(numericQuery);
                tempNumericClientIds = foundNumericClients.map((client) => client.id);
            }
            if (isNumeric && tempNumericClientIds.length > 0) {
                clientIdsFromResult = tempNumericClientIds;
            }
            else {
                const otherFieldsQuery = `
            SELECT c.id
            FROM "Client" c
            LEFT JOIN "Plan" p ON c."planId" = p.id
            LEFT JOIN "PaymentMethod" pm ON c."paymentMethodId" = pm.id
            LEFT JOIN "User" u ON c."userId" = u.id
            WHERE c."isActive" = true
              AND (
                LOWER(c."fullName") LIKE '${searchPattern}'
                OR LOWER(c."email") LIKE '${searchPattern}'
                OR LOWER(c."phone") LIKE '${searchPattern}'
                OR LOWER(p."name") LIKE '${searchPattern}'
                OR LOWER(pm."name") LIKE '${searchPattern}'
                OR LOWER(c."observations") LIKE '${searchPattern}'
                OR LOWER(TO_CHAR(c."dueDate", 'DD/MM/YYYY')) LIKE '${searchPattern}'
                OR LOWER(u."username") LIKE '${searchPattern}'
                ${isNumeric
                    ? `OR LOWER(CAST(c."grossAmount" AS TEXT)) LIKE '${searchPattern}' OR LOWER(CAST(c."netAmount" AS TEXT)) LIKE '${searchPattern}'`
                    : ""}
              )
          `;
                const otherFieldsClients = yield prisma.$queryRawUnsafe(otherFieldsQuery);
                clientIdsFromResult = otherFieldsClients.map((client) => client.id);
            }
            if (clientIdsFromResult.length > 0) {
                whereClause = { isActive: true, id: { in: clientIdsFromResult } };
            }
            else {
                whereClause = { isActive: true, id: { in: [] } };
            }
        }
        const clients = yield prisma.client.findMany({
            where: whereClause,
            include: { plan: true, paymentMethod: true, user: true },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        });
        const total = yield prisma.client.count({ where: whereClause });
        res.json({ data: clients, total, page, limit });
    }
    catch (error) {
        console.error("Erro ao buscar clientes:", error);
        res.status(500).json({ message: "Erro ao buscar clientes" });
    }
});
exports.getClients = getClients;
const getExpiredClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchTerm = ((_a = req.query.search) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
        let whereClause = { isActive: false };
        let clientIdsFromResult = [];
        if (searchTerm) {
            const searchPattern = `%${searchTerm}%`;
            const isNumeric = /^\d+([.,]\d+)?$/.test(searchTerm.replace(/[,]/g, "."));
            let tempNumericClientIds = [];
            if (isNumeric) {
                const numericQuery = `
          SELECT c.id FROM "Client" c
          WHERE c."isActive" = false AND (
            LOWER(CAST(c."grossAmount" AS TEXT)) LIKE '${searchPattern}' OR
            LOWER(CAST(c."netAmount" AS TEXT)) LIKE '${searchPattern}'
          )
        `;
                const foundNumericClients = yield prisma.$queryRawUnsafe(numericQuery);
                tempNumericClientIds = foundNumericClients.map((client) => client.id);
            }
            if (isNumeric && tempNumericClientIds.length > 0) {
                clientIdsFromResult = tempNumericClientIds;
            }
            else {
                const otherFieldsQuery = `
            SELECT c.id FROM "Client" c
            LEFT JOIN "Plan" p ON c."planId" = p.id
            LEFT JOIN "PaymentMethod" pm ON c."paymentMethodId" = pm.id
            LEFT JOIN "User" u ON c."userId" = u.id
            WHERE c."isActive" = false AND (
              LOWER(c."fullName") LIKE '${searchPattern}' OR
              LOWER(c."email") LIKE '${searchPattern}' OR
              LOWER(c."phone") LIKE '${searchPattern}' OR
              LOWER(p."name") LIKE '${searchPattern}' OR
              LOWER(pm."name") LIKE '${searchPattern}' OR
              LOWER(c."observations") LIKE '${searchPattern}' OR
              LOWER(TO_CHAR(c."dueDate", 'DD/MM/YYYY')) LIKE '${searchPattern}' OR
              LOWER(u."username") LIKE '${searchPattern}'
              ${isNumeric
                    ? `OR LOWER(CAST(c."grossAmount" AS TEXT)) LIKE '${searchPattern}' OR LOWER(CAST(c."netAmount" AS TEXT)) LIKE '${searchPattern}'`
                    : ""}
            )
          `;
                const otherFieldsClients = yield prisma.$queryRawUnsafe(otherFieldsQuery);
                clientIdsFromResult = otherFieldsClients.map((client) => client.id);
            }
            if (clientIdsFromResult.length > 0) {
                whereClause = { isActive: false, id: { in: clientIdsFromResult } };
            }
            else {
                whereClause = { isActive: false, id: { in: [] } };
            }
        }
        const clients = yield prisma.client.findMany({
            where: whereClause,
            include: { plan: true, paymentMethod: true, user: true },
            skip,
            take: limit,
            orderBy: { updatedAt: "desc" },
        });
        const total = yield prisma.client.count({ where: whereClause });
        res.json({ data: clients, total, page, limit });
    }
    catch (error) {
        console.error("Erro ao buscar clientes expirados:", error);
        res.status(500).json({ message: "Erro ao buscar clientes expirados" });
    }
});
exports.getExpiredClients = getExpiredClients;
const getClientById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        res.status(400).json({ message: "ID inválido" });
        return;
    }
    try {
        const client = yield prisma.client.findUnique({
            where: { id: parseInt(id) },
            include: { plan: true, paymentMethod: true, user: true },
        });
        if (!client) {
            res.status(404).json({ message: "Cliente não encontrado" });
            return;
        }
        res.json(client);
    }
    catch (error) {
        console.error("Erro ao buscar cliente:", error);
        res.status(500).json({ message: "Erro ao buscar cliente" });
    }
});
exports.getClientById = getClientById;
const getPlans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plans = yield prisma.plan.findMany({
            where: { isActive: true },
        });
        res.json(plans);
    }
    catch (error) {
        console.error("Erro ao buscar planos:", error);
        res.status(500).json({ message: "Erro ao buscar planos" });
    }
});
exports.getPlans = getPlans;
const getPaymentMethods = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentMethods = yield prisma.paymentMethod.findMany({
            where: { isActive: true },
        });
        res.json(paymentMethods);
    }
    catch (error) {
        console.error("Erro ao buscar métodos de pagamento:", error);
        res.status(500).json({ message: "Erro ao buscar métodos de pagamento" });
    }
});
exports.getPaymentMethods = getPaymentMethods;
const createClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullName, email, phone, planId, paymentMethodId, dueDate, grossAmount, isActive, username, observations, } = req.body;
        if (!username) {
            res.status(400).json({ message: "Username é obrigatório" });
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ message: "Email inválido" });
            return;
        }
        const parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
            res.status(400).json({ message: "Data de vencimento inválida" });
            return;
        }
        const plan = yield prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) {
            res.status(400).json({ message: "Plano inválido" });
            return;
        }
        const paymentMethod = yield prisma.paymentMethod.findUnique({
            where: { id: paymentMethodId },
        });
        if (!paymentMethod) {
            res.status(400).json({ message: "Método de pagamento inválido" });
            return;
        }
        const discountEntry = yield prisma.planPaymentMethodDiscount.findUnique({
            where: { planId_paymentMethodId: { planId, paymentMethodId } },
        });
        const discountFactor = discountEntry ? discountEntry.discount : 0;
        const netAmount = grossAmount * (1 - discountFactor);
        let user;
        try {
            const password = bcryptjs_1.default.hashSync("tempPassword123", 10);
            user = yield prisma.user.create({
                data: {
                    username,
                    password,
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002" &&
                error.meta &&
                Array.isArray(error.meta.target) &&
                error.meta.target.includes("username")) {
                res
                    .status(400)
                    .json({ message: "Username já cadastrado para um novo usuário." });
                return;
            }
            throw error;
        }
        const newClient = yield prisma.client.create({
            data: {
                fullName,
                email,
                phone,
                planId,
                paymentMethodId,
                dueDate: parsedDueDate,
                grossAmount,
                netAmount,
                isActive,
                observations: observations || null,
                userId: user.id,
                paymentHistory: [],
                visualPaymentConfirmed: false,
            },
            include: { plan: true, paymentMethod: true, user: true },
        });
        res.status(201).json(newClient);
    }
    catch (error) {
        console.error("Erro ao criar cliente:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Erro interno ao criar cliente" });
        }
    }
});
exports.createClient = createClient;
const updateClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        res.status(400).json({ message: "ID inválido" });
        return;
    }
    try {
        const { fullName, email, phone, planId, paymentMethodId, dueDate, grossAmount, isActive, observations, username, } = req.body;
        if (typeof grossAmount !== "number" || isNaN(grossAmount)) {
            res
                .status(400)
                .json({ message: "Valor bruto deve ser um número válido" });
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ message: "Email inválido" });
            return;
        }
        const parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
            res.status(400).json({ message: "Data de vencimento inválida" });
            return;
        }
        const plan = yield prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) {
            res.status(400).json({ message: "Plano inválido" });
            return;
        }
        const paymentMethod = yield prisma.paymentMethod.findUnique({
            where: { id: paymentMethodId },
        });
        if (!paymentMethod) {
            res.status(400).json({ message: "Método de pagamento inválido" });
            return;
        }
        const discountEntry = yield prisma.planPaymentMethodDiscount.findUnique({
            where: { planId_paymentMethodId: { planId, paymentMethodId } },
        });
        const discountFactor = discountEntry ? discountEntry.discount : 0;
        const netAmount = grossAmount * (1 - discountFactor);
        const clientToUpdate = yield prisma.client.findUnique({
            where: { id: parseInt(id) },
            include: { user: true },
        });
        if (!clientToUpdate) {
            res.status(404).json({ message: "Cliente não encontrado" });
            return;
        }
        let userIdToUpdate = clientToUpdate.userId;
        if (username &&
            clientToUpdate.user &&
            username !== clientToUpdate.user.username) {
            const existingUserWithNewUsername = yield prisma.user.findUnique({
                where: { username },
            });
            if (existingUserWithNewUsername &&
                existingUserWithNewUsername.id !== clientToUpdate.userId) {
                res
                    .status(400)
                    .json({ message: "Este username já está em uso por outro usuário." });
                return;
            }
            yield prisma.user.update({
                where: { id: clientToUpdate.userId },
                data: { username },
            });
        }
        const updatedClient = yield prisma.client.update({
            where: { id: parseInt(id) },
            data: {
                fullName,
                email,
                phone,
                planId,
                paymentMethodId,
                dueDate: parsedDueDate,
                grossAmount,
                netAmount,
                isActive,
                observations: observations || null,
                userId: userIdToUpdate,
            },
            include: { plan: true, paymentMethod: true, user: true },
        });
        res.json(updatedClient);
    }
    catch (error) {
        console.error("Erro detalhado ao atualizar cliente:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002" &&
                error.meta &&
                Array.isArray(error.meta.target) &&
                error.meta.target.includes("username")) {
                res.status(400).json({ message: "Username já cadastrado." });
                return;
            }
            if (error.code === "P2025") {
                res
                    .status(404)
                    .json({ message: "Cliente não encontrado para atualização." });
                return;
            }
        }
        if (!res.headersSent) {
            res
                .status(500)
                .json({ message: "Erro ao atualizar cliente", error: String(error) });
        }
    }
});
exports.updateClient = updateClient;
const deleteClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        res.status(400).json({ message: "ID inválido" });
        return;
    }
    try {
        yield prisma.client.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error("Erro ao deletar cliente:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({ message: "Cliente não encontrado" });
                return;
            }
        }
        res.status(500).json({ message: "Erro ao deletar cliente" });
    }
});
exports.deleteClient = deleteClient;
const renewClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { dueDate } = req.body;
    if (isNaN(parseInt(id))) {
        res.status(400).json({ message: "ID inválido" });
        return;
    }
    try {
        const parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
            res.status(400).json({ message: "Data de vencimento inválida" });
            return;
        }
        const clientExists = yield prisma.client.findUnique({
            where: { id: parseInt(id) },
        });
        if (!clientExists) {
            res.status(404).json({ message: "Cliente não encontrado" });
            return;
        }
        const updatedClient = yield prisma.client.update({
            where: { id: parseInt(id) },
            data: { dueDate: parsedDueDate, isActive: true },
            include: { plan: true, paymentMethod: true, user: true },
        });
        res.status(200).json(updatedClient);
    }
    catch (error) {
        console.error("Erro ao renovar cliente:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({ message: "Cliente não encontrado" });
                return;
            }
        }
        res.status(500).json({ message: "Erro ao renovar cliente" });
    }
});
exports.renewClient = renewClient;
const reactivateClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { dueDate } = req.body;
    if (isNaN(parseInt(id))) {
        res.status(400).json({ message: "ID inválido" });
        return;
    }
    if (!dueDate) {
        res.status(400).json({
            message: "Nova data de vencimento é obrigatória para reativar.",
        });
        return;
    }
    try {
        const parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
            res.status(400).json({ message: "Data de vencimento inválida" });
            return;
        }
        const clientExists = yield prisma.client.findUnique({
            where: { id: parseInt(id) },
        });
        if (!clientExists) {
            res.status(404).json({ message: "Cliente não encontrado" });
            return;
        }
        if (clientExists.isActive) {
            res.status(400).json({ message: "Cliente já está ativo." });
            return;
        }
        const updatedClient = yield prisma.client.update({
            where: { id: parseInt(id) },
            data: { isActive: true, dueDate: parsedDueDate },
            include: { plan: true, paymentMethod: true, user: true },
        });
        res.status(200).json(updatedClient);
    }
    catch (error) {
        console.error("Erro ao reativar cliente:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({ message: "Cliente não encontrado" });
                return;
            }
        }
        res.status(500).json({ message: "Erro ao reativar cliente" });
    }
});
exports.reactivateClient = reactivateClient;
const updatePaymentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { paymentDate, amount } = req.body;
    if (isNaN(parseInt(id))) {
        res.status(400).json({ message: "ID inválido" });
        return;
    }
    try {
        const parsedPaymentDate = new Date(paymentDate);
        if (isNaN(parsedPaymentDate.getTime())) {
            res.status(400).json({ message: "Data de pagamento inválida" });
            return;
        }
        if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
            res.status(400).json({
                message: "Valor do pagamento inválido, deve ser um número maior que zero.",
            });
            return;
        }
        const client = yield prisma.client.findUnique({
            where: { id: parseInt(id) },
        });
        if (!client) {
            res.status(404).json({ message: "Cliente não encontrado" });
            return;
        }
        const currentPayments = (Array.isArray(client.paymentHistory) ? client.paymentHistory : []);
        const newPayment = {
            paymentDate: parsedPaymentDate.toISOString(),
            amount,
        };
        const updatedPayments = [
            ...currentPayments,
            newPayment,
        ];
        const updatedClient = yield prisma.client.update({
            where: { id: parseInt(id) },
            data: {
                paymentHistory: updatedPayments,
            },
            include: { plan: true, paymentMethod: true, user: true },
        });
        res.status(200).json(updatedClient);
    }
    catch (error) {
        console.error("Erro ao atualizar status de pagamento:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({ message: "Cliente não encontrado" });
                return;
            }
        }
        res.status(500).json({ message: "Erro ao atualizar status de pagamento" });
    }
});
exports.updatePaymentStatus = updatePaymentStatus;
const editPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { index, paymentDate, amount } = req.body;
    if (isNaN(parseInt(id))) {
        res.status(400).json({ message: "ID inválido" });
        return;
    }
    if (typeof index !== "number" || index < 0) {
        res.status(400).json({ message: "Índice de pagamento inválido." });
        return;
    }
    try {
        const parsedPaymentDate = new Date(paymentDate);
        if (isNaN(parsedPaymentDate.getTime())) {
            res.status(400).json({ message: "Data de pagamento inválida" });
            return;
        }
        if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
            res.status(400).json({
                message: "Valor do pagamento inválido, deve ser um número maior que zero.",
            });
            return;
        }
        const client = yield prisma.client.findUnique({
            where: { id: parseInt(id) },
        });
        if (!client) {
            res.status(404).json({ message: "Cliente não encontrado" });
            return;
        }
        const currentPayments = (Array.isArray(client.paymentHistory) ? client.paymentHistory : []);
        if (index >= currentPayments.length) {
            res
                .status(400)
                .json({ message: "Índice de pagamento fora dos limites." });
            return;
        }
        currentPayments[index] = {
            paymentDate: parsedPaymentDate.toISOString(),
            amount,
        };
        const updatedClient = yield prisma.client.update({
            where: { id: parseInt(id) },
            data: {
                paymentHistory: currentPayments,
            },
            include: { plan: true, paymentMethod: true, user: true },
        });
        res.status(200).json(updatedClient);
    }
    catch (error) {
        console.error("Erro ao editar pagamento:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025") {
            res.status(404).json({ message: "Cliente não encontrado" });
        }
        else {
            res.status(500).json({ message: "Erro ao editar pagamento" });
        }
    }
});
exports.editPayment = editPayment;
const deletePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { index } = req.body;
    if (isNaN(parseInt(id))) {
        res.status(400).json({ message: "ID inválido" });
        return;
    }
    if (typeof index !== "number" || index < 0) {
        res.status(400).json({ message: "Índice de pagamento inválido." });
        return;
    }
    try {
        const client = yield prisma.client.findUnique({
            where: { id: parseInt(id) },
        });
        if (!client) {
            res.status(404).json({ message: "Cliente não encontrado" });
            return;
        }
        let currentPayments = (Array.isArray(client.paymentHistory) ? client.paymentHistory : []);
        if (index >= currentPayments.length) {
            res
                .status(400)
                .json({ message: "Índice de pagamento fora dos limites." });
            return;
        }
        currentPayments.splice(index, 1);
        const updatedClient = yield prisma.client.update({
            where: { id: parseInt(id) },
            data: {
                paymentHistory: currentPayments,
            },
            include: { plan: true, paymentMethod: true, user: true },
        });
        res.status(200).json(updatedClient);
    }
    catch (error) {
        console.error("Erro ao excluir pagamento:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025") {
            res.status(404).json({ message: "Cliente não encontrado" });
        }
        else {
            res.status(500).json({ message: "Erro ao excluir pagamento" });
        }
    }
});
exports.deletePayment = deletePayment;
const updateClientObservations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { observations } = req.body;
    if (isNaN(parseInt(id))) {
        res.status(400).json({ message: "ID inválido" });
        return;
    }
    try {
        const clientExists = yield prisma.client.findUnique({
            where: { id: parseInt(id) },
        });
        if (!clientExists) {
            res.status(404).json({ message: "Cliente não encontrado." });
            return;
        }
        const updatedClient = yield prisma.client.update({
            where: { id: parseInt(id) },
            data: { observations: observations || null },
            include: { plan: true, paymentMethod: true, user: true },
        });
        res.json(updatedClient);
    }
    catch (error) {
        console.error("Erro ao atualizar observações:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({ message: "Cliente não encontrado" });
                return;
            }
        }
        res.status(500).json({ message: "Erro ao atualizar observações" });
    }
});
exports.updateClientObservations = updateClientObservations;
const updateVisualPaymentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { status } = req.body;
    // Log da requisição recebida
    console.log("Recebida requisição para updateVisualPaymentStatus", {
        id: req.params.id,
        status: req.body.status,
    });
    if (isNaN(parseInt(id))) {
        res.status(400).json({ message: "ID inválido" });
        return;
    }
    if (typeof status !== "boolean") {
        res.status(400).json({ message: "Status inválido. Deve ser um booleano." });
        return;
    }
    try {
        const clientExists = yield prisma.client.findUnique({
            where: { id: parseInt(id) },
        });
        if (!clientExists) {
            res.status(404).json({ message: "Cliente não encontrado" });
            return;
        }
        const updatedClient = yield prisma.client.update({
            where: { id: parseInt(id) },
            data: { visualPaymentConfirmed: status },
            include: { plan: true, paymentMethod: true, user: true },
        });
        // Log do cliente atualizado com sucesso
        console.log("Cliente atualizado com sucesso:", updatedClient);
        res.json(updatedClient);
    }
    catch (error) {
        console.error("Erro ao atualizar status visual de pagamento:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025") {
            res
                .status(404)
                .json({ message: "Cliente não encontrado durante a atualização." });
            return;
        }
        res.status(500).json({
            message: "Erro interno ao atualizar status visual de pagamento",
        });
    }
});
exports.updateVisualPaymentStatus = updateVisualPaymentStatus;
