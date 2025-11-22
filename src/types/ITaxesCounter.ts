import { ITransactionAPI, ITransactionStatement } from "./ITransaction"

export interface IQuarterAPIData {
  transactions: ITransactionAPI[]
  is_closed: boolean
}

export interface IQuarterStatementData {
  transactions: ITransactionStatement[]
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

export interface IIntermediateSummary {
  total_income_uah: string
  total_single_tax_uah: string
  total_military_tax_uah: string
  total_esv_uah: string
  total_tax_load_percent: string
  income_limit_exceeded: boolean
}
