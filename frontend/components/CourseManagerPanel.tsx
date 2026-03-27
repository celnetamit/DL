"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addLesson,
  addModule,
  apiFetch,
  createCourse,
  deleteCourse,
  deleteLesson,
  deleteModule,
  fetchCourses,
  generateMaterial,
  reviewLesson,
  updateCourse,
  updateLesson,
  updateModule,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Toast from "@/components/Toast";

type Product = {
  id: string;
  name: string;
  tier: string;
  status: string;
};

type Lesson = {
  id: string;
  title: string;
  content_type?: string;
  status?: string;
  source_url?: string | null;
  content_url?: string | null;
  duration_seconds?: number;
  sort_order?: number;
  metadata?: {
    summary?: string;
    key_points?: string[];
    ai_provider?: string;
    ai_model?: string;
    generated_at?: string;
    generated_by_ai?: boolean;
    review_status?: string;
    reviewed_at?: string;
    reviewed_by?: string;
  };
};

type Module = {
  id: string;
  title: string;
  status?: string;
  sort_order?: number;
  lessons?: Lesson[];
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  domain: string;
  subdomain?: string | null;
  level: string;
  status: string;
  product_id?: string | null;
  modules?: Module[];
};

const EMPTY_COURSE_FORM = {
  title: "",
  description: "",
  domain: "General",
  subdomain: "",
  level: "beginner",
  status: "draft",
  product_id: "",
};

const EMPTY_MODULE_FORM = {
  title: "",
  status: "draft",
  sort_order: "0",
};

const EMPTY_LESSON_FORM = {
  title: "",
  content_type: "Videos",
  status: "draft",
  content_url: "",
  duration_seconds: "0",
  sort_order: "0",
};

const EMPTY_AI_FORM = {
  title: "",
  url: "",
  text: "",
};

function getLessonUrl(lesson: Lesson) {
  return lesson.content_url || lesson.source_url || "";
}

function isVideoLesson(lesson: Lesson) {
  return (lesson.content_type || "").toLowerCase().includes("video");
}

function canPublishCourse(courseForm: typeof EMPTY_COURSE_FORM) {
  return Boolean(courseForm.product_id);
}

function canPublishLesson(form: typeof EMPTY_LESSON_FORM) {
  const hasTitle = Boolean(form.title.trim());
  const isArticle = form.content_type.trim() === "Article";
  return hasTitle && (isArticle || Boolean(form.content_url.trim()));
}

export default function CourseManagerPanel() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE_FORM);
  const [moduleForms, setModuleForms] = useState<Record<string, typeof EMPTY_MODULE_FORM>>({});
  const [lessonForms, setLessonForms] = useState<Record<string, typeof EMPTY_LESSON_FORM>>({});
  const [aiForms, setAiForms] = useState<Record<string, typeof EMPTY_AI_FORM>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || null,
    [courses, selectedCourseId],
  );

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [courseData, productData] = await Promise.all([
        fetchCourses(token),
        apiFetch<Product[]>("/api/v1/products", { cache: "no-store" }),
      ]);
      const nextCourses = courseData || [];
      setCourses(nextCourses);
      setProducts((productData || []).filter((product) => product.status !== "archived"));
      setSelectedCourseId((current) => {
        if (current && nextCourses.some((course) => course.id === current)) {
          return current;
        }
        return nextCourses[0]?.id || null;
      });
    } catch (error: any) {
      setToast({ message: error.message || "Unable to load courses right now.", tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const resetCourseForm = () => {
    setEditingId(null);
    setCourseForm(EMPTY_COURSE_FORM);
  };

  const refreshCourses = async (message?: string) => {
    await loadData();
    if (message) {
      setToast({ message, tone: "success" });
    }
  };

  const handleSaveCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    const payload = {
      title: courseForm.title.trim(),
      description: courseForm.description.trim() || undefined,
      domain: courseForm.domain.trim() || undefined,
      subdomain: courseForm.subdomain.trim() || undefined,
      level: courseForm.level,
      status: courseForm.status,
      product_id: courseForm.product_id || undefined,
    };

    try {
      if (editingId) {
        await updateCourse(editingId, { ...payload, product_id: courseForm.product_id || null }, token);
        await refreshCourses("Course updated successfully.");
      } else {
        await createCourse(payload, token);
        await refreshCourses("Course created successfully.");
      }
      resetCourseForm();
    } catch (error: any) {
      setToast({ message: error.message || "Unable to save this course.", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingId(course.id);
    setSelectedCourseId(course.id);
    setCourseForm({
      title: course.title || "",
      description: course.description || "",
      domain: course.domain || "General",
      subdomain: course.subdomain || "",
      level: course.level || "beginner",
      status: course.status || "draft",
      product_id: course.product_id || "",
    });
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!token) return;
    try {
      await deleteCourse(courseId, token);
      await loadData();
      if (editingId === courseId) {
        resetCourseForm();
      }
      setPendingDeleteId(null);
      setToast({ message: "Course deleted successfully.", tone: "success" });
    } catch (error: any) {
      setToast({ message: error.message || "Unable to delete this course.", tone: "error" });
    }
  };

  const handleModuleChange = (moduleId: string, field: keyof typeof EMPTY_MODULE_FORM, value: string) => {
    setModuleForms((current) => ({
      ...current,
      [moduleId]: {
        ...(current[moduleId] || {
          title: "",
          status: "draft",
          sort_order: "0",
        }),
        [field]: value,
      },
    }));
  };

  const handleLessonChange = (lessonId: string, field: keyof typeof EMPTY_LESSON_FORM, value: string) => {
    setLessonForms((current) => ({
      ...current,
      [lessonId]: {
        ...(current[lessonId] || {
          title: "",
          content_type: "Videos",
          status: "draft",
          content_url: "",
          duration_seconds: "0",
          sort_order: "0",
        }),
        [field]: value,
      },
    }));
  };

  const handleAiChange = (moduleId: string, field: keyof typeof EMPTY_AI_FORM, value: string) => {
    setAiForms((current) => ({
      ...current,
      [moduleId]: {
        ...(current[moduleId] || EMPTY_AI_FORM),
        [field]: value,
      },
    }));
  };

  const handleAddModule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedCourse) return;
    const form = moduleForms.__new__ || EMPTY_MODULE_FORM;
    setBusyKey("add-module");
    try {
      await addModule(
        selectedCourse.id,
        {
          title: form.title.trim(),
          status: form.status,
          sort_order: Number(form.sort_order || 0),
        },
        token,
      );
      setModuleForms((current) => ({ ...current, __new__: EMPTY_MODULE_FORM }));
      await refreshCourses("Module added successfully.");
    } catch (error: any) {
      setToast({ message: error.message || "Unable to add module.", tone: "error" });
    } finally {
      setBusyKey(null);
    }
  };

  const handleMoveModule = async (moduleIndex: number, direction: -1 | 1) => {
    if (!token || !selectedCourse) return;
    const modules = [...(selectedCourse.modules || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const targetIndex = moduleIndex + direction;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const reordered = [...modules];
    const [moved] = reordered.splice(moduleIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    setBusyKey("reorder-modules");
    try {
      await Promise.all(
        reordered.map((module, index) =>
          updateModule(
            module.id,
            {
              title: module.title,
              status: module.status,
              sort_order: index,
            },
            token,
          ),
        ),
      );
      await refreshCourses("Module order updated.");
    } catch (error: any) {
      setToast({ message: error.message || "Unable to reorder modules.", tone: "error" });
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveModule = async (module: Module) => {
    if (!token) return;
    const form = moduleForms[module.id];
    if (!form) return;
    setBusyKey(`module-${module.id}`);
    try {
      await updateModule(
        module.id,
        {
          title: form.title.trim() || undefined,
          status: form.status || undefined,
          sort_order: Number(form.sort_order || 0),
        },
        token,
      );
      await refreshCourses("Module updated successfully.");
    } catch (error: any) {
      setToast({ message: error.message || "Unable to update module.", tone: "error" });
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!token) return;
    setBusyKey(`delete-module-${moduleId}`);
    try {
      await deleteModule(moduleId, token);
      await refreshCourses("Module deleted successfully.");
    } catch (error: any) {
      setToast({ message: error.message || "Unable to delete module.", tone: "error" });
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddLesson = async (event: React.FormEvent, moduleId: string) => {
    event.preventDefault();
    if (!token) return;
    const form = lessonForms[`new:${moduleId}`] || EMPTY_LESSON_FORM;
    setBusyKey(`add-lesson-${moduleId}`);
    try {
      await addLesson(
        moduleId,
        {
          title: form.title.trim(),
          content_type: form.content_type,
          status: form.status,
          content_url: form.content_url.trim(),
          duration_seconds: Number(form.duration_seconds || 0),
          sort_order: Number(form.sort_order || 0),
        },
        token,
      );
      setLessonForms((current) => ({ ...current, [`new:${moduleId}`]: EMPTY_LESSON_FORM }));
      await refreshCourses("Lesson added successfully.");
    } catch (error: any) {
      setToast({ message: error.message || "Unable to add lesson.", tone: "error" });
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveLesson = async (lesson: Lesson) => {
    if (!token) return;
    const form = lessonForms[lesson.id];
    if (!form) return;
    if (form.status === "published" && !canPublishLesson(form)) {
      setToast({ message: "Published lessons require both a title and a content URL.", tone: "error" });
      return;
    }
    setBusyKey(`lesson-${lesson.id}`);
    try {
      await updateLesson(
        lesson.id,
        {
          title: form.title.trim() || undefined,
          content_type: form.content_type || undefined,
          status: form.status || undefined,
          content_url: form.content_url.trim() || undefined,
          duration_seconds: Number(form.duration_seconds || 0),
          sort_order: Number(form.sort_order || 0),
        },
        token,
      );
      await refreshCourses("Lesson updated successfully.");
    } catch (error: any) {
      setToast({ message: error.message || "Unable to update lesson.", tone: "error" });
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!token) return;
    setBusyKey(`delete-lesson-${lessonId}`);
    try {
      await deleteLesson(lessonId, token);
      await refreshCourses("Lesson deleted successfully.");
    } catch (error: any) {
      setToast({ message: error.message || "Unable to delete lesson.", tone: "error" });
    } finally {
      setBusyKey(null);
    }
  };

  const handleMoveLesson = async (module: Module, lessonIndex: number, direction: -1 | 1) => {
    if (!token) return;
    const lessons = [...(module.lessons || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const targetIndex = lessonIndex + direction;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const reordered = [...lessons];
    const [moved] = reordered.splice(lessonIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    setBusyKey(`reorder-lessons-${module.id}`);
    try {
      await Promise.all(
        reordered.map((lesson, index) =>
          updateLesson(
            lesson.id,
            {
              title: lesson.title,
              content_type: lesson.content_type,
              status: lesson.status,
              content_url: getLessonUrl(lesson) || undefined,
              duration_seconds: lesson.duration_seconds,
              sort_order: index,
            },
            token,
          ),
        ),
      );
      await refreshCourses("Lesson order updated.");
    } catch (error: any) {
      setToast({ message: error.message || "Unable to reorder lessons.", tone: "error" });
    } finally {
      setBusyKey(null);
    }
  };

  const handleGenerateLesson = async (moduleId: string) => {
    if (!token || !selectedCourse) return;
    const form = aiForms[moduleId] || EMPTY_AI_FORM;
    setBusyKey(`ai-${moduleId}`);
    try {
      await generateMaterial(
        {
          course_id: selectedCourse.id,
          module_id: moduleId,
          title: form.title.trim() || undefined,
          url: form.url.trim() || undefined,
          text: form.text.trim() || undefined,
        },
        token,
      );
      setAiForms((current) => ({ ...current, [moduleId]: EMPTY_AI_FORM }));
      await refreshCourses("AI lesson generated as draft and queued for review.");
    } catch (error: any) {
      setToast({ message: error.message || "Unable to generate lesson.", tone: "error" });
    } finally {
      setBusyKey(null);
    }
  };

  const handleReviewLesson = async (lessonId: string, action: "approve" | "reject") => {
    if (!token) return;
    setBusyKey(`review-${lessonId}-${action}`);
    try {
      await reviewLesson(lessonId, { action }, token);
      await refreshCourses(action === "approve" ? "AI lesson approved and published." : "AI lesson rejected and returned to draft.");
    } catch (error: any) {
      setToast({ message: error.message || "Unable to update lesson review.", tone: "error" });
    } finally {
      setBusyKey(null);
    }
  };

  useEffect(() => {
    if (!selectedCourse) return;

    const nextModuleForms: Record<string, typeof EMPTY_MODULE_FORM> = {};
    const nextLessonForms: Record<string, typeof EMPTY_LESSON_FORM> = {
      ...(lessonForms.__seed__ ? { __seed__: lessonForms.__seed__ } : {}),
    };
    const nextAiForms: Record<string, typeof EMPTY_AI_FORM> = {};

    (selectedCourse.modules || []).forEach((module) => {
      nextModuleForms[module.id] = {
        title: module.title || "",
        status: module.status || "draft",
        sort_order: String(module.sort_order || 0),
      };
      nextAiForms[module.id] = aiForms[module.id] || EMPTY_AI_FORM;
      nextLessonForms[`new:${module.id}`] = lessonForms[`new:${module.id}`] || EMPTY_LESSON_FORM;

      (module.lessons || []).forEach((lesson) => {
        nextLessonForms[lesson.id] = {
          title: lesson.title || "",
          content_type: lesson.content_type || "Videos",
          status: lesson.status || "draft",
          content_url: lesson.content_url || lesson.source_url || "",
          duration_seconds: String(lesson.duration_seconds || 0),
          sort_order: String(lesson.sort_order || 0),
        };
      });
    });

    nextModuleForms.__new__ = moduleForms.__new__ || EMPTY_MODULE_FORM;
    setModuleForms(nextModuleForms);
    setLessonForms(nextLessonForms);
    setAiForms(nextAiForms);
  }, [selectedCourse]);

  if (loading) {
    return <p className="p-6 text-dune/60">Loading courses...</p>;
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass rounded-2xl p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-[var(--font-space)] text-xl">Course Catalog</h3>
              <p className="mt-1 text-xs text-dune/50">
                Link courses to products so access rules can be enforced from real purchases and subscriptions.
              </p>
            </div>
            <span className="text-xs text-dune/50">{courses.length} courses</span>
          </div>

          <div className="space-y-3">
            {courses.map((course) => {
              const linkedProduct = course.product_id ? productById.get(course.product_id) : null;
              const moduleCount = course.modules?.length || 0;
              const isSelected = selectedCourseId === course.id;
              return (
                <div
                  key={course.id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    isSelected ? "border-ember/40 bg-ember/5" : "border-dune/10 bg-midnight/30"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedCourseId(course.id)}
                        className="text-left text-lg font-semibold text-dune hover:text-ember"
                      >
                        {course.title}
                      </button>
                      <p className="mt-1 text-xs uppercase tracking-widest text-dune/45">
                        {course.domain}{course.subdomain ? ` • ${course.subdomain}` : ""} • {course.level}
                      </p>
                    </div>
                    <span className="rounded-full border border-dune/20 px-3 py-1 text-[10px] uppercase tracking-widest text-dune/60">
                      {course.status}
                    </span>
                  </div>

                  {course.description && <p className="mt-3 text-sm text-dune/70">{course.description}</p>}

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-dune/55">
                    <span>{moduleCount} modules</span>
                    <span>
                      Access: {linkedProduct ? `linked to ${linkedProduct.name}` : "open to signed-in users"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditCourse(course)}
                      className="rounded-full border border-dune/20 px-3 py-1 text-xs hover:border-dune/40"
                    >
                      Edit
                    </button>
                    {pendingDeleteId === course.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(course.id)}
                          className="rounded-full border border-ember/40 px-3 py-1 text-xs text-ember hover:bg-ember/10"
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="rounded-full border border-dune/20 px-3 py-1 text-xs"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(course.id)}
                        className="rounded-full border border-ember/40 px-3 py-1 text-xs text-ember hover:bg-ember/10"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {courses.length === 0 && <p className="text-sm text-dune/60">No courses created yet.</p>}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-[var(--font-space)] text-xl">{editingId ? "Edit Course" : "New Course"}</h3>
          <p className="mt-1 text-xs text-dune/50">
            Linking a product enables backend entitlement checks for the course detail page.
          </p>

          <form onSubmit={handleSaveCourse} className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-widest text-dune/50">Title</span>
              <input
                required
                value={courseForm.title}
                onChange={(event) => setCourseForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-widest text-dune/50">Description</span>
              <textarea
                value={courseForm.description}
                onChange={(event) => setCourseForm((current) => ({ ...current, description: event.target.value }))}
                className="h-24 w-full rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-widest text-dune/50">Domain</span>
                <input
                  value={courseForm.domain}
                  onChange={(event) => setCourseForm((current) => ({ ...current, domain: event.target.value }))}
                  className="w-full rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-widest text-dune/50">Subdomain</span>
                <input
                  value={courseForm.subdomain}
                  onChange={(event) => setCourseForm((current) => ({ ...current, subdomain: event.target.value }))}
                  className="w-full rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-widest text-dune/50">Level</span>
                <select
                  value={courseForm.level}
                  onChange={(event) => setCourseForm((current) => ({ ...current, level: event.target.value }))}
                  className="w-full rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-widest text-dune/50">Status</span>
                <select
                  value={courseForm.status}
                  onChange={(event) => {
                    const nextStatus = event.target.value;
                    if (nextStatus === "published" && !canPublishCourse(courseForm)) {
                      setToast({ message: "Published courses must be linked to a product first.", tone: "error" });
                      return;
                    }
                    setCourseForm((current) => ({ ...current, status: nextStatus }));
                  }}
                  className="w-full rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-widest text-dune/50">Linked Product</span>
              <select
                value={courseForm.product_id}
                onChange={(event) => setCourseForm((current) => ({ ...current, product_id: event.target.value }))}
                className="w-full rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
              >
                <option value="">No linked product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.tier})
                  </option>
                ))}
              </select>
            </label>

            {courseForm.product_id && productById.get(courseForm.product_id) && (
              <div className="rounded-xl border border-ember/20 bg-ember/5 p-3 text-xs text-dune/70">
                Learners will need an active purchase or subscription for{" "}
                <span className="text-dune">{productById.get(courseForm.product_id)?.name}</span> to open this course.
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-ember px-5 py-2.5 text-sm font-semibold text-midnight disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Course"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetCourseForm}
                  className="rounded-xl border border-dune/20 px-5 py-2.5 text-sm text-dune/70"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-[var(--font-space)] text-xl">Curriculum Builder</h3>
            <p className="mt-1 text-xs text-dune/50">
              Add modules, add lessons, and generate draft learning material directly inside the selected course.
            </p>
          </div>
          {selectedCourse ? (
            <div className="text-right text-xs text-dune/55">
              <p>Selected course</p>
              <p className="mt-1 text-sm text-dune">{selectedCourse.title}</p>
            </div>
          ) : null}
        </div>

        {!selectedCourse ? (
          <p className="mt-6 text-sm text-dune/60">Select a course from the catalog to manage its modules and lessons.</p>
        ) : (
          <div className="mt-6 space-y-6">
            <form onSubmit={handleAddModule} className="rounded-2xl border border-dune/10 bg-midnight/30 p-4">
              <p className="text-xs uppercase tracking-widest text-ember">Add Module</p>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_120px_auto]">
                <input
                  required
                  value={moduleForms.__new__?.title || ""}
                  onChange={(event) => handleModuleChange("__new__", "title", event.target.value)}
                  placeholder="Module title"
                  className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                />
                <select
                  value={moduleForms.__new__?.status || "draft"}
                  onChange={(event) => handleModuleChange("__new__", "status", event.target.value)}
                  className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
                <input
                  value={moduleForms.__new__?.sort_order || "0"}
                  onChange={(event) => handleModuleChange("__new__", "sort_order", event.target.value)}
                  placeholder="Sort"
                  className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                />
                <button
                  type="submit"
                  disabled={busyKey === "add-module"}
                  className="rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-midnight disabled:opacity-60"
                >
                  {busyKey === "add-module" ? "Adding..." : "Add Module"}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {(selectedCourse.modules || []).map((module, index) => (
                <div key={module.id} className="rounded-2xl border border-dune/10 bg-midnight/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-dune/45">Module {index + 1}</p>
                        <h4 className="mt-1 font-[var(--font-space)] text-lg">{module.title}</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleMoveModule(index, -1)}
                          disabled={index === 0 || busyKey === "reorder-modules"}
                          className="rounded-full border border-dune/20 px-3 py-1 text-xs text-dune/70 disabled:opacity-40"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveModule(index, 1)}
                          disabled={index === (selectedCourse.modules || []).length - 1 || busyKey === "reorder-modules"}
                          className="rounded-full border border-dune/20 px-3 py-1 text-xs text-dune/70 disabled:opacity-40"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteModule(module.id)}
                          disabled={busyKey === `delete-module-${module.id}`}
                          className="rounded-full border border-ember/40 px-3 py-1 text-xs text-ember hover:bg-ember/10 disabled:opacity-60"
                        >
                          {busyKey === `delete-module-${module.id}` ? "Deleting..." : "Delete Module"}
                        </button>
                      </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_120px_auto]">
                    <input
                      value={moduleForms[module.id]?.title || ""}
                      onChange={(event) => handleModuleChange(module.id, "title", event.target.value)}
                      className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                    />
                    <select
                      value={moduleForms[module.id]?.status || "draft"}
                      onChange={(event) => handleModuleChange(module.id, "status", event.target.value)}
                      className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                    <input
                      value={moduleForms[module.id]?.sort_order || "0"}
                      onChange={(event) => handleModuleChange(module.id, "sort_order", event.target.value)}
                      className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveModule(module)}
                      disabled={busyKey === `module-${module.id}`}
                      className="rounded-xl border border-dune/20 px-4 py-2 text-sm text-dune/80 disabled:opacity-60"
                    >
                      {busyKey === `module-${module.id}` ? "Saving..." : "Save Module"}
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl border border-ember/15 bg-ember/5 p-4">
                    <p className="text-xs uppercase tracking-widest text-ember">AI Lesson Generation</p>
                    <div className="mt-3 grid gap-3">
                      <input
                        value={aiForms[module.id]?.title || ""}
                        onChange={(event) => handleAiChange(module.id, "title", event.target.value)}
                        placeholder="Requested lesson title"
                        className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                      />
                      <input
                        value={aiForms[module.id]?.url || ""}
                        onChange={(event) => handleAiChange(module.id, "url", event.target.value)}
                        placeholder="Source URL"
                        className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                      />
                      <textarea
                        value={aiForms[module.id]?.text || ""}
                        onChange={(event) => handleAiChange(module.id, "text", event.target.value)}
                        placeholder="Or paste source text directly"
                        className="h-24 rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                      />
                      <button
                        type="button"
                        onClick={() => handleGenerateLesson(module.id)}
                        disabled={busyKey === `ai-${module.id}`}
                        className="w-fit rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-midnight disabled:opacity-60"
                      >
                        {busyKey === `ai-${module.id}` ? "Generating..." : "Generate Lesson"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {(module.lessons || []).map((lesson, lessonIndex) => {
                      const lessonUrl = getLessonUrl(lesson);
                      const hasAIMetadata =
                        !!lesson.metadata?.summary ||
                        (Array.isArray(lesson.metadata?.key_points) && lesson.metadata.key_points.length > 0);
                      const reviewStatus = lesson.metadata?.review_status || (hasAIMetadata ? "pending_review" : "");
                      return (
                      <div key={lesson.id} className="rounded-2xl border border-dune/10 bg-midnight/40 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-dune/45">Lesson {lessonIndex + 1}</p>
                            <p className="mt-1 text-sm text-dune/75">{lesson.title}</p>
                            {hasAIMetadata && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-[10px] uppercase tracking-widest text-sky-300">
                                  AI Draft
                                </span>
                                <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-widest ${
                                  reviewStatus === "approved"
                                    ? "border border-moss/30 bg-moss/10 text-moss"
                                    : reviewStatus === "rejected"
                                      ? "border border-ember/30 bg-ember/10 text-ember"
                                      : "border border-amber-400/30 bg-amber-400/10 text-amber-200"
                                }`}>
                                  {reviewStatus === "approved" ? "Reviewed" : reviewStatus === "rejected" ? "Rejected" : "Pending Review"}
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            disabled={busyKey === `delete-lesson-${lesson.id}`}
                            className="rounded-full border border-ember/40 px-3 py-1 text-xs text-ember hover:bg-ember/10 disabled:opacity-60"
                          >
                            {busyKey === `delete-lesson-${lesson.id}` ? "Deleting..." : "Delete Lesson"}
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <input
                            value={lessonForms[lesson.id]?.title || ""}
                            onChange={(event) => handleLessonChange(lesson.id, "title", event.target.value)}
                            className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                          />
                          <input
                            value={lessonForms[lesson.id]?.content_url || ""}
                            onChange={(event) => handleLessonChange(lesson.id, "content_url", event.target.value)}
                            placeholder="Content URL"
                            className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                          />
                          <select
                            value={lessonForms[lesson.id]?.content_type || "Videos"}
                            onChange={(event) => handleLessonChange(lesson.id, "content_type", event.target.value)}
                            className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                          >
                            <option value="Article">Article</option>
                            <option value="Videos">Videos</option>
                            <option value="E-Book">E-Book</option>
                            <option value="Thesis">Thesis</option>
                            <option value="Journals">Journals</option>
                            <option value="Conference">Conference</option>
                            <option value="Casestudies">Casestudies</option>
                            <option value="E-Newspaper">E-Newspaper</option>
                          </select>
                          <select
                            value={lessonForms[lesson.id]?.status || "draft"}
                            onChange={(event) => {
                              const nextStatus = event.target.value;
                              const nextForm = {
                                ...(lessonForms[lesson.id] || EMPTY_LESSON_FORM),
                                status: nextStatus,
                              };
                              if (nextStatus === "published" && !canPublishLesson(nextForm)) {
                                setToast({ message: "Published lessons require a title and content URL.", tone: "error" });
                                return;
                              }
                              handleLessonChange(lesson.id, "status", nextStatus);
                            }}
                            className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                          >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                          </select>
                          <input
                            value={lessonForms[lesson.id]?.duration_seconds || "0"}
                            onChange={(event) => handleLessonChange(lesson.id, "duration_seconds", event.target.value)}
                            placeholder="Duration seconds"
                            className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                          />
                          <input
                            value={lessonForms[lesson.id]?.sort_order || "0"}
                            onChange={(event) => handleLessonChange(lesson.id, "sort_order", event.target.value)}
                            placeholder="Sort order"
                            className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {hasAIMetadata && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReviewLesson(lesson.id, "approve")}
                                disabled={busyKey === `review-${lesson.id}-approve`}
                                className="rounded-xl border border-moss/30 px-4 py-2 text-sm text-moss disabled:opacity-60"
                              >
                                {busyKey === `review-${lesson.id}-approve` ? "Approving..." : "Approve & Publish"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewLesson(lesson.id, "reject")}
                                disabled={busyKey === `review-${lesson.id}-reject`}
                                className="rounded-xl border border-ember/30 px-4 py-2 text-sm text-ember disabled:opacity-60"
                              >
                                {busyKey === `review-${lesson.id}-reject` ? "Rejecting..." : "Reject to Draft"}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleMoveLesson(module, lessonIndex, -1)}
                            disabled={lessonIndex === 0 || busyKey === `reorder-lessons-${module.id}`}
                            className="rounded-xl border border-dune/20 px-4 py-2 text-sm text-dune/80 disabled:opacity-40"
                          >
                            Move Up
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveLesson(module, lessonIndex, 1)}
                            disabled={lessonIndex === (module.lessons || []).length - 1 || busyKey === `reorder-lessons-${module.id}`}
                            className="rounded-xl border border-dune/20 px-4 py-2 text-sm text-dune/80 disabled:opacity-40"
                          >
                            Move Down
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveLesson(lesson)}
                            disabled={busyKey === `lesson-${lesson.id}`}
                            className="rounded-xl border border-dune/20 px-4 py-2 text-sm text-dune/80 disabled:opacity-60"
                          >
                            {busyKey === `lesson-${lesson.id}` ? "Saving..." : "Save Lesson"}
                          </button>
                          {lessonUrl && (
                            <a
                              href={lessonUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-ember/30 px-4 py-2 text-sm text-ember hover:bg-ember/10"
                            >
                              Open Source
                            </a>
                          )}
                        </div>

                        {lessonUrl && (
                          <div className="mt-4 rounded-2xl border border-dune/10 bg-midnight/50 p-3">
                            <p className="text-[10px] uppercase tracking-widest text-dune/45">Inline Preview</p>
                            {isVideoLesson(lesson) ? (
                              <video
                                controls
                                preload="metadata"
                                className="mt-3 w-full rounded-xl border border-dune/10 bg-black/40"
                                src={lessonUrl}
                              />
                            ) : (
                              <iframe
                                src={lessonUrl}
                                title={`Preview ${lesson.title}`}
                                className="mt-3 h-64 w-full rounded-xl border border-dune/10 bg-white"
                              />
                            )}
                          </div>
                        )}

                        {hasAIMetadata && (
                          <div className="mt-4 rounded-2xl border border-ember/15 bg-ember/5 p-4">
                            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-ember/80">
                              <span>AI metadata</span>
                              {lesson.metadata?.ai_provider && <span>{lesson.metadata.ai_provider}</span>}
                              {lesson.metadata?.ai_model && <span>{lesson.metadata.ai_model}</span>}
                              {lesson.metadata?.generated_at && <span>{lesson.metadata.generated_at}</span>}
                            </div>
                            {lesson.metadata?.summary && (
                              <div className="mt-3">
                                <p className="text-[10px] uppercase tracking-widest text-ember">Summary</p>
                                <p className="mt-2 text-sm leading-relaxed text-dune/80">{lesson.metadata.summary}</p>
                              </div>
                            )}
                            {Array.isArray(lesson.metadata?.key_points) && lesson.metadata.key_points.length > 0 && (
                              <div className="mt-3">
                                <p className="text-[10px] uppercase tracking-widest text-ember">Key Points</p>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-dune/80">
                                  {lesson.metadata.key_points.map((point, pointIndex) => (
                                    <li key={`${lesson.id}-key-point-${pointIndex}`}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )})}

                    <form onSubmit={(event) => handleAddLesson(event, module.id)} className="rounded-2xl border border-dune/10 bg-midnight/40 p-4">
                      <p className="text-xs uppercase tracking-widest text-dune/50">Add Lesson</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <input
                          required
                          value={lessonForms[`new:${module.id}`]?.title || ""}
                          onChange={(event) => handleLessonChange(`new:${module.id}`, "title", event.target.value)}
                          placeholder="Lesson title"
                          className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                        />
                        <input
                          required
                          value={lessonForms[`new:${module.id}`]?.content_url || ""}
                          onChange={(event) => handleLessonChange(`new:${module.id}`, "content_url", event.target.value)}
                          placeholder="Content URL"
                          className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                        />
                        <select
                          value={lessonForms[`new:${module.id}`]?.content_type || "Videos"}
                          onChange={(event) => handleLessonChange(`new:${module.id}`, "content_type", event.target.value)}
                          className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                        >
                          <option value="Videos">Videos</option>
                          <option value="E-Book">E-Book</option>
                          <option value="Thesis">Thesis</option>
                          <option value="Journals">Journals</option>
                          <option value="Conference">Conference</option>
                          <option value="Casestudies">Casestudies</option>
                          <option value="E-Newspaper">E-Newspaper</option>
                        </select>
                        <select
                          value={lessonForms[`new:${module.id}`]?.status || "draft"}
                          onChange={(event) => {
                            const nextStatus = event.target.value;
                            const nextForm = {
                              ...(lessonForms[`new:${module.id}`] || EMPTY_LESSON_FORM),
                              status: nextStatus,
                            };
                            if (nextStatus === "published" && !canPublishLesson(nextForm)) {
                              setToast({ message: "Published lessons require a title and content URL.", tone: "error" });
                              return;
                            }
                            handleLessonChange(`new:${module.id}`, "status", nextStatus);
                          }}
                          className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                        </select>
                        <input
                          value={lessonForms[`new:${module.id}`]?.duration_seconds || "0"}
                          onChange={(event) => handleLessonChange(`new:${module.id}`, "duration_seconds", event.target.value)}
                          placeholder="Duration seconds"
                          className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                        />
                        <input
                          value={lessonForms[`new:${module.id}`]?.sort_order || "0"}
                          onChange={(event) => handleLessonChange(`new:${module.id}`, "sort_order", event.target.value)}
                          placeholder="Sort order"
                          className="rounded-xl border border-dune/20 bg-midnight px-3 py-2 text-sm text-dune"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={busyKey === `add-lesson-${module.id}`}
                        className="mt-4 rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-midnight disabled:opacity-60"
                      >
                        {busyKey === `add-lesson-${module.id}` ? "Adding..." : "Add Lesson"}
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              {(selectedCourse.modules || []).length === 0 && (
                <p className="text-sm text-dune/60">No modules yet. Add your first module to start building the course.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
