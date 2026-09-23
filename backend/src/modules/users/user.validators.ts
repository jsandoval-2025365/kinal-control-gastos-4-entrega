import { z } from "zod";
import { Role } from "@prisma/client";
import { registerSchema } from "../auth/auth.validators";

export const changeRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(5000),
});

/**
 * Creación de usuarios desde administración. Reutiliza las reglas de
 * validación del registro público (mismo email + contraseña) y añade un
 * `role` OPCIONAL: a diferencia del registro público (que SIEMPRE crea
 * USER, sección 12), un ADMIN sí puede decidir el rol del nuevo usuario.
 * Si no se envía, se asigna USER por defecto.
 */
export const createUserSchema = registerSchema.extend({
  role: z.nativeEnum(Role).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;