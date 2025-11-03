import fs from "fs"
import path from "path"
import { IQuarterSummary, IYearSummary } from "../types"
import { formatMoney, safeAdd } from "../utils"
import { FOP_CONFIG_2025_GROUP_3 } from "./config"
import { get_fop_credits_by_quarter, update_usd_uah_rates } from "./common"

export async function calculate_fop_taxes(closed_periods = false): Promise<{
  by_quarter: Record<string, IQuarterSummary>
  total: IYearSummary
}> {
  const quarters = get_fop_credits_by_quarter()
  const cfg = FOP_CONFIG_2025_GROUP_3

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

  const rates_path = path.resolve(__dirname, "../../dictionaries/usd_uah_rate.json")
  const rates = fs.existsSync(rates_path) ? JSON.parse(fs.readFileSync(rates_path, "utf-8")) : {}

  let total_income_raw = 0
  let total_single_tax_raw = 0
  let total_military_raw = 0
  let total_esv_raw = 0

  for (const [key, data] of Object.entries(quarters)) {
    const should_calculate = closed_periods ? data.is_closed : true
    if (!should_calculate || DISABLED_QUARTERS.includes(key)) continue

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
      is_quarter_closed: data.is_closed,
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
