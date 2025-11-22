import fs from "fs"
import { PDFParse, TextResult } from "pdf-parse"
import { IBankDetectionResult, ITransactionStatement, TransactionTypeEnum } from "../types"
import { parseMonobankStatement } from "./monobank"
import { normalizeMonobankTransactionStatement, normalizePryvatbankTransactionStatement } from "../utils"
import { calculateIntermediateSummaries, getFopCreditsByQuarterFromStatement } from "../taxes_counter/common"
import { FOP_CONFIG_2025_GROUP_3 } from "../taxes_counter/config"
import { calculateQuarterDataFromStatmentForGroup3 } from "../taxes_counter/fop_taxes_group_3_counter"
import { parsePryvatbankStatement } from "./privatbank"

const MONOBANK_STATEMENT_UAH_EN_PATH = "./files/monobank_statement_uah_en.pdf"
const MONOBANK_STATEMENT_UAH_UK_PATH = "./files/monobank_statement_uah_uk.pdf"
const MONOBANK_STATEMENT_USD_EN_PATH = "./files/monobank_statement_usd_en.pdf"
const MONOBANK_STATEMENT_USD_UK_PATH = "./files/monobank_statement_usd_uk.pdf"
const WISE_STATEMENT_EUR_EN_PATH = "./files/wise_statement_eur_en.pdf"
const PRYVAT_STATEMENT_GBP_UK_PATH = "./files/pryvat_statement_gbp_uk.pdf"
const PRYVAT_STATEMENT_UAH_UK_PATH = "./files/pryvat_statement_uah_uk.pdf"
const INVOICE_PATH = "./files/invoice.pdf"

export async function readPdf(path: string): Promise<TextResult> {
  const data = fs.readFileSync(path)
  const parser = new PDFParse({ data })

  const result = await parser.getText()

  return result
}

export function fastCheckIsProbablyFinancial(document: TextResult): boolean {
  if (!document.total || document.total < 1) {
    return false
  }

  for (let i = 1; i <= document.total; i++) {
    const txt = document.getPageText(i)?.trim()
    if (!txt) return false
  }

  const firstPage = document.getPageText(1)
  if (!firstPage) return false

  const t = firstPage.toLowerCase()

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
    "виписка за період",
    "заключна виписка",
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

  const hasKeywords = keywordsEN.some((k) => t.includes(k)) || keywordsUA.some((k) => t.includes(k))

  if (!hasKeywords) return false

  const datePatterns = [
    /\b\d{2}\.\d{2}\.\d{4}\b/, // 12.10.2025
    /\b\d{2}\.\d{2}\.\d{2}\b/, // 12.10.25
    /\b\d{4}-\d{2}-\d{2}\b/, // 2025-10-12
    /\b\d{2}\/\d{2}\/\d{4}\b/, // 12/10/2025
  ]

  const hasDate = datePatterns.some((rx) => rx.test(firstPage))
  if (!hasDate) return false

  return true
}

export function detectBank(document: TextResult): IBankDetectionResult {
  const t = document.getPageText(1).toLowerCase()

  const monoHits = ["universal bank jsc", 'ат "універсал банк"']
  const pryvatHits = ["приватбанк", 'ат кб "приватбанк"']

  const is_monobank = monoHits.some((k) => t.includes(k))
  const is_privatbank = pryvatHits.some((k) => t.includes(k))

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

export async function parseStatementByBank(document: TextResult, bank: IBankDetectionResult): Promise<ITransactionStatement[]> {
  if (bank.is_monobank) {
    const rawData = await parseMonobankStatement(document)

    if (!rawData.length) {
      console.error("We couldn't read any transactions from this file.")
      return
    }

    const normalizeTxn = rawData.map((item) => normalizeMonobankTransactionStatement(item))
    const currencies = new Set(normalizeTxn.map((t) => t.operation_currency))
    const filteredTxn = normalizeTxn.filter(
      (t) => t.type === TransactionTypeEnum.CREDIT && (currencies.size === 0 || t.operation_currency !== "UAH")
    )

    if (!filteredTxn.length) {
      console.error("We couldn't find any credit transactions from this file.")
      return
    }

    return filteredTxn
  }

  if (bank.is_privatbank) {
    const rawData = await parsePryvatbankStatement(document)

    if (!rawData.length) {
      console.error("We couldn't read any transactions from this file.")
      return
    }

    const normalizeTxn = rawData.map((item) => normalizePryvatbankTransactionStatement(item))
    const filteredTxn = normalizeTxn.filter((t) => t.type === TransactionTypeEnum.CREDIT)

    if (!filteredTxn.length) {
      console.error("We couldn't find any credit transactions from this file.")
      return
    }

    return filteredTxn
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
  const path = MONOBANK_STATEMENT_USD_UK_PATH
  const document = await readPdf(path)

  if (!fastCheckIsProbablyFinancial(document)) {
    console.error("This file doesn’t look like a bank statement.")
    return
  }

  const bank = detectBank(document)
  if (bank.is_unknown) {
    console.error("We can't recognize this type of bank statement.")
    return
  }

  const transactions = await parseStatementByBank(document, bank)

  console.dir(transactions, { depth: null })

  const quarters = getFopCreditsByQuarterFromStatement(transactions)
  const quarter_data = calculateQuarterDataFromStatmentForGroup3(quarters, FOP_CONFIG_2025_GROUP_3, false)
  const intermediate_summaries = calculateIntermediateSummaries(quarter_data, FOP_CONFIG_2025_GROUP_3.income_limit)

  console.dir({ quarter_data, intermediate_summaries }, { depth: null })
})()
