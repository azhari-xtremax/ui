/**
 * Authenticated App Shell — "Soft Futurism" layout.
 *
 * An 88px floating icon rail (replacing the classic 260px sidebar) plus a
 * transparent header row rendered inside the content area: breadcrumb left,
 * search chip + scheme toggle + notifications right. Nav entries render as
 * icon buttons with their label in a tooltip; `section` groups are separated
 * by a thin rail divider rather than a text heading.
 *
 * This is the recommended wrapper for your own app pages (dashboards,
 * custom screens). For schema-driven collection browsing under /content/*,
 * use ContentLayout + ContentNavigation instead — do NOT nest this shell
 * around those routes or you'll get duplicate chrome.
 *
 * Styling lives in app/globals.css under the `.bp-*` namespace and is built
 * entirely from the `--ds-*` design tokens.
 *
 * @buildpad/origin: components/layout/AuthenticatedShell
 * @buildpad/version: 1.0.0
 */

"use client";

import { ColorSchemeToggle } from "@/components/ColorSchemeToggle";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Divider,
  Group,
  Menu,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBell,
  IconLogout,
  IconSearch,
  IconSettings,
  IconUser,
  type IconProps,
} from "@tabler/icons-react";
import { NAV_ITEMS } from "./navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

interface AuthUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar: string | null;
}

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<IconProps>;
  /**
   * Rail group this entry belongs to (e.g. "Administration"). Entries
   * without a section fall into "Main Menu"; groups appear in the order
   * their first entry appears in the nav list and are separated by a
   * divider in the rail (the icon rail has no room for text headings).
   */
  section?: string;
}

export interface ShellBrand {
  /** Full workspace / app name shown next to the brand mark. */
  name: string;
  /** Single letter shown inside the gradient brand mark. */
  initial: string;
}

interface AuthenticatedShellProps {
  children: ReactNode;
  /**
   * Primary sidebar navigation. Defaults to NAV_ITEMS from
   * `./navigation` — the file the CLI extends when you install route
   * modules (e.g. `buildpad add users-routes`).
   */
  navItems?: NavItem[];
  /** Brand mark + name. Defaults to NEXT_PUBLIC_APP_NAME (or "Buildpad"). */
  brand?: ShellBrand;
  /** Show the (presentational) header search affordance. */
  showSearch?: boolean;
  /** Show the (presentational) header notification bell. */
  showNotifications?: boolean;
}

// Default nav lives in ./navigation — the CLI appends route-module entries
// there on install, so new modules appear in the sidebar automatically.
const DEFAULT_NAV_ITEMS: NavItem[] = NAV_ITEMS;

function defaultBrand(): ShellBrand {
  const name = process.env.NEXT_PUBLIC_APP_NAME ?? "Buildpad";
  return { name, initial: name.charAt(0).toUpperCase() || "B" };
}

function getInitials(user: AuthUser | null): string {
  if (!user) return "U";

  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  if (fullName) {
    return fullName
      .split(" ")
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  return user.email?.charAt(0).toUpperCase() ?? "U";
}

export function AuthenticatedShell({
  children,
  navItems = DEFAULT_NAV_ITEMS,
  brand = defaultBrand(),
  showSearch = true,
  showNotifications = true,
}: AuthenticatedShellProps) {
  const pathname = usePathname();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/user", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const data = payload?.data;

        if (isMounted && data) {
          setUser({
            id: String(data.id ?? ""),
            email: data.email ?? null,
            first_name: data.first_name ?? null,
            last_name: data.last_name ?? null,
            avatar: data.avatar ?? null,
          });
        }
      } catch {
        // Keep shell usable when profile endpoint is unavailable.
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Group nav entries by section (default "Main Menu"), preserving the order
  // in which each section first appears.
  const navGroups = useMemo(() => {
    const groups: Array<{ section: string; items: NavItem[] }> = [];
    for (const item of navItems) {
      const section = item.section ?? "Main Menu";
      let group = groups.find((g) => g.section === section);
      if (!group) {
        group = { section, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }, [navItems]);

  const pageTitle = useMemo(() => {
    const active = navItems.find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    if (active) return active.label;
    // Routes that aren't in the sidebar (e.g. /forms from the forms module)
    // still get a meaningful crumb from the first path segment, instead of
    // repeating the brand name.
    const segment = pathname.split("/").filter(Boolean)[0];
    if (!segment) return brand.name;
    const words = segment.replace(/[-_]+/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }, [pathname, navItems, brand.name]);

  const displayName =
    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
    user?.email ||
    "Account";

  return (
    <AppShell
      navbar={{
        width: 88,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
    >
      <AppShell.Navbar className="bp-rail-navbar" withBorder={false}>
        <nav
          className="bp-rail"
          style={{ position: "sticky", top: 16, height: "calc(100vh - 32px)" }}
          aria-label="Primary"
        >
          {/* Brand mark */}
          <div className="bp-rail-brand" aria-hidden="true">
            {brand.initial}
          </div>

          {/* Primary nav icons, grouped by section */}
          {navGroups.map((group, groupIndex) => (
            <Fragment key={group.section}>
              {groupIndex > 0 && (
                <div className="bp-rail-divider" role="separator" />
              )}
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Tooltip
                    key={item.href}
                    label={item.label}
                    position="right"
                    withArrow
                  >
                    <Link
                      href={item.href}
                      className={`bp-rail-link ${
                        isActive ? "bp-rail-link-active" : ""
                      }`}
                      onClick={closeMobile}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                      title={item.label}
                    >
                      <Icon size={19} stroke={1.8} />
                    </Link>
                  </Tooltip>
                );
              })}
            </Fragment>
          ))}

          <div className="bp-rail-spacer" />

          {/* User avatar + menu, pinned to the bottom */}
          <Menu position="right-end" offset={12} withArrow shadow="md" width={220}>
            <Menu.Target>
              <UnstyledButton aria-label="Account menu">
                <Avatar
                  radius="xl"
                  size={34}
                  src={user?.avatar ?? undefined}
                  style={{
                    background: "var(--ds-brand-mark)",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {getInitials(user)}
                </Avatar>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{displayName}</Menu.Label>
              <Menu.Item leftSection={<IconUser size={14} />} disabled>
                Account details
              </Menu.Item>
              <Menu.Item leftSection={<IconSettings size={14} />} disabled>
                Workspace Settings
              </Menu.Item>
              <Divider my="xs" />
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={14} />}
                onClick={() => {
                  window.location.href = "/api/auth/logout";
                }}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </nav>
      </AppShell.Navbar>

      <AppShell.Main className="bp-main">
        {/* Transparent header row (not a bar) */}
        <Group justify="space-between" align="center" mb="lg" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
            />
            <div>
              <Text component="div" className="bp-topbar-crumb">
                {pageTitle}
              </Text>
              <Text component="div" className="bp-topbar-sub">
                {brand.name} · Workspace
              </Text>
            </div>
          </Group>

          <Group gap="sm" wrap="nowrap">
            {/* Presentational only — wire these up to your own search /
                notification features when ready. */}
            {showSearch && (
              <UnstyledButton className="bp-search-chip" aria-label="Search">
                <Group gap="xs" wrap="nowrap">
                  <IconSearch size={14} stroke={1.8} />
                  <Text size="xs">Search anything…</Text>
                </Group>
                <span className="bp-search-kbd">⌘K</span>
              </UnstyledButton>
            )}

            <span className="bp-round-btn">
              <ColorSchemeToggle />
            </span>

            {showNotifications && (
              <Tooltip label="Notifications">
                <div className="bp-notification-bell">
                  <ActionIcon
                    className="bp-round-btn"
                    variant="default"
                    aria-label="Notifications"
                  >
                    <IconBell size={18} stroke={1.8} />
                  </ActionIcon>
                  <div className="bp-notification-dot" />
                </div>
              </Tooltip>
            )}
          </Group>
        </Group>

        {children}
      </AppShell.Main>
    </AppShell>
  );
}
