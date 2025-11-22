import { IQuarterSummary, IIntermediateSummary } from "../types"
import { DISABLED_QUARTERS, toMoneyFormat, safeAdd, fromMoneyFormat } from "../utils"
import { updateUAHRates, getFopCreditsByQuarterFromAPI } from "./common"
import { FOP_CONFIG_2025_GROUP_2, QUARTER_END_DATES, ESV_DEADLINES } from "./config"

export async function calculateFopTaxesGroup2(closed_periods = false): Promise<{
  quarter_data: Record<string, IQuarterSummary>
  intermediate_summaries: Record<string, IIntermediateSummary>
}> {
  const cfg = FOP_CONFIG_2025_GROUP_2
  const rates = await updateUAHRates("USD")
  const quarters = getFopCreditsByQuarterFromAPI()

  // QUARTER DATA

  const quarter_data: Record<string, IQuarterSummary> = {}

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

    const single_tax_raw = cfg.single_tax_monthly_max * 3
    const military_raw = 0
    const esv_raw = cfg.esv_per_quarter

    total_income_raw = safeAdd(total_income_raw, income_raw)
    total_single_tax_raw = safeAdd(total_single_tax_raw, single_tax_raw)
    total_military_raw = safeAdd(total_military_raw, military_raw)
    total_esv_raw = safeAdd(total_esv_raw, esv_raw)

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

  // INTERMEDIATE SUMMARIES (Q1, Q1+Q2, Q1+Q2+Q3, Q1+Q2+Q3+Q4)

  const intermediate_summaries: Record<string, IIntermediateSummary> = {}
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

    intermediate_summaries[q] = {
      total_income_uah: toMoneyFormat(acc_income),
      total_single_tax_uah: toMoneyFormat(acc_single),
      total_military_tax_uah: toMoneyFormat(acc_military),
      total_esv_uah: toMoneyFormat(acc_esv),
      total_tax_load_percent: acc_income > 0 ? (((acc_single + acc_military + acc_esv) / acc_income) * 100).toFixed(2) + "%" : "0%",
      income_limit_exceeded: acc_income > cfg.income_limit,
    }
  }

  return { quarter_data, intermediate_summaries }
}

// run standalone
;(async () => {
  const result = await calculateFopTaxesGroup2()

  console.dir(result, { depth: null })
})()
