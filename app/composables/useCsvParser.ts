export interface CsvParticipant {
  number: number
  name: string
}

export function useCsvParser() {
  function parseCsv(content: string): CsvParticipant[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(';')
        const number = parseInt(parts[0]?.trim() ?? '', 10)
        const name = parts[1]?.trim() ?? ''
        return { number, name }
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
