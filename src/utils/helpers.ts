import fs from "fs"
import path from "path"
import { IClientInfo, ITransactionAPI, ITransactionStatement, TransactionTypeEnum } from "../types"
import { FIN_AID_KEYWORDS, RETURN_KEYWORDS } from "./consts"

export const roundCents = (value: number = 0) => {
  return Math.round((value / 100) * 100) / 100
}

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Safe add with rounding to 2 decimals using integer cents
export const safeAdd = (a: number, b: number): number => {
  return (Math.round(a * 100) + Math.round(b * 100)) / 100
}

export const safeSubtract = (a: number, b: number): number => {
  return (Math.round(a * 100) - Math.round(b * 100)) / 100
}

// To format number with thousand separators and 2 decimals
export const toMoneyFormat = (value: number): string => {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// From format number with thousand separators and 2 decimals
export const fromMoneyFormat = (value: string): number => parseFloat(value.replace(/,/g, "")) || 0

export const cleanNumber = (str: string | null): number | null => {
  if (!str) return null
  const s = str.replace(/\s+/g, "")
  if (s === "—") return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

export function parseDateTimeDDMMYYYY(str: string): string {
  const cleaned = str.replace(/\s+/g, " ").trim()
  const [datePart, timePart = "00:00:00"] = cleaned.split(" ")

  const [day, month, year] = datePart.split(".").map(Number)

  const yyyy = year.toString().padStart(4, "0")
  const mm = month.toString().padStart(2, "0")
  const dd = day.toString().padStart(2, "0")

  return `${yyyy}-${mm}-${dd} ${timePart}`
}

// Check Refund and Financial Help ITransactionAPI
export function detectFlagsForTxnApi(statements: ITransactionAPI[]): ITransactionAPI[] {
  return statements.map((tx) => {
    const text = (tx.description || "").toLowerCase()
    const is_financial_aid = tx.type === TransactionTypeEnum.CREDIT && FIN_AID_KEYWORDS.some((k) => text.includes(k))
    const is_return = tx.type === TransactionTypeEnum.DEBIT && RETURN_KEYWORDS.some((k) => text.includes(k))

    return {
      ...tx,
      is_financial_aid,
      is_return,
    }
  })
}

// Check Refund and Financial Help ITransactionStatement
export function detectFlagsForTxnStatements(statements: ITransactionStatement[]): ITransactionStatement[] {
  return statements.map((tx) => {
    const text = (tx.description || "").toLowerCase()
    const is_financial_aid = tx.type === TransactionTypeEnum.CREDIT && FIN_AID_KEYWORDS.some((k) => text.includes(k))
    const is_return = tx.type === TransactionTypeEnum.DEBIT && RETURN_KEYWORDS.some((k) => text.includes(k))

    return {
      ...tx,
      is_financial_aid,
      is_return,
    }
  })
}

// Load MCC codes dictionary
export const loadMccDictionary = (): Record<number, string> => {
  const filePath = path.resolve(process.cwd(), "dictionaries", "mcc_codes.json")
  if (!fs.existsSync(filePath)) throw new Error("mcc_codes.json not found")
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}

// Load client info (contains all accounts)
export const loadClientInfo = (): IClientInfo => {
  const filePath = path.resolve(process.cwd(), "data", "client_info.json")
  if (!fs.existsSync(filePath)) throw new Error("client_info.json not found")
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}

// Load yearly transactions for a specific account
export const loadYearTransactions = (accountId: string): ITransactionAPI[] => {
  const filePath = path.resolve(process.cwd(), "data", `transactions_${accountId}_year.json`)
  if (!fs.existsSync(filePath)) throw new Error(`transactions_${accountId}_year.json not found`)
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}
