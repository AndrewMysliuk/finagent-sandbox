import fs from "fs"
import path from "path"
import { IClientInfo, ITransaction } from "../types"

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

// Format number with thousand separators and 2 decimals
export const formatMoney = (value: number): string => {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
export const loadYearTransactions = (accountId: string): ITransaction[] => {
  const filePath = path.resolve(process.cwd(), "data", `transactions_${accountId}_year.json`)
  if (!fs.existsSync(filePath)) throw new Error(`transactions_${accountId}_year.json not found`)
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}

/** Normalize transaction description */
export const normalizeDescription = (desc: string): string => {
  return desc
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґё\s]/gi, "")
    .replace(/\s+/g, " ")
}
