import axios from "axios";
import { attachAuthToken } from "@/lib/auth";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";

const apiKey = (process.env.NEXT_PUBLIC_API_KEY || "").trim();

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 60000,
  headers: {
    ...(apiKey ? { "x-api-key": apiKey } : {}),
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
    return Promise.reject(new Error(msg));
  }
);
