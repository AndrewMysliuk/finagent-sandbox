import OpenAI from "openai"
import dotenv from "dotenv"

dotenv.config()

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type RunGptModelInput = {
  prompt: string
  input: string
  schema: Record<string, unknown>
}

export async function runGptModel<T>(options: RunGptModelInput): Promise<T> {
  try {
    const { prompt, input, schema } = options

    const fullPrompt = `${prompt}\n\nInput:\n${input}`

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "response",
          schema,
          strict: true,
        },
      },
      messages: [
        {
          role: "user",
          content: fullPrompt,
        },
      ],
      temperature: 0,
    })

    const raw = response.choices[0].message.content
    return JSON.parse(raw) as T
  } catch (error: unknown) {
    console.log(error)
  }
}
