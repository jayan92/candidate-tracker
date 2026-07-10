import type { ApplicationStatus } from "@candidate-tracker/shared";

export const statusColors: Record<ApplicationStatus, string> = {
  applied: "#2a78d6",
  screening: "#1baf7a",
  interview: "#eda100",
  offer: "#008300",
  hired: "#4a3aa7",
  rejected: "#e34948",
};

export const statusLabels: Record<ApplicationStatus, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};
