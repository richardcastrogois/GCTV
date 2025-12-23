// frontend/src/types/client.ts

export interface Plan {
  id: number;
  name: string;
  isActive: boolean; // Obrigatório no Prisma
  createdAt: string; // Obrigatório no Prisma
  updatedAt: string; // Obrigatório no Prisma
}

export interface PaymentMethod {
  id: number;
  name: string;
  // discount é calculado via PlanPaymentMethodDiscount, não um campo direto de PaymentMethod no Prisma.
  // Se você o adiciona na API, mantenha-o. Caso contrário, pode ser removido ou gerenciado de outra forma.
  discount?: number;
  isActive: boolean; // Obrigatório no Prisma
  createdAt: string; // Obrigatório no Prisma
  updatedAt: string; // Obrigatório no Prisma
}

export interface User {
  id: number;
  username: string;
  createdAt: string; // Obrigatório no Prisma
}

export interface PaymentEntry {
  paymentDate: string; // Deve ser string ISO Date
  paymentBruto: number; // Novo campo para valor bruto
  paymentLiquido: number; // Novo campo para valor líquido
}

export interface Client {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  plan: Plan; // Assumindo que a API sempre retorna um objeto Plan (mesmo que "padrão")
  paymentMethod: PaymentMethod; // Assumindo que a API sempre retorna (mesmo que "padrão")
  dueDate: string; // Deve ser string ISO Date
  dueDateString?: string | null;
  grossAmount: number;
  netAmount: number;
  isActive: boolean;
  observations?: string;
  createdAt: string; // Obrigatório no Prisma
  updatedAt: string; // Obrigatório no Prisma
  userId: number;
  user: User; // Assumindo que a API sempre retorna um objeto User
  paymentHistory: PaymentEntry[] | null;
  visualPaymentConfirmed: boolean;
}

export interface EditFormData {
  fullName: string;
  email: string;
  phone: string;
  planId: number;
  paymentMethodId: number;
  dueDate: string; // Formato YYYY-MM-DD para input, convertido para ISO no envio
  grossAmount: number;
  isActive: boolean;
  observations?: string;
  username: string;
}

export interface DashboardStats {
  gross_amount: number;
  net_amount: number;
  active_clients: number;
}