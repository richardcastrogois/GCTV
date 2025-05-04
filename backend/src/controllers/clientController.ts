import { RequestHandler, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { ParsedQs } from "qs";

const prisma = new PrismaClient();

// Tipo para parâmetros com 'id'
type ParamsWithId = { id: string };

// Tipo para o corpo da requisição de criação/atualização de cliente
type ClientBody = {
  fullName: string;
  email: string;
  phone?: string;
  planId: number;
  paymentMethodId: number;
  dueDate: string;
  grossAmount: number;
  isActive: boolean;
};

// Tipo para o corpo da requisição de renovação de cliente
type RenewClientBody = {
  dueDate: string;
};

// Função para buscar todos os clientes (apenas ativos)
export const getClients: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      where: {
        isActive: true, // Apenas clientes ativos
      },
      include: {
        plan: true,
        paymentMethod: true,
      },
    });
    res.json(clients);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ message: "Erro ao buscar clientes" });
  }
};

// Função para buscar um cliente por ID
export const getClientById: RequestHandler<ParamsWithId> = async (
  req: Request<ParamsWithId>,
  res: Response
): Promise<void> => {
  console.log(`Função getClientById chamada com id=${req.params.id}`);
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    res.status(400).json({ message: "ID inválido" });
    return;
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: {
        plan: true,
        paymentMethod: true,
      },
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

// Função para buscar clientes expirados (apenas inativos)
export const getExpiredClients: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      where: {
        isActive: false, // Apenas clientes inativos
      },
      include: {
        plan: true,
        paymentMethod: true,
      },
    });
    res.json(clients);
  } catch (error) {
    console.error("Erro ao buscar clientes expirados:", error);
    res.status(500).json({ message: "Erro ao buscar clientes expirados" });
  }
};

// Função para buscar planos
export const getPlans: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("Função getPlans chamada. Buscando planos...");
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

// Função para buscar métodos de pagamento
export const getPaymentMethods: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log(
    "Função getPaymentMethods chamada. Buscando métodos de pagamento..."
  );
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

// Função para criar um cliente
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

    // Validações
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

    // Buscar desconto aplicável
    const discountEntry = await prisma.planPaymentMethodDiscount.findUnique({
      where: {
        planId_paymentMethodId: {
          planId,
          paymentMethodId,
        },
      },
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
      },
    });

    res.status(201).json(newClient);
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes("email")
      ) {
        res.status(400).json({ message: "Email já cadastrado" });
        return;
      }
    }
    res.status(500).json({ message: "Erro ao criar cliente" });
  }
};

// Função para atualizar um cliente
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

    // Validações
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

    // Buscar desconto aplicável
    const discountEntry = await prisma.planPaymentMethodDiscount.findUnique({
      where: {
        planId_paymentMethodId: {
          planId,
          paymentMethodId,
        },
      },
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
      },
    });

    res.json(updatedClient);
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes("email")
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

// Função para deletar um cliente
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

// Função para renovar um cliente (atualizar apenas a dueDate)
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
    // Validar a data de vencimento
    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      res.status(400).json({ message: "Data de vencimento inválida" });
      return;
    }

    // Verificar se o cliente existe
    const clientExists = await prisma.client.findUnique({
      where: { id: parseInt(id) },
    });
    if (!clientExists) {
      res.status(404).json({ message: "Cliente não encontrado" });
      return;
    }

    // Atualizar apenas a dueDate do cliente
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        dueDate: parsedDueDate,
      },
      include: {
        plan: true,
        paymentMethod: true,
      },
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

// Função para reativar um cliente (alterar isActive para true)
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
      data: {
        isActive: true, // Reativar o cliente
      },
      include: {
        plan: true,
        paymentMethod: true,
      },
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
