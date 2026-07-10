type StatCardProps = {
  label: string;
  value: string | number;
};

export const StatCard = ({ label, value }: StatCardProps) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5">
    <p className="text-sm font-medium text-slate-600">{label}</p>
    <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
  </div>
);
