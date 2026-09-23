import { z } from "zod";
import { ExpenseCategory } from "@prisma/client";

const amountSchema = z
  .number({ invalid_type_error: "El monto debe ser un número" })
  .positive("El monto debe ser mayor a 0")
  .finite("El monto no es válido")
  .max(999_999_999.99, "El monto es demasiado alto");

const categorySchema = z.nativeEnum(ExpenseCategory, {
  errorMap: () => ({ message: "Categoría de gasto inválida" }),
});

const descriptionSchema = z
  .string()
  .trim()
  .max(200, "La descripción es demasiado larga")
  .optional();

const dateSchema = z.coerce.date({
  errorMap: () => ({ message: "Fecha inválida" }),
});

export const createExpenseSchema = z.object({
  category: categorySchema,
  amount: amountSchema,
  description: descriptionSchema,
  date: dateSchema,
});

// Update parcial: cualquier subconjunto de los campos, pero al menos uno.
export const updateExpenseSchema = z
  .object({
    category: categorySchema.optional(),
    amount: amountSchema.optional(),
    description: descriptionSchema.optional(),
    date: dateSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;