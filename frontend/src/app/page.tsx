// frontend/src/app/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/utils/api";
import { toast } from "react-toastify";
import { FaUser, FaLock } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";

// Extender Navigator para incluir a propriedade connection
interface NavigatorNetwork extends Navigator {
  connection?: {
    downlink?: number;
  };
}

interface ErrorResponse {
  error?: string;
}

interface JwtPayload {
  exp: number;
  iat?: number;
  username?: string;
}

interface TMDBResponse {
  results: { backdrop_path: string; title: string }[];
}

const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.exp < Date.now() / 1000;
  } catch (error) {
    console.error("Erro ao decodificar token:", error);
    return true;
  }
};

const getToken = (): string | null =>
  localStorage.getItem("token") as string | null;

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [movieTitle, setMovieTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { handleUnauthorized } = useAuth();

  const TMDB_API_KEY = "fb7b0bbf56df803d4612f1fc923f5b84";

  const fetchRandomBackdrop = useCallback(async () => {
    try {
      const res = await api.get<TMDBResponse>(
        `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&language=pt-BR`
      );
      const results = res.data.results;
      const random = Math.floor(Math.random() * results.length);
      const backdropPath = results[random]?.backdrop_path;
      const title = results[random]?.title;

      if (!backdropPath) {
        setIsLoading(false);
        toast.error("Nenhuma imagem de fundo disponível");
        return;
      }

      let quality = "w780";
      const screenWidth =
        typeof window !== "undefined" ? window.innerWidth : 1024;
      const navigatorNetwork = navigator as NavigatorNetwork;
      const downlink = navigatorNetwork.connection?.downlink ?? 5;

      if (downlink >= 5 && screenWidth >= 1024) {
        quality = "original";
      } else if (downlink >= 1.5) {
        quality = "w1280";
      }

      const imageUrl = `https://image.tmdb.org/t/p/${quality}${backdropPath}`;

      const img = new Image();
      img.onload = () => {
        setBackgroundImage(imageUrl);
        setMovieTitle(title || "");
        setIsLoading(false);
      };
      img.onerror = () => {
        console.error("Erro ao carregar a imagem:", imageUrl);
        setIsLoading(false);
        toast.error("Erro ao carregar imagem de fundo");
      };
      img.src = imageUrl;
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      console.error("Erro ao buscar imagem da TMDB:", err);
      if (axiosError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(
          axiosError.response?.data?.error || "Erro ao buscar imagem de fundo"
        );
      }
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

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
        fetchRandomBackdrop();
        return;
      }

      const safeToken = token.length > 0 ? token : "";
      if (safeToken && !isTokenExpired(safeToken)) {
        router.push("/dashboard");
      } else {
        fetchRandomBackdrop();
      }
    };

    checkTokens();
  }, [router, fetchRandomBackdrop]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Tentando login com:", { username, password });
      const { data } = await api.post(
        "/api/auth/login",
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
        toast.success("Login realizado com sucesso!");
        router.push("/dashboard");
      } else {
        throw new Error(
          "Resposta do servidor não contém accessToken ou refreshToken"
        );
      }
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      console.error("Erro ao logar:", error);
      if (axiosError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(
          `Erro ao logar: ${
            axiosError.response?.data?.error ||
            axiosError.message ||
            "Erro desconhecido"
          }`
        );
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl sm:text-2xl font-bold flex items-center gap-2">
          Carregando... <span className="animate-pulse">🎬</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
      }}
    >
      {movieTitle && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-gradient-to-br from-white/5 to-gray-100/5 px-8 py-5 rounded-3xl text-3xl sm:text-4xl md:text-5xl font-playfair font-extrabold text-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.2)] ring-1 ring-white/15 backdrop-blur-xl z-10 bg-opacity-20">
          {movieTitle}
        </div>
      )}
      <form
        onSubmit={handleLogin}
        className="bg-gradient-to-br from-white/3 to-gray-100/3 p-6 sm:p-8 rounded-3xl w-full max-w-sm sm:max-w-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] ring-1 ring-white/15 backdrop-blur-sm z-20 text-slate-200 bg-opacity-2"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-white">
          Login
        </h2>
        <div className="mb-4 relative">
          <label
            htmlFor="username"
            className="block text-sm sm:text-base font-medium mb-1 text-white"
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
              className="pl-12 p-3 bg-gray-800/70 text-white text-base sm:text-lg border border-gray-600 rounded-full w-full focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
              autoComplete="username"
            />
          </div>
        </div>
        <div className="mb-6 relative">
          <label
            htmlFor="password"
            className="block text-sm sm:text-base font-medium mb-1 text-white"
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
              className="pl-12 p-3 bg-gray-800/70 text-white text-base sm:text-lg border border-gray-600 rounded-full w-full focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
              autoComplete="current-password"
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-pink-500 hover:bg-pink-600 text-white text-base sm:text-lg p-3 sm:p-4 rounded-full w-full transition-colors uppercase font-semibold"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}