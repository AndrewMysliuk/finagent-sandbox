import { TextResult } from "pdf-parse"
import { IMonobankTableRow, IMonobankStatementPageResponse } from "../types"
import { maskMonobankSensitive } from "./common"
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

1. Start extracting transactions **ONLY after the header row appears**.
2. Ignore the header itself and any formatting lines.
3. Each transaction always begins with a date in the format DD.MM.YYYY.
4. The next line after the date is the time HH:MM:SS.
5. Merge all following lines until the numeric operation amount into:
   - purpose_of_payment
   - partner_details (if present, otherwise null)
6. Extract numeric fields exactly:
   - operation_amount
   - currency
   - amount_nbu_exchange_rate_equivalent (or null)
   - exchange_rate (or null)
   - commission_usd (or null)
   - balance
7. Combine date + time into one string:
   "date_and_time": "DD.MM.YYYY HH:MM:SS"
8. Do not invent values. If the field is missing, set it to null.
9. Output STRICTLY using the JSON schema provided.
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

    const masked = maskMonobankSensitive(raw)

    const pageRows = await runGptModel<IMonobankStatementPageResponse>({
      prompt: PROMPT,
      input: masked,
      schema: MonobankTableRow,
    })

    if (pageRows.transactions && Array.isArray(pageRows.transactions)) {
      results.push(...pageRows.transactions)
    }
  }

  return results
}
