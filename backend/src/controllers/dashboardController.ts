// backend/src/controllers/dashboardController.ts

import { Request, Response, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

// NOVA FUNÇÃO UNIFICADA
export const getUnifiedDashboardData: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { month, year } = req.query;

    // --- VALIDAÇÃO E DEFINIÇÃO DAS DATAS ---
    const filterMonth = month
      ? parseInt(month as string)
      : new Date().getUTCMonth() + 1;
    const filterYear = year
      ? parseInt(year as string)
      : new Date().getUTCFullYear();

    if (isNaN(filterMonth) || isNaN(filterYear)) {
      res.status(400).json({ message: "Mês ou ano inválido." });
      return;
    }

    const liveDate = new Date();
    const liveMonth = liveDate.getUTCMonth() + 1;
    const liveYear = liveDate.getUTCFullYear();

    // --- PREPARAÇÃO DAS QUERIES (PARA EXECUÇÃO PARALELA) ---

    // 1. Dados para o Mês Filtrado
    const filteredGrossByMethodQuery = prisma.$queryRaw<
      [{ name: string; total: number }]
    >`
      SELECT pm.name, COALESCE(SUM((p.value->>'paymentLiquido')::FLOAT), 0) as total
      FROM "Client" c
      JOIN "PaymentMethod" pm ON c."paymentMethodId" = pm.id,
      jsonb_array_elements(c."paymentHistory") p
      WHERE EXTRACT(YEAR FROM (p.value->>'paymentDate')::DATE) = ${filterYear}
        AND EXTRACT(MONTH FROM (p.value->>'paymentDate')::DATE) = ${filterMonth}
      GROUP BY pm.name;
    `;

    const filteredDailyNetProfitQuery = prisma.$queryRaw<
      { date: Date; netAmount: number }[]
    >`
      SELECT (p.value->>'paymentDate')::DATE AS date, SUM((p.value->>'paymentLiquido')::FLOAT) AS "netAmount"
      FROM "Client" c, jsonb_array_elements(c."paymentHistory") p
      WHERE EXTRACT(YEAR FROM (p.value->>'paymentDate')::DATE) = ${filterYear}
        AND EXTRACT(MONTH FROM (p.value->>'paymentDate')::DATE) = ${filterMonth}
      GROUP BY date ORDER BY date ASC;
    `;

    // 2. Dados "Live" (do mês atual, independentemente do filtro)
    const livePaymentStatsQuery = prisma.$queryRaw<
      [{ totalPaymentLiquido: number; totalPayments: string }]
    >`
        SELECT
            COALESCE(SUM((p.value->>'paymentLiquido')::FLOAT), 0) AS "totalPaymentLiquido",
            COUNT(p.value) AS "totalPayments"
        FROM "Client" c, jsonb_array_elements(c."paymentHistory") p
        WHERE EXTRACT(YEAR FROM (p.value->>'paymentDate')::DATE) = ${liveYear}
        AND EXTRACT(MONTH FROM (p.value->>'paymentDate')::DATE) = ${liveMonth};
    `;

    // OTIMIZAÇÃO: Cálculos de clientes agregados movidos do front para o back
    const liveClientAggregatesQuery = prisma.client.findMany({
      where: { isActive: true },
      select: {
        plan: { select: { name: true } },
        paymentMethod: { select: { name: true } },
      },
    });

    // --- EXECUÇÃO PARALELA DAS QUERIES ---
    const [
      filteredGrossByMethod,
      filteredDailyNetProfit,
      livePaymentStatsResult,
      liveClientAggregates,
    ] = await Promise.all([
      filteredGrossByMethodQuery,
      filteredDailyNetProfitQuery,
      livePaymentStatsQuery,
      liveClientAggregatesQuery,
    ]);

    // --- PROCESSAMENTO DOS RESULTADOS E CONSTRUÇÃO DA RESPOSTA ---

    // 1. Processando dados filtrados
    const grossByPaymentMethod = filteredGrossByMethod.reduce((acc, item) => {
      acc[item.name] = item.total;
      return acc;
    }, {} as Record<string, number>);

    const filteredData = {
      // gross_amount e net_amount foram removidos pois não pareciam estar sendo usados no novo layout
      // Se precisar deles, a query pode ser readicionada.
      grossByPaymentMethod,
      dailyNetProfit: filteredDailyNetProfit.map((d) => ({
        ...d,
        date: d.date.toISOString().split("T")[0],
      })),
    };

    // 2. Processando dados "Live"
    const { totalPaymentLiquido, totalPayments } = {
      totalPaymentLiquido: livePaymentStatsResult[0]?.totalPaymentLiquido || 0,
      totalPayments: parseInt(
        livePaymentStatsResult[0]?.totalPayments || "0",
        10
      ),
    };
    const totalNetAmount8 = totalPaymentLiquido - totalPayments * 8;
    const totalNetAmount15 = totalPaymentLiquido - totalPayments * 15;

    const clientsByPlan = liveClientAggregates.reduce((acc, client) => {
      acc[client.plan.name] = (acc[client.plan.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const clientsByPaymentMethod = liveClientAggregates.reduce(
      (acc, client) => {
        acc[client.paymentMethod.name] =
          (acc[client.paymentMethod.name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const liveData = {
      totalNetAmount8: parseFloat(totalNetAmount8.toFixed(2)),
      totalNetAmount15: parseFloat(totalNetAmount15.toFixed(2)),
      activeClients: liveClientAggregates.length,
      clientsByPlan,
      clientsByPaymentMethod,
    };

    // Resposta final unificada
    res.json({ filteredData, liveData });
  } catch (error) {
    console.error("Error fetching unified dashboard data:", error);
    res.status(500).json({ message: "Error fetching dashboard data" });
  }
};
