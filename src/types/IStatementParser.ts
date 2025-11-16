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

export interface IMonobankStatementPageResponse {
  transactions: IMonobankTableRow[]
}
