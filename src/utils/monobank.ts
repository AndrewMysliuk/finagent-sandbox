import { TransactionTypeEnum } from "../types"
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

export function normalizeMonobankTransaction(tx: any, accountCurrency: string): Record<string, any> {
  const accountAmount = roundCents(tx.amount)
  const operationAmount = roundCents(tx.operationAmount)

  const operationCurrencyCode = tx.currencyCode
  const operationCurrency = CURRENCY_CODES[operationCurrencyCode] || "UNKNOWN"

  const isCrossCurrency = operationCurrency !== accountCurrency
  const type = accountAmount < 0 ? TransactionTypeEnum.DEBIT : TransactionTypeEnum.CREDIT

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
    balance_after: roundCents(tx.balance),
  }
}
