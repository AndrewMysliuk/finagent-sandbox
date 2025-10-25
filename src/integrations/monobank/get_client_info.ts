import fs from "fs"
import path from "path"
import axios from "axios"
import dotenv from "dotenv"
import { normalizeMonobankClientInfo } from "../../utils"

// === CONFIGURATION ===
const OUTPUT_DIR = path.resolve(__dirname, "../../../data")
const OUTPUT_FILE = path.join(OUTPUT_DIR, "client_info.json")

dotenv.config()
const TOKEN = process.env.MONOBANK_TOKEN

if (!TOKEN) {
  throw new Error("Missing MONOBANK_TOKEN in .env file")
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// === REQUEST CLIENT INFO ===
export async function getClientInfo() {
  const url = "https://api.monobank.ua/personal/client-info"

  const headers = {
    "X-Token": TOKEN!,
  }

  try {
    const response = await axios.get(url, { headers })
    const normalized = normalizeMonobankClientInfo(response.data)

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
