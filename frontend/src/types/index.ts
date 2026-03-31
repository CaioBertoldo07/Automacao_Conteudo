export interface User {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BrandProfile {
  id: string;
  description: string;
  targetAudience: string;
  mainProducts: string;
  communicationStyle: string;
  createdAt: string;
  companyId: string;
}

export interface Company {
  id: string;
  userId: string;
  name: string;
  niche: string;
  description: string;
  city: string;
  tone: string;
  postingFrequency: number;
  createdAt: string;
  updatedAt: string;
  brandProfile?: BrandProfile | null;
}

export interface CreateCompanyRequest {
  name: string;
  niche: string;
  description: string;
  city: string;
  tone: string;
  postingFrequency?: number;
}

export type UpdateCompanyRequest = Partial<CreateCompanyRequest>;

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export type ContentType = "IMAGE" | "REEL" | "STORY";
export type JobStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

export interface Post {
  id: string;
  type: ContentType;
  caption: string | null;
  hashtags: string | null;
  mediaUrl: string | null;
  status: JobStatus;
  scheduledAt: string | null;
  createdAt: string;
}
