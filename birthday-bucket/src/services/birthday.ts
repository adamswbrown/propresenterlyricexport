import type { BirthdayPerson, BirthdayEntry } from '../types'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 1
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getSunday(monday: Date): Date {
  const d = new Date(monday)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

function getBirthdayThisYear(dob: string, referenceYear: number): Date {
  const [, month, day] = dob.split('-').map(Number)
  // Handle Feb 29 for non-leap years: use Feb 28
  if (month === 2 && day === 29) {
    const isLeap = (referenceYear % 4 === 0 && referenceYear % 100 !== 0) || referenceYear % 400 === 0
    if (!isLeap) {
      return new Date(referenceYear, 1, 28) // Feb 28
    }
  }
  return new Date(referenceYear, month - 1, day)
}

function calculateAge(dob: string, onDate: Date): number {
  const [year] = dob.split('-').map(Number)
  let age = onDate.getFullYear() - year
  const birthdayThisYear = getBirthdayThisYear(dob, onDate.getFullYear())
  if (onDate < birthdayThisYear) {
    age--
  }
  return age
}

export function getWeekBirthdays(
  people: BirthdayPerson[],
  weekOffset: number = 0
): BirthdayEntry[] {
  const today = new Date()
  const targetMonday = getMonday(today)
  targetMonday.setDate(targetMonday.getDate() + weekOffset * 7)
  const targetSunday = getSunday(targetMonday)

  const year = targetMonday.getFullYear()

  const entries: BirthdayEntry[] = []

  for (const person of people) {
    // Check birthday in the target year
    let birthday = getBirthdayThisYear(person.dateOfBirth, year)

    // If the week spans a year boundary, also check next year
    if (targetSunday.getFullYear() > year) {
      const birthdayNextYear = getBirthdayThisYear(person.dateOfBirth, year + 1)
      if (birthdayNextYear >= targetMonday && birthdayNextYear <= targetSunday) {
        birthday = birthdayNextYear
      }
    }

    if (birthday >= targetMonday && birthday <= targetSunday) {
      const dayName = DAY_NAMES[birthday.getDay()]
      const dateFormatted = `${birthday.getDate()} ${MONTH_NAMES[birthday.getMonth()]}`
      const turningAge = calculateAge(person.dateOfBirth, birthday)
      const diffTime = birthday.getTime() - today.getTime()
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      entries.push({
        ...person,
        dayName,
        dateFormatted,
        turningAge,
        daysUntil
      })
    }
  }

  // Sort by day of week (Monday first)
  entries.sort((a, b) => {
    const dayA = DAY_NAMES.indexOf(a.dayName)
    const dayB = DAY_NAMES.indexOf(b.dayName)
    // Shift so Monday=0, Sunday=6
    const sortA = dayA === 0 ? 6 : dayA - 1
    const sortB = dayB === 0 ? 6 : dayB - 1
    return sortA - sortB
  })

  return entries
}

export function getWeekRange(weekOffset: number = 0): { start: string; end: string } {
  const today = new Date()
  const monday = getMonday(today)
  monday.setDate(monday.getDate() + weekOffset * 7)
  const sunday = getSunday(monday)

  return {
    start: `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()]}`,
    end: `${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]}`
  }
}
