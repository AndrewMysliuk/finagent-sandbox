import {
  ESV_MIN_QUARTERLY,
  ESV_RATE,
  FIXED_TAX_GROUP_1,
  FIXED_TAX_GROUP_2,
  LIMIT_GROUP_1,
  LIMIT_GROUP_2,
  LIMIT_GROUP_3,
  MILITARY_TAX_RATE,
  PAYMENT_DEADLINE_DAYS,
  REPORTING_DEADLINE_DAYS,
  TAX_RATE_GROUP_3_NON_VAT,
  TAX_RATE_GROUP_3_VAT,
  YEAR,
} from "../utils"

// === FOP config ===
export const BASE_FOP_CONFIG = {
  year: YEAR,
  is_vat_payer: false,
  currency: "USD",
  esv_rate: ESV_RATE,
  esv_per_quarter: ESV_MIN_QUARTERLY,
  reporting_deadline_days: REPORTING_DEADLINE_DAYS,
  payment_deadline_days: PAYMENT_DEADLINE_DAYS,
}

export const FOP_CONFIG_2025_GROUP_1 = {
  ...BASE_FOP_CONFIG,
  group: 1,
  income_limit: LIMIT_GROUP_1,
  single_tax_monthly_max: FIXED_TAX_GROUP_1,
  military_tax_rate: 0,
  is_local_business: true,
}

export const FOP_CONFIG_2025_GROUP_2 = {
  ...BASE_FOP_CONFIG,
  group: 2,
  income_limit: LIMIT_GROUP_2,
  single_tax_monthly_max: FIXED_TAX_GROUP_2,
  military_tax_rate: 0,
  is_local_business: true,
}

export const FOP_CONFIG_2025_GROUP_3 = {
  ...BASE_FOP_CONFIG,
  group: 3,
  income_limit: LIMIT_GROUP_3,
  single_tax_rate_non_vat: TAX_RATE_GROUP_3_NON_VAT,
  single_tax_rate_vat: TAX_RATE_GROUP_3_VAT,
  military_tax_rate: MILITARY_TAX_RATE,
  is_vat_payer: false,
}
