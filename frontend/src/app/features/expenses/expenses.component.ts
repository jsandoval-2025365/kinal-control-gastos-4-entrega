import { Component, HostListener, OnInit, computed, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { SessionTimeoutService } from "../../core/auth/session-timeout.service";
import { NotificationService } from "../../shared/coming-soon/notifications/notification.service";
import { ExpensesService } from "./expenses.service";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_LABELS,
  Expense,
  ExpenseCategory,
  ExpenseCategorySummary,
  ExpensePayload,
  groupExpensesByCategory,
  monthOverMonthExpenseDeltaPct,
  sumExpensesForMonth,
} from "../../core/models/expense.model";

@Component({
  selector: "app-expenses",
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: "./expenses.component.html",
  styleUrl: "./expenses.component.css",
})
export class ExpensesComponent implements OnInit {
  userMenuOpen = signal(false);

  expenses = signal<Expense[]>([]);
  loading = signal(true);
  loadError = signal<string | null>(null);

  // --- Formulario embebido (alta / edición), sin componente aparte ---
  formOpen = signal(false);
  editingId = signal<string | null>(null);
  formCategory: ExpenseCategory = "OTROS";
  formAmount: number | null = null;
  formDescription = "";
  formDate = this.todayIso();
  saving = signal(false);
  formError = signal<string | null>(null);

  // --- KPIs y agregaciones derivadas ---
  readonly totalThisMonth = computed(() => sumExpensesForMonth(this.expenses()));
  readonly monthDeltaPct = computed(() => monthOverMonthExpenseDeltaPct(this.expenses()));
  readonly byCategory = computed(() =>
    groupExpensesByCategory(
      this.expenses().filter(
        (e) =>
          new Date(e.date).getFullYear() === new Date().getFullYear() &&
          new Date(e.date).getMonth() === new Date().getMonth()
      )
    )
  );

  readonly mainCategory = computed<ExpenseCategorySummary | null>(() => this.byCategory()[0] ?? null);
  readonly mainCategoryShare = computed(() => {
    const main = this.mainCategory();
    const total = this.totalThisMonth();
    return main && total > 0 ? (main.total / total) * 100 : 0;
  });

  readonly recentMovements = computed(() => [...this.expenses()].slice(0, 8));

  readonly categories = EXPENSE_CATEGORIES;

  get isEditMode(): boolean {
    return this.editingId() !== null;
  }

  constructor(
    public auth: AuthService,
    private router: Router,
    private sessionTimeout: SessionTimeoutService,
    private notifications: NotificationService,
    private expensesService: ExpensesService
  ) {}

  ngOnInit(): void {
    this.loadExpenses();
  }

  get initials(): string {
    const email = this.auth.currentUser()?.email ?? "";
    return email.slice(0, 2).toUpperCase();
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen.update((open) => !open);
  }

  @HostListener("document:click")
  closeUserMenu(): void {
    if (this.userMenuOpen()) this.userMenuOpen.set(false);
  }

  goTo(path: string): void {
    this.userMenuOpen.set(false);
    this.router.navigate([path]);
  }

  // --- Formulario ---
  openCreateForm(): void {
    this.editingId.set(null);
    this.formCategory = "OTROS";
    this.formAmount = null;
    this.formDescription = "";
    this.formDate = this.todayIso();
    this.formError.set(null);
    this.formOpen.set(true);
  }

  openEditForm(expense: Expense): void {
    this.editingId.set(expense.id);
    this.formCategory = expense.category;
    this.formAmount = expense.amount;
    this.formDescription = expense.description ?? "";
    this.formDate = expense.date.slice(0, 10);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  submitForm(): void {
    this.formError.set(null);

    if (this.formAmount === null || this.formAmount <= 0) {
      this.formError.set("El monto debe ser mayor a 0");
      return;
    }
    if (!this.formDate) {
      this.formError.set("La fecha es requerida");
      return;
    }

    const payload: ExpensePayload = {
      category: this.formCategory,
      amount: this.formAmount,
      description: this.formDescription.trim() || undefined,
      date: this.formDate,
    };

    this.saving.set(true);
    const id = this.editingId();
    const request$ = id
      ? this.expensesService.update(id, payload)
      : this.expensesService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        const wasEditing = id !== null;
        this.closeForm();
        this.loadExpenses();
        this.notifications.success(wasEditing ? "Gasto actualizado" : "Gasto agregado");
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.error ?? "No se pudo guardar el gasto");
      },
    });
  }

  // --- Eliminar ---
  deleteExpense(expense: Expense): void {
    const label = this.categoryLabel(expense.category);
    this.notifications.warning({
      message: `¿Eliminar el gasto de ${label} (${this.formatAmount(expense.amount)})? Esta acción no se puede deshacer.`,
      actionLabel: "Eliminar",
      onAction: () => this.performDelete(expense.id),
    });
  }

  private performDelete(id: string): void {
    this.expensesService.delete(id).subscribe({
      next: () => {
        this.loadExpenses();
        this.notifications.success("Gasto eliminado");
      },
      error: (err) => {
        this.notifications.error(err?.error?.error ?? "No se pudo eliminar el gasto");
      },
    });
  }

  // --- Presentación ---
  categoryLabel(category: ExpenseCategory): string {
    return EXPENSE_CATEGORY_LABELS[category] ?? category;
  }

  categoryColor(category: ExpenseCategory): string {
    const index = EXPENSE_CATEGORIES.indexOf(category);
    return EXPENSE_CATEGORY_COLORS[index] ?? "var(--gray-mid)";
  }

  categoryShare(total: number): number {
    const monthTotal = this.totalThisMonth();
    return monthTotal > 0 ? (total / monthTotal) * 100 : 0;
  }

  formatAmount(n: number): string {
    return "Q " + n.toLocaleString("es-GT", { maximumFractionDigits: 2 });
  }

  formatPct(n: number): string {
    return `${Math.abs(n).toFixed(1)}%`;
  }

  formatShortDate(iso: string): string {
    return new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short" }).format(new Date(iso));
  }

  onLogout(): void {
    this.sessionTimeout.stop();
    this.auth.logout().subscribe({
      next: () => this.router.navigate(["/login"]),
      error: () => this.router.navigate(["/login"]),
    });
  }

  private loadExpenses(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.expensesService.list().subscribe({
      next: (res) => {
        this.expenses.set(res.expenses);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(err?.error?.error ?? "No se pudieron cargar los gastos");
      },
    });
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}