import axios from "axios";
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  ContentStrategy,
  CalendarEntry,
  EnqueueResult,
  BatchEnqueueResult,
  AIJobStatus,
  DashboardStats,
  PostsPage,
  PostsFilter,
  PostMediaInfo,
  Notification,
  AutomationConfig,
  UpdateAutomationConfigRequest,
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

  updateMe: async (data: { name?: string; email?: string }): Promise<User> => {
    const response = await api.patch<User>("/users/me", data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.patch("/users/me/password", { currentPassword, newPassword });
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

export const strategyService = {
  generate: async (): Promise<ContentStrategy> => {
    const response = await api.post<ContentStrategy>("/strategies/generate", {});
    return response.data;
  },

  getMyStrategy: async (): Promise<ContentStrategy | null> => {
    try {
      const response = await api.get<ContentStrategy>("/strategies/me");
      return response.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw err;
    }
  },

  approve: async (id: string): Promise<ContentStrategy> => {
    const response = await api.patch<ContentStrategy>(`/strategies/${id}/approval`, {
      action: "APPROVED",
    });
    return response.data;
  },

  reject: async (id: string, reason?: string): Promise<ContentStrategy> => {
    const response = await api.patch<ContentStrategy>(`/strategies/${id}/approval`, {
      action: "REJECTED",
      rejectionReason: reason,
    });
    return response.data;
  },
};

export const calendarService = {
  generate: async (): Promise<CalendarEntry[]> => {
    const response = await api.post<CalendarEntry[]>("/calendars/generate", {});
    return response.data;
  },

  getMyCalendar: async (): Promise<CalendarEntry[]> => {
    const response = await api.get<CalendarEntry[]>("/calendars/me");
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/calendars/${id}`);
  },
};

export const contentService = {
  /** POST → 202: enqueues generation, returns immediately with aiJobId. */
  generateOne: async (calendarEntryId: string): Promise<EnqueueResult> => {
    const response = await api.post<EnqueueResult>(
      `/content/${calendarEntryId}/generate`
    );
    return response.data;
  },

  /** POST → 202: enqueues all pending entries. */
  generateBatch: async (): Promise<BatchEnqueueResult> => {
    const response = await api.post<BatchEnqueueResult>("/content/batch");
    return response.data;
  },

  /** GET: polls job status by aiJobId. */
  getJobStatus: async (aiJobId: string): Promise<AIJobStatus> => {
    const response = await api.get<AIJobStatus>(`/content/jobs/${aiJobId}`);
    return response.data;
  },
};

// Phase 7 — dashboard stats & post listing
export const postService = {
  /** GET /posts/stats → aggregated dashboard counts. */
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>("/posts/stats");
    return response.data;
  },

  /** GET /posts → paginated list with optional filters. */
  list: async (filters: PostsFilter = {}): Promise<PostsPage> => {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.page != null) params.page = String(filters.page);
    if (filters.limit != null) params.limit = String(filters.limit);
    const response = await api.get<PostsPage>("/posts", { params });
    return response.data;
  },

  /** GET /posts/:id/download → validates ownership, returns mediaUrl. */
  getDownloadInfo: async (postId: string): Promise<PostMediaInfo> => {
    const response = await api.get<PostMediaInfo>(`/posts/${postId}/download`);
    return response.data;
  },
};

// Phase 8 — media library
export const mediaService = {
  list: async (
    companyId: string,
    filters?: { category?: string; type?: import("@/types").MediaType }
  ): Promise<import("@/types").CompanyMedia[]> => {
    const params: Record<string, string> = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.type) params.type = filters.type;
    const response = await api.get<import("@/types").CompanyMedia[]>(
      `/companies/${companyId}/media`,
      { params }
    );
    return response.data;
  },

  get: async (
    companyId: string,
    mediaId: string
  ): Promise<import("@/types").CompanyMedia> => {
    const response = await api.get<import("@/types").CompanyMedia>(
      `/companies/${companyId}/media/${mediaId}`
    );
    return response.data;
  },

  upload: async (
    companyId: string,
    file: File
  ): Promise<import("@/types").CompanyMedia> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<import("@/types").CompanyMedia>(
      `/companies/${companyId}/media`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },

  toggle: async (
    companyId: string,
    mediaId: string,
    isActive: boolean
  ): Promise<import("@/types").CompanyMedia> => {
    const response = await api.patch<import("@/types").CompanyMedia>(
      `/companies/${companyId}/media/${mediaId}`,
      { isActive }
    );
    return response.data;
  },

  remove: async (companyId: string, mediaId: string): Promise<void> => {
    await api.delete(`/companies/${companyId}/media/${mediaId}`);
  },

  requeue: async (companyId: string): Promise<{ requeued: number }> => {
    const response = await api.post<{ requeued: number }>(
      `/companies/${companyId}/media/requeue`
    );
    return response.data;
  },
};

// Phase 9 — notifications
export const notificationService = {
  list: async (): Promise<Notification[]> => {
    const response = await api.get<Notification[]>("/notifications");
    return response.data;
  },

  markRead: async (id: string): Promise<Notification> => {
    const response = await api.patch<Notification>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async (): Promise<void> => {
    await api.patch("/notifications/read-all");
  },

  unreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get<{ count: number }>("/notifications/unread-count");
    return response.data;
  },
};

// Phase 9 — automation
export const automationService = {
  getConfig: async (): Promise<AutomationConfig> => {
    const response = await api.get<AutomationConfig>("/automation/config");
    return response.data;
  },

  updateConfig: async (data: UpdateAutomationConfigRequest): Promise<AutomationConfig> => {
    const response = await api.patch<AutomationConfig>("/automation/config", data);
    return response.data;
  },

  trigger: async (): Promise<{ ok: boolean; message: string }> => {
    const response = await api.post<{ ok: boolean; message: string }>("/automation/trigger");
    return response.data;
  },
};

export default api;
