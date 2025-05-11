// src/app/clients/types.ts
export interface Plan {
  id: number;
  name: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
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
  paymentVerified: boolean; // Adicionado
  paymentVerifiedDate: string | null; // Adicionado
  observations?: string; // Novo campo, opcional
}

export interface EditFormData {
  fullName: string;
  email: string;
  phone: string;
  planId: number;
  paymentMethodId: number;
  dueDate: string;
  grossAmount: string;
  isActive: boolean;
  observations?: string;
}
