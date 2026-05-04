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

// Auto logout on 401 + Offline Caching
API.interceptors.response.use(
  (response) => {
    // Cache successful GET requests for offline use
    if (response.config.method === "get") {
      const cacheKey = `cache_${response.config.url}`;
      localStorage.setItem(cacheKey, JSON.stringify(response.data));
    }
    return response;
  },
  (error) => {
    const originalRequest = error.config;

    // If network error and it was a GET request, try to return cached data
    if (
      originalRequest &&
      (!error.response || error.code === "ERR_NETWORK") &&
      originalRequest.method === "get"
    ) {
      const cacheKey = `cache_${originalRequest.url}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        console.log("Serving from offline cache:", originalRequest.url);
        return Promise.resolve({
          data: JSON.parse(cachedData),
          status: 200,
          statusText: "OK (Offline Cache)",
          headers: {},
          config: originalRequest,
        });
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("retailflow_token");
      localStorage.removeItem("retailflow_shop");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default API;
