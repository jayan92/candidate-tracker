import type { ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
};

export const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
export const fieldErrorClass =
  "mt-1 w-full rounded-md border border-red-400 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500";

export const FormField = ({
  id,
  label,
  error,
  hint,
  required,
  children,
}: FormFieldProps) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="ml-0.5 text-red-600">*</span>}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700">
        {error}
      </p>
    ) : (
      hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
    )}
  </div>
);
