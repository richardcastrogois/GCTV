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
      if (decoded.exp < Date.now() / 1000 + 300) {
        // 5 minutos antes de expirar
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          try {
            const { data } = await axiosInstance.post("/api/refresh", {
              refreshToken,
            });
            localStorage.setItem("token", data.accessToken);
            config.headers.Authorization = `Bearer ${data.accessToken}`;
          } catch {
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            window.location.href = "/";
          }
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error) // Mantido para consistência, mas não usado explicitamente
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
