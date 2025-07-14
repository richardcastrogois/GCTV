"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/utils/api";
import { toast } from "react-toastify";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import { AxiosError } from "axios";
import LoadingSimple from "@/components/LoadingSimple";

interface ErrorResponse {
  error?: string;
}
interface JwtPayload {
  exp: number;
}
interface Movie {
  backdrop_path: string;
  title: string;
}
interface TMDBResponse {
  results: Movie[];
}

const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};

function useLoginBackground() {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [movieTitle, setMovieTitle] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const TMDB_API_KEY = "fb7b0bbf56df803d4612f1fc923f5b84";

    const fetchImage = async () => {
      try {
        const res = await api.get<TMDBResponse>(
          `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&language=pt-BR`
        );
        const moviesWithImages = res.data.results.filter(
          (movie) => movie.backdrop_path
        );
        if (moviesWithImages.length > 0) {
          const randomMovie =
            moviesWithImages[
              Math.floor(Math.random() * moviesWithImages.length)
            ];
          const imageUrl = `https://image.tmdb.org/t/p/w1280${randomMovie.backdrop_path}`;
          if (isMounted) {
            setBackgroundImage(imageUrl);
            setMovieTitle(randomMovie.title || "Imagem Aleatória");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar imagem da TMDB:", error);
      }
    };
    fetchImage();
    return () => {
      isMounted = false;
    };
  }, []);

  return { backgroundImage, movieTitle };
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const [isSessionChecking, setIsSessionChecking] = useState(true);

  const router = useRouter();
  const { backgroundImage, movieTitle } = useLoginBackground();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (isTokenValid(token)) {
      router.push("/dashboard");
    } else {
      setIsSessionChecking(false);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", {
        username,
        password,
      });
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
      const errorMessage =
        axiosError.response?.data?.error ||
        axiosError.message ||
        "Usuário ou senha inválida";
      toast.error(errorMessage);
    } finally {
      setIsLoginLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-900 bg-cover bg-center relative"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          opacity: backgroundImage ? 1 : 0,
        }}
      />
      <div className="absolute inset-0 bg-black opacity-50"></div>

      {movieTitle && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-gradient-to-br px-8 py-5 rounded-3xl text-2xl sm:text-3xl md:text-4xl font-playfair font-extrabold shadow-[0_4px_20px_rgba(0,0,0,0.2)] ring-1 ring-white/5 backdrop-blur-xl z-10 bg-opacity-10 text-white">
          {movieTitle}
        </div>
      )}
      <form
        onSubmit={handleLogin}
        className={`bg-gradient-to-br from-white/10 to-gray-100/5 p-6 sm:p-8 rounded-3xl w-full max-w-sm sm:max-w-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] ring-1 ring-white/15 backdrop-blur-lg z-20 bg-opacity-20 text-white transition-opacity duration-500 ${
          isSessionChecking ? "opacity-50 cursor-wait" : "opacity-100"
        }`}
      >
        <fieldset disabled={isSessionChecking || isLoginLoading}>
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
                className="pl-12 p-3 bg-gray-800/70 text-white text-base sm:text-lg border border-gray-600 rounded-full w-full focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-70"
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
                className="pl-12 pr-12 p-3 bg-gray-800/70 text-white text-base sm:text-lg border border-gray-600 rounded-full w-full focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-70"
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
            className="bg-pink-500 hover:bg-pink-600 text-white text-base sm:text-lg p-3 sm:p-4 rounded-full w-full transition-colors uppercase font-semibold disabled:bg-pink-800 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoginLoading ? <LoadingSimple isButton={true} /> : "Entrar"}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
