import { Component, HostListener, OnInit, computed, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { SessionTimeoutService } from "../../core/auth/session-timeout.service";
import { NotificationService } from "../../shared/coming-soon/notifications/notification.service";
import { IncomeService } from "../income/income.service";
import { ExpensesService } from "../expenses/expenses.service";
import {
  Income,
  groupBySource,
  monthOverMonthDeltaPct,
  sumIncomesForMonth,
} from "../../core/models/income.model";
import {
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_LABELS,
  Expense,
  ExpenseCategory,
  groupExpensesByCategory,
  monthOverMonthExpenseDeltaPct,
  sumExpensesForMonth,
} from "../../core/models/expense.model";

interface MonthPoint {
  label: string;
  income: number;
  expense: number;
}

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.css",
})
export class DashboardComponent implements OnInit {
  /** Controla la visibilidad del menú desplegable del usuario. */
  userMenuOpen = signal(false);

  incomes = signal<Income[]>([]);
  expenses = signal<Expense[]>([]);
  loading = signal(true);

  /** Nombre del mes actual para los textos del encabezado y tarjetas. */
  readonly monthName = (() => {
    const raw = new Intl.DateTimeFormat("es-GT", { month: "long", year: "numeric" }).format(new Date());
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  // --- KPIs reales del mes en curso ---
  readonly incomeMonth = computed(() => sumIncomesForMonth(this.incomes()));
  readonly expenseMonth = computed(() => sumExpensesForMonth(this.expenses()));
  readonly incomeDeltaPct = computed(() => monthOverMonthDeltaPct(this.incomes()));
  readonly expenseDeltaPct = computed(() => monthOverMonthExpenseDeltaPct(this.expenses()));

  /** Dinero libre del mes: ingresos − gastos. */
  readonly freeMonth = computed(() => this.incomeMonth() - this.expenseMonth());
  /** % del mes que queda libre (0–100) para el anillo. */
  readonly freePct = computed(() => {
    const income = this.incomeMonth();
    if (income <= 0) return 0;
    const pct = (this.freeMonth() / income) * 100;
    return Math.min(100, Math.max(0, pct));
  });
  /** stroke-dashoffset del anillo (circunferencia ≈ 238.7 para r=38). */
  readonly ringOffset = computed(() => 238.7 * (1 - this.freePct() / 100));

  /** Ingresos vs. gastos de los últimos 6 meses (para el gráfico de barras). */
  readonly lastSixMonths = computed<MonthPoint[]>(() => {
    const now = new Date();
    const points: MonthPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      points.push({
        label: new Intl.DateTimeFormat("es-GT", { month: "short" }).format(ref),
        income: sumIncomesForMonth(this.incomes(), ref),
        expense: sumExpensesForMonth(this.expenses(), ref),
      });
    }
    return points;
  });

  /** Escala las alturas de las barras respecto al valor máximo (110px = máximo). */
  readonly chartMax = computed(() =>
    Math.max(1, ...this.lastSixMonths().flatMap((p) => [p.income, p.expense]))
  );

  /** Gastos del mes actual agrupados por categoría (para barras y donut). */
  readonly monthlyCategoryBreakdown = computed(() => {
    const now = new Date();
    const monthly = this.expenses().filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    return groupExpensesByCategory(monthly);
  });

  /** Donut: cada categoría con su % y su desplazamiento acumulado en la circunferencia (≈100). */
  readonly donutSegments = computed(() => {
    const total = this.expenseMonth();
    let accumulated = 0;
    return this.monthlyCategoryBreakdown().map((item, index) => {
      const pct = total > 0 ? (item.total / total) * 100 : 0;
      const segment = {
        category: item.category,
        label: EXPENSE_CATEGORY_LABELS[item.category as ExpenseCategory] ?? item.category,
        color: EXPENSE_CATEGORY_COLORS[index % EXPENSE_CATEGORY_COLORS.length],
        pct,
        offset: 25 - accumulated,
      };
      accumulated += pct;
      return segment;
    });
  });

  /** Fuentes de ingreso activas (agrupadas por `source`). */
  readonly incomeSources = computed(() => groupBySource(this.incomes()));

  constructor(
    public auth: AuthService,
    private router: Router,
    private sessionTimeout: SessionTimeoutService,
    private notifications: NotificationService,
    private incomeService: IncomeService,
    private expensesService: ExpensesService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  /** Iniciales del avatar, calculadas a partir del email (no hay campo "nombre" en el modelo). */
  get initials(): string {
    const email = this.auth.currentUser()?.email ?? "";
    return email.slice(0, 2).toUpperCase();
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen.update((open) => !open);
  }

  /** Cierra el menú si el usuario hace click fuera de él. */
  @HostListener("document:click")
  closeUserMenu(): void {
    if (this.userMenuOpen()) {
      this.userMenuOpen.set(false);
    }
  }

  goTo(path: string): void {
    this.userMenuOpen.set(false);
    this.router.navigate([path]);
  }

  onLogout(): void {
    this.sessionTimeout.stop();
    this.auth.logout().subscribe({
      next: () => this.router.navigate(["/login"]),
      error: () => this.router.navigate(["/login"]),
    });
  }

  // --- Presentación ---
  formatAmount(n: number): string {
    return "Q " + n.toLocaleString("es-GT", { maximumFractionDigits: 2 });
  }

  formatPct(n: number): string {
    return `${Math.abs(n).toFixed(1)}%`;
  }

  barHeight(value: number): number {
    return Math.round((value / this.chartMax()) * 110);
  }

  private loadDashboardData(): void {
    this.loading.set(true);
    // Se cargan ambos módulos en paralelo; los errores se muestran con el
    // sistema de notificaciones existente (no se duplica manejo de errores).
    this.incomeService.list().subscribe({
      next: (res) => this.incomes.set(res.incomes),
      error: () => this.notifications.error("No se pudieron cargar los ingresos"),
    });
    this.expensesService.list().subscribe({
      next: (res) => {
        this.expenses.set(res.expenses);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifications.error("No se pudieron cargar los gastos");
      },
    });
  }

  frequencyLabel(freq: string): string {
    const labels: Record<string, string> = { MENSUAL: "Mensual", VARIABLE: "Variable", UNICA: "Única" };
    return labels[freq] ?? freq;
  }

  categoryLabel(category: string): string {
    return EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] ?? category;
  }
}