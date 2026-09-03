import axios from "axios";
import { attachAuthToken } from "@/lib/auth";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 60000,
  headers: {
    ...getLocalDevNgrokHeaders(),
  },
  withCredentials: true, // future-ready if you use cookies/session
});

apiClient.interceptors.request.use(attachAuthToken);

// Clean error messages
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data
        ? typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data)
        : err.message || "Request failed";
    const error = new Error(msg) as Error & { status?: number; data?: unknown };
    error.status = err?.response?.status;
    error.data = err?.response?.data;
    return Promise.reject(error);
  }
);
