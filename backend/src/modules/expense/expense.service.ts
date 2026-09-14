import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/AppError";
import { CreateExpenseInput, UpdateExpenseInput } from "./expense.validators";

type ExpenseRecord = {
  id: string;
  userId: string;
  category: string;
  amount: Prisma.Decimal;
  description: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Convierte el registro de Prisma a un DTO serializable en JSON.
 * `amount` viaja como Decimal en la base de datos (precisión exacta para
 * dinero); se convierte a number solo en el borde de salida hacia el
 * cliente, igual que en IncomeService.
 */
function toDTO(expense: ExpenseRecord) {
  return {
    id: expense.id,
    category: expense.category,
    amount: Number(expense.amount),
    description: expense.description,
    date: expense.date,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

/** Normaliza la descripción opcional: string vacío → null. */
function normalizeDescription(description: string | undefined): string | null {
  const trimmed = description?.trim();
  return trimmed ? trimmed : null;
}

export class ExpenseService {
  async listForUser(userId: string) {
    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });
    return expenses.map(toDTO);
  }

  /**
   * Control de propiedad (mismo principio que `IncomeService.getForUser`):
   * un usuario solo puede leer sus propios gastos. Sin bypass a ADMIN —
   * son datos financieros personales.
   */
  async getForUser(id: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw Errors.notFound("Gasto no encontrado");
    if (expense.userId !== userId) {
      throw Errors.forbidden("No tienes acceso a este recurso");
    }
    return toDTO(expense);
  }

  async create(userId: string, input: CreateExpenseInput) {
    const expense = await prisma.expense.create({
      data: {
        userId,
        category: input.category,
        amount: input.amount,
        description: normalizeDescription(input.description),
        date: input.date,
      },
    });
    return toDTO(expense);
  }

  async update(id: string, userId: string, input: UpdateExpenseInput) {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw Errors.notFound("Gasto no encontrado");
    if (existing.userId !== userId) {
      throw Errors.forbidden("No tienes acceso a este recurso");
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(input.category !== undefined && { category: input.category }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.description !== undefined && {
          description: normalizeDescription(input.description),
        }),
        ...(input.date !== undefined && { date: input.date }),
      },
    });
    return toDTO(expense);
  }

  async remove(id: string, userId: string) {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw Errors.notFound("Gasto no encontrado");
    if (existing.userId !== userId) {
      throw Errors.forbidden("No tienes acceso a este recurso");
    }
    await prisma.expense.delete({ where: { id } });
  }
}

export const expenseService = new ExpenseService();