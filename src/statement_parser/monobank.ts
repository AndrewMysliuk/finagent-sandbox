import { IMonobankTableRow } from "../types"
import { cleanNumber, parseDateTimeDDMMYYYY } from "../utils"

const UA_HEADER_FIRST = "Дата та час"
const EN_HEADER_FIRST = "Date and time"

export function parseMonobankStatement(rows: string[][]): IMonobankTableRow[] {
  const body = rows.filter((cols) => {
    const first = cols?.[0]?.trim()
    if (!first) return false

    const isHeader =
      first.toLowerCase().includes(UA_HEADER_FIRST.toLowerCase()) || first.toLowerCase().includes(EN_HEADER_FIRST.toLowerCase())

    return !isHeader && cols.length === 9
  })

  return body.map((cols) => {
    const [rawDate, rawPurpose, rawPartner, rawAmount, rawCurrency, rawNBU, rawRate, rawCommission, rawBalance] = cols

    let counterparty_name: string | null = null
    let counterparty_iban: string | null = null
    let partner_details: string | null = null

    if (rawPartner && rawPartner !== "—") {
      const parts = rawPartner
        .split(/\n+/g)
        .map((x) => x.trim())
        .filter(Boolean)

      const nameCandidate = parts.find((p) => !p.startsWith("IBAN") && !p.startsWith("UA"))
      counterparty_name = nameCandidate || null

      const iban = parts.find((p) => p.startsWith("UA"))
      counterparty_iban = iban || null

      partner_details = rawPartner.replace(/\s+/g, " ").trim()
    }

    return {
      date_and_time: parseDateTimeDDMMYYYY(rawDate),
      purpose_of_payment: rawPurpose.replace(/\s+/g, " ").trim(),
      partner_details,
      counterparty_name,
      counterparty_iban,
      operation_amount: cleanNumber(rawAmount)!,
      currency: rawCurrency.trim().toUpperCase(),
      amount_nbu_exchange_rate_equivalent: cleanNumber(rawNBU),
      exchange_rate: cleanNumber(rawRate),
      commission: cleanNumber(rawCommission),
      balance: cleanNumber(rawBalance),
    }
  })
}
