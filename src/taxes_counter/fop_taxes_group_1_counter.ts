import { IQuarterAPIData, IQuarterSummary, TransactionTypeEnum } from "../types"
import { DISABLED_QUARTERS, toMoneyFormat, safeAdd, safeSubtract } from "../utils"
import { updateUAHRates, getFopCreditsByQuarterFromAPI, calculateIntermediateSummariesByYear } from "./common"
import { FOP_CONFIG_2025_GROUP_1, getEsvDeadline, getQuarterEndDate } from "./config"

export function calculateQuarterDataFromAPIForGroup1(
  years: Record<number, Record<string, IQuarterAPIData>>,
  cfg: typeof FOP_CONFIG_2025_GROUP_1,
  rates: Record<string, number>,
  closed_periods: boolean
): Record<number, Record<string, IQuarterSummary>> {
  const out: Record<number, Record<string, IQuarterSummary>> = {}

  for (const yearStr of Object.keys(years)) {
    const year = Number(yearStr)
    const quarters = years[year]

    out[year] = {}

    for (const [quarter, data] of Object.entries(quarters)) {
      const should_calc = closed_periods ? data.is_closed : true
      if (!should_calc || DISABLED_QUARTERS.includes(quarter)) continue

      let income_raw = 0
      for (const tx of data.transactions) {
        const date = tx.date.slice(0, 10)
        const rate = rates[date] || 0

        const amountUAH = safeAdd(0, tx.amount_in_account_currency * rate)

        if (tx.type === TransactionTypeEnum.CREDIT) {
          income_raw = safeAdd(income_raw, amountUAH)
          continue
        }

        if (tx.type === TransactionTypeEnum.DEBIT) {
          income_raw = safeSubtract(income_raw, amountUAH)
          continue
        }
      }

      if (income_raw < 0) {
        throw new Error(
          `Quarter ${quarter} of ${year} produced negative income (${income_raw}). Probably too many DEBIT returns or wrong classification.`
        )
      }

      const single_tax_raw = cfg.single_tax_monthly_max * 3
      const military_raw = 0
      const esv_raw = cfg.esv_per_quarter

      const endDateStr = getQuarterEndDate(year, quarter)
      const end = new Date(endDateStr)

      const report_deadline = new Date(end)
      report_deadline.setDate(report_deadline.getDate() + cfg.reporting_deadline_days)

      const payment_deadline = new Date(end)
      payment_deadline.setDate(payment_deadline.getDate() + cfg.payment_deadline_days)

      out[year][quarter] = {
        total_income_uah: toMoneyFormat(income_raw),
        single_tax_uah: toMoneyFormat(single_tax_raw),
        military_tax_uah: toMoneyFormat(military_raw),
        esv_uah: toMoneyFormat(esv_raw),
        is_quarter_closed: data.is_closed,
        report_deadline_date: report_deadline.toISOString().split("T")[0],
        tax_payment_deadline_date: payment_deadline.toISOString().split("T")[0],
        esv_payment_deadline_date: getEsvDeadline(year, quarter),
      }
    }
  }

  return out
}

// === Standalone ===
// ;(async () => {
//   const rates = await updateUAHRates("USD")
//   const quarters = getFopCreditsByQuarterFromAPI()

//   const quarter_data = calculateQuarterDataFromAPIForGroup1(quarters, FOP_CONFIG_2025_GROUP_1, rates, false)
//   const intermediate_summaries = calculateIntermediateSummariesByYear(quarter_data, FOP_CONFIG_2025_GROUP_1.income_limit)

//   console.dir({ quarter_data, intermediate_summaries }, { depth: null })
// })()
