// backend/src/controllers/dashboardController.ts

import { Request, Response, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma"; // OTIMIZAÇÃO: Usando a instância única e estável do Prisma.

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

    // Voltando para a lógica original que busca todos os clientes, pois é mais estável.
    const clients = await prisma.client.findMany({
      include: {
        paymentMethod: true,
        user: true,
      },
    });

    const gross_amount = clients.reduce(
      (sum, client) => sum + (client.grossAmount || 0),
      0
    );
    const net_amount = clients.reduce(
      (sum, client) => sum + (client.netAmount || 0),
      0
    );
    const active_clients = clients.filter((client) => client.isActive).length;

    let totalPaymentLiquido = 0;
    let totalPayments = 0;
    clients.forEach((client) => {
      const paymentHistory = (
        Array.isArray(client.paymentHistory) ? client.paymentHistory : []
      ) as any[]; // Tipagem como 'any[]' para simplicidade no forEach

      paymentHistory.forEach((payment) => {
        if (payment && typeof payment === "object" && payment.paymentDate) {
          const paymentDate = new Date(payment.paymentDate);
          if (
            !isNaN(paymentDate.getTime()) &&
            paymentDate.getUTCMonth() + 1 === filterMonth &&
            paymentDate.getUTCFullYear() === filterYear &&
            payment.paymentLiquido !== undefined &&
            payment.paymentLiquido !== null
          ) {
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

    const paymentMethods = await prisma.paymentMethod.findMany();
    const initialGrossByPaymentMethod = paymentMethods.reduce((acc, method) => {
      acc[method.name] = 0;
      return acc;
    }, {} as Record<string, number>);

    const grossByPaymentMethod = clients.reduce((acc, client) => {
      // CORREÇÃO: Garante que paymentMethod existe antes de acessar o nome.
      if (client.paymentMethod) {
        const methodName = client.paymentMethod.name;
        const paymentHistory = (
          Array.isArray(client.paymentHistory) ? client.paymentHistory : []
        ) as any[];

        const totalLiquido = paymentHistory.reduce(
          (sum: number, payment: any) => {
            if (payment && typeof payment === "object" && payment.paymentDate) {
              const paymentDate = new Date(payment.paymentDate);
              if (
                !isNaN(paymentDate.getTime()) &&
                paymentDate.getUTCMonth() + 1 === filterMonth &&
                paymentDate.getUTCFullYear() === filterYear
              ) {
                return sum + (Number(payment.paymentLiquido) || 0);
              }
            }
            return sum;
          },
          0
        );

        if (acc.hasOwnProperty(methodName)) {
          acc[methodName] += totalLiquido;
        }
      }
      return acc;
    }, initialGrossByPaymentMethod);

    // OTIMIZAÇÃO: Usando uma query SQL pura para agregar dados do campo JSON.
    const dailyNetProfitQuery = Prisma.sql`
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
    const dailyNetProfit: { date: Date; netAmount: number }[] =
      await prisma.$queryRaw(dailyNetProfitQuery);

    res.json({
      gross_amount,
      net_amount,
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

export const getCurrentMonthStats: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getUTCMonth() + 1;
    const currentYear = currentDate.getUTCFullYear();

    // OTIMIZAÇÃO: Query SQL para buscar e agregar dados do mês atual diretamente no banco.
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
