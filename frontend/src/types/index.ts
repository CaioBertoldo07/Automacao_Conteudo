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
export type StrategyApprovalStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export interface PostIdea {
  title: string;
  objective: string;
  format: ContentType;
  hook: string;
  description: string;
  cta: string;
}

export interface StrategyContent {
  summary: string;
  businessGoals: string[];
  targetAudience: string;
  brandTone: string;
  contentPillars: string[];
  postingCadence: string;
  primaryCTA: string;
  postIdeas: PostIdea[];
}

export interface ContentStrategy {
  id: string;
  companyId: string;
  content: StrategyContent;
  approvalStatus: StrategyApprovalStatus;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

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

export interface CalendarEntry {
  id: string;
  companyId: string;
  date: string;
  type: ContentType;
  status: JobStatus;
  createdAt: string;
  post: Post | null;
}

export interface BatchGenerateResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{ id: string; status: string; error?: string }>;
}

// Phase 6 — async queue responses
export interface EnqueueResult {
  aiJobId: string;
  queueJobId: string;
  calendarEntryId: string;
}

export interface BatchEnqueueItemResult {
  calendarEntryId: string;
  aiJobId?: string;
  status: "queued" | "failed";
  error?: string;
}

export interface BatchEnqueueResult {
  total: number;
  queued: number;
  failed: number;
  items: BatchEnqueueItemResult[];
}

export interface AIJobStatus {
  id: string;
  status: JobStatus;
  result: Record<string, unknown> | null;
  error: string | null;
}

// Phase 7 — dashboard & post management

export type MediaKind = "video" | "image" | "none";

export interface DashboardStats {
  /** Posts successfully generated (posts only exist when generation succeeds). */
  donePosts: number;
  /** Posts with a media file available for download. */
  downloadsAvailable: number;
  /** Total ContentCalendar entries (all scheduled slots). */
  calendarTotal: number;
  /** Calendar slots with completed generation (status=DONE). Used as progress numerator. */
  calendarDone: number;
  /** Calendar slots awaiting generation (status=PENDING). */
  calendarPending: number;
  /** Calendar slots being processed by a worker (status=PROCESSING). */
  calendarProcessing: number;
  /** Calendar slots that failed and can be retried (status=FAILED). */
  calendarFailed: number;
  /** AIJob rows in PENDING or PROCESSING state. */
  activeJobs: number;
  /** REELs generated as images because Veo was unavailable. */
  reelFallbackCount: number;
}

export interface PostItem {
  id: string;
  type: ContentType;
  caption: string | null;
  hashtags: string | null;
  mediaUrl: string | null;
  status: JobStatus;
  scheduledAt: string | null;
  createdAt: string;
  calendarDate: string | null;
  mediaKind: MediaKind;
  /** True when a REEL was generated with an image as fallback (Veo unavailable). */
  reelFallback: boolean;
}

export interface PostsPage {
  data: PostItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PostsFilter {
  status?: JobStatus;
  type?: ContentType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PostMediaInfo {
  mediaUrl: string;
  type: ContentType;
  /** Suggested download filename, e.g. "post-abc12345.png" */
  filename: string;
  mediaKind: MediaKind;
  /** True when a REEL was generated with an image as fallback (Veo unavailable). */
  reelFallback: boolean;
}
