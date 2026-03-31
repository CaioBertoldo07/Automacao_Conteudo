import axios from "axios";
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from "@/types";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: async (data: RegisterRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>("/auth/register", data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>("/auth/login", data);
    return response.data;
  },
};

export const userService = {
  getMe: async (): Promise<User> => {
    const response = await api.get<User>("/users/me");
    return response.data;
  },
};

export const companyService = {
  list: async (): Promise<Company[]> => {
    const response = await api.get<Company[]>("/companies");
    return response.data;
  },

  getById: async (id: string): Promise<Company> => {
    const response = await api.get<Company>(`/companies/${id}`);
    return response.data;
  },

  create: async (data: CreateCompanyRequest): Promise<Company> => {
    const response = await api.post<Company>("/companies", data);
    return response.data;
  },

  update: async (id: string, data: UpdateCompanyRequest): Promise<Company> => {
    const response = await api.patch<Company>(`/companies/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/companies/${id}`);
  },

  getMyProfile: async (): Promise<Company | null> => {
    try {
      const response = await api.get<Company>("/companies/profile/me");
      return response.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw err;
    }
  },
};

export default api;
