// frontend/src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/utils/api";
import { toast } from "react-toastify";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import Loading from "@/components/Loading";
import LoadingSimple from "@/components/LoadingSimple";

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
  const [movieTitle, setMovieTitle] = useState<string>("");
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Para o carregamento inicial
  const [isLoginLoading, setIsLoginLoading] = useState(false); // Para o login
  const router = useRouter();
  const { handleUnauthorized } = useAuth();
  const hasLoaded = useRef(false);

  const TMDB_API_KEY = "fb7b0bbf56df803d4612f1fc923f5b84";

  useEffect(() => {
    console.log("useEffect executado", {
      TMDB_API_KEY,
      handleUnauthorized,
      router,
    });

    if (hasLoaded.current) {
      console.log("Carregamento já realizado, saindo...");
      setIsInitialLoading(false);
      return;
    }

    let isMounted = true;

    const loadImageAndData = async () => {
      console.log("Iniciando loadImageAndData");
      setIsInitialLoading(true);

      try {
        const res = await api.get<TMDBResponse>(
          `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&language=pt-BR`
        );

        const results = res.data.results;
        const moviesWithImages = results.filter(
          (movie: { backdrop_path: string; title: string }) =>
            movie.backdrop_path
        );
        if (moviesWithImages.length === 0) {
          throw new Error("Nenhum filme com imagem disponível");
        }

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

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const imageUrl = `${apiUrl}/api/proxy-image?url=${encodeURIComponent(
          `https://image.tmdb.org/t/p/${quality}${backdrop_path}`
        )}`;

        if (isMounted) {
          console.log("Carregando imagem:", imageUrl);
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              console.log("Imagem carregada:", imageUrl);
              setBackgroundImage(imageUrl);
              setMovieTitle(title || "Imagem Aleatória");
              resolve();
            };
            img.onerror = () =>
              reject(new Error("Falha ao carregar imagem da TMDB"));
            img.src = imageUrl;
          });

          console.log("Aguardando 2 segundos");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";
        console.log("Erro ao carregar imagem:", errorMessage);
        if (err instanceof AxiosError && err.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(errorMessage || "Erro ao buscar imagem da TMDB");
          if (isMounted) {
            setBackgroundImage("/teste001.jpg");
            setMovieTitle("Imagem Padrão");
          }
        }
      } finally {
        if (isMounted) {
          console.log("Finalizando loadImageAndData");
          setIsInitialLoading(false);
          hasLoaded.current = true;
        }
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

    return () => {
      isMounted = false;
      console.log("Componente desmontado");
    };
  }, [TMDB_API_KEY, handleUnauthorized, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true); // Ativa o LoadingSimple apenas para login
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
        toast.error("Usuário ou senha inválida.");
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
      setIsLoginLoading(false); // Desativa o LoadingSimple
    }
  };

  if (isInitialLoading) return <Loading />; // Carregamento inicial com animação
  if (isLoginLoading)
    return <LoadingSimple>Processando login...</LoadingSimple>; // Carregamento do login

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
      }}
    >
      {movieTitle && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-gradient-to-br px-8 py-5 rounded-3xl text-2xl sm:text-3xl md:text-4xl font-playfair font-extrabold shadow-[0_4px_20px_rgba(0,0,0,0.2)] ring-1 ring-white/5 backdrop-blur-xl z-10 bg-opacity-10">
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