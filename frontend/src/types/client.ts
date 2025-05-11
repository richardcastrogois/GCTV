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

export interface Client {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  plan: Plan; // Agora é um objeto, não uma string
  paymentMethod?: PaymentMethod; // Agora é um objeto, não uma string
  dueDate: string;
  grossAmount: number;
  netAmount: number;
  isActive: boolean;
  createdAt?: string; // Adicionei, já que o backend retorna isso
  updatedAt?: string; // Adicionei, já que o backend retorna isso
}

export interface DashboardStats {
  gross_amount: number;
  net_amount: number;
  active_clients: number;
}
