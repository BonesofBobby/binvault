import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AppBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function AppBreadcrumbs({ items }: AppBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 text-sm text-slate-400"
    >
      <Link
        href="/"
        aria-label="Home"
        className="transition hover:text-white"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-slate-600" />

            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="transition hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={isLast ? "font-medium text-slate-200" : undefined}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}