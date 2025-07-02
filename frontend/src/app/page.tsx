// frontend/src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/utils/api";
import { toast } from "react-toastify";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import Loading from "@/components/Loading";

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
  } catch {
    return true;
  }
};

const getToken = (): string | null =>
  localStorage.getItem("token") as string | null;

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [movieTitle, setMovieTitle] = useState<string>("Imagem Padrão");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { handleUnauthorized } = useAuth();

  const TMDB_API_KEY = "fb7b0bbf56df803d4612f1fc923f5b84";

  useEffect(() => {
    const loadImageAndData = async () => {
      setIsLoading(true);

      const img = new Image();
      img.crossOrigin = "anonymous";

      try {
        const res = await api.get<TMDBResponse>(
          `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&language=pt-BR`
        );

        const results = res.data.results;
        // Filtra apenas filmes com backdrop_path
        const moviesWithImages = results.filter((movie) => movie.backdrop_path);
        if (moviesWithImages.length === 0) {
          toast.error("Nenhum filme com imagem disponível");
          setBackgroundImage("/teste001.jpg");
          setMovieTitle("Imagem Padrão");
        } else {
          const random = Math.floor(Math.random() * moviesWithImages.length);
          const { backdrop_path, title } = moviesWithImages[random];

          let quality = "w780";
          const screenWidth =
            typeof window !== "undefined" ? window.innerWidth : 1024;
          const navigatorNetwork = navigator as NavigatorNetwork;
          const downlink = navigatorNetwork.connection?.downlink ?? 5;

          if (downlink >= 5 && screenWidth >= 1024) {
            quality = "w1280";
          } else if (downlink >= 1.5) {
            quality = "w1280";
          }

          const imageUrl = `https://localhost:3001/proxy-image?url=${encodeURIComponent(
            `https://image.tmdb.org/t/p/${quality}${backdrop_path}`
          )}`;

          await new Promise<void>((resolve) => {
            img.src = imageUrl;
            img.onload = () => {
              setBackgroundImage(imageUrl);
              setMovieTitle(title || "Imagem Aleatória");
              resolve();
            };
            img.onerror = () => {
              toast.error("Falha ao carregar imagem da TMDB");
              setBackgroundImage("/teste001.jpg");
              setMovieTitle("Imagem Padrão");
              resolve();
            };
          });
        }
      } catch (err) {
        const axiosError = err as AxiosError<ErrorResponse>;
        if (axiosError.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error("Erro ao buscar imagem da TMDB");
          setBackgroundImage("/teste001.jpg");
          setMovieTitle("Imagem Padrão");
        }
      } finally {
        // Exibe o Loading por 3 segundos antes de carregar o conteúdo
        setTimeout(() => {
          setIsLoading(false);
        }, 2000); // 3000ms = 3 segundos
      }
    };

    const checkAuthThenLoad = async () => {
      const token = getToken();
      const refreshToken = localStorage.getItem("refreshToken");

      if (token && refreshToken && !isTokenExpired(token)) {
        router.push("/dashboard");
      } else {
        await loadImageAndData();
      }
    };

    checkAuthThenLoad();
  }, [TMDB_API_KEY, handleUnauthorized, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await api.post(
        "/api/auth/login",
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (data.accessToken && data.refreshToken) {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        toast.success("Login realizado com sucesso!");
        router.push("/dashboard");
      } else {
        throw new Error("Resposta inválida do servidor.");
      }
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
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
    } finally {
      // Exibe o Loading por 3 segundos após o login
      setTimeout(() => {
        setIsLoading(false);
      }, 2000); // 3000ms = 3 segundos
    }
  };

  if (isLoading) return <Loading />;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
      }}
    >
      {movieTitle && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-gradient-to-br from-white/5 to-gray-100/5 px-8 py-5 rounded-3xl text-3xl sm:text-4xl md:text-5xl font-playfair font-extrabold text-white shadow-[0_4px_20px_rgba(0,0,0,0.2)] ring-1 ring-white/15 backdrop-blur-xl z-10 bg-opacity-20">
          {movieTitle}
        </div>
      )}
      <form
        onSubmit={handleLogin}
        className="bg-gradient-to-br from-white/3 to-gray-100/3 p-6 sm:p-8 rounded-3xl w-full max-w-sm sm:max-w-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] ring-1 ring-white/15 backdrop-blur-sm z-20 bg-opacity-2 text-white"
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
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg text-gray-300">
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
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg text-gray-300">
              <FaLock />
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-12 pr-12 p-3 bg-gray-800/70 text-white text-base sm:text-lg border border-gray-600 rounded-full w-full focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
              autoComplete="current-password"
            />
            <span
              className="absolute right-6 top-1/2 transform -translate-y-1/2 text-lg sm:text-xl md:text-2xl text-gray-300 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
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