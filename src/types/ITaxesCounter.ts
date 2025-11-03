import { ITransaction } from "./ITransaction"

export interface IQuarterData {
  transactions: ITransaction[]
  is_closed: boolean
}

export interface IQuarterSummary {
  total_income_uah: string
  single_tax_uah: string
  military_tax_uah: string
  esv_uah: string
  is_quarter_closed: boolean
  report_deadline_date: string
  tax_payment_deadline_date: string
  esv_payment_deadline_date: string
}

export interface IYearSummary {
  total_income_uah: string
  total_single_tax_uah: string
  total_military_tax_uah: string
  total_esv_uah: string
  total_tax_load_percent: string
  income_limit_exceeded: boolean
}

export interface ISingleTaxGroup1 {
  community: string | null
  year: number | null
  rate_percent: number | null
  group: number | null
  source_url: string | null
}
