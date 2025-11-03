import { fetchStructuredResponse } from "../api"
import singleTaxGroup1Schema from "../api/json_schema/single_tax_group_1.schema.json"
import { IQuarterSummary, ISingleTaxGroup1, IYearSummary } from "../types"
import { DISABLED_QUARTERS, formatMoney, safeAdd } from "../utils"
import { get_base_fop_data, update_usd_uah_rates } from "./common"
import { FOP_CONFIG_2025_GROUP_1 } from "./config"

export async function getSingleTaxGroup1Info(): Promise<ISingleTaxGroup1> {
  const prompt = `Знайди офіційне рішення або документ,
у якому вказана ставка єдиного податку для 1-ї групи фізичних осіб-підприємців у Криворізькій міській територіальній громаді.
Мене цікавить, який відсоток встановлений цією громадою і з якого року він діє.`

  const response = await fetchStructuredResponse<ISingleTaxGroup1>({
    prompt,
    schema: singleTaxGroup1Schema,
    schemaName: "single_tax_group_1",
    description: "JSON-об'єкт з даними про ставку єдиного податку у Криворізькій міській територіальній громаді",
  })

  console.log("GPT Response: ", response)
  return response
}

export async function calculate_fop_taxes_group1(closed_periods = false): Promise<{
  by_quarter: Record<string, IQuarterSummary>
  total: IYearSummary
}> {
  const cfg = FOP_CONFIG_2025_GROUP_1
  const { quarters, quarter_end_dates, esv_deadlines, rates } = get_base_fop_data()

  const summary: Record<string, IQuarterSummary> = {}

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

  return { by_quarter: summary, total }
}

// run standalone
;(async () => {
  await update_usd_uah_rates()
  const { by_quarter, total } = await calculate_fop_taxes_group1()
  console.log({ by_quarter, total })
})()
