export enum TransactionTypeEnum {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
}

export interface ITransaction {
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
}
