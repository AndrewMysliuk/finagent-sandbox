import { IQuarterSummary } from "../types"
import { DISABLED_QUARTERS, toMoneyFormat, safeAdd } from "../utils"
import { updateUAHRates, calculateIntermediateSummaries, getFopCreditsByQuarterFromAPI } from "./common"
import { FOP_CONFIG_2025_GROUP_3, QUARTER_END_DATES, ESV_DEADLINES } from "./config"

function calculateQuarterDataGroup3(
  quarters: ReturnType<typeof getFopCreditsByQuarterFromAPI>,
  cfg: typeof FOP_CONFIG_2025_GROUP_3,
  rates: Record<string, number>,
  closed_periods: boolean
): Record<string, IQuarterSummary> {
  const quarter_data: Record<string, IQuarterSummary> = {}

  for (const [key, data] of Object.entries(quarters)) {
    const should_calculate = closed_periods ? data.is_closed : true
    if (!should_calculate || DISABLED_QUARTERS.includes(key)) continue

    let income_raw = 0
    for (const tx of data.transactions) {
      const date = new Date(tx.date).toISOString().split("T")[0]
      const rate = rates[date] || 0
      income_raw = safeAdd(income_raw, tx.amount_in_account_currency * rate)
    }

    const single_tax_raw = income_raw * cfg[cfg.is_vat_payer ? "single_tax_rate_vat" : "single_tax_rate_non_vat"]
    const military_raw = income_raw * cfg.military_tax_rate
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

// run standalone
;(async () => {
  const rates = await updateUAHRates("USD")
  const quarters = getFopCreditsByQuarterFromAPI()

  const quarter_data = calculateQuarterDataGroup3(quarters, FOP_CONFIG_2025_GROUP_3, rates, false)
  const intermediate_summaries = calculateIntermediateSummaries(quarter_data, FOP_CONFIG_2025_GROUP_3.income_limit)

  console.dir({ quarter_data, intermediate_summaries }, { depth: null })
})()
