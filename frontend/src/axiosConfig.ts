import axios from "axios";
import { jwtDecode } from "jwt-decode";

// Criando uma função centralizada para o logout para evitar repetição de código.
const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  // Garante que o redirecionamento só ocorra no lado do cliente.
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
};

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      const decoded = jwtDecode<{ exp: number }>(token);
      const currentTime = Date.now() / 1000;

      // A lógica de renovar o token proativamente (antes de expirar) é excelente.
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
            logoutUser(); // OTIMIZAÇÃO: Usa a função centralizada.
          }
        } else {
          logoutUser(); // OTIMIZAÇÃO: Usa a função centralizada.
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // AJUSTE CRÍTICO: Adicionada uma verificação para não deslogar o usuário
    // se o erro 401 acontecer na própria tela de login (ex: senha errada).
    if (
      error.response?.status === 401 &&
      error.config?.url !== "/api/auth/login"
    ) {
      console.error(
        "Interceptor de resposta: Token inválido ou expirado. Deslogando..."
      );
      logoutUser(); // OTIMIZAÇÃO: Usa a função centralizada.
    }

    // Para todos os outros erros, a promessa é rejeitada para que a
    // função que fez a chamada possa tratar o erro (ex: mostrar um toast).
    return Promise.reject(error);
  }
);

export default axiosInstance;
