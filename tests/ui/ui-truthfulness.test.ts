import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { primaryNavigation } from "@/lib/navigation";

const repositoryRoot = process.cwd();
const source = (relativePath: string) =>
  readFile(path.join(repositoryRoot, relativePath), "utf8");

describe("UI truthfulness", () => {
  it("exposes only supported primary destinations", () => {
    expect(primaryNavigation).toEqual([
      { label: "Home", href: "/" },
      { label: "Inventory", href: "/inventory" },
      { label: "Storage", href: "/storage" },
      { label: "Settings", href: "/settings" },
    ]);
    expect(primaryNavigation.map(({ label }) => label)).not.toEqual(
      expect.arrayContaining(["QR Labels", "Documents", "Maintenance"]),
    );
  });

  it("does not render post-v1 sidebar destinations", async () => {
    const sidebar = await source("components/layout/AppSidebar.tsx");

    expect(sidebar).not.toMatch(/QR Labels|Documents|Maintenance|Soon/);
  });

  it("uses the working global search on the dashboard", async () => {
    const dashboard = await source("app/page.tsx");

    expect(dashboard).toContain('import { GlobalSearch }');
    expect(dashboard).toContain('variant="dashboard"');
    expect(dashboard).not.toContain('name="dashboard-search"');
  });

  it("does not render unsupported QR actions", async () => {
    const [inventoryDetail, containerDetail] = await Promise.all([
      source("app/inventory/[id]/page.tsx"),
      source("app/storage/[id]/page.tsx"),
    ]);

    expect(inventoryDetail).not.toContain("QR Code");
    expect(containerDetail).not.toContain("QR Label");
  });

  it("does not render placeholder notification or user controls", async () => {
    const shell = await source("components/layout/AppShell.tsx");

    expect(shell).not.toContain("Notifications");
    expect(shell).not.toMatch(/\bCJ\b/);
  });
});
