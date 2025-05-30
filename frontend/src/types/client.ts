//frontend/src/types/client.ts

export interface Plan {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  discount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  createdAt: string; // Adicionado para refletir o schema completo
}

export interface PaymentEntry {
  paymentDate: string;
  amount: number;
}

export interface Client {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  plan: Plan;
  paymentMethod?: PaymentMethod;
  dueDate: string;
  grossAmount: number;
  netAmount: number;
  isActive: boolean;
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
  userId: number;
  user: User;
  paymentHistory: PaymentEntry[] | null; // Novo campo para histórico de pagamentos
  // Removidos: paymentVerified, paymentVerifiedDate (não mais usados)
}

export interface EditFormData {
  fullName: string;
  email: string;
  phone: string;
  planId: number;
  paymentMethodId: number;
  dueDate: string;
  grossAmount: number;
  isActive: boolean;
  observations?: string;
  username: string; // Mantido para edição do username
}

export interface DashboardStats {
  gross_amount: number;
  net_amount: number;
  active_clients: number;
  // Adicione outros campos conforme necessário para o dashboard (ex.: totalPayments)
}