//frontend/src/utils/api.ts

import axios, {
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { jwtDecode } from "jwt-decode";

console.log(
  "API Base URL que o frontend está usando:",
  process.env.NEXT_PUBLIC_API_URL
);

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    // Removido o console.log do token para limpar o console em produção
    if (token) {
      const decoded = jwtDecode<{ exp: number }>(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime + 120) {
        // Renovar se faltar menos de 2 minutos
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          try {
            const { data } = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh-token`,
              { refreshToken }
            );
            const newAccessToken = data.accessToken;
            localStorage.setItem("token", newAccessToken);
            config.headers.Authorization = `Bearer ${newAccessToken}`;
          } catch (error) {
            console.error("Erro ao renovar token:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            if (typeof window !== "undefined") {
              window.location.href = "/";
            }
          }
        } else {
          localStorage.removeItem("token");
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // --- INÍCIO DA CORREÇÃO ---
    // Verificamos se o erro é 401 E se a requisição original NÃO FOI para a rota de login.
    if (
      error.response?.status === 401 &&
      error.config?.url !== "/api/auth/login"
    ) {
      // Esta lógica agora só será executada se o usuário já estiver logado
      // e o token expirar em outra página, que não a de login.
      console.log("Interceptor: Token inválido ou expirado. Deslogando...");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
    // --- FIM DA CORREÇÃO ---

    // Para todos os outros erros (incluindo o 401 do login),
    // nós simplesmente rejeitamos o erro para que a função que fez a chamada (handleLogin)
    // possa capturá-lo em seu próprio bloco 'catch'.
    return Promise.reject(error);
  }
);

export default api;
