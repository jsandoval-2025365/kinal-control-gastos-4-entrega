export type ExpenseCategory = "VIVIENDA" | "COMIDA" | "TRANSPORTE" | "SERVICIOS" | "OTROS";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "VIVIENDA",
  "COMIDA",
  "TRANSPORTE",
  "SERVICIOS",
  "OTROS",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  VIVIENDA: "Vivienda",
  COMIDA: "Comida",
  TRANSPORTE: "Transporte",
  SERVICIOS: "Servicios",
  OTROS: "Otros",
};

/** Paleta consistente con la usada en el Dashboard. */
export const EXPENSE_CATEGORY_COLORS = ["#1F3A5A", "#0052FF", "#FF6B4A", "#4ECDC4", "#8A94A6"];

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePayload {
  category: ExpenseCategory;
  amount: number;
  description?: string;
  date: string;
}

export interface ExpenseCategorySummary {
  category: ExpenseCategory;
  total: number;
  count: number;
  lastDate: string;
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Suma de gastos cuyo `date` cae en el mes/año de `reference` (por defecto, hoy). */
export function sumExpensesForMonth(expenses: Expense[], reference: Date = new Date()): number {
  return expenses
    .filter((e) => isSameMonth(new Date(e.date), reference))
    .reduce((sum, e) => sum + e.amount, 0);
}

/** % de variación del mes de `reference` contra el mes anterior. `null` si el mes anterior no tuvo gastos. */
export function monthOverMonthExpenseDeltaPct(
  expenses: Expense[],
  reference: Date = new Date()
): number | null {
  const previousMonth = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  const current = sumExpensesForMonth(expenses, reference);
  const previous = sumExpensesForMonth(expenses, previousMonth);
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Agrupa los gastos por `category`, sumando montos y contando movimientos. Ordenado de mayor a menor total. */
export function groupExpensesByCategory(expenses: Expense[]): ExpenseCategorySummary[] {
  const map = new Map<ExpenseCategory, ExpenseCategorySummary>();
  for (const expense of expenses) {
    const existing = map.get(expense.category);
    if (existing) {
      existing.total += expense.amount;
      existing.count++;
      if (new Date(expense.date) > new Date(existing.lastDate)) {
        existing.lastDate = expense.date;
      }
    } else {
      map.set(expense.category, {
        category: expense.category,
        total: expense.amount,
        count: 1,
        lastDate: expense.date,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}