import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface JoinedStudent {
  name: string
  phone: string
  exam_number: string | null
  series: string | null
  region: string | null
}

interface JoinedMaterial {
  name: string
}

interface ExportRow {
  id: number
  distributed_at: string
  distributed_by: string
  note: string
  students: JoinedStudent | null
  materials: JoinedMaterial | null
}

const PAGE_SIZE = 1000

const esc = (value: string | null | undefined): string => {
  const str = String(value ?? '')
    .replace(/\r\n/g, ' ')
    .replace(/[\r\n]/g, ' ')
    .replace(/"/g, '""')
  return `"${str}"`
}

async function loadRows(exportAll: boolean, dateFrom: string, dateTo: string): Promise<ExportRow[]> {
  const db = createServerClient()
  const rows: ExportRow[] = []

  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = db
      .from('distribution_logs')
      .select(
        'id, distributed_at, distributed_by, note, students(name, phone, exam_number, series, region), materials(name)',
      )
      .order('distributed_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (!exportAll) {
      query = query
        .gte('distributed_at', `${dateFrom}T00:00:00+09:00`)
        .lte('distributed_at', `${dateTo}T23:59:59.999+09:00`)
    }

    const { data, error } = await query
    if (error) {
      throw error
    }

    const batch = (data ?? []) as unknown as ExportRow[]
    rows.push(...batch)

    if (batch.length < PAGE_SIZE) {
      break
    }
  }

  return rows
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const exportAll = sp.get('all') === '1'
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  const dateFrom = sp.get('date_from') ?? today
  const dateTo = sp.get('date_to') ?? today

  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!exportAll && (!datePattern.test(dateFrom) || !datePattern.test(dateTo))) {
    return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  let rows: ExportRow[]
  try {
    rows = await loadRows(exportAll, dateFrom, dateTo)
  } catch {
    return NextResponse.json({ error: '데이터를 불러오지 못했습니다.' }, { status: 500 })
  }

  const header = ['ID', '배부일시(KST)', '학생명', '연락처', '수험번호', '구분', '응시청', '자료명', '처리자', '메모']
  const lines = [
    header.join(','),
    ...rows.map((row) => {
      const student = row.students
      const material = row.materials
      const kst = new Date(row.distributed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      return [
        row.id,
        esc(kst),
        esc(student?.name),
        esc(student?.phone),
        esc(student?.exam_number),
        esc(student?.series),
        esc(student?.region),
        esc(material?.name),
        esc(row.distributed_by),
        esc(row.note),
      ].join(',')
    }),
  ]

  const bom = '\uFEFF'
  const filename = exportAll
    ? 'distribution_logs_all.csv'
    : `distribution_logs_${dateFrom}${dateFrom !== dateTo ? `_${dateTo}` : ''}.csv`

  return new NextResponse(bom + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
