import { Router } from "express";
import * as expenseController from "./expense.controller";
import { authenticate } from "../../middleware/authenticate";

export const expenseRouter = Router();

expenseRouter.get("/", authenticate, expenseController.listExpenses);
expenseRouter.get("/:id", authenticate, expenseController.getExpense);
expenseRouter.post("/", authenticate, expenseController.createExpense);
expenseRouter.put("/:id", authenticate, expenseController.updateExpense);
expenseRouter.delete("/:id", authenticate, expenseController.deleteExpense);