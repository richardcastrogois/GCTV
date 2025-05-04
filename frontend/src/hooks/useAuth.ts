//frontend/src/hooks/useAuth.ts

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react"; // Adicione useCallback
import { toast } from "react-toastify";

export const useAuth = () => {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setToken(storedToken);

    if (!storedToken) {
      toast.error("Você precisa estar logado para acessar esta página.");
      router.push("/");
    }
  }, [router]);

  // Memoize a função handleUnauthorized
  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    router.push("/");
    toast.error("Sessão expirada. Faça login novamente.");
  }, [router]); // Adicione router como dependência

  return { token, handleUnauthorized };
};