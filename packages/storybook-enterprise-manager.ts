/**
 * Shared Storybook Manager theme — "Soft Futurism" navy + amber sidebar.
 *
 * Usage in each package's .storybook/manager.ts:
 *   import { enterpriseManagerTheme } from '../../storybook-enterprise-manager';
 *   addons.setConfig({ theme: enterpriseManagerTheme('Package Name') });
 */
import { create } from "storybook/theming/create";

type StoryTheme = ReturnType<typeof create>;

export function enterpriseManagerTheme(brandTitle: string): StoryTheme {
  return create({
    base: "light",
    brandTitle,
    brandUrl: "https://github.com/buildpad",

    // UI chrome — slate neutrals with gradient bg hint
    appBg: "#f6f7fa",
    appContentBg: "#ffffff",
    appPreviewBg: "#ffffff",
    appBorderColor: "#e8ebf1",
    appBorderRadius: 8,

    // Typography — Inter body, Space Grotesk for headings
    fontBase:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontCode:
      '"JetBrains Mono", "SF Mono", SFMono-Regular, Consolas, monospace',

    // Text colors — navy ink
    textColor: "#0f1b33",
    textInverseColor: "#ffffff",
    textMutedColor: "#64748b",

    // Brand colors — amber accent
    colorPrimary: "#e8890c",
    colorSecondary: "#e8890c",

    // Toolbar
    barTextColor: "#64748b",
    barSelectedColor: "#e8890c",
    barHoverColor: "#b45309",
    barBg: "#ffffff",

    // Form inputs in sidebar
    inputBg: "#ffffff",
    inputBorder: "#e8ebf1",
    inputTextColor: "#0f1b33",
    inputBorderRadius: 6,
  });
}
