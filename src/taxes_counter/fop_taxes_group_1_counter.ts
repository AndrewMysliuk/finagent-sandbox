import { fetchStructuredResponse } from "../api"
import singleTaxGroup1Schema from "../api/json_schema/single_tax_group_1.schema.json"
import { ISingleTaxGroup1 } from "../types"
import { FOP_CONFIG_2025_GROUP_1 } from "./config"

export async function getSingleTaxGroup1Info(): Promise<ISingleTaxGroup1> {
  const prompt = `Знайди офіційне рішення або документ,
у якому вказана ставка єдиного податку для 1-ї групи фізичних осіб-підприємців у Криворізькій міській територіальній громаді.
Мене цікавить, який відсоток встановлений цією громадою і з якого року він діє.`

  const response = await fetchStructuredResponse<ISingleTaxGroup1>({
    prompt,
    schema: singleTaxGroup1Schema,
    schemaName: "single_tax_group_1",
    description: "JSON-об'єкт з даними про ставку єдиного податку у Криворізькій міській територіальній громаді",
  })

  console.log("GPT Response: ", response)
  return response
}

// run
;(async () => {
  await getSingleTaxGroup1Info()
})()
