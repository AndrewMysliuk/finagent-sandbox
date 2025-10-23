import axios from "axios"

export async function runLLM(prompt: string): Promise<string> {
  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "mistral:7b-instruct",
      prompt,
      stream: false,
    })

    return response.data.response
  } catch (err: any) {
    console.error("Ollama request failed:", err.message)
    return "Error: model request failed"
  }
}
