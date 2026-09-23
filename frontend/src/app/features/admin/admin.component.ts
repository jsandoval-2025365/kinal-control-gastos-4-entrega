import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AdminService } from "./admin.service";
import { Role, User } from "../../core/models/user.model";

@Component({
  selector: "app-admin",
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container" style="max-width: 640px;">
      <h2>Panel de administración</h2>
      <p><a routerLink="/dashboard">Volver al dashboard</a></p>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <h3>Agregar usuario</h3>
      @if (success()) {
        <p>Usuario creado correctamente.</p>
      }
      <form (ngSubmit)="onCreate()">
        <input
          type="email"
          name="newEmail"
          placeholder="Email"
          [(ngModel)]="newEmail"
          required
          email
          autocomplete="off"
        />
        <input
          type="password"
          name="newPassword"
          placeholder="Contraseña (mín. 10 caracteres)"
          [(ngModel)]="newPassword"
          required
          minlength="10"
          autocomplete="new-password"
        />
        <select name="newRole" [(ngModel)]="newRole" required>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button type="submit" [disabled]="creating()">
          {{ creating() ? "Creando..." : "Crear usuario" }}
        </button>
      </form>

      <h3>Usuarios</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom: 1px solid #ddd; padding: 8px;">Email</th>
            <th style="text-align:left; border-bottom: 1px solid #ddd; padding: 8px;">Rol</th>
            <th style="border-bottom: 1px solid #ddd; padding: 8px;">Acción</th>
          </tr>
        </thead>
        <tbody>
          @for (u of users(); track u.id) {
            <tr>
              <td style="padding: 8px;">{{ u.email }}</td>
              <td style="padding: 8px;">{{ u.role }}</td>
              <td style="padding: 8px;">
                <button
                  style="width:auto; padding: 6px 12px;"
                  (click)="toggleRole(u)"
                >
                  Hacer {{ u.role === "ADMIN" ? "USER" : "ADMIN" }}
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class AdminComponent implements OnInit {
  users = signal<User[]>([]);
  error = signal<string | null>(null);
  success = signal(false);

  newEmail = "";
  newPassword = "";
  newRole: Role = "USER";
  creating = signal(false);

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.adminService.listUsers().subscribe({
      next: (res) => this.users.set(res.users),
      error: (err) => this.error.set(err?.error?.error ?? "No se pudo cargar la lista"),
    });
  }

  onCreate(): void {
    this.error.set(null);
    this.success.set(false);
    this.creating.set(true);

    this.adminService
      .createUser({ email: this.newEmail, password: this.newPassword, role: this.newRole })
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.success.set(true);
          this.newEmail = "";
          this.newPassword = "";
          this.newRole = "USER";
          this.load(); // Refresca la tabla para mostrar el usuario creado
        },
        error: (err) => {
          this.creating.set(false);
          this.error.set(err?.error?.error ?? "No se pudo crear el usuario");
        },
      });
  }

  toggleRole(user: User): void {
    const newRole: Role = user.role === "ADMIN" ? "USER" : "ADMIN";
    this.adminService.changeRole(user.id, newRole).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.error ?? "No se pudo cambiar el rol"),
    });
  }
}