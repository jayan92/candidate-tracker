type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
};

export const SearchInput = ({
  value,
  onChange,
  placeholder,
  label,
}: SearchInputProps) => (
  <div className="relative w-full max-w-md">
    <label htmlFor="search" className="sr-only">
      {label}
    </label>
    <input
      id="search"
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        aria-label="Clear search"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-slate-400 hover:text-slate-700"
      >
        ×
      </button>
    )}
  </div>
);
