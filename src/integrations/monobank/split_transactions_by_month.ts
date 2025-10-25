import fs from "fs"
import path from "path"

// Directories inside data/
const DATA_ROOT = path.resolve(__dirname, "../../../data")
const INPUT_DIR = DATA_ROOT
const OUTPUT_BASE = path.join(DATA_ROOT, "transactions_by_month")

// Create output base directory if it does not exist
if (!fs.existsSync(OUTPUT_BASE)) {
  fs.mkdirSync(OUTPUT_BASE, { recursive: true })
}

// Collect all transaction files that end with "_year.json"
const inputFiles = fs.readdirSync(INPUT_DIR).filter((f) => f.startsWith("transactions_") && f.endsWith("_year.json"))

if (inputFiles.length === 0) {
  console.log("No transaction files found in 'data/'")
  process.exit(0)
}

console.log(`Found ${inputFiles.length} transaction files in '${INPUT_DIR}'`)

for (const filename of inputFiles) {
  const filePath = path.join(INPUT_DIR, filename)

  // Extract account key, e.g., "black_uah" from "transactions_black_uah_year.json"
  let accountKey = "unknown"
  try {
    accountKey = filename.replace("transactions_", "").replace("_year.json", "").toLowerCase()
  } catch {
    accountKey = "unknown"
  }

  const outputDir = path.join(OUTPUT_BASE, accountKey)
  fs.mkdirSync(outputDir, { recursive: true })

  // Load transaction file
  let transactions: any[] = []
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8")
    transactions = JSON.parse(fileContent)
  } catch {
    console.error(`Skipped ${filename}: invalid JSON`)
    continue
  }

  // Group transactions by year-month
  const months: Record<string, any[]> = {}

  for (const tx of transactions) {
    const dateStr = tx.date
    if (!dateStr) continue

    try {
      const dt = new Date(dateStr)
      if (isNaN(dt.getTime())) continue
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`

      if (!months[monthKey]) months[monthKey] = []
      months[monthKey].push(tx)
    } catch (e) {
      console.warn(`Skipped transaction due to parsing error: ${e}`)
    }
  }

  // Save each month into a separate JSON file
  const sortedMonths = Object.keys(months).sort()
  for (const month of sortedMonths) {
    const outFile = path.join(outputDir, `transactions_${month}.json`)
    fs.writeFileSync(outFile, JSON.stringify(months[month], null, 2), "utf-8")
    console.log(`Saved ${months[month].length} transactions -> ${outFile}`)
  }
}
