//frontend/src/app/clients/types.ts

export interface Plan {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string; // Tornar obrigatório
  updatedAt: string; // Tornar obrigatório
}

export interface PaymentMethod {
  id: number;
  name: string;
  discount?: number;
  isActive: boolean;
  createdAt: string; // Tornar obrigatório
  updatedAt: string; // Tornar obrigatório
}

export interface User {
  id: number;
  username: string;
  createdAt: string; // Tornar obrigatório
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
  paymentMethod: PaymentMethod;
  dueDate: string;
  grossAmount: number;
  netAmount: number;
  isActive: boolean;
  observations?: string;
  createdAt: string; // Tornar obrigatório
  updatedAt: string; // Tornar obrigatório
  userId: number;
  user: User;
  paymentHistory: PaymentEntry[] | null;
  visualPaymentConfirmed: boolean;
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
  username: string;
}