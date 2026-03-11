/** OAuth2 Client Credentials authentication for ChurchSuite Core API v2 */
export interface ChurchSuiteConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  tokenExpiresAt?: number; // Unix timestamp in ms
}

/** OAuth2 token response */
export interface ChurchSuiteOAuth2Tokens {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

export interface BirthdayPerson {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  source: 'contact' | 'child';
}

export interface BirthdayEntry extends BirthdayPerson {
  dayName: string; // "Saturday"
  dateFormatted: string; // "1 March"
  turningAge: number;
  daysUntil: number;
}

export interface SyncResult {
  contacts: BirthdayPerson[];
  children: BirthdayPerson[];
  syncedAt: string; // ISO timestamp
}
