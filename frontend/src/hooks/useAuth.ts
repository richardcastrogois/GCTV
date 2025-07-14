// frontend/src/hooks/useAuth.ts

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";

export const useAuth = () => {
  const [token, setToken] = useState<string | null>(null);

  // Este useEffect roda apenas uma vez quando o componente que usa o hook é montado.
  // Ele busca o token do localStorage de forma segura, o que é a abordagem correta.
  useEffect(() => {
    const storedToken =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setToken(storedToken);
  }, []);

  // O uso de useCallback aqui é uma boa prática. Ele garante que a função
  // de logout não seja recriada a cada renderização, otimizando componentes
  // que dependem dela.
  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    toast.error("Sessão expirada. Faça login novamente.");
    // A decisão de não redirecionar aqui é inteligente, pois dá flexibilidade
    // para o componente que chama o hook decidir o que fazer.
  }, []);

  return { token, handleUnauthorized };
};
