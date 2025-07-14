// frontend/src/utils/api.ts

import axios, {
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { jwtDecode } from "jwt-decode";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// O uso de interceptors é a forma mais eficiente e centralizada
// de gerenciar a autenticação em todas as requisições.
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode<{ exp: number }>(token);
      const currentTime = Date.now() / 1000;

      // A lógica de renovar o token proativamente (antes de expirar) é excelente
      // para a experiência do usuário, evitando que uma requisição falhe.
      if (decoded.exp < currentTime + 120) {
        // Renova se faltar menos de 2 minutos
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
            console.error("Erro ao renovar token, deslogando:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            if (typeof window !== "undefined") {
              window.location.href = "/";
            }
          }
        } else {
          // Se não há refresh token, desloga o usuário.
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
    // A verificação para não deslogar na própria tela de login é crucial e está correta.
    if (
      error.response?.status === 401 &&
      error.config?.url !== "/api/auth/login"
    ) {
      // Esta lógica centralizada garante que qualquer chamada de API com token
      // expirado em qualquer lugar do site resulte em um logout seguro.
      console.log("Interceptor: Token inválido ou expirado. Deslogando...");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }

    // Rejeitar o erro permite que os componentes que fizeram a chamada (ex: no useQuery)
    // possam tratar o erro de forma específica (ex: exibir um toast).
    return Promise.reject(error);
  }
);

export default api;
