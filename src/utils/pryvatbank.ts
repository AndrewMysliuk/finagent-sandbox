import { IPryvatbankTableRow, ITransactionStatement, TransactionTypeEnum } from "../types"

export function normalizePryvatbankTransactionStatement(tx: IPryvatbankTableRow): ITransactionStatement {
  const isCredit = tx.amount > 0

  const amount = Math.abs(tx.amount)
  let amountEquivalent = tx.amount_uah_equivalent !== null ? Math.abs(tx.amount_uah_equivalent) : amount

  if (tx.amount_currency === "UAH" && (tx.amount_uah_equivalent === null || amount > amountEquivalent)) {
    amountEquivalent = amount
  }

  return {
    date: tx.operation_datetime,
    description: tx.payment_details,
    type: isCredit ? TransactionTypeEnum.CREDIT : TransactionTypeEnum.DEBIT,
    amount_in_operation_currency: amount,
    operation_currency: tx.amount_currency,
    amount_nbu_exchange_rate_equivalent: amountEquivalent,
    exchange_rate: null,
    counterparty_name: null,
    counterparty_iban: tx.counterparty_iban,
    balance_after: null,
    is_financial_aid: false,
    is_return: false,
  }
}
