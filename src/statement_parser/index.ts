import fs from "fs"
import { PDFParse, TextResult } from "pdf-parse"
import { IBankDetectionResult, ParsedStatementByBankType } from "../types"
import { parseMonobankStatement } from "./monobank"

const STATEMENT_UAH_EN_PATH = "./files/statement_uah_en.pdf"
const STATEMENT_UAH_UK_PATH = "./files/statement_uah_uk.pdf"
const STATEMENT_USD_EN_PATH = "./files/statement_usd_en.pdf"
const STATEMENT_USD_UK_PATH = "./files/statement_usd_uk.pdf"
const INVOICE_PATH = "./files/invoice.pdf"

export async function readPdf(path: string): Promise<TextResult> {
  const data = fs.readFileSync(path)
  const parser = new PDFParse({ data })

  const result = await parser.getText()

  return result
}

export function fastCheckIsProbablyFinancial(document: TextResult): boolean {
  const t = document.getPageText(1).toLowerCase()

  const keywordsEN = [
    "account statement",
    "bank statement",
    "statement",
    "statement date",
    "statement period",
    "reporting period",
    "period:",
    "balance",
    "opening balance",
    "closing balance",
    "current balance",
    "available balance",
    "balance at the beginning of the period",
    "balance at the end of the period",
    "cash flow",
    "credit turnover",
    "debit turnover",
    "turnover",
  ]

  const keywordsUA = [
    "банківська виписка",
    "виписка по рахунку",
    "виписка",
    "звітний період",
    "період:",
    "баланс",
    "залишок",
    "залишок на початок періоду",
    "залишок на кінець періоду",
    "поточний залишок",
    "доступний залишок",
    "рух коштів",
    "обіг за кредитом",
    "обіг за дебетом",
    "обіг за період",
    "обіг за кредитом за період",
    "обіг за дебетом за період",
    "оборот",
  ]

  if (keywordsEN.some((k) => t.includes(k))) return true
  if (keywordsUA.some((k) => t.includes(k))) return true

  return false
}

export function detectBank(document: TextResult): IBankDetectionResult {
  const t = document.getPageText(1).toLowerCase()

  const monoHits = ["universal bank jsc", 'ат "універсал банк"']

  const is_monobank = monoHits.some((k) => t.includes(k))

  const is_privatbank = false // TODO
  const is_pumb = false // TODO
  const is_raiffeisen = false // TODO
  const is_ukrsib = false // TODO

  const is_unknown = !is_monobank && !is_privatbank && !is_pumb && !is_raiffeisen && !is_ukrsib

  return {
    is_monobank,
    is_privatbank,
    is_pumb,
    is_raiffeisen,
    is_ukrsib,
    is_unknown,
  }
}

export async function parseStatementByBank(document: TextResult, bank: IBankDetectionResult): Promise<ParsedStatementByBankType> {
  if (bank.is_monobank) {
    return parseMonobankStatement(document)
  }

  if (bank.is_privatbank) {
    // TODO
    throw new Error("PrivatBank parser not implemented")
  }

  if (bank.is_pumb) {
    // TODO
    throw new Error("PUMB parser not implemented")
  }

  if (bank.is_raiffeisen) {
    // TODO
    throw new Error("Raiffeisen parser not implemented")
  }

  if (bank.is_ukrsib) {
    // TODO
    throw new Error("Ukrsib parser not implemented")
  }

  throw new Error("Unknown bank: no parser available")
}

// === Standalone ===
;(async () => {
  const path = STATEMENT_USD_EN_PATH
  const document = await readPdf(path)

  if (!fastCheckIsProbablyFinancial(document)) {
    console.error("This PDF is probably not a financial statement.")
    return
  }

  const bank = detectBank(document)

  const result = await parseStatementByBank(document, bank)

  console.dir(result, { depth: null })
})()
