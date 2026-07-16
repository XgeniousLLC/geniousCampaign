// Lightweight client-side preview parser — only reads the header row and one
// sample data row so the import modal can build a column-mapping UI. The
// authoritative full-file parse (csv-parse) always happens server-side in
// the import job; this never needs to handle the whole file.
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

export interface CsvPreview {
  headers: string[];
  sampleRow: string[];
}

export async function previewCsv(file: File): Promise<CsvPreview> {
  // Reading the whole file as text is fine here — even a 10k-row CSV is a
  // few MB at most, and we only look at the first two lines.
  const text = await file.text();
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.length > 0);
  const headers = lines[0] ? parseCsvLine(lines[0]) : [];
  const sampleRow = lines[1] ? parseCsvLine(lines[1]) : [];
  return { headers, sampleRow };
}

const EMAIL_HEADER_RE = /email/i;
const FIRST_NAME_RE = /^first[\s_-]?name$/i;
const LAST_NAME_RE = /^last[\s_-]?name$/i;
const FULL_NAME_RE = /^(full[\s_-]?)?name$/i;

export function guessColumnTarget(header: string): 'email' | 'firstName' | 'lastName' | 'fullName' | 'ignore' {
  const h = header.trim();
  if (EMAIL_HEADER_RE.test(h)) return 'email';
  if (FIRST_NAME_RE.test(h)) return 'firstName';
  if (LAST_NAME_RE.test(h)) return 'lastName';
  if (FULL_NAME_RE.test(h)) return 'fullName';
  return 'ignore';
}
