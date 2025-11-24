export interface IBankDetectionResult {
  is_monobank: boolean
  is_privatbank: boolean
  is_pumb: boolean
  is_raiffeisen: boolean
  is_ukrsib: boolean
  is_unknown: boolean
}

export interface IMonobankTableRow {
  date_and_time: string
  purpose_of_payment: string
  partner_details: string | null
  counterparty_name: string | null
  counterparty_iban: string | null
  operation_amount: number
  currency: string
  amount_nbu_exchange_rate_equivalent: number | null
  exchange_rate: number | null
  commission: number | null
  balance: number | null
}

export interface IPryvatbankTableRow {
  document_number: string | null
  operation_datetime: string
  amount: number
  amount_currency: string
  amount_uah_equivalent: number | null
  payment_details: string
  counterparty_iban: string | null
}

export interface IUkrsibbankTableRow {
  operation_datetime: string
  document_number: string | null
  debit: number | null
  credit: number | null
  counterparty_details: string | null
  payment_details: string
  account_currency: string
  counterparty_iban: string | null
}
