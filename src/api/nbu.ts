import fs from "fs"
import path from "path"

export const getUAHRate = async (from: string, date: string): Promise<number> => {
  const filename = `${from.toLowerCase()}_uah_rate.json`
  const file_path = path.resolve("dictionaries", filename)

  const cache = fs.existsSync(file_path) ? JSON.parse(fs.readFileSync(file_path, "utf-8")) : {}

  if (cache[date]) return cache[date]

  const formatted = date.replace(/-/g, "")

  const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${from}&date=${formatted}&json`
  const res = await fetch(url)
  const data = await res.json()
  const rate = data?.[0]?.rate

  if (!rate) throw new Error(`NBU rate not found for ${date} (${from}/UAH)`)

  cache[date] = rate
  fs.writeFileSync(file_path, JSON.stringify(cache, null, 2))

  return rate
}
