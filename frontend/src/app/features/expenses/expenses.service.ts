import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { Expense, ExpensePayload } from "../../core/models/expense.model";

@Injectable({ providedIn: "root" })
export class ExpensesService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<{ expenses: Expense[] }> {
    return this.http.get<{ expenses: Expense[] }>(`${this.apiUrl}/expenses`);
  }

  create(payload: ExpensePayload): Observable<{ expense: Expense }> {
    return this.http.post<{ expense: Expense }>(`${this.apiUrl}/expenses`, payload);
  }

  update(id: string, payload: Partial<ExpensePayload>): Observable<{ expense: Expense }> {
    return this.http.put<{ expense: Expense }>(`${this.apiUrl}/expenses/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/expenses/${id}`);
  }
}