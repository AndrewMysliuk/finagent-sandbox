export enum TransactionTypeEnum {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
}

export enum TransactionSourceEnum {
  STATEMENT = "STATEMENT",
  MANUAL = "MANUAL",
}

export interface ITransactionAPI {
  id: string
  date: string
  description: string
  type: TransactionTypeEnum
  amount_in_account_currency: number
  amount_in_operation_currency: number
  account_currency: string
  operation_currency: string
  cross_currency: boolean
  mcc: number
  balance_after: number
  is_financial_aid: boolean
  is_refund: boolean
  is_fx_sale: boolean
}

export interface ITransactionStatement {
  date: string
  description: string
  type: TransactionTypeEnum
  amount_in_operation_currency: number
  operation_currency: string
  amount_nbu_exchange_rate_equivalent: number | null
  exchange_rate: number | null
  counterparty_name: string | null
  counterparty_iban: string | null
  balance_after: number | null
  source: TransactionSourceEnum
  is_financial_aid: boolean
  is_refund: boolean
  is_fx_sale: boolean
}
