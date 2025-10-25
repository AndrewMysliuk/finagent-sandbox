import OpenAI from "openai"
import "dotenv/config"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function defaultChat(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    })

    const text = response.choices[0]?.message?.content?.trim() || ""

    return text
  } catch (err: any) {
    console.error("OpenAI request failed:", err.message)
    return "Error: model request failed"
  }
}
