import fs from "fs"
import path from "path"
import { IQuarterData, ITransaction, TransactionTypeEnum } from "../types"
import { loadClientInfo, loadYearTransactions } from "../utils"
import { get_usd_uah_rate } from "../api"
import { BASE_FOP_CONFIG } from "./config"

// === core logic ===
export function get_fop_credit_transactions(): ITransaction[] {
  const client = loadClientInfo()
  const result: ITransaction[] = []

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

export function get_fop_credits_by_quarter(): Record<string, IQuarterData> {
  const all_txs = get_fop_credit_transactions()

  const year_start = new Date(`${BASE_FOP_CONFIG.year}-01-01`)
  const now = new Date()

  const filtered = all_txs.filter((tx) => new Date(tx.date) >= year_start)

  const quarters: Record<string, IQuarterData> = {
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

// === NBU rates handling ===
export async function update_usd_uah_rates() {
  const txs = get_fop_credit_transactions()
  const file_path = path.resolve(__dirname, "../../dictionaries/usd_uah_rate.json")
  const cache = fs.existsSync(file_path) ? JSON.parse(fs.readFileSync(file_path, "utf-8")) : {}

  const unique_dates = [...new Set(txs.map((tx) => new Date(tx.date).toISOString().split("T")[0]))]

  for (const date of unique_dates) {
    if (cache[date]) continue
    const rate = await get_usd_uah_rate(date)
    cache[date] = rate
    console.log(`${date}: ${rate}`)
  }

  fs.writeFileSync(file_path, JSON.stringify(cache, null, 2))
  console.log(`File updated: ${file_path}`)
}
