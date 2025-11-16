import { TextResult } from "pdf-parse"
import { IMonobankTableRow, IMonobankStatementPageResponse } from "../types"
import MonobankTableRow from "../api/json_schema/monobank_table_row.schema.json"
import { runGptModel } from "../api"

const PROMPT = `
You are parsing one page of a Monobank account statement.
The page may be in English or Ukrainian.

Recognize the table header using ANY of the following column names
(whichever is present):

English:
- "Date and time"
- "Purpose of payment"
- "Partner details"
- "Operation amount"
- "Currency"
- "Amount (NBU exchange rate equivalent)"
- "Exchange rate"
- "Commission"
- "Balance"

Ukrainian:
- "Дата та час операції"
- "Деталі операції"
- "Реквізити контрагента"
- "Сума операції"
- "Валюта операції"
- "Сума у валюті рахунку / Еквівалент суми за курсом НБУ"
- "Курс"
- "Сума комісій"
- "Залишок після операції"

RULES:

1. Start extracting transactions ONLY after the header row appears.
2. Ignore the header itself and any formatting or separator lines.
3. Each transaction begins with a date in the format DD.MM.YYYY.
4. The next line after the date is the time HH:MM:SS.
5. Merge all following text lines until the numeric operation amount into:
   - purpose_of_payment
   - partner_details (raw text block; if missing, null)
6. From the partner_details field, extract:
   - counterparty_name:
       * A person’s full name OR a company name, cleaned from IBAN/EDRPOU/extra text.
       * If not present → null.
   - counterparty_iban:
       * A valid IBAN that appears in partner_details (e.g. UAxxxxxxxxxxxxxxxxxxxxxx).
       * If none found → null.
7. Extract numeric fields exactly as in the document:
   - operation_amount
   - currency
   - amount_nbu_exchange_rate_equivalent (or null)
   - exchange_rate (or null)
   - commission (or null)
   - balance (or null)
8. Combine date and time into: "date_and_time": "YYYY-MM-DD HH:MM:SS"
9. Do NOT invent values. If something is missing or unreadable → set it to null.
10. Output STRICTLY following the JSON schema provided.
`

export async function parseMonobankStatement(document: TextResult): Promise<IMonobankTableRow[]> {
  const startTableEng = "date and time"
  const startTableUkr = "дата та час операції"

  const total = document.total
  if (!total || total === 0) return []

  const results: IMonobankTableRow[] = []

  for (let page = 1; page <= total; page++) {
    let raw = document.getPageText(page)
    if (!raw.trim()) continue

    if (page === 1) {
      const lower = raw.toLowerCase()
      const engIndex = lower.indexOf(startTableEng)
      const ukrIndex = lower.indexOf(startTableUkr)

      let startIndex = -1

      if (engIndex !== -1) startIndex = engIndex
      else if (ukrIndex !== -1) startIndex = ukrIndex
      else startIndex = 0

      raw = raw.slice(startIndex).trim()
    }

    const pageRows = await runGptModel<IMonobankStatementPageResponse>({
      prompt: PROMPT,
      input: raw,
      schema: MonobankTableRow,
    })

    if (pageRows.transactions && Array.isArray(pageRows.transactions)) {
      results.push(...pageRows.transactions)
    }
  }

  return results
}
