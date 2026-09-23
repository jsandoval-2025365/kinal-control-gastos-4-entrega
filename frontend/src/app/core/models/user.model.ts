export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

/**
 * Datos para crear un usuario desde el panel de administración.
 * A diferencia del registro público, aquí el ADMIN puede elegir el rol.
 */
export interface CreateUserPayload {
  email: string;
  password: string;
  role: Role;
}