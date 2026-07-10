import type { Dashboard } from "@candidate-tracker/shared";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";

import { statusColors, statusLabels } from "../lib/status";

const SURFACE = "#ffffff";

type Slice = Dashboard["applicationsByStatus"][number];

const percentOf = (count: number, total: number): string =>
  total === 0 ? "0%" : `${Math.round((count / total) * 1000) / 10}%`;

const ChartTooltip = ({
  active,
  payload,
  total,
}: TooltipProps<number, string> & { total: number }) => {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  if (!entry) return null;

  const label = String(entry.name ?? "");
  const count = typeof entry.value === "number" ? entry.value : 0;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-slate-900">{label}</p>
      <p className="text-slate-600">
        {count} {count === 1 ? "application" : "applications"} ·{" "}
        {percentOf(count, total)}
      </p>
    </div>
  );
};

export const StatusDoughnut = ({ slices }: { slices: Slice[] }) => {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  const data = slices.map((slice) => ({
    ...slice,
    label: statusLabels[slice.status],
  }));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-[240px] w-full max-w-[260px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={2}
              stroke={SURFACE}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((slice) => (
                <Cell key={slice.status} fill={statusColors[slice.status]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-slate-900">{total}</span>
          <span className="text-xs text-slate-600">applications</span>
        </div>
      </div>

      <ul className="w-full space-y-1.5">
        {data.map((slice) => (
          <li
            key={slice.status}
            className="flex items-center gap-3 text-sm text-slate-700"
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: statusColors[slice.status] }}
            />
            <span className="flex-1">{slice.label}</span>
            <span className="tabular-nums font-medium text-slate-900">
              {slice.count}
            </span>
            <span className="w-12 text-right tabular-nums text-slate-500">
              {percentOf(slice.count, total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
