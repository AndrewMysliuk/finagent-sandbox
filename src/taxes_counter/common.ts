import fs from "fs"
import path from "path"
import {
  IIntermediateSummary,
  IQuarterAPIData,
  IQuarterStatementData,
  IQuarterSummary,
  ITransactionAPI,
  ITransactionStatement,
  TransactionTypeEnum,
} from "../types"
import { fromMoneyFormat, loadClientInfo, loadYearTransactions, safeAdd, toMoneyFormat } from "../utils"
import { getUAHRate } from "../api"
import { BASE_FOP_CONFIG } from "./config"

// === core logic ===
export function getFopCreditTransactionsAPI(): ITransactionAPI[] {
  const client = loadClientInfo()
  const result: ITransactionAPI[] = []

  for (const acc of client.accounts) {
    if (acc.type !== "fop" || acc.currency !== BASE_FOP_CONFIG.currency) continue

    const account_id = `${acc.type.toLowerCase()}_${acc.currency.toLowerCase()}`
    const txs = loadYearTransactions(account_id)
    if (!txs.length) continue

    const credits = txs.filter((tx) => tx.type === TransactionTypeEnum.CREDIT)
    result.push(...credits)
  }

  return result
}

// === NBU rates handling ===
export async function updateUAHRates(from: string): Promise<Record<string, number>> {
  const txs = getFopCreditTransactionsAPI()

  const filename = `${from.toLowerCase()}_uah_rate.json`
  const file_path = path.resolve(__dirname, `../../dictionaries/${filename}`)

  const cache: Record<string, number> = fs.existsSync(file_path) ? JSON.parse(fs.readFileSync(file_path, "utf-8")) : {}

  const unique_dates = [
    ...new Set(txs.filter((tx) => tx.operation_currency === from).map((tx) => new Date(tx.date).toISOString().split("T")[0])),
  ]

  for (const date of unique_dates) {
    if (cache[date]) continue

    const rate = await getUAHRate(from, date)
    cache[date] = rate
  }

  fs.writeFileSync(file_path, JSON.stringify(cache, null, 2))

  return cache
}

export function getFopCreditsByQuarterFromAPI(): Record<string, IQuarterAPIData> {
  const all_txs = getFopCreditTransactionsAPI()

  const year_start = new Date(`${BASE_FOP_CONFIG.year}-01-01`)
  const now = new Date()

  const filtered = all_txs.filter((tx) => new Date(tx.date) >= year_start)

  const quarters: Record<string, IQuarterAPIData> = {
    Q1: { transactions: [], is_closed: false },
    Q2: { transactions: [], is_closed: false },
    Q3: { transactions: [], is_closed: false },
    Q4: { transactions: [], is_closed: false },
  }

  for (const tx of filtered) {
    const month = new Date(tx.date).getMonth() + 1
    if (month <= 3) quarters.Q1.transactions.push(tx)
    else if (month <= 6) quarters.Q2.transactions.push(tx)
    else if (month <= 9) quarters.Q3.transactions.push(tx)
    else quarters.Q4.transactions.push(tx)
  }

  const current_month = now.getMonth() + 1
  if (current_month > 3) quarters.Q1.is_closed = true
  if (current_month > 6) quarters.Q2.is_closed = true
  if (current_month > 9) quarters.Q3.is_closed = true
  if (current_month > 12) quarters.Q4.is_closed = true

  return quarters
}

export function getFopCreditsByQuarterFromStatement(statement_txs: ITransactionStatement[]): Record<string, IQuarterStatementData> {
  const year_start = new Date(`${BASE_FOP_CONFIG.year}-01-01`)
  const now = new Date()

  const filtered = statement_txs.filter((tx) => new Date(tx.date) >= year_start)

  const quarters: Record<string, IQuarterStatementData> = {
    Q1: { transactions: [], is_closed: false },
    Q2: { transactions: [], is_closed: false },
    Q3: { transactions: [], is_closed: false },
    Q4: { transactions: [], is_closed: false },
  }

  for (const tx of filtered) {
    const month = new Date(tx.date).getMonth() + 1
    if (month <= 3) quarters.Q1.transactions.push(tx)
    else if (month <= 6) quarters.Q2.transactions.push(tx)
    else if (month <= 9) quarters.Q3.transactions.push(tx)
    else quarters.Q4.transactions.push(tx)
  }

  const current_month = now.getMonth() + 1
  if (current_month > 3) quarters.Q1.is_closed = true
  if (current_month > 6) quarters.Q2.is_closed = true
  if (current_month > 9) quarters.Q3.is_closed = true
  if (current_month > 12) quarters.Q4.is_closed = true

  return quarters
}

export function calculateIntermediateSummaries(
  quarter_data: Record<string, IQuarterSummary>,
  income_limit: number
): Record<string, IIntermediateSummary> {
  const result: Record<string, IIntermediateSummary> = {}
  const ordered = ["Q1", "Q2", "Q3", "Q4"]

  let acc_income = 0
  let acc_single = 0
  let acc_military = 0
  let acc_esv = 0

  for (const q of ordered) {
    const s = quarter_data[q]
    if (!s) continue

    acc_income = safeAdd(acc_income, fromMoneyFormat(s.total_income_uah))
    acc_single = safeAdd(acc_single, fromMoneyFormat(s.single_tax_uah))
    acc_military = safeAdd(acc_military, fromMoneyFormat(s.military_tax_uah))
    acc_esv = safeAdd(acc_esv, fromMoneyFormat(s.esv_uah))

    result[q] = {
      total_income_uah: toMoneyFormat(acc_income),
      total_single_tax_uah: toMoneyFormat(acc_single),
      total_military_tax_uah: toMoneyFormat(acc_military),
      total_esv_uah: toMoneyFormat(acc_esv),
      total_tax_load_percent: acc_income > 0 ? (((acc_single + acc_military + acc_esv) / acc_income) * 100).toFixed(2) + "%" : "0%",
      income_limit_exceeded: acc_income > income_limit,
    }
  }

  return result
}
