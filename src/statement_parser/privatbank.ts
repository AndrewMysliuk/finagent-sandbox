import { TextResult } from "pdf-parse"
import { IPryvatbankStatementPageResponse, IPryvatbankTableRow } from "../types"
import PryvatbankTableRow from "../api/json_schema/pryvat_table_row.schema.json"
import { runGptModel } from "../api"

const PROMPT = `
You are parsing ONE PAGE of a PryvatBank (ПриватБанк) account statement in Ukrainian.
Your task is to extract rows STRICTLY according to the JSON schema.

TABLE COLUMNS:
- Номер документа
- Дата та час операції
- Сума
- Сума екв. грн.
- Призначення платежу
- Реквізити контрагента

RULES:

1. Start extracting transactions ONLY after the header row. Ignore header lines completely.
2. Ignore empty lines and formatting trash.
3. A transaction contains:
   - document number (string or null)
   - date DD.MM.YYYY (may be one line)
   - time HH:MM (may be next line)
   - amount (from column “Сума”)
   - amount_uah_equivalent (from “Сума екв. грн.” or null if empty)
   - payment_details (multiline text block)
   - counterparty_iban (UA-prefixed IBAN inside the counterparty block or null)
4. operation_datetime:
   - Combine date + time into: YYYY-MM-DD HH:MM:SS
5. amount:
   - Parse numeric value exactly as shown. May be negative or positive.
6. amount_uah_equivalent:
   - If “Сума екв. грн.” has a number → parse it.
   - If empty → null.
7. amount_currency:
   - If the column “Сума екв. грн.” EXISTS on this page → this is a foreign-currency account.
     Use the account currency from the statement header (e.g. USD/EUR/GBP).
   - If the column does NOT exist → this is a UAH account.
     amount_currency = "UAH".
   - NEVER extract currency from payment_details.
   - NEVER guess based on text like “GBP” or “USD” inside payment_details.
8. counterparty_iban:
   - If any UA************** IBAN is present → return it.
   - Otherwise → null.
9. payment_details:
   - Preserve original multiline text exactly.
10. If any value is missing or unreadable → set null. Do NOT invent or guess values.
`

export async function parsePryvatbankStatement(document: TextResult): Promise<IPryvatbankTableRow[]> {
  const startTableUkr = "вихідний залишок"

  const total = document.total
  if (!total || total === 0) return []

  const results: IPryvatbankTableRow[] = []

  for (let page = 1; page <= total; page++) {
    let raw = document.getPageText(page)
    if (!raw.trim()) continue

    if (page === 1) {
      const lower = raw.toLowerCase()
      const ukrIndex = lower.indexOf(startTableUkr)

      let startIndex = -1

      if (ukrIndex !== -1) startIndex = ukrIndex
      else startIndex = 0

      raw = raw.slice(startIndex).trim()
    }

    const pageRows = await runGptModel<IPryvatbankStatementPageResponse>({
      prompt: PROMPT,
      input: raw,
      schema: PryvatbankTableRow,
    })

    if (pageRows.transactions && Array.isArray(pageRows.transactions)) {
      results.push(...pageRows.transactions)
    }
  }

  return results
}
