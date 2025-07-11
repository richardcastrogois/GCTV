// backend/src/controllers/clientController.ts

import { RequestHandler, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ParsedQs } from "qs";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

// Tipos de dados (sem alterações)
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
type VisualPaymentStatusBody = {
  status: boolean;
};

// NENHUMA OTIMIZAÇÃO NECESSÁRIA: Função auxiliar já eficiente.
function buildSearchWhereClause(
  searchTerm: string,
  isActive: boolean
): Prisma.ClientWhereInput {
  const searchClauses: Prisma.ClientWhereInput[] = [
    { fullName: { contains: searchTerm, mode: "insensitive" } },
    { email: { contains: searchTerm, mode: "insensitive" } },
    { phone: { contains: searchTerm, mode: "insensitive" } },
    { observations: { contains: searchTerm, mode: "insensitive" } },
    { plan: { name: { contains: searchTerm, mode: "insensitive" } } },
    { paymentMethod: { name: { contains: searchTerm, mode: "insensitive" } } },
    { user: { username: { contains: searchTerm, mode: "insensitive" } } },
  ];

  const numericSearchTerm = parseFloat(searchTerm.replace(",", "."));
  if (!isNaN(numericSearchTerm)) {
    searchClauses.push({ grossAmount: { equals: numericSearchTerm } });
    searchClauses.push({ netAmount: { equals: numericSearchTerm } });
  }

  return {
    isActive,
    OR: searchClauses,
  };
}

// NENHUMA OTIMIZAÇÃO NECESSÁRIA: Uso de $transaction já é a melhor prática aqui.
export const getClients: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const searchTerm = (req.query.search as string) || "";

    const whereClause: Prisma.ClientWhereInput = searchTerm
      ? buildSearchWhereClause(searchTerm, true)
      : { isActive: true };

    const [clients, total] = await prisma.$transaction([
      prisma.client.findMany({
        where: whereClause,
        include: { plan: true, paymentMethod: true, user: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.client.count({ where: whereClause }),
    ]);

    res.json({ data: clients, total, page, limit });
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ message: "Erro ao buscar clientes" });
  }
};

// NENHUMA OTIMIZAÇÃO NECESSÁRIA: Segue o mesmo padrão eficiente de getClients.
export const getExpiredClients: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const searchTerm = (req.query.search as string) || "";

    const whereClause: Prisma.ClientWhereInput = searchTerm
      ? buildSearchWhereClause(searchTerm, false)
      : { isActive: false };

    const [clients, total] = await prisma.$transaction([
      prisma.client.findMany({
        where: whereClause,
        include: { plan: true, paymentMethod: true, user: true },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.client.count({ where: whereClause }),
    ]);

    res.json({ data: clients, total, page, limit });
  } catch (error) {
    console.error("Erro ao buscar clientes expirados:", error);
    res.status(500).json({ message: "Erro ao buscar clientes expirados" });
  }
};

// NENHUMA OTIMIZAÇÃO NECESSÁRIA: findUnique é a forma mais eficiente de buscar por ID.
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

// NENHUMA OTIMIZAÇÃO NECESSÁRIA: Abordagem correta e direta.
export const getPlans: RequestHandler = async (req, res): Promise<void> => {
  try {
    const plans = await prisma.plan.findMany({ where: { isActive: true } });
    res.json(plans);
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    res.status(500).json({ message: "Erro ao buscar planos" });
  }
};

// NENHUMA OTIMIZAÇÃO NECESSÁRIA: Abordagem correta e direta.
export const getPaymentMethods: RequestHandler = async (
  req,
  res
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

// OTIMIZAÇÃO APLICADA: Executa buscas independentes em paralelo com Promise.all.
export const createClient: RequestHandler<
  never,
  unknown,
  ClientBody,
  ParsedQs
> = async (req, res): Promise<void> => {
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

    const [plan, paymentMethod, discountEntry] = await Promise.all([
      prisma.plan.findUnique({ where: { id: planId } }),
      prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } }),
      prisma.planPaymentMethodDiscount.findUnique({
        where: { planId_paymentMethodId: { planId, paymentMethodId } },
      }),
    ]);

    if (!plan) {
      res.status(400).json({ message: "Plano inválido" });
      return;
    }
    if (!paymentMethod) {
      res.status(400).json({ message: "Método de pagamento inválido" });
      return;
    }

    const discountFactor = discountEntry ? discountEntry.discount : 0;
    const netAmount = grossAmount * (1 - discountFactor);

    let user;
    try {
      const password = bcrypt.hashSync("tempPassword123", 10);
      user = await prisma.user.create({
        data: { username, password },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res
          .status(400)
          .json({ message: "Username já cadastrado para um novo usuário." });
        return;
      }
      throw error;
    }

    // CORREÇÃO: Garante que 'user' não é indefinido antes de prosseguir.
    if (!user) {
      // A resposta de erro já foi enviada no bloco catch, então apenas retornamos.
      return;
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

// OTIMIZAÇÃO APLICADA: Executa buscas independentes em paralelo com Promise.all.
export const updateClient: RequestHandler<
  ParamsWithId,
  unknown,
  ClientBody,
  ParsedQs
> = async (req, res): Promise<void> => {
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

    const [plan, paymentMethod, discountEntry, clientToUpdate] =
      await Promise.all([
        prisma.plan.findUnique({ where: { id: planId } }),
        prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } }),
        prisma.planPaymentMethodDiscount.findUnique({
          where: { planId_paymentMethodId: { planId, paymentMethodId } },
        }),
        prisma.client.findUnique({
          where: { id: parseInt(id) },
          include: { user: true },
        }),
      ]);

    // CORREÇÃO: Adiciona verificações explícitas para satisfazer o TypeScript.
    if (!plan) {
      res.status(400).json({ message: "Plano inválido" });
      return;
    }
    if (!paymentMethod) {
      res.status(400).json({ message: "Método de pagamento inválido" });
      return;
    }
    if (!clientToUpdate) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }

    const discountFactor = discountEntry ? discountEntry.discount : 0;
    const netAmount = grossAmount * (1 - discountFactor);

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
      },
      include: { plan: true, paymentMethod: true, user: true },
    });

    res.json(updatedClient);
  } catch (error) {
    console.error("Erro detalhado ao atualizar cliente:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
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

// NENHUMA OTIMIZAÇÃO NECESSÁRIA: `delete` é uma operação atômica e direta.
export const deleteClient: RequestHandler<ParamsWithId> = async (
  req,
  res
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }
    res.status(500).json({ message: "Erro ao deletar cliente" });
  }
};

// OTIMIZAÇÃO APLICADA: Remove busca prévia, atualiza direto e trata erro P2025.
export const renewClient: RequestHandler<
  ParamsWithId,
  unknown,
  RenewClientBody,
  ParsedQs
> = async (req, res): Promise<void> => {
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
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { dueDate: parsedDueDate, isActive: true },
      include: { plan: true, paymentMethod: true, user: true },
    });
    res.status(200).json(updatedClient);
  } catch (error) {
    console.error("Erro ao renovar cliente:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }
    res.status(500).json({ message: "Erro ao renovar cliente" });
  }
};

// OTIMIZAÇÃO APLICADA: Combina verificação e atualização em uma única chamada.
export const reactivateClient: RequestHandler<
  ParamsWithId,
  unknown,
  ReactivateClientBody,
  ParsedQs
> = async (req, res): Promise<void> => {
  const { id } = req.params;
  const { dueDate } = req.body;
  if (isNaN(parseInt(id))) {
    res.status(400).json({ message: "ID inválido" });
    return;
  }
  if (!dueDate) {
    res
      .status(400)
      .json({
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
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id), isActive: false },
      data: { isActive: true, dueDate: parsedDueDate },
      include: { plan: true, paymentMethod: true, user: true },
    });
    res.status(200).json(updatedClient);
  } catch (error) {
    console.error("Erro ao reativar cliente:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      const clientExists = await prisma.client.findUnique({
        where: { id: parseInt(id) },
      });
      if (!clientExists) {
        res.status(404).json({ message: "Cliente não encontrado" });
      } else {
        res.status(400).json({ message: "Cliente já está ativo." });
      }
      return;
    }
    res.status(500).json({ message: "Erro ao reativar cliente" });
  }
};

// NENHUMA OTIMIZAÇÃO NECESSÁRIA: Manipulação de JSON com ORM já é a prática recomendada.
export const updatePaymentStatus: RequestHandler<
  ParamsWithId,
  unknown,
  PaymentBody,
  ParsedQs
> = async (req, res): Promise<void> => {
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
      res
        .status(400)
        .json({
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
      res
        .status(400)
        .json({
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
    const currentPayments = (
      Array.isArray(client.paymentHistory) ? client.paymentHistory : []
    ) as Prisma.JsonArray;
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }
    res.status(500).json({ message: "Erro ao atualizar status de pagamento" });
  }
};

// NENHUMA OTIMIZAÇÃO NECESSÁRIA: Manipulação de JSON com ORM já é a prática recomendada.
export const editPayment: RequestHandler<
  ParamsWithId,
  unknown,
  UpdatePaymentBody,
  ParsedQs
> = async (req, res): Promise<void> => {
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
      res
        .status(400)
        .json({
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
      res
        .status(400)
        .json({
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

// NENHUMA OTIMIZAÇÃO NECESSÁRIA: Manipulação de JSON com ORM já é a prática recomendada.
export const deletePayment: RequestHandler<
  ParamsWithId,
  unknown,
  DeletePaymentBody,
  ParsedQs
> = async (req, res): Promise<void> => {
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

// OTIMIZAÇÃO APLICADA: Remove busca prévia, atualiza direto e trata erro P2025.
export const updateClientObservations: RequestHandler<
  ParamsWithId,
  unknown,
  ObservationBody,
  ParsedQs
> = async (req, res): Promise<void> => {
  const { id } = req.params;
  const { observations } = req.body;
  if (isNaN(parseInt(id))) {
    res.status(400).json({ message: "ID inválido" });
    return;
  }
  try {
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { observations: observations || null },
      include: { plan: true, paymentMethod: true, user: true },
    });
    res.json(updatedClient);
  } catch (error) {
    console.error("Erro ao atualizar observações:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }
    res.status(500).json({ message: "Erro ao atualizar observações" });
  }
};

// OTIMIZAÇÃO APLICADA: Remove busca prévia, atualiza direto e trata erro P2025.
export const updateVisualPaymentStatus: RequestHandler<
  ParamsWithId,
  unknown,
  VisualPaymentStatusBody
> = async (req, res): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  if (isNaN(parseInt(id))) {
    res.status(400).json({ message: "ID inválido" });
    return;
  }
  if (typeof status !== "boolean") {
    res.status(400).json({ message: "Status inválido. Deve ser um booleano." });
    return;
  }
  try {
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { visualPaymentConfirmed: status },
      include: { plan: true, paymentMethod: true, user: true },
    });
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
    res
      .status(500)
      .json({
        message: "Erro interno ao atualizar status visual de pagamento",
      });
  }
};
