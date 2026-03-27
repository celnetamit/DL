import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import CourseManagerPanel from "@/components/CourseManagerPanel";

const mockUseAuth = vi.fn();
const mockFetchCourses = vi.fn();
const mockApiFetch = vi.fn();
const mockCreateCourse = vi.fn();
const mockDeleteCourse = vi.fn();
const mockAddModule = vi.fn();
const mockUpdateCourse = vi.fn();
const mockUpdateModule = vi.fn();
const mockDeleteModule = vi.fn();
const mockAddLesson = vi.fn();
const mockUpdateLesson = vi.fn();
const mockDeleteLesson = vi.fn();
const mockGenerateMaterial = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/api", () => ({
  fetchCourses: (...args: unknown[]) => mockFetchCourses(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  createCourse: (...args: unknown[]) => mockCreateCourse(...args),
  deleteCourse: (...args: unknown[]) => mockDeleteCourse(...args),
  addModule: (...args: unknown[]) => mockAddModule(...args),
  updateCourse: (...args: unknown[]) => mockUpdateCourse(...args),
  updateModule: (...args: unknown[]) => mockUpdateModule(...args),
  deleteModule: (...args: unknown[]) => mockDeleteModule(...args),
  addLesson: (...args: unknown[]) => mockAddLesson(...args),
  updateLesson: (...args: unknown[]) => mockUpdateLesson(...args),
  deleteLesson: (...args: unknown[]) => mockDeleteLesson(...args),
  generateMaterial: (...args: unknown[]) => mockGenerateMaterial(...args),
}));

const products = [
  { id: "product-1", name: "Premium Access", tier: "premium", status: "published" },
  { id: "product-2", name: "Archived Access", tier: "legacy", status: "archived" },
];

const courses = [
  {
    id: "course-1",
    title: "Research Methods",
    description: "Build your academic foundation",
    domain: "Library Science",
    subdomain: "Research",
    level: "intermediate",
    status: "draft",
    product_id: "product-1",
    modules: [
      {
        id: "module-1",
        title: "Core Methods",
        status: "draft",
        sort_order: 0,
        lessons: [
          {
            id: "lesson-1",
            title: "Finding Sources",
            content_type: "Videos",
            status: "draft",
            content_url: "https://example.com/video.mp4",
            duration_seconds: 120,
            sort_order: 0,
          },
          {
            id: "lesson-1b",
            title: "Database Navigation",
            content_type: "Videos",
            status: "published",
            content_url: "https://example.com/database-navigation.mp4",
            duration_seconds: 180,
            sort_order: 1,
          },
        ],
      },
      {
        id: "module-2",
        title: "Applied Practice",
        status: "draft",
        sort_order: 1,
        lessons: [
          {
            id: "lesson-2",
            title: "Annotated Bibliographies",
            content_type: "E-Book",
            status: "draft",
            content_url: "https://example.com/annotated-bibliographies.pdf",
            duration_seconds: 240,
            sort_order: 0,
          },
        ],
      },
    ],
  },
];

describe("CourseManagerPanel", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ token: "token" });
    mockFetchCourses.mockReset();
    mockApiFetch.mockReset();
    mockCreateCourse.mockReset();
    mockDeleteCourse.mockReset();
    mockAddModule.mockReset();
    mockUpdateCourse.mockReset();
    mockUpdateModule.mockReset();
    mockDeleteModule.mockReset();
    mockAddLesson.mockReset();
    mockUpdateLesson.mockReset();
    mockDeleteLesson.mockReset();
    mockGenerateMaterial.mockReset();

    mockFetchCourses.mockResolvedValue(courses);
    mockApiFetch.mockResolvedValue(products);
    mockCreateCourse.mockResolvedValue({});
    mockDeleteCourse.mockResolvedValue({});
    mockAddModule.mockResolvedValue({});
    mockUpdateCourse.mockResolvedValue({});
    mockUpdateModule.mockResolvedValue({});
    mockDeleteModule.mockResolvedValue({});
    mockAddLesson.mockResolvedValue({});
    mockUpdateLesson.mockResolvedValue({});
    mockDeleteLesson.mockResolvedValue({});
    mockGenerateMaterial.mockResolvedValue({});
  });

  it("loads existing courses and shows linked product messaging when editing", async () => {
    render(<CourseManagerPanel />);

    expect(await screen.findByRole("button", { name: "Research Methods" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Edit Course" })).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Research Methods")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Linked Product" })).toHaveValue("product-1");
    expect(screen.getByText(/learners will need an active purchase or subscription/i)).toBeInTheDocument();
  });

  it("blocks publishing a course until a linked product is selected", async () => {
    mockFetchCourses.mockResolvedValue([]);
    render(<CourseManagerPanel />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "New Course" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "New Course" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), {
      target: { value: "published" },
    });

    expect(await screen.findByText("Published courses must be linked to a product first.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("draft");
  });

  it("adds a module to the selected course from the curriculum builder", async () => {
    render(<CourseManagerPanel />);

    expect(await screen.findByText("Selected course")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Module title"), {
      target: { value: "Advanced Search" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Module" }));

    await waitFor(() => {
      expect(mockAddModule).toHaveBeenCalledWith(
        "course-1",
        {
          title: "Advanced Search",
          status: "draft",
          sort_order: 0,
        },
        "token",
      );
    });
  });

  it("blocks publishing a lesson until required fields are present", async () => {
    render(<CourseManagerPanel />);

    expect(await screen.findByText("Finding Sources")).toBeInTheDocument();

    const lessonCard = screen.getByText("Finding Sources").closest(".rounded-2xl.border.border-dune\\/10.bg-midnight\\/40.p-4");
    expect(lessonCard).not.toBeNull();
    if (!(lessonCard instanceof HTMLElement)) {
      throw new Error("Expected lesson card to exist");
    }

    const titleInput = within(lessonCard).getAllByRole("textbox")[0];
    fireEvent.change(titleInput, { target: { value: "" } });

    const statusSelect = within(lessonCard).getAllByRole("combobox")[1];
    fireEvent.change(statusSelect, { target: { value: "published" } });

    expect(await screen.findByText("Published lessons require a title and content URL.")).toBeInTheDocument();
    expect(mockUpdateLesson).not.toHaveBeenCalled();
  });

  it("submits AI lesson generation requests for the selected module", async () => {
    render(<CourseManagerPanel />);

    expect(await screen.findAllByPlaceholderText("Requested lesson title")).toHaveLength(2);

    fireEvent.change(screen.getAllByPlaceholderText("Requested lesson title")[0], {
      target: { value: "Source Evaluation" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("Source URL")[0], {
      target: { value: "https://example.com/source-evaluation" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Generate Lesson" })[0]);

    await waitFor(() => {
      expect(mockGenerateMaterial).toHaveBeenCalledWith(
        {
          course_id: "course-1",
          module_id: "module-1",
          title: "Source Evaluation",
          url: "https://example.com/source-evaluation",
          text: undefined,
        },
        "token",
      );
    });
  });

  it("persists module reorder changes when moving a module down", async () => {
    render(<CourseManagerPanel />);

    expect(await screen.findByText("Applied Practice")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Down" })[0]);

    await waitFor(() => {
      expect(mockUpdateModule).toHaveBeenCalledWith(
        "module-2",
        {
          title: "Applied Practice",
          status: "draft",
          sort_order: 0,
        },
        "token",
      );
      expect(mockUpdateModule).toHaveBeenCalledWith(
        "module-1",
        {
          title: "Core Methods",
          status: "draft",
          sort_order: 1,
        },
        "token",
      );
    });
  });

  it("blocks saving a published lesson when the content URL is missing", async () => {
    render(<CourseManagerPanel />);

    expect(await screen.findByText("Database Navigation")).toBeInTheDocument();

    const lessonCard = screen
      .getByText("Database Navigation")
      .closest(".rounded-2xl.border.border-dune\\/10.bg-midnight\\/40.p-4");
    expect(lessonCard).not.toBeNull();
    if (!(lessonCard instanceof HTMLElement)) {
      throw new Error("Expected lesson card to exist");
    }

    fireEvent.change(within(lessonCard).getByPlaceholderText("Content URL"), {
      target: { value: "" },
    });
    fireEvent.change(within(lessonCard).getAllByRole("combobox")[1], {
      target: { value: "published" },
    });
    fireEvent.click(within(lessonCard).getByRole("button", { name: "Save Lesson" }));

    expect(await screen.findByText("Published lessons require both a title and a content URL.")).toBeInTheDocument();
    expect(mockUpdateLesson).not.toHaveBeenCalled();
  });

  it("persists lesson reorder changes when moving a lesson down", async () => {
    render(<CourseManagerPanel />);

    expect(await screen.findByText("Database Navigation")).toBeInTheDocument();

    const lessonCards = screen.getAllByText(/Finding Sources|Database Navigation/);
    expect(lessonCards).toHaveLength(2);

    const firstLessonCard = screen
      .getByText("Finding Sources")
      .closest(".rounded-2xl.border.border-dune\\/10.bg-midnight\\/40.p-4");

    expect(firstLessonCard).not.toBeNull();
    if (!(firstLessonCard instanceof HTMLElement)) {
      throw new Error("Expected first lesson card to exist");
    }

    fireEvent.click(within(firstLessonCard).getByRole("button", { name: "Move Down" }));

    await waitFor(() => {
      expect(mockUpdateLesson).toHaveBeenCalledWith(
        "lesson-1b",
        {
          title: "Database Navigation",
          content_type: "Videos",
          status: "published",
          content_url: "https://example.com/database-navigation.mp4",
          duration_seconds: 180,
          sort_order: 0,
        },
        "token",
      );
      expect(mockUpdateLesson).toHaveBeenCalledWith(
        "lesson-1",
        {
          title: "Finding Sources",
          content_type: "Videos",
          status: "draft",
          content_url: "https://example.com/video.mp4",
          duration_seconds: 120,
          sort_order: 1,
        },
        "token",
      );
    });
  });

  it("confirms and deletes a course from the catalog", async () => {
    render(<CourseManagerPanel />);

    expect(await screen.findByRole("button", { name: "Research Methods" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(mockDeleteCourse).toHaveBeenCalledWith("course-1", "token");
    });
  });

  it("deletes a lesson directly from its lesson card", async () => {
    render(<CourseManagerPanel />);

    expect(await screen.findByText("Finding Sources")).toBeInTheDocument();

    const lessonCard = screen.getByText("Finding Sources").closest(".rounded-2xl.border.border-dune\\/10.bg-midnight\\/40.p-4");
    expect(lessonCard).not.toBeNull();
    if (!(lessonCard instanceof HTMLElement)) {
      throw new Error("Expected lesson card to exist");
    }

    fireEvent.click(within(lessonCard).getByRole("button", { name: "Delete Lesson" }));

    await waitFor(() => {
      expect(mockDeleteLesson).toHaveBeenCalledWith("lesson-1", "token");
    });
  });
});
