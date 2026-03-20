const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const aiBase = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8000";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

function buildApiUrl(path: string) {
  const base = apiBase.replace(/\/+$/, "");
  let nextPath = path;
  if (nextPath.startsWith("/api/v1") && base.endsWith("/api/v1")) {
    nextPath = nextPath.replace("/api/v1", "");
  }
  return `${base}${nextPath}`;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(buildApiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const raw = await res.text();
  let payload: ApiResponse<T>;
  try {
    payload = JSON.parse(raw) as ApiResponse<T>;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        payload = JSON.parse(raw.slice(start, end + 1)) as ApiResponse<T>;
      } catch {
        throw new Error(raw.trim() || "Invalid server response");
      }
    } else {
      throw new Error(raw.trim() || "Invalid server response");
    }
  }
  if (!res.ok || !payload.success) {
    throw new Error(payload.message || "Request failed");
  }
  return payload.data as T;
}

export async function fetchCourses(token?: string) {
  try {
    return await apiFetch<any[]>("/api/v1/courses", { cache: "no-store" }, token);
  } catch {
    return [];
  }
}

export async function getCourse(courseId: string, token?: string) {
  return apiFetch<any>(`/api/v1/courses/${courseId}`, { cache: "no-store" }, token);
}

export async function registerUser(payload: {
  email: string;
  password: string;
  full_name: string;
  role?: string;
  code?: string;
}) {
  return apiFetch<{ token: string; user: any }>(
    "/api/v1/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function loginUser(payload: { email: string; password: string }) {
  return apiFetch<{ token: string; user: any }>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function submitContactLead(payload: {
  full_name: string;
  email: string;
  phone?: string;
  institution_name?: string;
  subject: string;
  message: string;
}) {
  return apiFetch<{ lead_id: string; sync_status: string }>(
    "/api/v1/leads/contact",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function submitPurchaseLead(payload: {
  full_name: string;
  email: string;
  phone?: string;
  institution_name?: string;
  subject?: string;
  message?: string;
  product_id?: string;
  product_name?: string;
  plan_code?: string;
  amount?: number;
  currency?: string;
}) {
  return apiFetch<{ lead_id: string; sync_status: string }>(
    "/api/v1/leads/purchase-request",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function createCourse(
  payload: { title: string; description?: string; level?: string; domain?: string; subdomain?: string },
  token: string,
) {
  return apiFetch<any>(
    "/api/v1/courses",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function addModule(
  courseId: string,
  payload: { title: string; sort_order?: number },
  token: string,
) {
  return apiFetch<any>(
    `/api/v1/courses/${courseId}/modules`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function addLesson(
  moduleId: string,
  payload: {
    title: string;
    content_type?: string;
    content_url?: string;
    duration_seconds?: number;
    sort_order?: number;
  },
  token: string,
) {
  return apiFetch<any>(
    `/api/v1/modules/${moduleId}/lessons`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deleteCourse(courseId: string, token: string) {
  return apiFetch<any>(
    `/api/v1/courses/${courseId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function deleteModule(moduleId: string, token: string) {
  return apiFetch<any>(
    `/api/v1/modules/${moduleId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function deleteLesson(lessonId: string, token: string) {
  return apiFetch<any>(
    `/api/v1/lessons/${lessonId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function bulkDelete(payload: { courseIds?: string[]; moduleIds?: string[]; lessonIds?: string[] }, token: string) {
  const deletions: Promise<any>[] = [];
  (payload.courseIds || []).forEach((id) => deletions.push(deleteCourse(id, token)));
  (payload.moduleIds || []).forEach((id) => deletions.push(deleteModule(id, token)));
  (payload.lessonIds || []).forEach((id) => deletions.push(deleteLesson(id, token)));
  return Promise.allSettled(deletions);
}

export async function updateCourse(
  courseId: string,
  payload: { title?: string; description?: string; level?: string; status?: string; domain?: string; subdomain?: string },
  token: string,
) {
  return apiFetch<any>(
    `/api/v1/courses/${courseId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateModule(
  moduleId: string,
  payload: { title?: string; status?: string; sort_order?: number },
  token: string,
) {
  return apiFetch<any>(
    `/api/v1/modules/${moduleId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateLesson(
  lessonId: string,
  payload: {
    title?: string;
    content_type?: string;
    status?: string;
    content_url?: string;
    duration_seconds?: number;
    sort_order?: number;
  },
  token: string,
) {
  return apiFetch<any>(
    `/api/v1/lessons/${lessonId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateProgress(
  payload: { lesson_id: string; progress_percent: number; last_position_seconds?: number },
  token: string,
) {
  return apiFetch<any>(
    "/api/v1/progress",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function getUserProgress(token: string) {
  return apiFetch<any[]>("/api/v1/progress", { cache: "no-store" }, token);
}

export async function fetchContents(type?: string, token?: string) {
  const url = type ? `/api/v1/contents?type=${type}` : "/api/v1/contents";
  return apiFetch<any[]>(url, { cache: "no-store" }, token);
}

export async function createContent(payload: any, token: string) {
  return apiFetch<any>("/api/v1/contents", { method: "POST", body: JSON.stringify(payload) }, token);
}

export async function updateContent(contentId: string, payload: any, token: string) {
  return apiFetch<any>(`/api/v1/contents/${contentId}`, { method: "PUT", body: JSON.stringify(payload) }, token);
}

export async function deleteContent(contentId: string, token: string) {
  return apiFetch<any>(`/api/v1/contents/${contentId}`, { method: "DELETE" }, token);
}

export async function generateMaterial(payload: Record<string, unknown>, token: string) {
  return apiFetch<any>("/api/v1/ai/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function createOrder(payload: { plan_code: string; amount: number; currency?: string }, token: string) {
  return apiFetch<any>("/api/v1/subscriptions/create-order", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function verifyOrderPayment(payload: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}, token: string) {
  return apiFetch<any>("/api/v1/subscriptions/verify-order-payment", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function createSubscription(payload: { plan_id: string; total_count: number }, token: string) {
  return apiFetch<any>("/api/v1/subscriptions/create-subscription", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function getMySubscriptions(token: string) {
  return apiFetch<any[]>("/api/v1/subscriptions/me", {}, token);
}

export async function getMyPurchases(token: string) {
  return apiFetch<any[]>("/api/v1/subscriptions/purchases/me", { cache: "no-store" }, token);
}

export async function getMyPayments(token: string) {
  return apiFetch<any[]>("/api/v1/subscriptions/payments/me", { cache: "no-store" }, token);
}

export async function getAdminAnalytics(token: string, months = 6) {
  return apiFetch<any>(`/api/v1/analytics?months=${months}`, {}, token);
}

export async function getAIGenerationLogs(
  token: string,
  params: { status?: string; provider?: string; model?: string; limit?: number } = {},
) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.provider) query.set("provider", params.provider);
  if (params.model) query.set("model", params.model);
  if (params.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<any[]>(`/api/v1/ai/logs${suffix}`, { cache: "no-store" }, token);
}

export async function getLeadEvents(
  token: string,
  params: { status?: string; lead_type?: string } = {},
) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.lead_type) query.set("lead_type", params.lead_type);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<any[]>(`/api/v1/leads${suffix}`, { cache: "no-store" }, token);
}

export async function retryLeadEvent(leadId: string, token: string) {
  return apiFetch<any>(`/api/v1/leads/${leadId}/retry`, {
    method: "POST",
  }, token);
}

export async function getInstitutionOverview(institutionId: string, token: string) {
  return apiFetch<any>(`/api/v1/institutions/${institutionId}/overview`, { cache: "no-store" }, token);
}
