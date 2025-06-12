// frontend/src/app/page.tsx
"use client";

// Definir interface para a resposta de erro do Axios
interface ErrorResponse {
  error?: string;
}

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { toast } from "react-toastify";
import { FaUser, FaLock } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";

// Interface refinada para o payload do JWT
interface JwtPayload {
  exp: number;
  iat?: number;
  username?: string;
}

const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.exp < Date.now() / 1000;
  } catch (error) {
    console.error("Erro ao decodificar token:", error);
    return true; // Assume como expirado se houver erro
  }
};

// Função auxiliar para obter token com tipagem explícita
const getToken = (): string | null =>
  localStorage.getItem("token") as string | null;

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const setupLogoutTimer = useCallback(() => {
    const inactivityTimeout = setTimeout(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      toast.info("Sua sessão expirou por inatividade. Faça login novamente.");
      router.push("/");
    }, 9 * 60 * 1000); // 9 minutos, alinhado com o backend
    return () => clearTimeout(inactivityTimeout);
  }, [router]);

  const refreshToken = useCallback(async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken && typeof refreshToken === "string") {
      try {
        console.log("Enviando refreshToken para renovação:", refreshToken);
        const { data } = await axios.post(
          process.env.NEXT_PUBLIC_API_URL + "/api/auth/refresh",
          { refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );
        if (data.accessToken && typeof data.accessToken === "string") {
          localStorage.setItem("token", data.accessToken);
          if (data.refreshToken && typeof data.refreshToken === "string") {
            localStorage.setItem("refreshToken", data.refreshToken);
          }
          console.log(
            "Token renovado com sucesso, novo token:",
            data.accessToken
          );
          return true; // Indica sucesso
        }
      } catch (error) {
        const axiosError = error as AxiosError<ErrorResponse>;
        console.error(
          "Erro ao renovar token:",
          axiosError.response?.data?.error ||
            axiosError.message ||
            "Erro desconhecido"
        );
      }
    } else {
      console.warn("Nenhum refreshToken válido encontrado no localStorage");
    }
    return false; // Indica falha
  }, []);

  useEffect(() => {
    const checkTokens = async () => {
      const token = getToken();
      const storedRefreshToken = localStorage.getItem("refreshToken");
      console.log("Tokens no carregamento:", { token, storedRefreshToken });

      if (
        !token ||
        !storedRefreshToken ||
        typeof token !== "string" ||
        typeof storedRefreshToken !== "string"
      ) {
        console.log("Primeiro acesso ou tokens ausentes, aguardando login...");
        return;
      }

      const safeToken = token.length > 0 ? token : "";
      if (safeToken && isTokenExpired(safeToken)) {
        const refreshed = await refreshToken();
        if (refreshed) {
          router.push("/dashboard");
          const cleanup = setupLogoutTimer();
          return () => cleanup();
        }
      } else {
        router.push("/dashboard");
        const cleanup = setupLogoutTimer();
        return () => cleanup();
      }
    };

    checkTokens();
  }, [router, setupLogoutTimer, refreshToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Tentando login com:", { username, password });
      const { data } = await axios.post(
        process.env.NEXT_PUBLIC_API_URL + "/api/auth/login",
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );
      console.log(
        "Resposta do servidor (detalhada):",
        JSON.stringify(data, null, 2)
      );
      if (data.accessToken && data.refreshToken) {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        console.log("refreshToken armazenado:", data.refreshToken);
        const cleanup = setupLogoutTimer();
        const refreshInterval = setInterval(refreshToken, 8 * 60 * 1000); // Ajustado para 8 minutos, antes do timeout
        toast.success("Login realizado com sucesso!");
        router.push("/dashboard");
        return () => {
          cleanup();
          clearInterval(refreshInterval);
        };
      } else {
        throw new Error(
          "Resposta do servidor não contém accessToken ou refreshToken"
        );
      }
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      console.error("Erro ao logar:", error);
      toast.error(
        `Erro ao logar: ${
          axiosError.response?.data?.error ||
          axiosError.message ||
          "Erro desconhecido"
        }`
      );
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage:
          "url('https://images.pexels.com/photos/39811/pexels-photo-39811.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500')",
      }}
    >
      <form
        onSubmit={handleLogin}
        className="bg-black/35 p-8 rounded-xl w-full max-w-md shadow-md"
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-white">
          Login
        </h2>
        <div className="mb-4 relative">
          <label
            htmlFor="username"
            className="block text-base font-medium mb-1 text-white"
          >
            Usuário
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
              <FaUser />
            </span>
            <input
              id="username"
              type="text"
              placeholder="User Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-12 p-3 bg-gray-800/70 text-white text-lg border border-gray-600 rounded-full w-full focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
              autoComplete="username"
            />
          </div>
        </div>
        <div className="mb-6 relative">
          <label
            htmlFor="password"
            className="block text-base font-medium mb-1 text-white"
          >
            Senha
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
              <FaLock />
            </span>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-12 p-3 bg-gray-800/70 text-white text-lg border border-gray-600 rounded-full w-full focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
              autoComplete="current-password"
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-pink-500 hover:bg-pink-600 text-white text-lg p-4 rounded-full w-full transition-colors uppercase font-semibold"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}