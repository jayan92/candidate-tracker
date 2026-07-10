const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const formatDate = (iso: string): string =>
  dateFormatter.format(new Date(iso));

export const formatPercent = (value: number): string => `${value}%`;
