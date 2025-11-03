export interface IStructuredPromptPayload {
  prompt: string
  schema: Record<string, unknown>
  schemaName: string
  description?: string
}
