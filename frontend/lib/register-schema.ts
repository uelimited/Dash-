export type RegisterSection = "tds" | "procurement" | "design";
export const SHARED_FIELDS = ["name", "trade", "group", "front", "boq", "unit", "qty"];
export const OWNED_FIELDS: Record<RegisterSection, string[]> = {
  tds: [...SHARED_FIELDS, "tdsNo", "workflow", "revision", "tds", "submitted", "submissionDue", "due", "reply", "tdsNotes", "url", "owner"],
  procurement: [...SHARED_FIELDS, "make", "vendor", "stage", "budget", "quote", "commitment", "loi", "po", "orderDate", "leadWeeks", "required", "delivery", "delivered", "cashMonth", "cashPlan", "procurementNotes"],
  design: ["name", "drawingNo", "trade", "kind", "front", "revision", "status", "submitted", "due", "clashes", "owner", "url", "notes"],
};
export const sectionLabel = (section: RegisterSection) => section === "tds" ? "TDS" : section === "design" ? "Drawings & BIM" : "Procurement";
export const equalValue = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);
