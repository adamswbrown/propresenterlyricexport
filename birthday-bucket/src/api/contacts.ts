import type { ChurchSuiteConfig, BirthdayPerson } from '../types'
import { fetchAllPages } from './client'

interface ChurchSuiteContact {
  id: number
  first_name: string
  last_name: string
  date_of_birth: string | null
  [key: string]: unknown
}

export async function fetchContacts(config: ChurchSuiteConfig): Promise<BirthdayPerson[]> {
  const contacts = await fetchAllPages<ChurchSuiteContact>(config, '/addressbook/contacts')

  return contacts
    .filter((c) => c.date_of_birth && c.date_of_birth !== '' && c.date_of_birth !== '0000-00-00')
    .map((c) => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      dateOfBirth: c.date_of_birth!,
      source: 'contact' as const
    }))
}
