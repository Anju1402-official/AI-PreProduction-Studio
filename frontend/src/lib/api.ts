/**
 * Centralized API service for the AI Pre-Production Studio backend.
 *
 * All network access to the FastAPI backend goes through this module.
 * Base URL comes from VITE_API_URL (see .env / .env.example).
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  "https://ai-preprod-backend.onrender.com";

const TOKEN_KEY = "auth_token";

/* ------------------------------------------------------------------ */
/* Token storage (SSR-safe — localStorage only exists in the browser) */
/* ------------------------------------------------------------------ */

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore (private mode / storage disabled) */
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Unauthorized handling — the UI layer subscribes to this once       */
/* ------------------------------------------------------------------ */

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListener = listener;
  return () => {
    if (unauthorizedListener === listener) unauthorizedListener = null;
  };
}

/* ------------------------------------------------------------------ */
/* Core error type                                                    */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      // FastAPI validation error array
      const msgs = detail
        .map((d) =>
          d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : null,
        )
        .filter(Boolean);
      if (msgs.length) return msgs.join("; ");
    }
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Request core — handles auth header, JSON/form bodies, retries      */
/* ------------------------------------------------------------------ */

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Send as multipart/form-data (for file uploads) instead of JSON */
  form?: FormData;
  /** Send as application/x-www-form-urlencoded (for OAuth2 password flow) */
  urlencoded?: URLSearchParams;
  /** Attach Authorization header. Defaults to true. */
  auth?: boolean;
  /** Number of retry attempts for network-level failures. Default 2. */
  retries?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 20000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, form, urlencoded, auth = true, retries = 2 } = options;

  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {};

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let fetchBody: BodyInit | undefined;
  if (form) {
    fetchBody = form; // browser sets multipart boundary automatically
  } else if (urlencoded) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    fetchBody = urlencoded;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    // Combine caller-provided signal with our timeout signal
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: fetchBody,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 204) {
        return undefined as T;
      }

      const contentType = response.headers.get("content-type") || "";
      const parsed = contentType.includes("application/json")
        ? await response.json().catch(() => undefined)
        : await response.text().catch(() => undefined);

      if (!response.ok) {
        if (response.status === 401 && auth) {
          clearToken();
          unauthorizedListener?.();
        }
        const message = extractErrorMessage(parsed, `Request failed (${response.status})`);
        throw new ApiError(message, response.status, parsed);
      }

      return parsed as T;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      // Don't retry on HTTP errors (4xx/5xx already handled above) or aborts
      if (err instanceof ApiError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt === retries) {
          throw new ApiError("Request timed out. Please check your connection and try again.", 0);
        }
      }
      // Network-level failure — retry with backoff
      if (attempt < retries) {
        await sleep(400 * (attempt + 1));
        continue;
      }
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  throw new ApiError(
    "Could not reach the server. Please check your connection and try again.",
    0,
    lastError,
  );
}

/* ------------------------------------------------------------------ */
/* Types mirroring backend Pydantic schemas                           */
/* ------------------------------------------------------------------ */

export type PlanType = "creator" | "professional" | "studio";

export interface User {
  id: number;
  name: string;
  email: string;
  plan_type: PlanType;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export type ScriptStatus = "uploaded" | "processing" | "completed" | "failed";

export interface Script {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: ScriptStatus;
  pipeline_stage: string | null;
  error_message: string | null;
  created_at: string;
}

export interface Scene {
  id: number;
  script_id: number;
  scene_number: number;
  heading: string | null;
  location: string | null;
  time_of_day: string | null;
  action_lines: string | null;
  importance_score: number | null;
  importance_category: string | null;
}

export interface DashboardSummary {
  user_id: number;
  user_name: string;
  plan_type: PlanType;
  stats: {
    total_scripts: number;
    completed_scripts: number;
    total_scenes: number;
    total_characters: number;
    total_dialogues: number;
  };
  recent_scripts: Array<{
    id: number;
    title: string;
    status: ScriptStatus;
    pipeline_stage: string | null;
    created_at: string;
  }>;
}

export interface OverallStats {
  total_users: number;
  total_scripts: number;
  total_scenes: number;
  total_characters: number;
}

export interface EmotionScore {
  scene_number: number;
  joy: number;
  fear: number;
  sadness: number;
  anger: number;
  tension: number;
}

export interface EmotionAnalysisResponse {
  script_id: number;
  emotions: EmotionScore[];
}

export interface DialogueData {
  character_name: string;
  word_count: number;
  dialogue_percentage: number;
  scene_count: number;
}

export interface DialogueAnalysisResponse {
  script_id: number;
  total_words: number;
  dialogues: DialogueData[];
}

export interface ShotSuggestion {
  scene_number: number;
  scene_heading: string;
  emotion: string;
  suggested_shots: string[];
}

export interface ShotSuggestionsResponse {
  script_id: number;
  suggestions: ShotSuggestion[];
}

export interface BGMRecommendation {
  scene_number: number;
  scene_heading: string;
  mood: string;
  recommended_music: string[];
}

export interface BGMResponse {
  script_id: number;
  recommendations: BGMRecommendation[];
}

export interface SceneImportance {
  scene_number: number;
  scene_heading: string;
  importance_score: number;
  category: string;
}

export interface SceneImportanceResponse {
  script_id: number;
  scenes: SceneImportance[];
}

export interface CostEstimationResponse {
  script_id: number;
  total_scenes: number;
  total_locations: number;
  total_characters: number;
  vfx_complexity: string;
  shooting_difficulty: string;
  budget_risk_score: number;
  estimated_budget_range: string;
}

/* ---- Character tracking ---- */

export interface TrackedCharacter {
  name: string;
  scene_count: number;
  speaking_scene_count: number;
  detected_via: string[];
}

export interface CharacterTrackingResponse {
  script_id: number;
  total_characters: number;
  characters: TrackedCharacter[];
}

/* ---- Storyboard ---- */

export interface StoryboardPanel {
  panel_number: number;
  scene_number: number;
  scene_heading: string;
  shot_type: string;
  camera_angle: string;
  composition_notes: string;
  key_visual_elements: string | null;
  mood_lighting: string | null;
}

export interface StoryboardResponse {
  script_id: number;
  panels: StoryboardPanel[];
}

/* ---- Unified per-script dashboard (Overview / Analysis / Recommendations / Storyboard) ---- */

export interface DashboardOverview {
  script_id: number;
  title: string;
  status: ScriptStatus;
  pipeline_stage: string | null;
  total_scenes: number;
  total_characters: number;
  total_words_of_dialogue: number;
  cost_estimation: CostEstimationResponse | null;
  top_scenes: SceneImportance[];
}

export interface DashboardAnalysisTab {
  emotion: EmotionAnalysisResponse | null;
  dialogue: DialogueAnalysisResponse | null;
  character_tracking: CharacterTrackingResponse | null;
  scene_importance: SceneImportanceResponse | null;
}

export interface DashboardRecommendationsTab {
  shot_suggestions: ShotSuggestionsResponse | null;
  bgm_recommendations: BGMResponse | null;
  cost_estimation: CostEstimationResponse | null;
}

export interface UnifiedScriptDashboard {
  script_id: number;
  status: ScriptStatus;
  pipeline_stage: string | null;
  error_message: string | null;
  overview: DashboardOverview | null;
  analysis: DashboardAnalysisTab | null;
  recommendations: DashboardRecommendationsTab | null;
  storyboard: StoryboardResponse | null;
}

export interface PlanLimitResponse {
  user_id: number;
  plan_type: PlanType;
  scripts_uploaded: number;
  can_upload: boolean;
  message: string;
}

export interface PlanInfo {
  name: string;
  plan_type: PlanType;
  price: string;
  features: string[];
}

/* ------------------------------------------------------------------ */
/* API surface                                                        */
/* ------------------------------------------------------------------ */

export const api = {
  auth: {
    signup(data: { name: string; email: string; password: string; plan_type?: PlanType }) {
      return request<User>("/auth/signup", { method: "POST", body: data, auth: false, retries: 0 });
    },
    /** Backend expects OAuth2 form-encoded credentials (username = email). */
    login(data: { email: string; password: string }) {
      const params = new URLSearchParams();
      params.set("username", data.email);
      params.set("password", data.password);
      return request<AuthResponse>("/auth/login", {
        method: "POST",
        auth: false,
        retries: 0,
        urlencoded: params,
      });
    },
    me() {
      return request<User>("/auth/me");
    },
  },

  scripts: {
    upload(data: { title: string; description?: string; user_id: number; file: File }) {
      const form = new FormData();
      form.set("title", data.title);
      if (data.description) form.set("description", data.description);
      form.set("user_id", String(data.user_id));
      form.set("file", data.file);
      return request<Script>("/scripts/upload", { method: "POST", form, retries: 0 });
    },
    get(scriptId: number) {
      return request<Script>(`/scripts/${scriptId}`);
    },
    scenes(scriptId: number) {
      return request<Scene[]>(`/scripts/${scriptId}/scenes`);
    },
    forUser(userId: number) {
      return request<Script[]>(`/scripts/user/${userId}`);
    },
    /**
     * The single call that powers the unified per-script dashboard
     * (Overview / Analysis / Recommendations / Storyboard tabs). The
     * backend runs the entire AI pipeline automatically right after
     * upload, so this just reads back whatever's ready so far — poll it
     * while `pipeline_stage` is non-null and `status` isn't yet
     * "completed".
     */
    dashboard(scriptId: number) {
      return request<UnifiedScriptDashboard>(`/scripts/${scriptId}/dashboard`);
    },
  },

  dashboard: {
    summary(userId: number) {
      return request<DashboardSummary>(`/dashboard/summary/${userId}`);
    },
    stats() {
      return request<OverallStats>("/dashboard/stats");
    },
  },

  analysis: {
    emotion(scriptId: number) {
      return request<EmotionAnalysisResponse>(`/analysis/${scriptId}/emotion`);
    },
    dialogue(scriptId: number) {
      return request<DialogueAnalysisResponse>(`/analysis/${scriptId}/dialogue`);
    },
    shots(scriptId: number) {
      return request<ShotSuggestionsResponse>(`/analysis/${scriptId}/shots`);
    },
    bgm(scriptId: number) {
      return request<BGMResponse>(`/analysis/${scriptId}/bgm`);
    },
    sceneImportance(scriptId: number) {
      return request<SceneImportanceResponse>(`/analysis/${scriptId}/scene-importance`);
    },
    costEstimation(scriptId: number) {
      return request<CostEstimationResponse>(`/analysis/${scriptId}/cost-estimation`);
    },
    characters(scriptId: number) {
      return request<CharacterTrackingResponse>(`/analysis/${scriptId}/characters`);
    },
    storyboard(scriptId: number) {
      return request<StoryboardResponse>(`/analysis/${scriptId}/storyboard`);
    },
  },

  payments: {
    plans() {
      return request<{ plans: PlanInfo[] }>("/payments/plans", { auth: false });
    },
    checkLimit(userId: number) {
      return request<PlanLimitResponse>(`/payments/check-limit/${userId}`);
    },
  },
};
