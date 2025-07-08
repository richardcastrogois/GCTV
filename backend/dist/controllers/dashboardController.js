"use strict";
// backend/src/controllers/dashboardController.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentMonthStats = exports.getDashboardStats = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month, year } = req.query;
        const filterMonth = month ? parseInt(month) : new Date().getMonth() + 1;
        const filterYear = year ? parseInt(year) : new Date().getFullYear();
        if (isNaN(filterMonth) || filterMonth < 1 || filterMonth > 12) {
            res.status(400).json({ message: "Mês inválido (deve ser entre 1 e 12)" });
            return;
        }
        if (isNaN(filterYear) || filterYear < 2000 || filterYear > 2100) {
            res
                .status(400)
                .json({ message: "Ano inválido (deve ser entre 2000 e 2100)" });
            return;
        }
        const clients = yield prisma.client.findMany({
            include: {
                paymentMethod: true,
                user: true,
            },
        });
        const gross_amount = clients.reduce((sum, client) => sum + (client.grossAmount || 0), 0);
        const net_amount = clients.reduce((sum, client) => sum + (client.netAmount || 0), 0);
        const active_clients = clients.filter((client) => client.isActive).length;
        let totalPaymentLiquido = 0;
        let totalPayments = 0;
        clients.forEach((client) => {
            const paymentHistory = Array.isArray(client.paymentHistory)
                ? client.paymentHistory
                : [];
            paymentHistory.forEach((payment) => {
                if (payment && typeof payment === "object" && payment.paymentDate) {
                    const paymentDate = new Date(payment.paymentDate);
                    if (!isNaN(paymentDate.getTime()) &&
                        paymentDate.getUTCMonth() + 1 === filterMonth &&
                        paymentDate.getUTCFullYear() === filterYear &&
                        payment.paymentLiquido !== undefined &&
                        payment.paymentLiquido !== null) {
                        totalPaymentLiquido += Number(payment.paymentLiquido);
                        totalPayments += 1;
                    }
                }
            });
        });
        const activationCost8 = totalPayments * 8;
        const activationCost15 = totalPayments * 15;
        const totalNetAmount8 = totalPaymentLiquido - activationCost8;
        const totalNetAmount15 = totalPaymentLiquido - activationCost15;
        const paymentMethods = yield prisma.paymentMethod.findMany();
        const initialGrossByPaymentMethod = paymentMethods.reduce((acc, method) => {
            acc[method.name] = 0;
            return acc;
        }, {});
        const grossByPaymentMethod = clients.reduce((acc, client) => {
            const methodName = client.paymentMethod.name;
            let paymentHistory = [];
            if (typeof client.paymentHistory === "string") {
                try {
                    paymentHistory = JSON.parse(client.paymentHistory);
                }
                catch (e) {
                    paymentHistory = [];
                    console.error("Erro ao parsear paymentHistory:", e);
                }
            }
            else if (Array.isArray(client.paymentHistory)) {
                paymentHistory = client.paymentHistory;
            }
            const totalLiquido = paymentHistory.reduce((sum, payment) => {
                if (payment && typeof payment === "object" && payment.paymentDate) {
                    const paymentDate = new Date(payment.paymentDate);
                    if (!isNaN(paymentDate.getTime()) &&
                        paymentDate.getUTCMonth() + 1 === filterMonth &&
                        paymentDate.getUTCFullYear() === filterYear) {
                        return sum + (payment.paymentLiquido || 0);
                    }
                }
                return sum;
            }, 0);
            if (acc.hasOwnProperty(methodName)) {
                acc[methodName] += totalLiquido;
            }
            return acc;
        }, initialGrossByPaymentMethod);
        let dailyNetProfitQuery = `
      SELECT 
        DATE(payment_data->>'paymentDate') AS date,
        SUM((payment_data->>'paymentLiquido')::FLOAT) AS netamount
      FROM "Client"
      CROSS JOIN jsonb_array_elements("paymentHistory") AS payment_data
    `;
        const params = [];
        if (filterMonth && filterYear) {
            dailyNetProfitQuery += ` WHERE EXTRACT(MONTH FROM (payment_data->>'paymentDate')::DATE) = $1 AND EXTRACT(YEAR FROM (payment_data->>'paymentDate')::DATE) = $2`;
            params.push(filterMonth, filterYear);
        }
        dailyNetProfitQuery += `
      GROUP BY DATE(payment_data->>'paymentDate')
      ORDER BY DATE(payment_data->>'paymentDate') ASC
    `;
        const dailyNetProfitRaw = yield prisma.$queryRawUnsafe(dailyNetProfitQuery, ...params);
        const dailyNetProfit = dailyNetProfitRaw.map((entry) => ({
            date: entry.date,
            netAmount: entry.netamount || 0,
        }));
        res.json({
            gross_amount,
            net_amount,
            active_clients,
            totalNetAmount8: parseFloat(totalNetAmount8.toFixed(2)),
            totalNetAmount15: parseFloat(totalNetAmount15.toFixed(2)),
            grossByPaymentMethod,
            dailyNetProfit,
        });
    }
    catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Error fetching dashboard stats" });
    }
});
exports.getDashboardStats = getDashboardStats;
const getCurrentMonthStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getUTCMonth() + 1;
        const currentYear = currentDate.getUTCFullYear();
        const clients = yield prisma.client.findMany({
            include: {
                paymentMethod: true,
                user: true,
            },
        });
        let totalPaymentLiquido = 0;
        let totalPayments = 0;
        clients.forEach((client) => {
            const paymentHistory = Array.isArray(client.paymentHistory)
                ? client.paymentHistory
                : [];
            paymentHistory.forEach((payment) => {
                if (payment && typeof payment === "object" && payment.paymentDate) {
                    const paymentDate = new Date(payment.paymentDate);
                    if (!isNaN(paymentDate.getTime()) &&
                        paymentDate.getUTCFullYear() === currentYear &&
                        paymentDate.getUTCMonth() + 1 === currentMonth &&
                        payment.paymentLiquido !== undefined &&
                        payment.paymentLiquido !== null) {
                        totalPaymentLiquido += Number(payment.paymentLiquido);
                        totalPayments += 1;
                    }
                }
            });
        });
        const totalNetAmount8 = totalPaymentLiquido - totalPayments * 8;
        const totalNetAmount15 = totalPaymentLiquido - totalPayments * 15;
        res.json({
            totalNetAmount8: parseFloat(totalNetAmount8.toFixed(2)),
            totalNetAmount15: parseFloat(totalNetAmount15.toFixed(2)),
            activeClients: clients.length,
        });
    }
    catch (error) {
        console.error("Error fetching current month stats:", error);
        res.status(500).json({ message: "Error fetching current month stats" });
    }
});
exports.getCurrentMonthStats = getCurrentMonthStats;
