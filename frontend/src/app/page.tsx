//frontend/src/app/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { FaUser, FaLock } from "react-icons/fa";

interface DecodedToken {
  exp: number;
  username: string;
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const setupLogoutTimer = useCallback(
    (token: string) => {
      const decoded = jwtDecode<DecodedToken>(token);
      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;

      // Notificações progressivas
      const time10min = timeUntilExpiration - 10 * 60 * 1000;
      if (time10min > 0) {
        setTimeout(
          () =>
            toast.warn(
              "Sua sessão expirará em 10 minutos. Salve seu progresso."
            ),
          time10min
        );
      }
      const time5min = timeUntilExpiration - 5 * 60 * 1000;
      if (time5min > 0) {
        setTimeout(
          () =>
            toast.warn(
              "Sua sessão expirará em 5 minutos. Salve seu progresso."
            ),
          time5min
        );
      }
      const time1min = timeUntilExpiration - 1 * 60 * 1000;
      if (time1min > 0) {
        setTimeout(
          () =>
            toast.error(
              "Atenção: Sua sessão expirará em 1 minuto. Salve e saia agora!",
              { autoClose: false }
            ),
          time1min
        );
      }

      // Logout na expiração
      setTimeout(() => {
        localStorage.removeItem("token");
        toast.info("Sua sessão expirou. Por favor, faça login novamente.");
        router.push("/");
      }, timeUntilExpiration);
    },
    [router]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        setupLogoutTimer(token);
        router.push("/dashboard");
      } catch {
        localStorage.removeItem("token");
      }
    }
  }, [router, setupLogoutTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        "http://localhost:3001/api/auth/login",
        { username, password }
      );
      localStorage.setItem("token", data.token);
      setupLogoutTimer(data.token);
      toast.success("Login realizado com sucesso!");
      router.push("/dashboard");
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      toast.error(
        `Erro ao logar: ${
          axiosError.response?.data?.error || axiosError.message
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