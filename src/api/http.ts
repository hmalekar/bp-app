import axios, { AxiosHeaders } from "axios";

const AUTH_TOKEN_HEADER = "X-Auth-Token";
const AUTH_TOKEN_STORAGE_KEY = "#bp_X-Auth-Token";
const USER_ROLE_STORAGE_KEY = "#bp_user_role";
const USER_EMAIL_STORAGE_KEY = "#bp_user_email";

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
export const setAuthToken = (token: string) => localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
export const clearAuthToken = () => localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);

export const getUserRole = () => sessionStorage.getItem(USER_ROLE_STORAGE_KEY);
export const setUserRole = (role: string) => sessionStorage.setItem(USER_ROLE_STORAGE_KEY, role);
export const clearUserRole = () => sessionStorage.removeItem(USER_ROLE_STORAGE_KEY);

export const getCurrentUser = () => sessionStorage.getItem(USER_EMAIL_STORAGE_KEY);
export const setCurrentUser = (email: string) => sessionStorage.setItem(USER_EMAIL_STORAGE_KEY, email);
export const clearCurrentUser = () => sessionStorage.removeItem(USER_EMAIL_STORAGE_KEY);

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
});

http.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set(AUTH_TOKEN_HEADER, token);
    config.headers = headers;
  }
  return config;
});

http.interceptors.response.use((response) => {
  const headers = AxiosHeaders.from(response.headers as AxiosHeaders | Record<string, string> | undefined);
  const token = headers.get(AUTH_TOKEN_HEADER);
  if (typeof token === "string" && token.length > 0) {
    setAuthToken(token);
  }
  return response;
});

export default http;
export { AUTH_TOKEN_HEADER, AUTH_TOKEN_STORAGE_KEY };
