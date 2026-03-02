export interface ChurchSuiteConfig {
  account: string
  apiKey: string
  appName: string
}

export interface BirthdayPerson {
  id: number
  firstName: string
  lastName: string
  dateOfBirth: string // YYYY-MM-DD
  source: 'contact' | 'child'
}

export interface BirthdayEntry extends BirthdayPerson {
  dayName: string       // "Saturday"
  dateFormatted: string  // "1 March"
  turningAge: number
  daysUntil: number
}

export interface SyncResult {
  contacts: BirthdayPerson[]
  children: BirthdayPerson[]
  syncedAt: string // ISO timestamp
}

export interface AppSettings {
  account: string
  apiKey: string
  appName: string
  lastSync: string | null
  cachedData: SyncResult | null
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination?: {
    no_results: number
    page: number
    per_page: number
  }
}
