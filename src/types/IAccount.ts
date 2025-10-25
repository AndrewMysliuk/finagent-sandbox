export interface IClientInfo {
  client_id: string
  name: string
  permissions: string
  accounts: IAccount[]
}

export interface IAccount {
  id: string
  iban: string
  type: string
  currency: string
  balance: number
  credit_limit: number
  masked_pan: string[]
}
