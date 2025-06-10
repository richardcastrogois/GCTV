//frontend/src/utils/api.ts

import axios from "axios";
import { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    console.log("Token enviado na requisição (interceptor):", token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    console.error("Erro na resposta do servidor:", error.response);
    return Promise.reject(error);
  }
);

export default api;