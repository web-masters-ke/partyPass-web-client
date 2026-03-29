import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function fmtDate(d: string | Date) {
  return format(new Date(d), "EEE dd MMM yyyy");
}
export function fmtTime(d: string | Date) {
  return format(new Date(d), "h:mm a");
}
export function fmtDateTime(d: string | Date) {
  return format(new Date(d), "EEE dd MMM · h:mm a");
}
export function fmtRelative(d: string | Date) {
  return formatDistanceToNow(new Date(d), { addSuffix: true });
}
export function fmtCurrency(amount: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
export function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}
