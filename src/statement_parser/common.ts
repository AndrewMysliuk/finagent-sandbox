export function maskMonobankSensitive(text: string): string {
  let out = text

  out = out.replace(/\b([A-Z]{2}\d{2}[A-Z0-9]{10,30})\b/g, (iban) => {
    const prefix = iban.slice(0, 4)
    const suffix = iban.slice(-4)
    const middle = "*".repeat(iban.length - 8)
    return prefix + middle + suffix
  })

  out = out.replace(/\b\d{10}\b/g, "**********")

  out = out.replace(/\d{8,}/g, (n) => "*".repeat(n.length))

  out = out.replace(/\b(?![A-Z ]{4,})([A-Z][a-z]{2,20} [A-Z][a-z]{2,20})\b/g, "USER_NAME")

  return out
}
