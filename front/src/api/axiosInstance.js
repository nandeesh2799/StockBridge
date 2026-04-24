import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("retailflow_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Auto logout on 401
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("retailflow_token");
      localStorage.removeItem("retailflow_shop");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default API;
