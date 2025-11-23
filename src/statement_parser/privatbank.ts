import { TextResult } from "pdf-parse"
import { IPryvatbankTableRow } from "../types"
import { cleanNumber, parseDateTimeDDMMYYYY } from "../utils"

const UA_HEADER_FIRST = "Найменування"
const UA_HEADER_SECOND = "РНОКПП"

export function parsePryvatbankStatement(rows: string[][], document: TextResult): IPryvatbankTableRow[] {
  const firstPage = document.getPageText(1)
  const detectedCurrency = detectCurrencyFromDocument(firstPage)

  const isCurrencyAccount = rows.some((cols) =>
    cols?.some((c) => c?.toLowerCase().includes("сума") && c?.toLowerCase().includes("екв") && c?.toLowerCase().includes("грн"))
  )
  const headerEndIndex = rows.findIndex((cols) =>
    cols?.some((c) => c?.toLowerCase().includes(UA_HEADER_FIRST.toLowerCase()) && c?.toLowerCase().includes(UA_HEADER_SECOND.toLowerCase()))
  )

  if (headerEndIndex === -1) {
    throw new Error("PrivatBank: header not found")
  }

  const dataRows = rows.slice(headerEndIndex + 1)
  const expectedCols = isCurrencyAccount ? 8 : 7
  const body = dataRows.filter((cols) => cols && cols.length === expectedCols)

  return body.map((cols) => {
    if (isCurrencyAccount) {
      const [rawDoc, rawDate, rawAmount, rawAmountUAH, rawPurpose, _unusedName, _unusedCounterpartyName, rawAccountInfo] = cols

      const flatAcc = rawAccountInfo ? rawAccountInfo.replace(/\s+/g, " ") : null
      const ibanMatch = flatAcc ? flatAcc.match(/[A-Z]{2}[0-9A-Z]{10,}/i) : null

      return {
        document_number: rawDoc ? rawDoc.replace(/\s+/g, "").trim() : null,
        operation_datetime: parseDateTimeDDMMYYYY(rawDate),
        amount: cleanNumber(rawAmount)!,
        amount_currency: detectedCurrency,
        amount_uah_equivalent: cleanNumber(rawAmountUAH),
        payment_details: rawPurpose ? rawPurpose.replace(/\s+/g, " ").trim() : "",
        counterparty_iban: ibanMatch ? ibanMatch[0] : null,
      }
    }

    const [rawDoc, rawDate, rawAmount, rawPurpose, _unusedNull, _unusedCounterpartyName, rawAccountInfo] = cols

    const flatAcc = rawAccountInfo ? rawAccountInfo.replace(/\s+/g, " ") : null
    const ibanMatch = flatAcc ? flatAcc.match(/[A-Z]{2}[0-9A-Z]{10,}/i) : null

    return {
      document_number: rawDoc ? rawDoc.replace(/\s+/g, "").trim() : null,
      operation_datetime: parseDateTimeDDMMYYYY(rawDate),
      amount: cleanNumber(rawAmount)!,
      amount_currency: "UAH",
      amount_uah_equivalent: cleanNumber(rawAmount),
      payment_details: rawPurpose ? rawPurpose.replace(/\s+/g, " ").trim() : "",
      counterparty_iban: ibanMatch ? ibanMatch[0] : null,
    }
  })
}

function detectCurrencyFromDocument(firstPage: string): string {
  if (!firstPage) return "UAH"
  const m = firstPage.match(/валюта\s+([A-Z]{3})\/\d{3}/i)
  if (!m) return "UAH"
  return m[1].toUpperCase()
}
