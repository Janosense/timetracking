export type Gender = 'F' | 'M'

export interface CsvParticipant {
  number: number
  name: string
  gender: Gender | null
}

export function useCsvParser() {
  function parseGender(raw: string | undefined): Gender | null {
    const v = (raw ?? '').trim().toUpperCase()
    if (v === 'F' || v === 'W') return 'F'
    if (v === 'M') return 'M'
    return null
  }

  function parseCsv(content: string): CsvParticipant[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(';')
        const number = parseInt(parts[0]?.trim() ?? '', 10)
        const name = parts[1]?.trim() ?? ''
        const gender = parseGender(parts[2])
        return { number, name, gender }
      })
      .filter(p => !isNaN(p.number) && p.number > 0)
  }

  async function readCsvFile(file: File): Promise<CsvParticipant[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(parseCsv(e.target?.result as string))
      reader.onerror = () => reject(new Error('Failed to read CSV file'))
      reader.readAsText(file)
    })
  }

  return { parseCsv, readCsvFile }
}
