//backend/src/controllers/clientController.ts

import { RequestHandler, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { ParsedQs } from "qs";

const prisma = new PrismaClient();

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
  observations?: string; // Adicionado
};
type RenewClientBody = { dueDate: string };
type ObservationBody = { observations: string };

export const getClients: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const searchTerm = (req.query.search as string)?.toLowerCase() || "";

    const whereClause: Prisma.ClientWhereInput = { isActive: true };
    if (searchTerm) {
      whereClause.OR = [
        { fullName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } },
        { plan: { name: { contains: searchTerm, mode: "insensitive" } } },
        {
          paymentMethod: {
            name: { contains: searchTerm, mode: "insensitive" },
          },
        },
      ];
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      include: { plan: true, paymentMethod: true },
      skip,
      take: limit,
    });
    const total = await prisma.client.count({ where: whereClause });
    res.json({ data: clients, total, page, limit });
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ message: "Erro ao buscar clientes" });
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
      include: { plan: true, paymentMethod: true },
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

export const getExpiredClients: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const searchTerm = (req.query.search as string)?.toLowerCase() || "";

    const whereClause: Prisma.ClientWhereInput = { isActive: false };
    if (searchTerm) {
      whereClause.OR = [
        { fullName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } },
        { plan: { name: { contains: searchTerm, mode: "insensitive" } } },
        {
          paymentMethod: {
            name: { contains: searchTerm, mode: "insensitive" },
          },
        },
      ];
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      include: { plan: true, paymentMethod: true },
      skip,
      take: limit,
    });
    const total = await prisma.client.count({ where: whereClause });
    res.json({ data: clients, total, page, limit });
  } catch (error) {
    console.error("Erro ao buscar clientes expirados:", error);
    res.status(500).json({ message: "Erro ao buscar clientes expirados" });
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
    } = req.body;

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

    const discount = discountEntry ? discountEntry.discount : 0;
    const netAmount = grossAmount - grossAmount * (discount / 100);

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
        paymentVerified: false,
        paymentVerifiedDate: null,
        observations: req.body.observations || null,
      },
    });

    res.status(201).json(newClient);
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        error.meta &&
        Array.isArray((error.meta as any).target) &&
        (error.meta as any).target.includes("email")
      ) {
        res.status(400).json({ message: "Email já cadastrado" });
        return;
      }
    }
    res.status(500).json({ message: "Erro ao criar cliente" });
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
    } = req.body;

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

    const discount = discountEntry ? discountEntry.discount : 0;
    const netAmount = grossAmount - grossAmount * (discount / 100);

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
        observations: req.body.observations || null,
      },
    });

    res.json(updatedClient);
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        error.meta &&
        Array.isArray((error.meta as any).target) &&
        (error.meta as any).target.includes("email")
      ) {
        res.status(400).json({ message: "Email já cadastrado" });
        return;
      }
      if (error.code === "P2025") {
        res.status(404).json({ message: "Cliente não encontrado" });
        return;
      }
    }
    res.status(500).json({ message: "Erro ao atualizar cliente" });
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
      data: { dueDate: parsedDueDate },
      include: { plan: true, paymentMethod: true },
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

export const reactivateClient: RequestHandler<ParamsWithId> = async (
  req: Request<ParamsWithId>,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    res.status(400).json({ message: "ID inválido" });
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
      data: { isActive: true },
      include: { plan: true, paymentMethod: true },
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

export const updatePaymentStatus: RequestHandler<ParamsWithId> = async (
  req: Request<ParamsWithId>,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { paymentVerified, paymentVerifiedDate } = req.body;

  if (isNaN(parseInt(id))) {
    res.status(400).json({ message: "ID inválido" });
    return;
  }

  try {
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        paymentVerified,
        paymentVerifiedDate: paymentVerified
          ? new Date(paymentVerifiedDate)
          : null,
      },
      include: { plan: true, paymentMethod: true },
    });
    res.json(updatedClient);
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

// Nova função para atualizar apenas o campo observations
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
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { observations: observations || null },
      include: { plan: true, paymentMethod: true },
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