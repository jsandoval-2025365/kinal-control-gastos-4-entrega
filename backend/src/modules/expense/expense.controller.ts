import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { expenseService } from "./expense.service";
import { createExpenseSchema, updateExpenseSchema } from "./expense.validators";

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const expenses = await expenseService.listForUser(req.user!.id);
  res.status(200).json({ expenses });
});

export const getExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expenseService.getForUser(req.params.id, req.user!.id);
  res.status(200).json({ expense });
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const input = createExpenseSchema.parse(req.body);
  const expense = await expenseService.create(req.user!.id, input);
  res.status(201).json({ expense });
});

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const input = updateExpenseSchema.parse(req.body);
  const expense = await expenseService.update(req.params.id, req.user!.id, input);
  res.status(200).json({ expense });
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  await expenseService.remove(req.params.id, req.user!.id);
  res.status(204).send();
});