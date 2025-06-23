//backend/src/controllers/dashboardController.ts

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

    // Construir a condição de filtro para clientes (somente isActive)
    const whereClause: any = { isActive: true };

    // Buscar todos os clientes ativos
    const clients = await prisma.client.findMany({
      where: whereClause,
      include: {
        paymentMethod: true,
        user: true,
      },
    });

    console.log(
      "Clientes retornados:",
      clients.map((c) => ({
        id: c.id,
        username: c.user.username,
        paymentMethod: c.paymentMethod.name,
        paymentHistory: c.paymentHistory,
      }))
    );

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

    // Calcular o total líquido ajustado (subtraindo R$ 8,00 por ativação)
    const activationCost = active_clients * 8; // R$ 8,00 por ativação
    const totalNetAmount = net_amount - activationCost;

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
      console.log("paymentHistory para", methodName, ":", paymentHistory);
      const totalLiquido = paymentHistory.reduce(
        (sum: number, payment: any) => {
          const paymentDate = new Date(payment.paymentDate);
          console.log(
            "Payment Date:",
            payment.paymentDate,
            "Parsed:",
            paymentDate,
            "Month:",
            paymentDate.getMonth() + 1,
            "Year:",
            paymentDate.getFullYear(),
            "Filter Month:",
            filterMonth,
            "Filter Year:",
            filterYear
          );
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
      console.log("Total Líquido para", methodName, ":", totalLiquido);
      acc[methodName] = (acc[methodName] || 0) + totalLiquido;
      return acc;
    }, {} as Record<string, number>);

    console.log("grossByPaymentMethod final:", grossByPaymentMethod);

    // Calcular lucro líquido por dia somando paymentLiquido do paymentHistory
    let dailyNetProfitQuery = `
      SELECT 
        DATE(payment_data->>'paymentDate') AS date,
        SUM((payment_data->>'paymentLiquido')::FLOAT) AS netamount
      FROM "Client"
      CROSS JOIN jsonb_array_elements("paymentHistory") AS payment_data
      WHERE "isActive" = true
    `;
    const params: any[] = [];
    if (filterMonth && filterYear) {
      dailyNetProfitQuery += ` AND EXTRACT(MONTH FROM (payment_data->>'paymentDate')::DATE) = $1 AND EXTRACT(YEAR FROM (payment_data->>'paymentDate')::DATE) = $2`;
      params.push(filterMonth, filterYear);
    }
    dailyNetProfitQuery += `
      GROUP BY DATE(payment_data->>'paymentDate')
      ORDER BY DATE(payment_data->>'paymentDate') ASC
    `;

    console.log(
      "Daily Net Profit Query:",
      dailyNetProfitQuery,
      "Params:",
      params
    ); // Depuração
    const dailyNetProfitRaw: { date: string; netamount: number }[] =
      await prisma.$queryRawUnsafe(dailyNetProfitQuery, ...params);
    console.log("Daily Net Profit Raw:", dailyNetProfitRaw); // Depuração

    const dailyNetProfit = dailyNetProfitRaw.map((entry) => ({
      date: entry.date,
      netAmount: entry.netamount || 0, // Corrigido para usar 'netamount' do resultado
    }));

    console.log("Daily Net Profit:", dailyNetProfit); // Depuração

    res.json({
      gross_amount,
      net_amount,
      active_clients,
      totalNetAmount: parseFloat(totalNetAmount.toFixed(2)),
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
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();

    // Buscar todos os clientes ativos
    const clients = await prisma.client.findMany({
      where: {
        isActive: true,
      },
    });

    // Calcular o total líquido a partir de paymentHistory
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

    // Subtrair R$ 8,00 por pagamento registrado
    const totalNetAmount8 = totalPaymentLiquido - totalPayments * 8;

    // Subtrair R$ 15,00 por pagamento registrado
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