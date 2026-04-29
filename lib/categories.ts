import type { CategoryMeta } from "./types";

export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  study: "#7B6BB8",
  work:  "#378ADD",
};

export const CATEGORIES: Record<string, CategoryMeta> = {
  study: { id: "study", label: "دراسة", color: "#7B6BB8", bg: "#EEEDFE", ring: "rgba(123,107,184,0.3)", text: "#3C3489" },
  work:  { id: "work",  label: "عمل",   color: "#378ADD", bg: "#E6F1FB", ring: "rgba(55,138,221,0.3)",  text: "#0C447C" },
};

export const CATEGORY_LIST: CategoryMeta[] = [CATEGORIES.study, CATEGORIES.work];
