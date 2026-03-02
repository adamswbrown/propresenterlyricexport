import type { ChurchSuiteConfig, BirthdayPerson } from '../types'
import { fetchAllPages } from './client'

interface ChurchSuiteChild {
  id: number
  first_name: string
  last_name: string
  date_of_birth: string | null
  [key: string]: unknown
}

export async function fetchChildren(config: ChurchSuiteConfig): Promise<BirthdayPerson[]> {
  const children = await fetchAllPages<ChurchSuiteChild>(config, '/children/children')

  return children
    .filter((c) => c.date_of_birth && c.date_of_birth !== '' && c.date_of_birth !== '0000-00-00')
    .map((c) => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      dateOfBirth: c.date_of_birth!,
      source: 'child' as const
    }))
}
