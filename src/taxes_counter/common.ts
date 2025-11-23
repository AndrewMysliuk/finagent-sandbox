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
import { detectFlagsForTxnApi, fromMoneyFormat, loadClientInfo, loadYearTransactions, safeAdd, toMoneyFormat } from "../utils"
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

export function getFopCreditsByQuarterFromAPI(): Record<number, Record<string, IQuarterAPIData>> {
  let txs = getFopCreditTransactionsAPI()
  txs = detectFlagsForTxnApi(txs)

  const result: Record<number, Record<string, IQuarterAPIData>> = {}

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  for (const tx of txs) {
    const d = new Date(tx.date)
    const year = d.getFullYear()
    const month = d.getMonth() + 1

    if (!result[year]) {
      result[year] = {
        Q1: { transactions: [], is_closed: false },
        Q2: { transactions: [], is_closed: false },
        Q3: { transactions: [], is_closed: false },
        Q4: { transactions: [], is_closed: false },
      }
    }

    if (month <= 3) result[year].Q1.transactions.push(tx)
    else if (month <= 6) result[year].Q2.transactions.push(tx)
    else if (month <= 9) result[year].Q3.transactions.push(tx)
    else result[year].Q4.transactions.push(tx)
  }

  for (const yearStr of Object.keys(result)) {
    const year = Number(yearStr)
    const q = result[year]

    if (year < currentYear) {
      q.Q1.is_closed = true
      q.Q2.is_closed = true
      q.Q3.is_closed = true
      q.Q4.is_closed = true
      continue
    }

    if (year === currentYear) {
      q.Q1.is_closed = currentMonth > 3
      q.Q2.is_closed = currentMonth > 6
      q.Q3.is_closed = currentMonth > 9
      q.Q4.is_closed = false
      continue
    }
  }

  return result
}

export function getFopCreditsByQuarterFromStatement(txs: ITransactionStatement[]): Record<number, Record<string, IQuarterStatementData>> {
  const result: Record<number, Record<string, IQuarterStatementData>> = {}

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  for (const tx of txs) {
    const d = new Date(tx.date)
    const year = d.getFullYear()
    const month = d.getMonth() + 1

    if (!result[year]) {
      result[year] = {
        Q1: { transactions: [], is_closed: false },
        Q2: { transactions: [], is_closed: false },
        Q3: { transactions: [], is_closed: false },
        Q4: { transactions: [], is_closed: false },
      }
    }

    if (month <= 3) result[year].Q1.transactions.push(tx)
    else if (month <= 6) result[year].Q2.transactions.push(tx)
    else if (month <= 9) result[year].Q3.transactions.push(tx)
    else result[year].Q4.transactions.push(tx)
  }

  for (const yearStr of Object.keys(result)) {
    const year = Number(yearStr)
    const q = result[year]

    if (year < currentYear) {
      q.Q1.is_closed = true
      q.Q2.is_closed = true
      q.Q3.is_closed = true
      q.Q4.is_closed = true
      continue
    }

    if (year === currentYear) {
      q.Q1.is_closed = currentMonth > 3
      q.Q2.is_closed = currentMonth > 6
      q.Q3.is_closed = currentMonth > 9
      q.Q4.is_closed = false
      continue
    }
  }

  return result
}

export function calculateIntermediateSummariesByYear(
  years: Record<number, Record<string, IQuarterSummary>>,
  income_limit: number
): Record<number, Record<string, IIntermediateSummary>> {
  const out: Record<number, Record<string, IIntermediateSummary>> = {}
  const ordered = ["Q1", "Q2", "Q3", "Q4"]

  for (const yearStr of Object.keys(years)) {
    const year = Number(yearStr)
    const quarter_data = years[year]

    let acc_income = 0
    let acc_single = 0
    let acc_military = 0
    let acc_esv = 0

    out[year] = {}

    for (const q of ordered) {
      const s = quarter_data[q]
      if (!s) continue

      acc_income = safeAdd(acc_income, fromMoneyFormat(s.total_income_uah))
      acc_single = safeAdd(acc_single, fromMoneyFormat(s.single_tax_uah))
      acc_military = safeAdd(acc_military, fromMoneyFormat(s.military_tax_uah))
      acc_esv = safeAdd(acc_esv, fromMoneyFormat(s.esv_uah))

      out[year][q] = {
        total_income_uah: toMoneyFormat(acc_income),
        total_single_tax_uah: toMoneyFormat(acc_single),
        total_military_tax_uah: toMoneyFormat(acc_military),
        total_esv_uah: toMoneyFormat(acc_esv),
        total_tax_load_percent: acc_income > 0 ? (((acc_single + acc_military + acc_esv) / acc_income) * 100).toFixed(2) + "%" : "0%",
        income_limit_exceeded: acc_income > income_limit,
      }
    }
  }

  return out
}
