import { TextResult } from "pdf-parse"
import { IUkrsibbankTableRow } from "../types"
import { cleanNumber, parseDateTimeDDMMYYYY } from "../utils"

const UKRSIB_HEADER_COL = "дата опер."
const ACCOUNT_CURRENCY_REGEX = /Валюта:\s+([A-Z]{3})/i
const IBAN_REGEX = /[A-Z]{2}[0-9A-Z]{10,}/i

export function parseUkrsibbankStatement(rows: string[][], document: TextResult): IUkrsibbankTableRow[] {
  if (!rows || rows.length === 0) {
    throw new Error("UkrsibBank: no rows provided")
  }

  const firstPage = document.getPageText(1)
  const currencyMatch = firstPage.match(ACCOUNT_CURRENCY_REGEX)
  const accountCurrency = currencyMatch ? currencyMatch[1].toUpperCase() : "UAH"

  const headerIndex = rows.findIndex((cols) => cols?.[0]?.toLowerCase().includes(UKRSIB_HEADER_COL))
  if (headerIndex === -1) {
    throw new Error("UkrsibBank: header row not found")
  }

  const dataRows = rows.slice(headerIndex + 1)
  const body = dataRows.filter(
    (cols) => cols && cols.length === 6 && typeof cols[0] === "string" && typeof cols[5] === "string" && cols[5].trim() !== ""
  )

  return body.map((cols) => {
    const [rawDate, rawDoc, rawDebit, rawCredit, rawCounterparty, rawPurpose] = cols
    const flatDate = rawDate.replace(/\s+/g, " ").trim()
    const flatCounterparty = rawCounterparty ? rawCounterparty.replace(/\s+/g, " ").trim() : null

    let counterpartyIban: string | null = null
    if (flatCounterparty) {
      const ibanMatch = flatCounterparty.match(IBAN_REGEX)
      counterpartyIban = ibanMatch ? ibanMatch[0] : null
    }

    return {
      operation_datetime: parseDateTimeDDMMYYYY(flatDate),
      document_number: rawDoc ? rawDoc.replace(/\s+/g, "").trim() : null,
      debit: rawDebit ? cleanNumber(rawDebit) : null,
      credit: rawCredit ? cleanNumber(rawCredit) : null,
      counterparty_details: flatCounterparty,
      payment_details: rawPurpose ? rawPurpose.replace(/\s+/g, " ").trim() : "",
      account_currency: accountCurrency,
      counterparty_iban: counterpartyIban,
    }
  })
}
