import fs from "fs"
import { execFile } from "child_process"
import path from "path"
import { PDFParse, TextResult } from "pdf-parse"
import { IBankDetectionResult, ITransactionStatement, TransactionTypeEnum } from "../types"
import { parseMonobankStatement } from "./monobank"
import { detectFlagsForTxnStatements, normalizeMonobankTransactionStatement, normalizePryvatbankTransactionStatement } from "../utils"
import { calculateIntermediateSummariesByYear, getFopCreditsByQuarterFromStatement } from "../taxes_counter/common"
import { FOP_CONFIG_2025_GROUP_3 } from "../taxes_counter/config"
import { calculateQuarterDataFromStatementForGroup3 } from "../taxes_counter/fop_taxes_group_3_counter"
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

export async function parsePdf(pdfRelativePath: string): Promise<string[][]> {
  const absPath = path.resolve(pdfRelativePath)

  return new Promise((resolve, reject) => {
    execFile("python3", ["./src/scripts/pdf_parser.py", absPath], { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
      if (err) {
        reject(err)
        return
      }

      try {
        const data = JSON.parse(stdout)
        resolve(data)
      } catch (e) {
        reject(e)
      }
    })
  })
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

export async function parseStatementByBank(
  raws: string[][],
  document: TextResult,
  bank: IBankDetectionResult
): Promise<ITransactionStatement[]> {
  if (bank.is_monobank) {
    const rawData = await parseMonobankStatement(raws)

    if (!rawData.length) {
      console.error("We couldn't read any transactions from this file.")
      return
    }

    let normalizeTxn = rawData.map((item) => normalizeMonobankTransactionStatement(item))
    normalizeTxn = detectFlagsForTxnStatements(normalizeTxn)
    normalizeTxn = normalizeTxn.filter(
      (t) => (t.type === TransactionTypeEnum.CREDIT && !t.is_financial_aid) || (t.type === TransactionTypeEnum.DEBIT && t.is_return)
    )

    if (!normalizeTxn.length) {
      console.error("We couldn't find any credit transactions from this file.")
      return
    }

    return normalizeTxn
  }

  if (bank.is_privatbank) {
    const rawData = await parsePryvatbankStatement(raws, document)

    if (!rawData.length) {
      console.error("We couldn't read any transactions from this file.")
      return
    }

    let normalizeTxn = rawData.map((item) => normalizePryvatbankTransactionStatement(item))
    normalizeTxn = detectFlagsForTxnStatements(normalizeTxn)
    normalizeTxn = normalizeTxn.filter(
      (t) => (t.type === TransactionTypeEnum.CREDIT && !t.is_financial_aid) || (t.type === TransactionTypeEnum.DEBIT && t.is_return)
    )

    if (!normalizeTxn.length) {
      console.error("We couldn't find any credit transactions from this file.")
      return
    }

    return normalizeTxn
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
  const filePath = MONOBANK_STATEMENT_USD_EN_PATH

  const document = await readPdf(filePath)
  if (!fastCheckIsProbablyFinancial(document)) {
    console.error("This file doesn’t look like a bank statement.")
    return
  }

  const bank = detectBank(document)
  if (bank.is_unknown) {
    console.error("We can't recognize this type of bank statement.")
    return
  }

  const rows = await parsePdf(filePath)
  const transactions = await parseStatementByBank(rows, document, bank)
  const quarters = getFopCreditsByQuarterFromStatement(transactions)
  const quarter_data = calculateQuarterDataFromStatementForGroup3(quarters, FOP_CONFIG_2025_GROUP_3, false)
  const intermediate_summaries = calculateIntermediateSummariesByYear(quarter_data, FOP_CONFIG_2025_GROUP_3.income_limit)

  console.dir({ quarter_data, intermediate_summaries }, { depth: null })
})()
