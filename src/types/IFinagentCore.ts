export interface IV1AnalystLayerResponse {
  account_type: string
  currency: string
  income_total: string
  expense_total: string
  net_balance: string
  transactions_count: number
}

export interface IV2InterpreterResponse {
  account_type: string
  currency: string
  total_expense: string
  categories: Record<string, string>
  category_share_percent: Record<string, number>
  recurrent_payments: string[]
  top_category?: {
    name: string
    amount: string
    share: number
  }
}
