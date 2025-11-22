import { IQuarterAPIData, IQuarterSummary } from "../types"
import { DISABLED_QUARTERS, toMoneyFormat, safeAdd } from "../utils"
import { updateUAHRates, getFopCreditsByQuarterFromAPI, calculateIntermediateSummaries } from "./common"
import { FOP_CONFIG_2025_GROUP_1, QUARTER_END_DATES, ESV_DEADLINES } from "./config"

export function calculateQuarterDataFromAPIForGroup1(
  quarters: Record<string, IQuarterAPIData>,
  cfg: typeof FOP_CONFIG_2025_GROUP_1,
  rates: Record<string, number>,
  closed_periods: boolean
): Record<string, IQuarterSummary> {
  const quarter_data: Record<string, IQuarterSummary> = {}

  for (const [key, data] of Object.entries(quarters)) {
    const should_calculate = closed_periods ? data.is_closed : true
    if (!should_calculate || DISABLED_QUARTERS.includes(key)) continue

    const income_raw = data.transactions.reduce((sum, tx) => {
      const date = tx.date.slice(0, 10)
      const rate = rates[date] || 0
      return safeAdd(sum, tx.amount_in_account_currency * rate)
    }, 0)

    const single_tax_raw = cfg.single_tax_monthly_max * 3
    const military_raw = 0
    const esv_raw = cfg.esv_per_quarter

    const end = new Date(QUARTER_END_DATES[key as keyof typeof QUARTER_END_DATES])

    const report_deadline = new Date(end)
    report_deadline.setDate(report_deadline.getDate() + cfg.reporting_deadline_days)

    const payment_deadline = new Date(end)
    payment_deadline.setDate(payment_deadline.getDate() + cfg.payment_deadline_days)

    quarter_data[key] = {
      total_income_uah: toMoneyFormat(income_raw),
      single_tax_uah: toMoneyFormat(single_tax_raw),
      military_tax_uah: toMoneyFormat(military_raw),
      esv_uah: toMoneyFormat(esv_raw),
      is_quarter_closed: data.is_closed,
      report_deadline_date: report_deadline.toISOString().split("T")[0],
      tax_payment_deadline_date: payment_deadline.toISOString().split("T")[0],
      esv_payment_deadline_date: ESV_DEADLINES[key as keyof typeof ESV_DEADLINES],
    }
  }

  return quarter_data
}

// === Standalone ===
;(async () => {
  const rates = await updateUAHRates("USD")
  const quarters = getFopCreditsByQuarterFromAPI()

  const quarter_data = calculateQuarterDataFromAPIForGroup1(quarters, FOP_CONFIG_2025_GROUP_1, rates, false)
  const intermediate_summaries = calculateIntermediateSummaries(quarter_data, FOP_CONFIG_2025_GROUP_1.income_limit)

  console.dir({ quarter_data, intermediate_summaries }, { depth: null })
})()
