import { IUkrsibbankTableRow, ITransactionStatement, TransactionTypeEnum, TransactionSourceEnum } from "../types"

export function normalizeUkrsibbankTransactionStatement(tx: IUkrsibbankTableRow): ITransactionStatement {
  const isCredit = tx.credit !== null && tx.credit > 0

  const amount = isCredit ? tx.credit! : tx.debit!
  const amountEquivalent = tx.account_currency === "UAH" ? amount : null

  return {
    date: tx.operation_datetime,
    description: tx.payment_details.trim(),
    type: isCredit ? TransactionTypeEnum.CREDIT : TransactionTypeEnum.DEBIT,
    amount_in_operation_currency: amount,
    operation_currency: tx.account_currency,
    amount_nbu_exchange_rate_equivalent: amountEquivalent,
    exchange_rate: null,
    counterparty_name: null,
    counterparty_iban: tx.counterparty_iban,
    balance_after: null,
    source: TransactionSourceEnum.STATEMENT,
    is_financial_aid: false,
    is_refund: false,
    is_fx_sale: false,
  }
}
