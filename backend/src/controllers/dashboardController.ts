// backend/src/controllers/dashboardController.ts

import { Request, Response, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

export const getDashboardStats: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { month, year } = req.query;

    const filterMonth = month
      ? parseInt(month as string)
      : new Date().getUTCMonth() + 1;
    const filterYear = year
      ? parseInt(year as string)
      : new Date().getUTCFullYear();

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

    // --- QUERIES OTIMIZADAS ---
    // Todas as queries são preparadas para serem executadas em paralelo.

    // 1. Query para totais gerais (independente do filtro de data)
    const totalAmountsQuery = prisma.client.aggregate({
      _sum: {
        grossAmount: true,
        netAmount: true,
      },
    });

    // 2. Query para contar clientes ativos (independente do filtro de data)
    const activeClientsQuery = prisma.client.count({
      where: { isActive: true },
    });

    // 3. Query para totais do mês filtrado (usando o campo JSON)
    const monthlyTotalsQuery = prisma.$queryRaw<
      [{ totalPaymentLiquido: number; totalPayments: string }]
    >`
      SELECT
        COALESCE(SUM((p.value->>'paymentLiquido')::FLOAT), 0) AS "totalPaymentLiquido",
        COUNT(p.value) AS "totalPayments"
      FROM "Client" c, jsonb_array_elements(c."paymentHistory") p
      WHERE
        EXTRACT(YEAR FROM (p.value->>'paymentDate')::DATE) = ${filterYear} AND
        EXTRACT(MONTH FROM (p.value->>'paymentDate')::DATE) = ${filterMonth};
    `;

    // 4. Query para agrupar faturamento por método de pagamento no mês filtrado
    const grossByMethodQuery = prisma.$queryRaw<
      [{ name: string; total: number }]
    >`
      SELECT
        pm.name,
        COALESCE(SUM((p.value->>'paymentLiquido')::FLOAT), 0) as "total"
      FROM "Client" c
      JOIN "PaymentMethod" pm ON c."paymentMethodId" = pm.id,
      jsonb_array_elements(c."paymentHistory") p
      WHERE
        EXTRACT(YEAR FROM (p.value->>'paymentDate')::DATE) = ${filterYear} AND
        EXTRACT(MONTH FROM (p.value->>'paymentDate')::DATE) = ${filterMonth}
      GROUP BY pm.name;
    `;

    // 5. Query para lucro líquido diário (sua query original, que já era boa)
    const dailyNetProfitQuery = prisma.$queryRaw<
      { date: Date; netAmount: number }[]
    >`
      SELECT
        (p.value->>'paymentDate')::DATE AS date,
        SUM((p.value->>'paymentLiquido')::FLOAT) AS "netAmount"
      FROM "Client" c, jsonb_array_elements(c."paymentHistory") p
      WHERE
        EXTRACT(YEAR FROM (p.value->>'paymentDate')::DATE) = ${filterYear} AND
        EXTRACT(MONTH FROM (p.value->>'paymentDate')::DATE) = ${filterMonth}
      GROUP BY date
      ORDER BY date ASC;
    `;

    // --- EXECUÇÃO PARALELA ---
    // Executa todas as queries ao mesmo tempo para máxima eficiência.
    const [
      totalAmounts,
      active_clients,
      monthlyTotalsResult,
      grossByMethodResult,
      dailyNetProfit,
    ] = await Promise.all([
      totalAmountsQuery,
      activeClientsQuery,
      monthlyTotalsQuery,
      grossByMethodQuery,
      dailyNetProfitQuery,
    ]);

    // --- PROCESSAMENTO DOS RESULTADOS ---
    // Cálculos e formatação final, agora com os dados já agregados.

    const { totalPaymentLiquido, totalPayments } = {
      totalPaymentLiquido: monthlyTotalsResult[0]?.totalPaymentLiquido || 0,
      totalPayments: parseInt(monthlyTotalsResult[0]?.totalPayments || "0", 10),
    };

    const activationCost8 = totalPayments * 8;
    const activationCost15 = totalPayments * 15;
    const totalNetAmount8 = totalPaymentLiquido - activationCost8;
    const totalNetAmount15 = totalPaymentLiquido - activationCost15;

    // Converte o resultado do 'grossByMethod' para o formato de objeto { methodName: total }
    const grossByPaymentMethod = grossByMethodResult.reduce((acc, item) => {
      acc[item.name] = item.total;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      gross_amount: totalAmounts._sum.grossAmount || 0,
      net_amount: totalAmounts._sum.netAmount || 0,
      active_clients,
      totalNetAmount8: parseFloat(totalNetAmount8.toFixed(2)),
      totalNetAmount15: parseFloat(totalNetAmount15.toFixed(2)),
      grossByPaymentMethod,
      dailyNetProfit: dailyNetProfit.map((d) => ({
        ...d,
        date: d.date.toISOString().split("T")[0],
      })),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
};

// A função getCurrentMonthStats já estava bem otimizada, usando uma query nativa.
// Mantida como está para consistência.
export const getCurrentMonthStats: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getUTCMonth() + 1;
    const currentYear = currentDate.getUTCFullYear();

    const paymentStatsQuery = Prisma.sql`
      SELECT
        COALESCE(SUM((p.value->>'paymentLiquido')::FLOAT), 0) AS "totalPaymentLiquido",
        COUNT(p.value) AS "totalPayments"
      FROM "Client" c, jsonb_array_elements(c."paymentHistory") p
      WHERE
        EXTRACT(YEAR FROM (p.value->>'paymentDate')::DATE) = ${currentYear} AND
        EXTRACT(MONTH FROM (p.value->>'paymentDate')::DATE) = ${currentMonth};
    `;
    const paymentStats: {
      totalPaymentLiquido: number;
      totalPayments: bigint;
    }[] = await prisma.$queryRaw(paymentStatsQuery);

    const { totalPaymentLiquido, totalPayments } = {
      totalPaymentLiquido: paymentStats[0]?.totalPaymentLiquido || 0,
      totalPayments: Number(paymentStats[0]?.totalPayments || 0),
    };

    const activeClients = await prisma.client.count({
      where: { isActive: true },
    });

    const totalNetAmount8 = totalPaymentLiquido - totalPayments * 8;
    const totalNetAmount15 = totalPaymentLiquido - totalPayments * 15;

    res.json({
      totalNetAmount8: parseFloat(totalNetAmount8.toFixed(2)),
      totalNetAmount15: parseFloat(totalNetAmount15.toFixed(2)),
      activeClients: activeClients,
    });
  } catch (error) {
    console.error("Error fetching current month stats:", error);
    res.status(500).json({ message: "Error fetching current month stats" });
  }
};
