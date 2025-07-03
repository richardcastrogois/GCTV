// backend/src/controllers/dashboardController.ts

import { Request, Response, RequestHandler } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getDashboardStats: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { month, year } = req.query;

    // Validar parâmetros de filtro
    const filterMonth = month ? parseInt(month as string) : undefined;
    const filterYear = year ? parseInt(year as string) : undefined;

    if (
      filterMonth &&
      (isNaN(filterMonth) || filterMonth < 1 || filterMonth > 12)
    ) {
      res.status(400).json({ message: "Mês inválido (deve ser entre 1 e 12)" });
      return;
    }
    if (
      filterYear &&
      (isNaN(filterYear) || filterYear < 2000 || filterYear > 2100)
    ) {
      res
        .status(400)
        .json({ message: "Ano inválido (deve ser entre 2000 e 2100)" });
      return;
    }

    // Buscar todos os clientes (ativos e expirados)
    const clients = await prisma.client.findMany({
      include: {
        paymentMethod: true,
        user: true,
      },
    });

    // Calcular gross_amount (soma de grossAmount para referência geral)
    const gross_amount = clients.reduce(
      (sum, client) => sum + (client.grossAmount || 0),
      0
    );
    const net_amount = clients.reduce(
      (sum, client) => sum + (client.netAmount || 0),
      0
    );
    const active_clients = clients.filter((client) => client.isActive).length;

    // Calcular totalNetAmount somando paymentLiquido do paymentHistory filtrado
    let totalPaymentLiquido = 0;
    let totalPayments = 0;
    clients.forEach((client) => {
      const paymentHistory = Array.isArray(client.paymentHistory)
        ? client.paymentHistory
        : [];
      paymentHistory.forEach((payment: any) => {
        const paymentDate = new Date(payment.paymentDate);
        if (
          !isNaN(paymentDate.getTime()) &&
          (!filterMonth || paymentDate.getMonth() + 1 === filterMonth) &&
          (!filterYear || paymentDate.getFullYear() === filterYear) &&
          payment.paymentLiquido !== undefined &&
          payment.paymentLiquido !== null
        ) {
          totalPaymentLiquido += Number(payment.paymentLiquido);
          totalPayments += 1;
        }
      });
    });
    const activationCost8 = totalPayments * 8;
    const activationCost15 = totalPayments * 15;
    const totalNetAmount8 = totalPaymentLiquido - activationCost8;
    const totalNetAmount15 = totalPaymentLiquido - activationCost15;

    // Calcular grossByPaymentMethod somando paymentLiquido do paymentHistory
    const grossByPaymentMethod = clients.reduce((acc, client) => {
      const methodName = client.paymentMethod.name;
      let paymentHistory: any[] = [];
      if (typeof client.paymentHistory === "string") {
        try {
          paymentHistory = JSON.parse(client.paymentHistory);
        } catch (e) {
          paymentHistory = [];
          console.error("Erro ao parsear paymentHistory:", e);
        }
      } else if (Array.isArray(client.paymentHistory)) {
        paymentHistory = client.paymentHistory;
      }
      const totalLiquido = paymentHistory.reduce(
        (sum: number, payment: any) => {
          const paymentDate = new Date(payment.paymentDate);
          if (
            filterMonth &&
            filterYear &&
            !isNaN(paymentDate.getTime()) &&
            paymentDate.getMonth() + 1 === filterMonth &&
            paymentDate.getFullYear() === filterYear
          ) {
            return sum + (payment.paymentLiquido || 0);
          }
          return sum;
        },
        0
      );
      acc[methodName] = (acc[methodName] || 0) + totalLiquido;
      return acc;
    }, {} as Record<string, number>);

    // Calcular lucro líquido por dia somando paymentLiquido do paymentHistory
    let dailyNetProfitQuery = `
      SELECT 
        DATE(payment_data->>'paymentDate') AS date,
        SUM((payment_data->>'paymentLiquido')::FLOAT) AS netamount
      FROM "Client"
      CROSS JOIN jsonb_array_elements("paymentHistory") AS payment_data
    `;
    const params: any[] = [];
    if (filterMonth && filterYear) {
      dailyNetProfitQuery += ` WHERE EXTRACT(MONTH FROM (payment_data->>'paymentDate')::DATE) = $1 AND EXTRACT(YEAR FROM (payment_data->>'paymentDate')::DATE) = $2`;
      params.push(filterMonth, filterYear);
    }
    dailyNetProfitQuery += `
      GROUP BY DATE(payment_data->>'paymentDate')
      ORDER BY DATE(payment_data->>'paymentDate') ASC
    `;

    const dailyNetProfitRaw: { date: string; netamount: number }[] =
      await prisma.$queryRawUnsafe(dailyNetProfitQuery, ...params);

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
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
};

export const getCurrentMonthStats: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const clients = await prisma.client.findMany({
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
      paymentHistory.forEach((payment: any) => {
        if (payment && typeof payment === "object") {
          const paymentDate = new Date(payment.paymentDate);
          if (
            paymentDate.getUTCFullYear() === currentYear &&
            paymentDate.getUTCMonth() + 1 === currentMonth &&
            payment.paymentLiquido !== undefined &&
            payment.paymentLiquido !== null
          ) {
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
  } catch (error) {
    console.error("Error fetching current month stats:", error);
    res.status(500).json({ message: "Error fetching current month stats" });
  }
};