import {
  ESV_MIN_QUARTERLY,
  ESV_RATE,
  LIMIT_GROUP_3,
  MILITARY_TAX_RATE,
  PAYMENT_DEADLINE_DAYS,
  REPORTING_DEADLINE_DAYS,
  TAX_RATE_GROUP_3_NON_VAT,
  YEAR,
} from "../utils"

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
