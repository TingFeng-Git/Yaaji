interface MockRow {
  [key: string]: unknown
}

interface MockTable {
  data: MockRow[]
  autoIncrement: number
}

class MockD1PreparedStatement {
  private db: MockD1Database
  private sql: string
  private params: unknown[]

  constructor(db: MockD1Database, sql: string) {
    this.db = db
    this.sql = sql
    this.params = []
  }

  bind(...params: unknown[]): this {
    this.params = params
    return this
  }

  async first(colName?: string): Promise<unknown> {
    const normalized = this.sql.trim().toUpperCase()
    if (normalized.includes('RETURNING')) {
      if (normalized.startsWith('INSERT')) {
        const result = this.execInsert()
        const tableName = this.extractTableName()
        const table = this.getTableData(tableName)
        const row = table.data.find(r => r.id === result.meta.last_row_id) || null
        if (!row) return null
        if (colName) return row[colName]
        return row
      }
      if (normalized.startsWith('UPDATE')) {
        const whereMatch = this.sql.match(/WHERE\s+(\w+)\s*=\s*\?/i)
        if (whereMatch) {
          this.execUpdate()
          const tableName = this.extractTableName()
          const table = this.getTableData(tableName)
          const col = whereMatch[1]
          const val = this.params[this.params.length - 1]
          const row = table.data.find(r => r[col] === Number(val) || r[col] === val) || null
          if (!row) return null
          if (colName) return row[colName]
          return row
        }
      }
    }
    const results = this.execSelect()
    if (results.length === 0) return null
    if (colName) return results[0][colName]
    return results[0]
  }

  async all(): Promise<{ results: unknown[] }> {
    return { results: this.execSelect() }
  }

  async run(): Promise<{ success: boolean; meta: { changes: number; last_row_id: number } }> {
    const normalized = this.sql.trim().toUpperCase()

    if (normalized.startsWith('INSERT')) return this.execInsert()
    if (normalized.startsWith('UPDATE')) return this.execUpdate()
    if (normalized.startsWith('DELETE')) return this.execDelete()

    return { success: true, meta: { changes: 0, last_row_id: 0 } }
  }

  private extractTableName(): string {
    const match = this.sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i)
    return match ? match[1] : ''
  }

  private getTableData(tableName: string): MockTable {
    if (!this.db.tables.has(tableName)) {
      this.db.tables.set(tableName, { data: [], autoIncrement: 0 })
    }
    return this.db.tables.get(tableName)!
  }

  private execSelect(): MockRow[] {
    const tableName = this.extractTableName()
    const table = this.getTableData(tableName)
    let rows = [...table.data]

    const whereMatch = this.sql.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|$)/i)
    if (whereMatch) {
      rows = this.applyWhere(rows, whereMatch[1].trim())
    }

    if (this.sql.toUpperCase().includes('LEFT JOIN') && this.sql.includes('b.id IS NULL')) {
      const bookmarks = this.getTableData('bookmarks')
      rows = rows.filter(row => !bookmarks.data.some(b => b.category_id === row.id))
    }

    return rows
  }

  private applyWhere(rows: MockRow[], clause: string): MockRow[] {
    const eqMatch = clause.match(/(\w+)\s*=\s*\?/)
    if (eqMatch) {
      const col = eqMatch[1]
      const val = this.params[0]
      return rows.filter(row => row[col] === val || row[col] === Number(val))
    }

    if (clause.includes('IS NOT NULL')) {
      const colMatch = clause.match(/(\w+)\s+IS\s+NOT\s+NULL/i)
      if (colMatch) return rows.filter(row => row[colMatch[1]] != null)
    }

    if (clause.includes('IS NULL')) {
      const colMatch = clause.match(/(\w+)\s+IS\s+NULL/i)
      if (colMatch) return rows.filter(row => row[colMatch[1]] == null)
    }

    const inMatch = clause.match(/(\w+)\s+IN\s*\(([^)]+)\)/i)
    if (inMatch) {
      const col = inMatch[1]
      const values = this.params.map(v => Number(v))
      return rows.filter(row => values.includes(row[col] as number))
    }

    return rows
  }

  private execInsert(): { success: boolean; meta: { changes: number; last_row_id: number } } {
    const tableName = this.extractTableName()
    const table = this.getTableData(tableName)

    const colsMatch = this.sql.match(/\(([^)]+)\)\s*VALUES/i)
    if (!colsMatch) return { success: true, meta: { changes: 0, last_row_id: 0 } }

    const columns = colsMatch[1].split(',').map(c => c.trim().replace(/['"]/g, ''))

    table.autoIncrement++
    const newRow: MockRow = { id: table.autoIncrement }

    columns.forEach((col, idx) => {
      if (col.toLowerCase() !== 'id') {
        newRow[col] = this.params[idx] ?? null
      }
    })

    table.data.push(newRow)
    return { success: true, meta: { changes: 1, last_row_id: table.autoIncrement } }
  }

  private execUpdate(): { success: boolean; meta: { changes: number; last_row_id: number } } {
    const tableName = this.extractTableName()
    const table = this.getTableData(tableName)

    const whereMatch = this.sql.match(/WHERE\s+(\w+)\s*=\s*\?/i)
    if (!whereMatch) return { success: true, meta: { changes: 0, last_row_id: 0 } }

    const whereCol = whereMatch[1]
    const whereVal = this.params[this.params.length - 1]

    const setMatch = this.sql.match(/SET\s+(.+?)\s+WHERE/i)
    if (!setMatch) return { success: true, meta: { changes: 0, last_row_id: 0 } }

    const setParts = setMatch[1].split(',').map(s => s.trim())
    const assignments: { col: string; hasParam: boolean; expression: string }[] = []
    let paramIdx = 0

    for (const part of setParts) {
      const colMatch = part.match(/(\w+)\s*=\s*(.+)/)
      if (!colMatch) continue
      const col = colMatch[1]
      const expr = colMatch[2].trim()
      const hasParam = expr === '?'
      assignments.push({ col, hasParam, expression: expr })
      if (hasParam) paramIdx++
    }

    let changes = 0
    table.data = table.data.map(row => {
      if (row[whereCol] === Number(whereVal) || row[whereCol] === whereVal) {
        changes++
        const updated = { ...row }
        let pIdx = 0
        for (const a of assignments) {
          if (a.hasParam) {
            updated[a.col] = this.params[pIdx]
            pIdx++
          } else if (a.expression.includes('+')) {
            const parts = a.expression.split('+').map(p => p.trim())
            const left = parts[0] === a.col ? (updated[a.col] as number) || 0 : Number(parts[0])
            const right = Number(parts[1])
            updated[a.col] = left + right
          }
        }
        return updated
      }
      return row
    })

    return { success: true, meta: { changes, last_row_id: 0 } }
  }

  private execDelete(): { success: boolean; meta: { changes: number; last_row_id: number } } {
    const tableName = this.extractTableName()
    const table = this.getTableData(tableName)
    const before = table.data.length

    const whereEq = this.sql.match(/WHERE\s+(\w+)\s*=\s*\?/i)
    if (whereEq) {
      const col = whereEq[1]
      const val = this.params[0]
      table.data = table.data.filter(row => row[col] !== Number(val) && row[col] !== val)
      return { success: true, meta: { changes: before - table.data.length, last_row_id: 0 } }
    }

    const whereInParam = this.sql.match(/WHERE\s+(\w+)\s+IN\s*\(\s*\?/i)
    if (whereInParam) {
      const col = whereInParam[1]
      const values = this.params.map(v => Number(v))
      table.data = table.data.filter(row => !values.includes(row[col] as number))
      return { success: true, meta: { changes: before - table.data.length, last_row_id: 0 } }
    }

    const whereInSubquery = this.sql.match(/WHERE\s+(\w+)\s+IN\s*\(\s*SELECT/i)
    if (whereInSubquery) {
      const col = whereInSubquery[1]
      const idsToDelete = this.execSubquery()
      table.data = table.data.filter(row => !idsToDelete.includes(row[col] as number))
      return { success: true, meta: { changes: before - table.data.length, last_row_id: 0 } }
    }

    return { success: true, meta: { changes: 0, last_row_id: 0 } }
  }

  private execSubquery(): number[] {
    if (this.sql.includes('LEFT JOIN') && this.sql.includes('b.id IS NULL')) {
      const categories = this.getTableData('categories')
      const bookmarks = this.getTableData('bookmarks')
      return categories.data
        .filter(cat => !bookmarks.data.some(b => b.category_id === cat.id))
        .map(cat => cat.id as number)
    }
    return []
  }
}

export class MockD1Database {
  tables: Map<string, MockTable> = new Map()

  prepare(sql: string): D1PreparedStatement {
    return new MockD1PreparedStatement(this, sql) as unknown as D1PreparedStatement
  }

  async batch(): Promise<unknown[]> { return [] }
  async exec(): Promise<D1ExecResult> { return { count: 0, duration: 0 } }

  seed(tableName: string, rows: MockRow[]): void {
    const table: MockTable = { data: [], autoIncrement: 0 }
    rows.forEach(row => {
      table.autoIncrement = Math.max(table.autoIncrement, (row.id as number) || 0)
      table.data.push({ ...row })
    })
    this.tables.set(tableName, table)
  }

  getAll(tableName: string): MockRow[] {
    return this.tables.get(tableName)?.data || []
  }
}

export function createMockDB(): MockD1Database {
  return new MockD1Database()
}
