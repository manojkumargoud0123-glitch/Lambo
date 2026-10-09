/**
 * Client-side exports with no extra dependencies:
 *  - CSV  (UTF-8 with BOM so Excel opens it with the right encoding)
 *  - XLSX (a real Office Open XML workbook, zipped with a tiny store-only writer)
 *  - PDF  (a branded, print-ready document opened in a new window → Save as PDF)
 */

export interface ExportColumn<T> {
  header: string
  value: (row: T) => string | number
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const stamp = () => new Date().toISOString().slice(0, 10)

// ── CSV ─────────────────────────────────────────────────────
export function exportCsv<T>(name: string, columns: ExportColumn<T>[], rows: T[]) {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map((c) => esc(c.header)).join(',')]
  for (const r of rows) lines.push(columns.map((c) => esc(c.value(r))).join(','))
  download(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }), `${name}-${stamp()}.csv`)
}

// ── XLSX ────────────────────────────────────────────────────
const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function colRef(i: number) {
  let s = ''
  let n = i + 1
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(data: Uint8Array) {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Minimal ZIP writer (STORE method) — all an .xlsx container needs. */
function zip(files: { name: string; content: string }[]) {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const f of files) {
    const name = enc.encode(f.name)
    const data = enc.encode(f.content)
    const crc = crc32(data)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(8, 0, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, name.length, true)
    chunks.push(new Uint8Array(local.buffer), name, data)

    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, 0x02014b50, true)
    cen.setUint16(4, 20, true)
    cen.setUint16(6, 20, true)
    cen.setUint32(16, crc, true)
    cen.setUint32(20, data.length, true)
    cen.setUint32(24, data.length, true)
    cen.setUint16(28, name.length, true)
    cen.setUint32(42, offset, true)
    central.push(new Uint8Array(cen.buffer), name)

    offset += 30 + name.length + data.length
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)] as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function exportXlsx<T>(name: string, sheetTitle: string, columns: ExportColumn<T>[], rows: T[]) {
  const cell = (v: string | number, r: number, c: number, style = 0) => {
    const ref = `${colRef(c)}${r}`
    const s = style ? ` s="${style}"` : ''
    return typeof v === 'number' && Number.isFinite(v)
      ? `<c r="${ref}"${s}><v>${v}</v></c>`
      : `<c r="${ref}" t="inlineStr"${s}><is><t>${xmlEsc(String(v))}</t></is></c>`
  }
  const header = `<row r="1">${columns.map((c, i) => cell(c.header, 1, i, 1)).join('')}</row>`
  const body = rows
    .map((row, ri) => `<row r="${ri + 2}">${columns.map((c, ci) => cell(c.value(row), ri + 2, ci)).join('')}</row>`)
    .join('')
  const widths = columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(12, c.header.length + 6)}" customWidth="1"/>`).join('')

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${header}${body}</sheetData></worksheet>`

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D1D1B"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`

  const safeTitle = xmlEsc(sheetTitle.slice(0, 31))
  download(
    zip([
      {
        name: '[Content_Types].xml',
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      },
      {
        name: '_rels/.rels',
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      },
      {
        name: 'xl/workbook.xml',
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeTitle}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      },
      { name: 'xl/styles.xml', content: styles },
      { name: 'xl/worksheets/sheet1.xml', content: sheet },
    ]),
    `${name}-${stamp()}.xlsx`,
  )
}

// ── PDF (print) ─────────────────────────────────────────────
export function exportPdf<T>(title: string, subtitle: string, columns: ExportColumn<T>[], rows: T[]) {
  const w = window.open('', '_blank', 'width=1100,height=800')
  if (!w) return false
  const head = columns.map((c) => `<th>${xmlEsc(c.header)}</th>`).join('')
  const body = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${xmlEsc(String(c.value(r)))}</td>`).join('')}</tr>`)
    .join('')
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${xmlEsc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Georama:wdth,wght@150,400..600&family=Kanit:wght@300;400&display=swap">
<style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: Kanit, system-ui, sans-serif; font-weight: 300; color: #1d1d1b; margin: 0; }
  header { display: flex; align-items: center; gap: 14px; border-bottom: 1px solid #1d1d1b; padding-bottom: 12px; margin-bottom: 16px; }
  header img { height: 44px; }
  h1 { font-family: Georama, sans-serif; font-variation-settings: 'wdth' 150; text-transform: uppercase; font-weight: 500; font-size: 18px; letter-spacing: .08em; margin: 0; }
  p { margin: 2px 0 0; font-size: 11px; color: #6b6964; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  th { text-align: left; font-family: Georama, sans-serif; font-variation-settings: 'wdth' 150; font-weight: 500; text-transform: uppercase; letter-spacing: .06em; font-size: 7.5px; background: #1d1d1b; color: #fff; padding: 7px 6px; }
  td { padding: 6px; border-bottom: 1px solid #e8e8e8; font-variant-numeric: tabular-nums; }
  tr:nth-child(even) td { background: #f6f5f5; }
  footer { margin-top: 12px; font-size: 9px; color: #9a978f; }
</style></head><body>
<header><img src="${location.origin}/brand/shield.png" alt=""><div><h1>${xmlEsc(title)}</h1><p>${xmlEsc(subtitle)} · ${rows.length} records · generated ${new Date().toLocaleString('en-IN')}</p></div></header>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
<footer>Tonino Lamborghini Golf Cart · Fleet Intelligence</footer>
<script>document.fonts.ready.then(function(){setTimeout(function(){window.print()},250)})</script>
</body></html>`)
  w.document.close()
  return true
}
