import fs from "fs"
import path from "path"

const NBU_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date="

export const get_usd_uah_rate = async (date: string): Promise<number> => {
  const file_path = path.resolve("dictionaries", "usd_uah_rate.json")
  const cache = fs.existsSync(file_path) ? JSON.parse(fs.readFileSync(file_path, "utf-8")) : {}

  if (cache[date]) return cache[date]

  const formatted = date.replace(/-/g, "")
  const res = await fetch(`${NBU_URL}${formatted}&json`)
  const data = await res.json()
  const rate = data?.[0]?.rate
  if (!rate) throw new Error(`NBU rate not found for ${date}`)

  cache[date] = rate
  fs.writeFileSync(file_path, JSON.stringify(cache, null, 2))

  return rate
}
