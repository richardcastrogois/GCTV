//frontend/src/hooks/useAuth.ts

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";

export const useAuth = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setToken(storedToken);
    // Não redireciona aqui; deixa o DataPreloader ou outro componente lidar
  }, []);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    toast.error("Sessão expirada. Faça login novamente.");
    // Não redireciona aqui; deixa o componente pai decidir
  }, []);

  return { token, handleUnauthorized };
};