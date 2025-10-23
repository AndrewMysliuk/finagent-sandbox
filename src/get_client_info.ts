import fs from "fs"
import path from "path"
import axios from "axios"
import dotenv from "dotenv"

// === CONFIGURATION ===
const OUTPUT_DIR = path.resolve(__dirname, "../data")
const OUTPUT_FILE = path.join(OUTPUT_DIR, "client_info.json")

const CURRENCY_CODES: Record<number, string> = {
  980: "UAH",
  978: "EUR",
  840: "USD",
}

// === LOAD TOKEN ===
dotenv.config()
const TOKEN = process.env.MONOBANK_TOKEN

if (!TOKEN) {
  throw new Error("Missing MONOBANK_TOKEN in .env file")
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// === REQUEST CLIENT INFO ===
async function getClientInfo() {
  const url = "https://api.monobank.ua/personal/client-info"

  const headers = {
    "X-Token": TOKEN!,
  }

  try {
    const response = await axios.get(url, { headers })
    const data = response.data

    // === NORMALIZE STRUCTURE ===
    const normalized = {
      client_id: data.clientId,
      name: data.name,
      permissions: data.permissions,
      accounts: data.accounts.map((acc: any) => {
        const currency = CURRENCY_CODES[acc.currencyCode] || "UNKNOWN"
        return {
          id: acc.id,
          iban: acc.iban,
          type: acc.type,
          currency,
          balance: Math.round(((acc.balance || 0) / 100) * 100) / 100,
          credit_limit: Math.round(((acc.creditLimit || 0) / 100) * 100) / 100,
          masked_pan: acc.maskedPan || [],
        }
      }),
    }

    // === SAVE TO FILE ===
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(normalized, null, 2), "utf-8")
    console.log(`Client info saved to ${OUTPUT_FILE}`)
  } catch (err: any) {
    if (err.response) {
      console.error(`Error ${err.response.status}: ${err.response.data}`)
    } else {
      console.error("Request failed:", err.message)
    }
  }
}

getClientInfo()
