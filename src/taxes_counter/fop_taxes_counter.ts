import fs from "fs"
import path from "path"
import { IQuarterData, IQuarterSummary, ITransaction, IYearSummary, TransactionTypeEnum } from "../types"
import {
  ESV_MIN_QUARTERLY,
  ESV_RATE,
  formatMoney,
  LIMIT_GROUP_3,
  loadClientInfo,
  loadYearTransactions,
  MILITARY_TAX_RATE,
  PAYMENT_DEADLINE_DAYS,
  REPORTING_DEADLINE_DAYS,
  safeAdd,
  TAX_RATE_GROUP_3_NON_VAT,
  YEAR,
} from "../utils"
import { get_usd_uah_rate } from "../api"

// === FOP config ===
export const FOP_CONFIG_2025 = {
  year: YEAR,
  group: 3,
  is_vat_payer: false,
  currency: "USD",
  esv_rate: ESV_RATE,
  esv_per_quarter: ESV_MIN_QUARTERLY,
  single_tax_rate: TAX_RATE_GROUP_3_NON_VAT,
  military_tax_rate: MILITARY_TAX_RATE,
  income_limit: LIMIT_GROUP_3,
  reporting_deadline_days: REPORTING_DEADLINE_DAYS,
  payment_deadline_days: PAYMENT_DEADLINE_DAYS,
}

// === core logic ===
export function get_fop_credit_transactions(): ITransaction[] {
  const client = loadClientInfo()
  const result: ITransaction[] = []

  for (const acc of client.accounts) {
    if (acc.type !== "fop" || acc.currency !== FOP_CONFIG_2025.currency) continue

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

  const year_start = new Date(`${FOP_CONFIG_2025.year}-01-01`)
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
  const file_path = path.resolve("dictionaries", "usd_uah_rate.json")
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

export async function calculate_fop_taxes(): Promise<{
  by_quarter: Record<string, IQuarterSummary>
  total: IYearSummary
}> {
  const quarters = get_fop_credits_by_quarter()
  const cfg = FOP_CONFIG_2025

  const DISABLED_QUARTERS = ["Q4"]

  const summary: Record<string, IQuarterSummary> = {}

  const quarter_end_dates = {
    Q1: `${cfg.year}-03-31`,
    Q2: `${cfg.year}-06-30`,
    Q3: `${cfg.year}-09-30`,
    Q4: `${cfg.year}-12-31`,
  }

  const esv_deadlines = {
    Q1: `${cfg.year}-04-20`,
    Q2: `${cfg.year}-07-20`,
    Q3: `${cfg.year}-10-20`,
    Q4: `${cfg.year + 1}-01-20`,
  }

  const rates_path = path.resolve("dictionaries", "usd_uah_rate.json")
  const rates = fs.existsSync(rates_path) ? JSON.parse(fs.readFileSync(rates_path, "utf-8")) : {}

  let total_income_raw = 0
  let total_single_tax_raw = 0
  let total_military_raw = 0
  let total_esv_raw = 0

  for (const [key, data] of Object.entries(quarters)) {
    if (!data.is_closed || DISABLED_QUARTERS.includes(key)) continue

    let income_raw = 0
    for (const tx of data.transactions) {
      const date = new Date(tx.date).toISOString().split("T")[0]
      const rate = rates[date] || 0
      income_raw = safeAdd(income_raw, tx.amount_in_account_currency * rate)
    }

    const single_tax_raw = income_raw * cfg.single_tax_rate
    const military_raw = income_raw * cfg.military_tax_rate
    const esv_raw = cfg.esv_per_quarter

    total_income_raw = safeAdd(total_income_raw, income_raw)
    total_single_tax_raw = safeAdd(total_single_tax_raw, single_tax_raw)
    total_military_raw = safeAdd(total_military_raw, military_raw)
    total_esv_raw = safeAdd(total_esv_raw, esv_raw)

    const end = new Date(quarter_end_dates[key as keyof typeof quarter_end_dates])
    const report_deadline = new Date(end)
    report_deadline.setDate(report_deadline.getDate() + cfg.reporting_deadline_days)
    const payment_deadline = new Date(end)
    payment_deadline.setDate(payment_deadline.getDate() + cfg.payment_deadline_days)

    summary[key] = {
      total_income_uah: formatMoney(income_raw),
      single_tax_uah: formatMoney(single_tax_raw),
      military_tax_uah: formatMoney(military_raw),
      esv_uah: formatMoney(esv_raw),
      is_quarter_closed: true,
      report_deadline_date: report_deadline.toISOString().split("T")[0],
      tax_payment_deadline_date: payment_deadline.toISOString().split("T")[0],
      esv_payment_deadline_date: esv_deadlines[key as keyof typeof esv_deadlines],
    }
  }

  const income_limit_exceeded = total_income_raw > cfg.income_limit
  const total_tax_load_percent =
    total_income_raw > 0 ? (((total_single_tax_raw + total_military_raw + total_esv_raw) / total_income_raw) * 100).toFixed(2) + "%" : "0%"

  const total: IYearSummary = {
    total_income_uah: formatMoney(total_income_raw),
    total_single_tax_uah: formatMoney(total_single_tax_raw),
    total_military_tax_uah: formatMoney(total_military_raw),
    total_esv_uah: formatMoney(total_esv_raw),
    total_tax_load_percent,
    income_limit_exceeded,
  }

  console.log({ by_quarter: summary, total })
  return { by_quarter: summary, total }
}

// run
;(async () => {
  await update_usd_uah_rates()
  await calculate_fop_taxes()
})()
