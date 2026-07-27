/**
 * Shared Mantine theme for all Storybook previews.
 *
 * "Soft Futurism" palette — navy + amber brand, Space Grotesk display type,
 * pill-shaped controls, large-radius cards.
 * Palette arrays map Mantine indices 0–9 to Tailwind stops 50–900.
 * Each package's .storybook/preview.tsx should import and use this theme
 * so every component renders with the same professional look in the canvas.
 */
import { createTheme } from "@mantine/core";

export const enterpriseTheme = createTheme({
  colors: {
    primary: [
      "#eef1f6",
      "#d8dee9",
      "#b4c0d6",
      "#8a9cbe",
      "#5d74a0",
      "#3a5480",
      "#1b2a4a",  // main — navy-600
      "#16213c",  // hover/strong — navy-700
      "#11192e",
      "#0c1220",
    ],
    secondary: [
      "#fff8eb",
      "#ffebc2",
      "#ffd98a",
      "#ffc152",
      "#f5a623",
      "#ec940f",
      "#e8890c",  // main — amber-600
      "#c26e07",
      "#995607",
      "#7a4407",
    ],
    accent: [
      "#fff8eb",
      "#ffebc2",
      "#ffd98a",
      "#ffc152",
      "#f5a623",
      "#ec940f",
      "#e8890c",  // main — amber-600
      "#c26e07",
      "#995607",
      "#7a4407",
    ],
    success: [
      "#f0fdf4",
      "#dcfce7",
      "#bbf7d0",
      "#86efac",
      "#4ade80",
      "#22c55e",
      "#16a34a",  // main — green-600
      "#15803d",
      "#166534",
      "#14532d",
    ],
    info: [
      "#f0f9ff",
      "#e0f2fe",
      "#bae6fd",
      "#7dd3fc",
      "#38bdf8",
      "#0ea5e9",
      "#0284c7",  // main — sky-600
      "#0369a1",
      "#075985",
      "#0c4a6e",
    ],
    warning: [
      "#fffbeb",
      "#fef3c7",
      "#fde68a",
      "#fcd34d",
      "#fbbf24",
      "#f59e0b",
      "#d97706",  // main — amber-600
      "#b45309",
      "#92400e",
      "#78350f",
    ],
    danger: [
      "#fef2f2",
      "#fee2e2",
      "#fecaca",
      "#fca5a5",
      "#f87171",
      "#ef4444",
      "#dc2626",  // main — red-600
      "#b91c1c",
      "#991b1b",
      "#7f1d1d",
    ],
    gray: [
      "#f8fafc",  // slate-50
      "#f1f5f9",
      "#e2e8f0",  // border
      "#cbd5e1",  // input border
      "#94a3b8",
      "#64748b",  // muted text
      "#475569",
      "#334155",
      "#1e293b",
      "#0f172a",  // text
    ],
  },
  primaryColor: "primary",
  primaryShade: { light: 6, dark: 4 },
  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  fontFamilyMonospace:
    '"JetBrains Mono", "SF Mono", SFMono-Regular, Consolas, monospace',
  headings: {
    fontWeight: "600",
    fontFamily:
      '"Space Grotesk", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    sizes: {
      h1: { lineHeight: "1.2" },
      h2: { lineHeight: "1.25" },
      h3: { lineHeight: "1.3" },
      h4: { lineHeight: "1.35" },
    },
  },
  fontSizes: {
    xs: "0.75rem",
    sm: "0.8125rem",
    md: "0.875rem",
    lg: "1rem",
    xl: "1.25rem",
  },
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  radius: {
    xs: "0.25rem",
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
  },
  shadows: {
    xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  },
  defaultRadius: "sm",
  components: {
    Button: {
      defaultProps: { radius: 999 },
      styles: {
        root: {
          fontWeight: "600",
          borderRadius: "999px",
          fontSize: "0.875rem",
          transition: "background-color 0.15s, border-color 0.15s",
        },
      },
    },
    Input: {
      styles: {
        input: {
          borderColor: "#cbd5e1",
          fontSize: "0.875rem",
          borderRadius: "0.375rem",
          transition: "border-color 0.15s, box-shadow 0.15s",
        },
      },
    },
    Card: {
      defaultProps: { radius: 18, shadow: undefined },
      styles: {
        root: {
          borderColor: "#e8ebf1",
          borderRadius: "18px",
          background: "#ffffff",
        },
      },
    },
    Paper: {
      styles: {
        root: { borderRadius: "0.5rem" },
      },
    },
    Modal: {
      styles: {
        header: {
          borderBottom: "1px solid #e2e8f0",
          padding: "1rem 1.5rem",
          marginBottom: 0,
        },
        title: { fontWeight: 600, fontSize: "1rem" },
        body: { padding: "1.5rem" },
        content: {
          borderRadius: "0.75rem",
          boxShadow:
            "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        },
        close: { color: "#94a3b8" },
      },
    },
    Popover: {
      styles: {
        dropdown: {
          borderRadius: "0.5rem",
          boxShadow:
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          border: "1px solid #e2e8f0",
        },
      },
    },
    Badge: {
      styles: {
        root: {
          borderRadius: "999px",
          fontSize: "0.75rem",
          fontWeight: "500",
          textTransform: "none" as const,
        },
      },
    },
    TextInput: {
      styles: {
        label: {
          fontSize: "0.8125rem",
          fontWeight: "500",
          color: "#334155",
          marginBottom: "4px",
        },
      },
    },
    NumberInput: {
      styles: {
        label: {
          fontSize: "0.8125rem",
          fontWeight: "500",
          color: "#334155",
          marginBottom: "4px",
        },
      },
    },
    Select: {
      styles: {
        label: {
          fontSize: "0.8125rem",
          fontWeight: "500",
          color: "#334155",
          marginBottom: "4px",
        },
      },
    },
    Table: {
      defaultProps: { withTableBorder: true },
      styles: {
        table: {
          fontSize: "0.875rem",
        },
        th: {
          fontWeight: "500",
          fontSize: "0.75rem",
          color: "#64748b",
        },
      },
    },
    Tabs: {
      styles: {
        tab: {
          fontWeight: "500",
          fontSize: "0.875rem",
          borderRadius: "0.375rem",
          transition: "background 0.15s, color 0.15s",
        },
      },
    },
    Tooltip: {
      defaultProps: { withArrow: true, arrowSize: 6 },
      styles: {
        tooltip: { fontSize: "0.75rem", borderRadius: "0.375rem" },
      },
    },
    Group: { defaultProps: { gap: "sm" } },
    Stack: { defaultProps: { gap: "md" } },
  },
});
