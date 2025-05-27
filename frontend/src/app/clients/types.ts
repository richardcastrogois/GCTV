// src/app/clients/types.ts
export interface Plan {
  id: number;
  name: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
}

export interface User {
  id: number;
  username: string;
}

export interface Client {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  plan: { id: number; name: string };
  paymentMethod: { id: number; name: string };
  dueDate: string;
  grossAmount: number;
  netAmount: number;
  isActive: boolean;
  paymentVerified: boolean;
  paymentVerifiedDate: string | null;
  observations?: string;
  user: User;
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
  username: string; // Adicionado para permitir a edição do username
}