import { supabase } from '../lib/supabase';
import type {
  Expense,
  ExpenseCategory,
  ExpenseAllocationType,
  ExpensePaymentMethod,
  ExpenseStatus,
  UUID,
} from '../types';

export interface CreateExpenseInput {
  category: ExpenseCategory;
  title: string;
  amount: number;
  expense_date: string;
  allocation_type: ExpenseAllocationType;
  tanker_id?: UUID;
  vehicle_registration?: string;
  payee_vendor?: string;
  payment_method?: ExpensePaymentMethod;
  reference_number?: string;
  status?: ExpenseStatus;
  notes?: string;
  userId?: UUID;
}

export interface UpdateExpenseInput {
  category?: ExpenseCategory;
  title?: string;
  amount?: number;
  expense_date?: string;
  allocation_type?: ExpenseAllocationType;
  tanker_id?: UUID | null;
  vehicle_registration?: string | null;
  payee_vendor?: string;
  payment_method?: ExpensePaymentMethod;
  reference_number?: string;
  status?: ExpenseStatus;
  notes?: string;
}

export interface ExpenseSummary {
  totalAmount: number;
  totalThisMonth: number;
  totalTruckExpenses: number;
  totalDepotExpenses: number;
  count: number;
  pendingCount: number;
}

const LOCAL_STORAGE_KEY = 'petrodepot_local_expenses_cache';

function getLocalExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalExpenses(list: Expense[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    // ignore
  }
}

export async function getExpenses(): Promise<Expense[]> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, tanker:tankers(*)')
      .order('expense_date', { ascending: false });

    if (error) {
      if (error.message.includes('relation "expenses" does not exist') || error.message.includes('404')) {
        console.warn('Expenses table not created yet. Using local storage fallback.');
        return getLocalExpenses();
      }
      throw error;
    }

    // Merge with any local cache if present
    const local = getLocalExpenses();
    if (local.length > 0) {
      const serverIds = new Set((data || []).map((e: any) => e.id));
      const unsynced = local.filter((l) => !serverIds.has(l.id));
      return [...(data || []), ...unsynced] as Expense[];
    }

    return (data as Expense[]) || [];
  } catch (e: any) {
    console.warn('Fallback to local storage for expenses:', e.message);
    return getLocalExpenses();
  }
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  if (input.amount <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }
  if (!input.title || input.title.trim().length < 2) {
    throw new Error('Please enter a description or title for the expense.');
  }

  const randomNum = Math.floor(100 + Math.random() * 900);
  const expenseNumber = `EXP-2026-${randomNum}`;

  const payload: Record<string, any> = {
    expense_number: expenseNumber,
    category: input.category,
    title: input.title.trim(),
    amount: input.amount,
    expense_date: input.expense_date || new Date().toISOString().split('T')[0],
    allocation_type: input.allocation_type,
    tanker_id: input.allocation_type === 'TRUCK' ? input.tanker_id || null : null,
    vehicle_registration: input.vehicle_registration?.trim() || null,
    payee_vendor: input.payee_vendor?.trim() || null,
    payment_method: input.payment_method || 'BANK_TRANSFER',
    reference_number: input.reference_number?.trim() || null,
    status: input.status || 'PAID',
    notes: input.notes?.trim() || null,
    created_by: input.userId || null,
  };

  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert(payload)
      .select('*, tanker:tankers(*)')
      .single();

    if (error) {
      if (error.message.includes('relation "expenses" does not exist')) {
        // Fallback local save
        const fallback: Expense = {
          id: `local-${Date.now()}` as any,
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Expense;
        const current = getLocalExpenses();
        saveLocalExpenses([fallback, ...current]);
        return fallback;
      }
      throw error;
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: input.userId,
      action: 'EXPENSE_RECORDED',
      entity_type: 'expenses',
      entity_id: data.id,
      new_values: { expense_number: expenseNumber, amount: input.amount, category: input.category },
      description: `Recorded expense ${expenseNumber}: KES ${input.amount.toLocaleString()} for ${input.title} [Category: ${input.category}${input.vehicle_registration ? ` | Truck: ${input.vehicle_registration}` : ''}]`,
    });

    return data as Expense;
  } catch (err: any) {
    if (err.message && err.message.includes('relation "expenses" does not exist')) {
      const fallback: Expense = {
        id: `local-${Date.now()}` as any,
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Expense;
      const current = getLocalExpenses();
      saveLocalExpenses([fallback, ...current]);
      return fallback;
    }
    throw err;
  }
}

export async function deleteExpense(id: UUID): Promise<void> {
  try {
    await supabase.from('expenses').delete().eq('id', id);
  } catch (e) {
    // ignore
  }

  // Also remove from local cache
  const local = getLocalExpenses();
  saveLocalExpenses(local.filter((l) => l.id !== id));
}

export async function getExpenseSummary(): Promise<ExpenseSummary> {
  const expenses = await getExpenses();
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  let totalAmount = 0;
  let totalThisMonth = 0;
  let totalTruckExpenses = 0;
  let totalDepotExpenses = 0;
  let pendingCount = 0;

  for (const exp of expenses) {
    const amt = Number(exp.amount || 0);
    totalAmount += amt;

    if (exp.expense_date && exp.expense_date.startsWith(currentMonthStr)) {
      totalThisMonth += amt;
    }

    if (exp.allocation_type === 'TRUCK' || exp.vehicle_registration || exp.tanker_id) {
      totalTruckExpenses += amt;
    } else {
      totalDepotExpenses += amt;
    }

    if (exp.status === 'PENDING') {
      pendingCount++;
    }
  }

  return {
    totalAmount,
    totalThisMonth,
    totalTruckExpenses,
    totalDepotExpenses,
    count: expenses.length,
    pendingCount,
  };
}
