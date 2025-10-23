import fs from "fs"
import path from "path"
import axios from "axios"
import dotenv from "dotenv"

dotenv.config()

// === CONFIGURATION ===
const DAYS_PER_REQUEST = 31
const TOTAL_DAYS = 365
const PAUSE_SECONDS = 30
const OUTPUT_DIR = path.resolve(__dirname, "../data")

const CURRENCY_CODES: Record<number, string> = {
  980: "UAH",
  975: "BGN",
  978: "EUR",
  840: "USD",
  985: "PLN",
  949: "TRY",
}

// === LOAD TOKEN ===
const TOKEN = process.env.MONOBANK_TOKEN
if (!TOKEN) throw new Error("Missing MONOBANK_TOKEN in .env file")

const headers = { "X-Token": TOKEN }

// === UTILITIES ===
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchTransactions(accountId: string, startTs: number, endTs: number, attempt = 1): Promise<any[]> {
  const url = `https://api.monobank.ua/personal/statement/${accountId}/${startTs}/${endTs}`
  try {
    const res = await axios.get(url, { headers })
    return res.data
  } catch (err: any) {
    if (err.response?.status === 429) {
      const wait = PAUSE_SECONDS * attempt
      console.log(`Got 429 Too Many Requests — waiting ${wait}s and retrying...`)
      await sleep(wait * 1000)
      return fetchTransactions(accountId, startTs, endTs, attempt + 1)
    }
    console.error(`Error ${err.response?.status || ""}: ${err.message}`)
    return []
  }
}

// === NORMALIZATION ===
function normalize(tx: any, accountCurrency: string): Record<string, any> {
  const accountAmount = Math.round(((tx.amount || 0) / 100) * 100) / 100
  const operationAmount = Math.round(((tx.operationAmount || 0) / 100) * 100) / 100

  const operationCurrencyCode = tx.currencyCode
  const operationCurrency = CURRENCY_CODES[operationCurrencyCode] || "UNKNOWN"

  const isCrossCurrency = operationCurrency !== accountCurrency
  const type = accountAmount < 0 ? "DEBIT" : "CREDIT"

  return {
    id: tx.id,
    date: new Date(tx.time * 1000).toISOString().replace("T", " ").split(".")[0],
    description: tx.description || "",
    type,
    amount_in_account_currency: accountAmount,
    amount_in_operation_currency: operationAmount,
    account_currency: accountCurrency,
    operation_currency: operationCurrency,
    cross_currency: isCrossCurrency,
    mcc: tx.mcc,
    balance_after: Math.round(((tx.balance || 0) / 100) * 100) / 100,
  }
}

// === FETCH FOR ONE ACCOUNT ===
async function fetchForAccount(account: any) {
  const accountId = account.id
  const accountType = (account.type || "unknown").toLowerCase()
  const currency = (account.currency || "xxx").toLowerCase()

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const outputFile = path.join(OUTPUT_DIR, `transactions_${accountType}_${currency}_year.json`)

  console.log(`\n=== Fetching for ${accountType.toUpperCase()} (${currency}) ===`)
  console.log(`Account ID: ${accountId}`)

  const allTxs: Record<string, any> = {}
  let end = new Date()
  let start = new Date(end.getTime() - DAYS_PER_REQUEST * 24 * 3600 * 1000)
  let totalDays = 0
  let iteration = 1

  while (totalDays < TOTAL_DAYS) {
    const startTs = Math.floor(start.getTime() / 1000)
    const endTs = Math.floor(end.getTime() / 1000)
    console.log(`\n→ Request #${iteration}: ${start.toISOString().split("T")[0]} → ${end.toISOString().split("T")[0]}`)

    const data = await fetchTransactions(accountId, startTs, endTs)
    console.log(`+ Retrieved ${data.length} tx`)

    for (const tx of data) {
      if (tx.id) allTxs[tx.id] = tx
    }

    const normalized = Object.values(allTxs).map((tx) => normalize(tx, account.currency))
    fs.writeFileSync(outputFile, JSON.stringify(normalized, null, 2), "utf-8")

    end = start
    start = new Date(start.getTime() - DAYS_PER_REQUEST * 24 * 3600 * 1000)
    totalDays += DAYS_PER_REQUEST
    iteration += 1

    console.log(`Waiting ${PAUSE_SECONDS}s before next request...`)
    await sleep(PAUSE_SECONDS * 1000)
  }

  console.log(`\nTotal unique transactions: ${Object.keys(allTxs).length}`)
  console.log(`Saved to ${outputFile}`)
}

// === MAIN ===
async function main() {
  const clientPath = path.join(OUTPUT_DIR, "client_info.json")
  if (!fs.existsSync(clientPath)) {
    throw new Error("client_info.json not found in 'data/'. Run get_client_info.ts first.")
  }

  const client = JSON.parse(fs.readFileSync(clientPath, "utf-8"))
  const accounts = client.accounts || []

  console.log(`Found ${accounts.length} accounts in client_info.json`)

  for (const acc of accounts) {
    try {
      await fetchForAccount(acc)
    } catch (e: any) {
      console.error(`Error while fetching for account ${acc.id}: ${e.message}`)
      continue
    }
  }

  console.log("\nAll accounts processed.")
}

main()
