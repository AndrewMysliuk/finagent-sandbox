import OpenAI from "openai"
import "dotenv/config"
import { IStructuredPromptPayload } from "../types"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function fetchStructuredResponse<T>(payload: IStructuredPromptPayload): Promise<T> {
  const { prompt, schema, schemaName, description } = payload

  try {
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: prompt,
      temperature: 0.3,
      max_output_tokens: 500,
      tools: [
        {
          type: "web_search",
          search_context_size: "high",
          user_location: {
            country: "UA",
          },
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          description: description ?? "Structured JSON response",
          schema,
          strict: true,
        },
      },
    })

    console.dir(response, { depth: null, colors: true })

    if (!response.output_text) {
      throw new Error("Missing output_text in OpenAI response")
    }

    try {
      return JSON.parse(response.output_text) as T
    } catch (err) {
      throw new Error(`Invalid JSON in output_text: ${(err as Error).message}`)
    }
  } catch (err: any) {
    console.error("OpenAI request failed:", err.message)
    throw new Error(`OpenAI structured response failed: ${err.message}`)
  }
}
