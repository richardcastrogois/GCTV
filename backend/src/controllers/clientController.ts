// backend/src/controllers/clientController.ts

import { RequestHandler, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ParsedQs } from "qs";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma"; // USANDO A NOSSA CONEXÃO ÚNICA E ESTÁVEL

type ParamsWithId = { id: string };
type ClientBody = {
  fullName: string;
  email: string;
  phone?: string;
  planId: number;
  paymentMethodId: number;
  dueDate: string;
  grossAmount: number;
  isActive: boolean;
  observations?: string;
  username: string;
};
type RenewClientBody = { dueDate: string };
type ObservationBody = { observations: string };
type ReactivateClientBody = { dueDate: string };
type PaymentBody = {
  paymentDate: string;
  paymentBruto: number;
  paymentLiquido: number;
};
type UpdatePaymentBody = {
  index: number;
  paymentDate: string;
  paymentBruto: number;
  paymentLiquido: number;
};
type DeletePaymentBody = { index: number };

type RawClient = {
  id: number;
};

type VisualPaymentStatusBody = {
  status: boolean;
};

export const getClients: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const searchTerm = (req.query.search as string)?.toLowerCase() || "";

    let whereClause: Prisma.ClientWhereInput = { isActive: true };
    let clientIdsFromResult: number[] = [];

    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`;
      const isNumeric = /^\d+([.,]\d+)?$/.test(searchTerm.replace(/[,]/g, "."));
      let tempNumericClientIds: number[] = [];

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
        const foundNumericClients = await prisma.$queryRawUnsafe<RawClient[]>(
          numericQuery
        );
        tempNumericClientIds = foundNumericClients.map(
          (client: RawClient) => client.id
        );
      }

      if (isNumeric && tempNumericClientIds.length > 0) {
        clientIdsFromResult = tempNumericClientIds;
      } else {
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
                ${
                  isNumeric
                    ? `OR LOWER(CAST(c."grossAmount" AS TEXT)) LIKE '${searchPattern}' OR LOWER(CAST(c."netAmount" AS TEXT)) LIKE '${searchPattern}'`
                    : ""
                }
              )
          `;
        const otherFieldsClients = await prisma.$queryRawUnsafe<RawClient[]>(
          otherFieldsQuery
        );
        clientIdsFromResult = otherFieldsClients.map(
          (client: RawClient) => client.id
        );
      }

      if (clientIdsFromResult.length > 0) {
        whereClause = { isActive: true, id: { in: clientIdsFromResult } };
      } else {
        whereClause = { isActive: true, id: { in: [] } };
      }
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      include: { plan: true, paymentMethod: true, user: true },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.client.count({ where: whereClause });

    res.json({ data: clients, total, page, limit });
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ message: "Erro ao buscar clientes" });
  }
};

export const getExpiredClients: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const searchTerm = (req.query.search as string)?.toLowerCase() || "";

    let whereClause: Prisma.ClientWhereInput = { isActive: false };
    let clientIdsFromResult: number[] = [];

    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`;
      const isNumeric = /^\d+([.,]\d+)?$/.test(searchTerm.replace(/[,]/g, "."));
      let tempNumericClientIds: number[] = [];

      if (isNumeric) {
        const numericQuery = `
          SELECT c.id FROM "Client" c
          WHERE c."isActive" = false AND (
            LOWER(CAST(c."grossAmount" AS TEXT)) LIKE '${searchPattern}' OR
            LOWER(CAST(c."netAmount" AS TEXT)) LIKE '${searchPattern}'
          )
        `;
        const foundNumericClients = await prisma.$queryRawUnsafe<RawClient[]>(
          numericQuery
        );
        tempNumericClientIds = foundNumericClients.map(
          (client: RawClient) => client.id
        );
      }

      if (isNumeric && tempNumericClientIds.length > 0) {
        clientIdsFromResult = tempNumericClientIds;
      } else {
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
              ${
                isNumeric
                  ? `OR LOWER(CAST(c."grossAmount" AS TEXT)) LIKE '${searchPattern}' OR LOWER(CAST(c."netAmount" AS TEXT)) LIKE '${searchPattern}'`
                  : ""
              }
            )
          `;
        const otherFieldsClients = await prisma.$queryRawUnsafe<RawClient[]>(
          otherFieldsQuery
        );
        clientIdsFromResult = otherFieldsClients.map(
          (client: RawClient) => client.id
        );
      }

      if (clientIdsFromResult.length > 0) {
        whereClause = { isActive: false, id: { in: clientIdsFromResult } };
      } else {
        whereClause = { isActive: false, id: { in: [] } };
      }
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      include: { plan: true, paymentMethod: true, user: true },
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    const total = await prisma.client.count({ where: whereClause });

    res.json({ data: clients, total, page, limit });
  } catch (error) {
    console.error("Erro ao buscar clientes expirados:", error);
    res.status(500).json({ message: "Erro ao buscar clientes expirados" });
  }
};

export const getClientById: RequestHandler<ParamsWithId> = async (
  req: Request<ParamsWithId>,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    res.status(400).json({ message: "ID inválido" });
    return;
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: { plan: true, paymentMethod: true, user: true },
    });

    if (!client) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }

    res.json(client);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    res.status(500).json({ message: "Erro ao buscar cliente" });
  }
};

export const getPlans: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
    });
    res.json(plans);
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    res.status(500).json({ message: "Erro ao buscar planos" });
  }
};

export const getPaymentMethods: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
    });
    res.json(paymentMethods);
  } catch (error) {
    console.error("Erro ao buscar métodos de pagamento:", error);
    res.status(500).json({ message: "Erro ao buscar métodos de pagamento" });
  }
};

export const createClient: RequestHandler<
  never,
  unknown,
  ClientBody,
  ParsedQs
> = async (
  req: Request<never, unknown, ClientBody, ParsedQs>,
  res: Response
): Promise<void> => {
  try {
    const {
      fullName,
      email,
      phone,
      planId,
      paymentMethodId,
      dueDate,
      grossAmount,
      isActive,
      username,
      observations,
    } = req.body;

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

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      res.status(400).json({ message: "Plano inválido" });
      return;
    }

    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });
    if (!paymentMethod) {
      res.status(400).json({ message: "Método de pagamento inválido" });
      return;
    }

    const discountEntry = await prisma.planPaymentMethodDiscount.findUnique({
      where: { planId_paymentMethodId: { planId, paymentMethodId } },
    });

    const discountFactor = discountEntry ? discountEntry.discount : 0;
    const netAmount = grossAmount * (1 - discountFactor);

    let user;
    try {
      const password = bcrypt.hashSync("tempPassword123", 10);
      user = await prisma.user.create({
        data: {
          username,
          password,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        error.meta &&
        Array.isArray((error.meta as any).target) &&
        (error.meta as any).target.includes("username")
      ) {
        res
          .status(400)
          .json({ message: "Username já cadastrado para um novo usuário." });
        return;
      }
      throw error;
    }

    const newClient = await prisma.client.create({
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
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Erro interno ao criar cliente" });
    }
  }
};

export const updateClient: RequestHandler<
  ParamsWithId,
  unknown,
  ClientBody,
  ParsedQs
> = async (
  req: Request<ParamsWithId, unknown, ClientBody, ParsedQs>,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    res.status(400).json({ message: "ID inválido" });
    return;
  }

  try {
    const {
      fullName,
      email,
      phone,
      planId,
      paymentMethodId,
      dueDate,
      grossAmount,
      isActive,
      observations,
      username,
    } = req.body;

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
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      res.status(400).json({ message: "Plano inválido" });
      return;
    }
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });
    if (!paymentMethod) {
      res.status(400).json({ message: "Método de pagamento inválido" });
      return;
    }

    const discountEntry = await prisma.planPaymentMethodDiscount.findUnique({
      where: { planId_paymentMethodId: { planId, paymentMethodId } },
    });

    const discountFactor = discountEntry ? discountEntry.discount : 0;
    const netAmount = grossAmount * (1 - discountFactor);

    const clientToUpdate = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: { user: true },
    });

    if (!clientToUpdate) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }

    let userIdToUpdate = clientToUpdate.userId;
    if (
      username &&
      clientToUpdate.user &&
      username !== clientToUpdate.user.username
    ) {
      const existingUserWithNewUsername = await prisma.user.findUnique({
        where: { username },
      });
      if (
        existingUserWithNewUsername &&
        existingUserWithNewUsername.id !== clientToUpdate.userId
      ) {
        res
          .status(400)
          .json({ message: "Este username já está em uso por outro usuário." });
        return;
      }
      await prisma.user.update({
        where: { id: clientToUpdate.userId },
        data: { username },
      });
    }

    const updatedClient = await prisma.client.update({
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
  } catch (error) {
    console.error("Erro detalhado ao atualizar cliente:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        error.meta &&
        Array.isArray((error.meta as any).target) &&
        (error.meta as any).target.includes("username")
      ) {
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
};

export const deleteClient: RequestHandler<ParamsWithId> = async (
  req: Request<ParamsWithId>,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    res.status(400).json({ message: "ID inválido" });
    return;
  }

  try {
    await prisma.client.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar cliente:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        res.status(404).json({ message: "Cliente não encontrado" });
        return;
      }
    }
    res.status(500).json({ message: "Erro ao deletar cliente" });
  }
};

export const renewClient: RequestHandler<
  ParamsWithId,
  unknown,
  RenewClientBody,
  ParsedQs
> = async (
  req: Request<ParamsWithId, unknown, RenewClientBody, ParsedQs>,
  res: Response
): Promise<void> => {
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

    const clientExists = await prisma.client.findUnique({
      where: { id: parseInt(id) },
    });
    if (!clientExists) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }

    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { dueDate: parsedDueDate, isActive: true },
      include: { plan: true, paymentMethod: true, user: true },
    });

    res.status(200).json(updatedClient);
  } catch (error) {
    console.error("Erro ao renovar cliente:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        res.status(404).json({ message: "Cliente não encontrado" });
        return;
      }
    }
    res.status(500).json({ message: "Erro ao renovar cliente" });
  }
};

export const reactivateClient: RequestHandler<
  ParamsWithId,
  unknown,
  ReactivateClientBody,
  ParsedQs
> = async (
  req: Request<ParamsWithId, unknown, ReactivateClientBody, ParsedQs>,
  res: Response
): Promise<void> => {
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

    const clientExists = await prisma.client.findUnique({
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

    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { isActive: true, dueDate: parsedDueDate },
      include: { plan: true, paymentMethod: true, user: true },
    });

    res.status(200).json(updatedClient);
  } catch (error) {
    console.error("Erro ao reativar cliente:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        res.status(404).json({ message: "Cliente não encontrado" });
        return;
      }
    }
    res.status(500).json({ message: "Erro ao reativar cliente" });
  }
};

export const updatePaymentStatus: RequestHandler<
  ParamsWithId,
  unknown,
  PaymentBody,
  ParsedQs
> = async (
  req: Request<ParamsWithId, unknown, PaymentBody, ParsedQs>,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { paymentDate, paymentBruto, paymentLiquido } = req.body;

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

    if (
      typeof paymentBruto !== "number" ||
      isNaN(paymentBruto) ||
      paymentBruto <= 0
    ) {
      res.status(400).json({
        message:
          "Valor bruto do pagamento inválido, deve ser um número maior que zero.",
      });
      return;
    }

    if (
      typeof paymentLiquido !== "number" ||
      isNaN(paymentLiquido) ||
      paymentLiquido <= 0
    ) {
      res.status(400).json({
        message:
          "Valor líquido do pagamento inválido, deve ser um número maior que zero.",
      });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
    });

    if (!client) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }

    let currentPayments = (
      Array.isArray(client.paymentHistory) ? client.paymentHistory : []
    ) as Prisma.JsonArray;

    currentPayments = currentPayments.map((payment: any) => {
      if (typeof payment === "object" && payment !== null) {
        return {
          paymentDate:
            payment.paymentDate ||
            (payment.date
              ? new Date(payment.date).toISOString()
              : new Date().toISOString()),
          paymentBruto: payment.paymentBruto || payment.amount || 0,
          paymentLiquido: payment.paymentLiquido || payment.amount || 0,
        };
      }
      return {
        paymentDate: new Date().toISOString(),
        paymentBruto: 0,
        paymentLiquido: 0,
      };
    });

    const newPayment = {
      paymentDate: parsedPaymentDate.toISOString(),
      paymentBruto,
      paymentLiquido,
    };

    const updatedPayments = [...currentPayments, newPayment];

    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        paymentHistory: updatedPayments,
      },
      include: { plan: true, paymentMethod: true, user: true },
    });

    res.status(200).json(updatedClient);
  } catch (error) {
    console.error("Erro ao atualizar status de pagamento:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        res.status(404).json({ message: "Cliente não encontrado" });
        return;
      }
    }
    res.status(500).json({ message: "Erro ao atualizar status de pagamento" });
  }
};

export const editPayment: RequestHandler<
  ParamsWithId,
  unknown,
  UpdatePaymentBody,
  ParsedQs
> = async (
  req: Request<ParamsWithId, unknown, UpdatePaymentBody, ParsedQs>,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { index, paymentDate, paymentBruto, paymentLiquido } = req.body;

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
    if (
      typeof paymentBruto !== "number" ||
      isNaN(paymentBruto) ||
      paymentBruto <= 0
    ) {
      res.status(400).json({
        message:
          "Valor bruto do pagamento inválido, deve ser um número maior que zero.",
      });
      return;
    }
    if (
      typeof paymentLiquido !== "number" ||
      isNaN(paymentLiquido) ||
      paymentLiquido <= 0
    ) {
      res.status(400).json({
        message:
          "Valor líquido do pagamento inválido, deve ser um número maior que zero.",
      });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
    });

    if (!client) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }

    let currentPayments = (
      Array.isArray(client.paymentHistory) ? client.paymentHistory : []
    ) as Prisma.JsonArray;

    currentPayments = currentPayments.map((payment: any) => {
      if (typeof payment === "object" && payment !== null) {
        return {
          paymentDate:
            payment.paymentDate ||
            (payment.date
              ? new Date(payment.date).toISOString()
              : new Date().toISOString()),
          paymentBruto: payment.paymentBruto || payment.amount || 0,
          paymentLiquido: payment.paymentLiquido || payment.amount || 0,
        };
      }
      return {
        paymentDate: new Date().toISOString(),
        paymentBruto: 0,
        paymentLiquido: 0,
      };
    });

    if (index >= currentPayments.length) {
      res
        .status(400)
        .json({ message: "Índice de pagamento fora dos limites." });
      return;
    }

    currentPayments[index] = {
      paymentDate: parsedPaymentDate.toISOString(),
      paymentBruto,
      paymentLiquido,
    } as Prisma.JsonValue;

    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        paymentHistory: currentPayments,
      },
      include: { plan: true, paymentMethod: true, user: true },
    });

    res.status(200).json(updatedClient);
  } catch (error) {
    console.error("Erro ao editar pagamento:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      res.status(404).json({ message: "Cliente não encontrado" });
    } else {
      res.status(500).json({ message: "Erro ao editar pagamento" });
    }
  }
};

export const deletePayment: RequestHandler<
  ParamsWithId,
  unknown,
  DeletePaymentBody,
  ParsedQs
> = async (
  req: Request<ParamsWithId, unknown, DeletePaymentBody, ParsedQs>,
  res: Response
): Promise<void> => {
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
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
    });

    if (!client) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }

    let currentPayments = (
      Array.isArray(client.paymentHistory) ? client.paymentHistory : []
    ) as Prisma.JsonArray;

    currentPayments = currentPayments.map((payment: any) => {
      if (typeof payment === "object" && payment !== null) {
        return {
          paymentDate:
            payment.paymentDate ||
            (payment.date
              ? new Date(payment.date).toISOString()
              : new Date().toISOString()),
          paymentBruto: payment.paymentBruto || payment.amount || 0,
          paymentLiquido: payment.paymentLiquido || payment.amount || 0,
        };
      }
      return {
        paymentDate: new Date().toISOString(),
        paymentBruto: 0,
        paymentLiquido: 0,
      };
    });

    if (index >= currentPayments.length) {
      res
        .status(400)
        .json({ message: "Índice de pagamento fora dos limites." });
      return;
    }

    currentPayments.splice(index, 1);

    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        paymentHistory: currentPayments,
      },
      include: { plan: true, paymentMethod: true, user: true },
    });

    res.status(200).json(updatedClient);
  } catch (error) {
    console.error("Erro ao excluir pagamento:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      res.status(404).json({ message: "Cliente não encontrado" });
    } else {
      res.status(500).json({ message: "Erro ao excluir pagamento" });
    }
  }
};

export const updateClientObservations: RequestHandler<
  ParamsWithId,
  unknown,
  ObservationBody,
  ParsedQs
> = async (
  req: Request<ParamsWithId, unknown, ObservationBody, ParsedQs>,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { observations } = req.body;

  if (isNaN(parseInt(id))) {
    res.status(400).json({ message: "ID inválido" });
    return;
  }

  try {
    const clientExists = await prisma.client.findUnique({
      where: { id: parseInt(id) },
    });
    if (!clientExists) {
      res.status(404).json({ message: "Cliente não encontrado." });
      return;
    }

    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { observations: observations || null },
      include: { plan: true, paymentMethod: true, user: true },
    });
    res.json(updatedClient);
  } catch (error) {
    console.error("Erro ao atualizar observações:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        res.status(404).json({ message: "Cliente não encontrado" });
        return;
      }
    }
    res.status(500).json({ message: "Erro ao atualizar observações" });
  }
};

export const updateVisualPaymentStatus: RequestHandler<
  ParamsWithId,
  unknown,
  VisualPaymentStatusBody
> = async (
  req: Request<ParamsWithId, unknown, VisualPaymentStatusBody>,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

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
    const clientExists = await prisma.client.findUnique({
      where: { id: parseInt(id) },
    });

    if (!clientExists) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }

    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { visualPaymentConfirmed: status },
      include: { plan: true, paymentMethod: true, user: true },
    });

    console.log("Cliente atualizado com sucesso:", updatedClient);

    res.json(updatedClient);
  } catch (error) {
    console.error("Erro ao atualizar status visual de pagamento:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      res
        .status(404)
        .json({ message: "Cliente não encontrado durante a atualização." });
      return;
    }
    res.status(500).json({
      message: "Erro interno ao atualizar status visual de pagamento",
    });
  }
};