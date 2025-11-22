import { IMonobankTableRow, ITransactionAPI, ITransactionStatement, TransactionTypeEnum } from "../types"
import { CURRENCY_CODES } from "./consts"
import { roundCents } from "./helpers"

export function normalizeMonobankClientInfo(data: any) {
  return {
    client_id: data.clientId,
    name: data.name,
    permissions: data.permissions,
    accounts: (data.accounts || []).map((acc: any) => {
      const currency = CURRENCY_CODES[acc.currencyCode] || "UNKNOWN"
      return {
        id: acc.id,
        iban: acc.iban,
        type: acc.type,
        currency,
        balance: roundCents(acc.balance),
        credit_limit: roundCents(acc.creditLimit),
        masked_pan: acc.maskedPan || [],
      }
    }),
  }
}

export function normalizeMonobankTransactionAPI(tx: any, accountCurrency: string): ITransactionAPI {
  const accountAmount = roundCents(Math.abs(tx.amount))
  const operationAmount = roundCents(Math.abs(tx.operationAmount))

  const operationCurrencyCode = tx.currencyCode
  const operationCurrency = CURRENCY_CODES[operationCurrencyCode] || "UNKNOWN"

  const isCrossCurrency = operationCurrency !== accountCurrency

  const type = tx.amount < 0 ? TransactionTypeEnum.DEBIT : TransactionTypeEnum.CREDIT

  return {
    id: tx.id,
    date: new Date(tx.time * 1000).toISOString().replace("T", " ").split(".")[0],
    description: tx.description || "",
    type,
    amount_in_account_currency: accountAmount,
    amount_in_operation_currency: operationAmount,
    account_currency: accountCurrency,
    operation_currency: operationCurrency,
    cross_currency: isCrossCurrency,
    mcc: tx.mcc,
    balance_after: roundCents(Math.abs(tx.balance)),
  }
}

export function normalizeMonobankTransactionStatement(tx: IMonobankTableRow): ITransactionStatement {
  const isCredit = tx.operation_amount > 0

  const amount = Math.abs(tx.operation_amount)
  const amountEquivalent = tx.amount_nbu_exchange_rate_equivalent !== null ? Math.abs(tx.amount_nbu_exchange_rate_equivalent) : null

  return {
    date: tx.date_and_time,
    description: tx.purpose_of_payment,
    type: isCredit ? TransactionTypeEnum.CREDIT : TransactionTypeEnum.DEBIT,
    amount_in_operation_currency: amount,
    operation_currency: tx.currency,
    amount_nbu_exchange_rate_equivalent: amountEquivalent,
    exchange_rate: tx.exchange_rate,
    counterparty_name: tx.counterparty_name,
    counterparty_iban: tx.counterparty_iban,
    balance_after: tx.balance !== null ? Math.abs(tx.balance) : null,
    is_financial_aid: false,
    is_return: false,
  }
}
