import { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-sm font-medium text-blue-400">{eyebrow}</p>
        )}

        <h1 className="mt-1 text-4xl font-bold tracking-tight">{title}</h1>

        {description && (
          <p className="mt-2 max-w-3xl text-slate-400">{description}</p>
        )}
      </div>

      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}