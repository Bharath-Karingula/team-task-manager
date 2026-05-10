import axios from "axios";
import toast from "react-hot-toast";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  updateAccessToken
} from "./auth";

const api = axios.create({
 baseURL: import.meta.env.VITE_API_URL || "/api"
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      getRefreshToken() &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      refreshPromise =
        refreshPromise ||
        api
          .post("/auth/refresh", { refreshToken: getRefreshToken() })
          .finally(() => {
            refreshPromise = null;
          });

      try {
        const res = await refreshPromise;
        updateAccessToken(res.data.token, res.data.refreshToken, res.data.user);
        originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearSession();
        toast.error("Your session expired. Please login again.");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
