/**
 * Shared Storybook Manager theme — "Soft Futurism" navy + amber sidebar.
 *
 * Usage in each package's .storybook/manager.ts:
 *   import { enterpriseManagerTheme } from '../../storybook-enterprise-manager';
 *   addons.setConfig({ theme: enterpriseManagerTheme('Package Name') });
 */
import { create } from "storybook/theming/create";
import { COLOR_BORDER, COLOR_MUTED, FONT_BODY, FONT_MONO } from "./storybook-enterprise-theme";

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
    appBorderColor: COLOR_BORDER,
    appBorderRadius: 8,

    // Typography — Inter body, Space Grotesk for headings
    fontBase: FONT_BODY,
    fontCode: FONT_MONO,

    // Text colors — navy ink
    textColor: "#0f1b33",
    textInverseColor: "#ffffff",
    textMutedColor: COLOR_MUTED,

    // Brand colors — amber accent
    colorPrimary: "#e8890c",
    colorSecondary: "#e8890c",

    // Toolbar
    barTextColor: COLOR_MUTED,
    barSelectedColor: "#e8890c",
    barHoverColor: "#b45309",
    barBg: "#ffffff",

    // Form inputs in sidebar
    inputBg: "#ffffff",
    inputBorder: COLOR_BORDER,
    inputTextColor: "#0f1b33",
    inputBorderRadius: 6,
  });
}
