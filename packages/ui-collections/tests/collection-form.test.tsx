/**
 * CollectionForm Component Tests
 *
 * Tests rendering, CRUD operations, permission enforcement, and delete flow.
 * Mocks @buildpad/services, @buildpad/ui-form (VForm), and @buildpad/ui-table.
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MantineProvider } from "@mantine/core";

// -------------------------------------------------------------------
// Service mocks — use vi.hoisted so they are available in vi.mock factories
// -------------------------------------------------------------------
const {
  mockFieldsReadAll,
  mockPermissionsGetAccess,
  mockItemsReadOne,
  mockItemsCreateOne,
  mockItemsUpdateOne,
  mockItemsDeleteOne,
  mockItemsDeleteMany,
} = vi.hoisted(() => ({
  mockFieldsReadAll: vi.fn(),
  mockPermissionsGetAccess: vi.fn(),
  mockItemsReadOne: vi.fn(),
  mockItemsCreateOne: vi.fn(),
  mockItemsUpdateOne: vi.fn(),
  mockItemsDeleteOne: vi.fn(),
  mockItemsDeleteMany: vi.fn(),
}));

vi.mock("@buildpad/services", () => ({
  FieldsService: vi.fn().mockImplementation(() => ({
    readAll: mockFieldsReadAll,
  })),
  ItemsService: vi.fn().mockImplementation(() => ({
    readOne: mockItemsReadOne,
    createOne: mockItemsCreateOne,
    updateOne: mockItemsUpdateOne,
    deleteOne: mockItemsDeleteOne,
    deleteMany: mockItemsDeleteMany,
  })),
  PermissionsService: {
    getMyCollectionAccess: mockPermissionsGetAccess,
  },
  apiRequest: vi.fn(),
}));

// Mock VForm to a simple controlled component so we can drive it in tests
vi.mock("@buildpad/ui-form", () => ({
  VForm: vi.fn(({ fields, modelValue, onUpdate, disabled }: {
    fields: Array<{ field: string }>;
    modelValue: Record<string, unknown>;
    onUpdate: (values: Record<string, unknown>) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="vform-mock">
      {fields.map((f) => (
        <input
          key={f.field}
          data-testid={`field-${f.field}`}
          value={String(modelValue[f.field] ?? "")}
          disabled={disabled}
          onChange={(e) => onUpdate({ [f.field]: e.target.value })}
        />
      ))}
    </div>
  )),
}));

// Minimal mock for SaveOptions
vi.mock("../src/SaveOptions", () => ({
  SaveOptions: () => <div data-testid="save-options-mock" />,
}));

// Import component under test AFTER mocks
import { CollectionForm } from "../src/CollectionForm";

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
const SAMPLE_FIELDS = [
  { field: "title", type: "string", meta: { interface: "input", sort: 1 } },
  { field: "body", type: "text", meta: { interface: "input-multiline", sort: 2 } },
];

/** Returns SAMPLE_FIELDS for FieldsService.readAll and empty permissions (admin) */
function setupDefaultMocks() {
  mockFieldsReadAll.mockResolvedValue(SAMPLE_FIELDS);
  mockPermissionsGetAccess.mockResolvedValue({});
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

function renderForm(props: Partial<React.ComponentProps<typeof CollectionForm>> = {}) {
  return render(
    <CollectionForm collection="posts" {...props} />,
    { wrapper },
  );
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------
describe("CollectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  // =====================================================================
  // Rendering
  // =====================================================================
  describe("rendering", () => {
    it("renders with loading overlay then VForm", async () => {
      renderForm();

      // After loading, VForm should be rendered
      await waitFor(() => {
        expect(screen.getByTestId("vform-mock")).toBeInTheDocument();
      });
    });

    it("shows error alert when fields fail to load", async () => {
      mockFieldsReadAll.mockRejectedValueOnce(new Error("Network error"));

      renderForm();

      await waitFor(() => {
        expect(screen.getByTestId("form-error")).toBeInTheDocument();
      });
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    it("renders Create button in create mode", async () => {
      renderForm({ mode: "create" });

      await waitFor(() => {
        expect(screen.getByTestId("form-submit-btn")).toHaveTextContent("Create");
      });
    });

    it("renders Save button in edit mode", async () => {
      mockItemsReadOne.mockResolvedValue({ id: 1, title: "Test", body: "Hello" });

      renderForm({ mode: "edit", id: 1 });

      await waitFor(() => {
        expect(screen.getByTestId("form-submit-btn")).toHaveTextContent("Save");
      });
    });
  });

  // =====================================================================
  // Create operation
  // =====================================================================
  describe("create", () => {
    it("calls ItemsService.createOne on form submit", async () => {
      mockItemsCreateOne.mockResolvedValueOnce({ id: 42, title: "New" });
      const onSuccess = vi.fn();

      renderForm({ mode: "create", onSuccess });

      await waitFor(() => {
        expect(screen.getByTestId("vform-mock")).toBeInTheDocument();
      });

      // Type into the title field
      const titleInput = screen.getByTestId("field-title");
      fireEvent.change(titleInput, { target: { value: "New Post" } });

      // Submit
      fireEvent.click(screen.getByTestId("form-submit-btn"));

      await waitFor(() => {
        expect(mockItemsCreateOne).toHaveBeenCalled();
      });
    });
  });

  // =====================================================================
  // Edit / Update operation
  // =====================================================================
  describe("edit", () => {
    it("loads existing item data in edit mode", async () => {
      mockItemsReadOne.mockResolvedValue({
        id: 1,
        title: "Existing Title",
        body: "Existing Body",
      });

      renderForm({ mode: "edit", id: 1 });

      await waitFor(() => {
        expect(mockItemsReadOne).toHaveBeenCalledWith(1, expect.any(Array));
      });

      await waitFor(() => {
        const titleInput = screen.getByTestId("field-title") as HTMLInputElement;
        expect(titleInput.value).toBe("Existing Title");
      });
    });

    it("calls ItemsService.updateOne when saving edited item", async () => {
      mockItemsReadOne.mockResolvedValue({ id: 1, title: "Old", body: "Body" });
      mockItemsUpdateOne.mockResolvedValueOnce({ id: 1, title: "Updated", body: "Body" });

      renderForm({ mode: "edit", id: 1 });

      await waitFor(() => {
        expect(screen.getByTestId("field-title")).toBeInTheDocument();
      });

      // Change the title
      fireEvent.change(screen.getByTestId("field-title"), {
        target: { value: "Updated" },
      });

      // Submit
      fireEvent.click(screen.getByTestId("form-submit-btn"));

      await waitFor(() => {
        expect(mockItemsUpdateOne).toHaveBeenCalled();
      });
    });
  });

  // =====================================================================
  // Delete operation
  // =====================================================================
  describe("delete", () => {
    it("shows delete button in edit mode with deleteAllowed", async () => {
      mockItemsReadOne.mockResolvedValue({ id: 1, title: "Item" });

      renderForm({ mode: "edit", id: 1, showDelete: true });

      await waitFor(() => {
        expect(screen.getByTestId("form-delete-btn")).toBeInTheDocument();
      });
    });

    it("seeds create-mode form data from each field's own schema default_value", async () => {
      // Postgres reports a typed literal default with a `::type` cast suffix
      // (e.g. `'active'::character varying`) — getFieldDefault handles the
      // parsing; this covers CollectionForm actually calling it for create
      // mode, which it previously never did (only the defaultValues prop
      // and permission presets seeded initial form data).
      mockFieldsReadAll.mockResolvedValue([
        { field: "status", type: "string", schema: { default_value: "'active'::character varying" }, meta: { interface: "input", sort: 1 } },
        { field: "theme", type: "string", schema: { default_value: "auto" }, meta: { interface: "input", sort: 2 } },
        { field: "title", type: "string", schema: { default_value: null }, meta: { interface: "input", sort: 3 } },
      ]);

      renderForm({ mode: "create" });

      await waitFor(() => {
        expect(screen.getByTestId("field-status")).toHaveValue("active");
      });
      expect(screen.getByTestId("field-theme")).toHaveValue("auto");
      expect(screen.getByTestId("field-title")).toHaveValue("");
    });

    it("lets an explicit defaultValues prop override a field's schema default", async () => {
      mockFieldsReadAll.mockResolvedValue([
        { field: "status", type: "string", schema: { default_value: "'active'::character varying" }, meta: { interface: "input", sort: 1 } },
      ]);

      renderForm({ mode: "create", defaultValues: { status: "draft" } });

      await waitFor(() => {
        expect(screen.getByTestId("field-status")).toHaveValue("draft");
      });
    });

    it("does not show delete button in create mode", async () => {
      renderForm({ mode: "create" });

      await waitFor(() => {
        expect(screen.getByTestId("vform-mock")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("form-delete-btn")).not.toBeInTheDocument();
    });

    it("opens delete confirmation modal on delete button click", async () => {
      mockItemsReadOne.mockResolvedValue({ id: 1, title: "Item" });

      renderForm({ mode: "edit", id: 1, showDelete: true });

      await waitFor(() => {
        expect(screen.getByTestId("form-delete-btn")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("form-delete-btn"));

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });
    });

    it("calls ItemsService.deleteOne and onDelete when confirmed", async () => {
      mockItemsReadOne.mockResolvedValue({ id: 1, title: "Item" });
      mockItemsDeleteOne.mockResolvedValueOnce(undefined);
      const onDelete = vi.fn();

      renderForm({ mode: "edit", id: 1, showDelete: true, onDelete });

      await waitFor(() => {
        expect(screen.getByTestId("form-delete-btn")).toBeInTheDocument();
      });

      // Open confirmation
      await userEvent.click(screen.getByTestId("form-delete-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("delete-confirm-btn")).toBeInTheDocument();
      });

      // Confirm delete
      await userEvent.click(screen.getByTestId("delete-confirm-btn"));

      await waitFor(() => {
        expect(mockItemsDeleteOne).toHaveBeenCalledWith(1);
        expect(onDelete).toHaveBeenCalled();
      });
    });

    it("shows error when delete fails", async () => {
      mockItemsReadOne.mockResolvedValue({ id: 1, title: "Item" });
      mockItemsDeleteOne.mockRejectedValueOnce(new Error("Delete forbidden"));

      renderForm({ mode: "edit", id: 1, showDelete: true });

      await waitFor(() => {
        expect(screen.getByTestId("form-delete-btn")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("form-delete-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("delete-confirm-btn")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("delete-confirm-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("form-error")).toBeInTheDocument();
      });
      expect(screen.getByText(/delete forbidden/i)).toBeInTheDocument();
    });
  });

  // =====================================================================
  // Cancel
  // =====================================================================
  describe("cancel", () => {
    it("calls onCancel when cancel button is clicked", async () => {
      const onCancel = vi.fn();

      renderForm({ mode: "create", onCancel });

      await waitFor(() => {
        expect(screen.getByTestId("form-cancel-btn")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("form-cancel-btn"));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  // =====================================================================
  // Permissions
  // =====================================================================
  describe("permissions", () => {
    it("disables delete button when permission is denied", async () => {
      // Return permissions that deny delete
      mockPermissionsGetAccess.mockResolvedValueOnce({
        posts: {
          read: { fields: ["*"] },
          create: { fields: ["*"] },
          update: { fields: ["*"] },
          // no delete key = delete not allowed
        },
      });
      mockItemsReadOne.mockResolvedValue({ id: 1, title: "Item" });

      renderForm({ mode: "edit", id: 1, showDelete: true });

      await waitFor(() => {
        expect(screen.getByTestId("vform-mock")).toBeInTheDocument();
      });

      // Delete button should NOT be shown because deleteAllowed = false
      expect(screen.queryByTestId("form-delete-btn")).not.toBeInTheDocument();
    });
  });
});

describe("edit fetch relational-field exclusion", () => {
  it("omits O2M/M2M/M2A fields from readOne and keeps flat fields plus the PK", async () => {
    mockFieldsReadAll.mockResolvedValue([
      ...SAMPLE_FIELDS,
      {
        collection: "posts",
        field: "blocks",
        type: "text",
        meta: { special: ["m2a"], interface: "list-m2a" },
        schema: {},
      },
      {
        collection: "posts",
        field: "comments",
        type: "text",
        meta: { interface: "list-o2m" },
        schema: {},
      },
    ]);
    mockItemsReadOne.mockResolvedValueOnce({ id: 1, title: "Existing Title" });

    renderForm({ mode: "edit", id: 1 });

    await waitFor(() => expect(mockItemsReadOne).toHaveBeenCalled());
    const [calledId, fields] = mockItemsReadOne.mock.calls.at(-1)!;
    expect(calledId).toBe(1);
    expect(fields).toContain("id");
    expect(fields).toContain("title");
    expect(fields).not.toContain("blocks");
    expect(fields).not.toContain("comments");
  });
});

describe("submit containment through portals", () => {
  it("does not bubble the form's submit into an ancestor page form across a portal", async () => {
    const { createPortal } = await import("react-dom");
    mockItemsCreateOne.mockResolvedValueOnce({ id: 9, title: "t" });
    const outerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

    // Mirrors the real bug shape: the page form is an ancestor in the REACT
    // tree while the CollectionForm lives elsewhere in the DOM via a portal
    // (Mantine Modal). React bubbles synthetic submit along the React tree.
    function Page() {
      return (
        <form onSubmit={outerSubmit} data-testid="outer-page-form">
          {createPortal(
            <CollectionForm collection="posts" mode="create" />,
            document.body,
          )}
        </form>
      );
    }

    render(<Page />, { wrapper });

    await waitFor(() => screen.getByTestId("form-submit-btn"));
    fireEvent.click(screen.getByTestId("form-submit-btn"));

    await waitFor(() => expect(mockItemsCreateOne).toHaveBeenCalled());
    expect(outerSubmit).not.toHaveBeenCalled();
  });
});
