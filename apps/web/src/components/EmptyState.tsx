import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
    <p className="font-medium text-slate-900">{title}</p>
    {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
