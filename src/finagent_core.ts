import fs from "fs"
import path from "path"
import { runLLM } from "./gpt_model"

/**
 * Load MCC codes dictionary
 */
export function loadMccDictionary(): Record<number, string> {
  const filePath = path.resolve(process.cwd(), "dictionaries", "mcc_codes.json")
  if (!fs.existsSync(filePath)) throw new Error("mcc_codes.json not found")
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}

/**
 * Load client info (contains all accounts)
 */

export interface IClientInfo {
  client_id: string
  name: string
  permissions: string
  accounts: IAccount[]
}

export interface IAccount {
  id: string
  iban: string
  type: string
  currency: string
  balance: number
  credit_limit: number
  masked_pan: string[]
}

export function loadClientInfo(): IClientInfo {
  const filePath = path.resolve(process.cwd(), "data", "client_info.json")
  if (!fs.existsSync(filePath)) throw new Error("client_info.json not found")
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}

/**
 * Load yearly transactions for a specific account
 */

export enum TransactionTypeEnum {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
}

export interface ITransaction {
  id: string
  date: string
  description: string
  type: TransactionTypeEnum
  amount_in_account_currency: number
  amount_in_operation_currency: number
  account_currency: string
  operation_currency: string
  cross_currency: boolean
  mcc: number
  balance_after: number
}

export function loadYearTransactions(accountId: string): ITransaction[] {
  const basePath = path.resolve(process.cwd(), "data")
  const filePath = path.join(basePath, `transactions_${accountId}_year.json`)

  if (!fs.existsSync(filePath)) return []
  try {
    const content = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(content)
  } catch {
    console.warn(`Failed to parse ${filePath}`)
    return []
  }
}

/**
 * Safe add with rounding to 2 decimals using integer cents
 */
export function safeAdd(a: number, b: number): number {
  return (Math.round(a * 100) + Math.round(b * 100)) / 100
}

/**
 * Format number with thousand separators and 2 decimals
 */
export function formatMoney(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * === Finagent Brain v1 Layer (Analyst) ===
 * Financial-safe version with cent precision arithmetic
 */

interface IV1AnalystLayerResponse {
  account_type: string
  currency: string
  income_total: string
  expense_total: string
  net_balance: string
  transactions_count: number
}

export function runV1AnalystLayer(): Record<string, IV1AnalystLayerResponse> {
  const client = loadClientInfo()
  const results: Record<string, IV1AnalystLayerResponse> = {}

  for (const acc of client.accounts) {
    const accountId = `${acc.type.toLowerCase()}_${acc.currency.toLowerCase()}`
    const txs = loadYearTransactions(accountId)
    if (!txs.length) {
      console.log(`No data for ${acc.type.toUpperCase()} (${acc.currency})`)
      continue
    }

    let income = 0
    let expense = 0

    for (const t of txs) {
      if (t.type === TransactionTypeEnum.CREDIT) {
        income = safeAdd(income, t.amount_in_account_currency)
      } else if (t.type === TransactionTypeEnum.DEBIT) {
        expense = safeAdd(expense, Math.abs(t.amount_in_account_currency))
      }
    }

    const net = safeAdd(income, -expense)

    results[acc.id] = {
      account_type: acc.type,
      currency: acc.currency,
      income_total: formatMoney(income),
      expense_total: formatMoney(expense),
      net_balance: formatMoney(net),
      transactions_count: txs.length,
    } as IV1AnalystLayerResponse
  }

  console.log(JSON.stringify(results, null, 2))
  return results
}

/**
 * === Finagent Brain v2.1 Layer (Interpreter) ===
 * Categorization and recurrent expense analysis (improved)
 */

interface IV2InterpreterResponse {
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

/** Normalize transaction description */
function normalizeDescription(desc: string): string {
  return desc
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґё\s]/gi, "") // remove special chars
    .replace(/\s+/g, " ") // collapse multiple spaces
}

/** Detect recurrent payments (present in >=2 months, not stores or markets) */
function detectRecurrentPayments(txs: ITransaction[]): string[] {
  const monthly: Record<string, Set<number>> = {}

  for (const t of txs) {
    const desc = normalizeDescription(t.description)
    const month = new Date(t.date).getMonth()
    if (!monthly[desc]) monthly[desc] = new Set()
    monthly[desc].add(month)
  }

  return Object.entries(monthly)
    .filter(([_, months]) => months.size >= 2)
    .filter(([desc]) => !/(market|shop|store|super|express|gas|fuel|beer|food|grocery|mart|mini|alcohol|liquor|hyper)/.test(desc))
    .map(([desc]) => desc)
}

export function runV2InterpreterLayer(): Record<string, IV2InterpreterResponse> {
  const client = loadClientInfo()
  const MCC_MAP = loadMccDictionary()
  const results: Record<string, IV2InterpreterResponse> = {}

  for (const acc of client.accounts) {
    const accountId = `${acc.type.toLowerCase()}_${acc.currency.toLowerCase()}`
    const txs = loadYearTransactions(accountId)
    if (!txs.length) continue

    const expenseTxs = txs.filter((t) => t.type === TransactionTypeEnum.DEBIT)
    if (!expenseTxs.length) continue

    const categoryTotals: Record<string, number> = {}

    // === 1. Aggregate expenses by MCC ===
    for (const t of expenseTxs) {
      const amount = Math.abs(t.amount_in_account_currency)
      const category = MCC_MAP[t.mcc] || "Uncategorized"
      categoryTotals[category] = safeAdd(categoryTotals[category] || 0, amount)
    }

    // === 2. Compute totals ===
    let totalExpense = 0
    for (const val of Object.values(categoryTotals)) totalExpense = safeAdd(totalExpense, val)

    // === 3. Format results ===
    const formattedCategories: Record<string, string> = {}
    const sharePercent: Record<string, number> = {}
    for (const [cat, amount] of Object.entries(categoryTotals)) {
      formattedCategories[cat] = formatMoney(amount)
      sharePercent[cat] = Math.round((amount / totalExpense) * 1000) / 10
    }

    // === 4. Detect recurrent patterns ===
    const recurrent = detectRecurrentPayments(expenseTxs)

    // === 5. Find top spending category ===
    const topCatEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
    const topCategory = topCatEntry
      ? {
          name: topCatEntry[0],
          amount: formatMoney(topCatEntry[1]),
          share: sharePercent[topCatEntry[0]],
        }
      : undefined

    // === 6. Save account report ===
    results[acc.id] = {
      account_type: acc.type,
      currency: acc.currency,
      total_expense: formatMoney(totalExpense),
      categories: formattedCategories,
      category_share_percent: sharePercent,
      recurrent_payments: recurrent,
      top_category: topCategory,
    }
  }

  console.log(JSON.stringify(results, null, 2))
  return results
}
