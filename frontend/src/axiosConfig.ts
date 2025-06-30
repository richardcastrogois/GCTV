//frontend/src/axiosConfig.ts

import axios from "axios";
import { jwtDecode } from "jwt-decode";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token");
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
            console.log("Token renovado com sucesso:", newAccessToken);
          } catch (error) {
            console.error("Erro ao renovar token:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            window.location.href = "/";
          }
        } else {
          localStorage.removeItem("token");
          window.location.href = "/";
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
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;