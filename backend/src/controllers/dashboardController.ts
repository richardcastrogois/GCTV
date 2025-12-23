import { Request, Response, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

export const getUnifiedDashboardData: RequestHandler = async (
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

    if (isNaN(filterMonth) || isNaN(filterYear)) {
      res.status(400).json({ message: "Mês ou ano inválido." });
      return;
    }

    // A lógica de data ao vivo continua aqui para os outros cards que não mudaram.
    const liveDate = new Date();
    const liveMonth = liveDate.getUTCMonth() + 1;
    const liveYear = liveDate.getUTCFullYear();

    // A query para os cards de saldo bruto por método permanece a mesma.
    const filteredGrossByMethodQuery = prisma.$queryRaw<
      [{ name: string; total: number }]
    >`
      SELECT
        pm.name,
        COALESCE(
          SUM(
            CASE
              WHEN pm.name = 'PagSeguro' THEN
                CASE
                  WHEN (p.value->>'paymentBruto')::FLOAT = 35.00 THEN 32.85
                  WHEN (p.value->>'paymentBruto')::FLOAT = 30.00 THEN 28.10
                  ELSE (p.value->>'paymentBruto')::FLOAT
                END
              ELSE (p.value->>'paymentBruto')::FLOAT
            END
          ), 0
        ) as total
      FROM
        "Client" c
      JOIN "PaymentMethod" pm ON c."paymentMethodId" = pm.id,
      jsonb_array_elements(c."paymentHistory") AS p
      WHERE
        EXTRACT(YEAR FROM (p.value->>'paymentDate')::DATE) = ${filterYear}
        AND EXTRACT(MONTH FROM (p.value->>'paymentDate')::DATE) = ${filterMonth}
      GROUP BY
        pm.name;
    `;

    // A query de lucro diário líquido permanece a mesma.
    const filteredDailyNetProfitQuery = prisma.$queryRaw<
      { date: Date; netAmount: number }[]
    >`
      SELECT (p.value->>'paymentDate')::DATE AS date, SUM((p.value->>'paymentLiquido')::FLOAT) AS "netAmount"
      FROM "Client" c, jsonb_array_elements(c."paymentHistory") p
      WHERE EXTRACT(YEAR FROM (p.value->>'paymentDate')::DATE) = ${filterYear}
        AND EXTRACT(MONTH FROM (p.value->>'paymentDate')::DATE) = ${filterMonth}
      GROUP BY date ORDER BY date ASC;
    `;

    // ===================================================================================
    // ALTERAÇÃO PRINCIPAL - NOVA QUERY OTIMIZADA
    // Esta query substitui a antiga 'livePaymentStatsQuery'.
    // Ela calcula o bruto total (com a regra do PagSeguro) e a contagem de pagamentos
    // para o PERÍODO FILTRADO, tudo de uma só vez.
    // ===================================================================================
    const filteredPaymentStatsQuery = prisma.$queryRaw<
      [{ totalGrossAmount: number; totalPayments: string }]
    >`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN pm.name = 'PagSeguro' THEN
              CASE
                WHEN (p.value->>'paymentBruto')::FLOAT = 35.00 THEN 32.85
                WHEN (p.value->>'paymentBruto')::FLOAT = 30.00 THEN 28.10
                ELSE (p.value->>'paymentBruto')::FLOAT
              END
            ELSE (p.value->>'paymentBruto')::FLOAT
          END
        ), 0) AS "totalGrossAmount",
        COUNT(p.value) AS "totalPayments"
      FROM
        "Client" c
      JOIN "PaymentMethod" pm ON c."paymentMethodId" = pm.id,
      jsonb_array_elements(c."paymentHistory") p
      WHERE
        EXTRACT(YEAR FROM (p.value->>'paymentDate')::DATE) = ${filterYear}
        AND EXTRACT(MONTH FROM (p.value->>'paymentDate')::DATE) = ${filterMonth};
    `;

    // A query para os agregados de clientes ao vivo permanece a mesma.
    const liveClientAggregatesQuery = prisma.client.findMany({
      where: { isActive: true },
      select: {
        plan: { select: { name: true } },
        paymentMethod: { select: { name: true } },
      },
    });

    const [
      filteredGrossByMethod,
      filteredDailyNetProfit,
      filteredPaymentStatsResult, // <-- Resultado da nova query
      liveClientAggregates,
    ] = await Promise.all([
      filteredGrossByMethodQuery,
      filteredDailyNetProfitQuery,
      filteredPaymentStatsQuery, // <-- Usando a nova query
      liveClientAggregatesQuery,
    ]);

    const grossByPaymentMethod = filteredGrossByMethod.reduce((acc, item) => {
      acc[item.name] = item.total;
      return acc;
    }, {} as Record<string, number>);

    // ===================================================================================
    // LÓGICA DE CÁLCULO ATUALIZADA
    // Agora usamos os resultados da nova query para o cálculo.
    // ===================================================================================
    const { totalGrossAmount, totalPayments } = {
      totalGrossAmount: filteredPaymentStatsResult[0]?.totalGrossAmount || 0,
      totalPayments: parseInt(
        filteredPaymentStatsResult[0]?.totalPayments || "0",
        10
      ),
    };
    const totalNetAmount8 = totalGrossAmount - totalPayments * 8;
    const totalNetAmount15 = totalGrossAmount - totalPayments * 15;
    const thyPayment = totalNetAmount15 * 0.15;

    // O objeto 'filteredData' agora inclui os novos totais calculados.
    const filteredData = {
      grossByPaymentMethod,
      dailyNetProfit: filteredDailyNetProfit.map((d) => ({
        ...d,
        date: d.date.toISOString().split("T")[0],
      })),
      totalNetAmount8: parseFloat(totalNetAmount8.toFixed(2)),
      totalNetAmount15: parseFloat(totalNetAmount15.toFixed(2)),
      totalGrossAmount,
      totalPayments,
      thyPayment: parseFloat(thyPayment.toFixed(2)),
    };

    // Os dados de clientes por plano e método de pagamento continuam vindo dos agregados "ao vivo".
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

    // O objeto 'liveData' agora contém apenas os dados que são realmente "ao vivo".
    const liveData = {
      activeClients: liveClientAggregates.length,
      clientsByPlan,
      clientsByPaymentMethod,
    };

    res.json({ filteredData, liveData });
  } catch (error) {
    console.error("Error fetching unified dashboard data:", error);
    res.status(500).json({ message: "Error fetching dashboard data" });
  }
};
