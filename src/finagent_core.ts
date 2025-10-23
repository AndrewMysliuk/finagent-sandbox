import fs from "fs"
import path from "path"

/**
 * Load client info (contains all accounts)
 */

interface IClientInfo {
  client_id: string
  name: string
  permissions: string
  accounts: IAccount[]
}

interface IAccount {
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

enum TransactionTypeEnum {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
}

interface ITransaction {
  id: string
  date: string
  description: string
  type: TransactionTypeEnum
  amount_in_account_currency: number
  account_currency: string
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
function safeAdd(a: number, b: number): number {
  return (Math.round(a * 100) + Math.round(b * 100)) / 100
}

/**
 * Format number with thousand separators and 2 decimals
 */
function formatMoney(value: number): string {
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

