// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — GSC File Parser (V3)
// Parses Google Search Console Coverage / Indexing report exports (.xlsx, .csv)
// Handles flexible column naming across different GSC export formats.
// ─────────────────────────────────────────────────────────────────────────────

import type { GSCRecord, GSCReasonCategory } from '@/types/seo';

// ─── Column name candidates (all lowercase for matching) ─────────────────────

const URL_COLS     = ['url', 'page', 'pages', 'top pages', 'address', 'landing page', 'canonical url'];
const REASON_COLS  = ['reason', 'status', 'indexing status', 'coverage status', 'index status',
                      'why excluded', 'coverage', 'verdict', 'excluded because'];
const VALID_COLS   = ['validation', 'validation status', 'validation state', 'validation issue'];
const CRAWL_COLS   = ['last crawled', 'last crawl', 'crawl date', 'date crawled', 'crawled',
                      'last crawl time', 'last crawl date'];
const SOURCE_COLS  = ['source', 'discovered by', 'discovery source', 'how discovered',
                      'referring page', 'first discovered'];

// ─── Column finder ────────────────────────────────────────────────────────────

function findCol(headers: string[], candidates: string[]): string | undefined {
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const c of candidates) {
    // Exact match first
    const exact = lower.findIndex(h => h === c);
    if (exact !== -1) return headers[exact];
  }
  for (const c of candidates) {
    // Substring match
    const sub = lower.findIndex(h => h.includes(c) || c.includes(h));
    if (sub !== -1) return headers[sub];
  }
  return undefined;
}

// ─── Reason categoriser ───────────────────────────────────────────────────────

export function categorizeReason(reason: string): GSCReasonCategory {
  const r = reason.toLowerCase().trim();
  if (!r) return 'other';

  // Indexed — good states
  if (r === 'indexed' ||
      r.includes('submitted and indexed') ||
      r.includes('indexed, not submitted') ||
      r.includes('indexed - not submitted') ||
      (r.includes('indexed') && r.includes('not submitted'))) return 'indexed';

  // Noindex tag
  if (r.includes('noindex') || r.includes("'noindex'") || r.includes('"noindex"') ||
      r.includes('no index') || r.includes('marked noindex') ||
      r.includes('excluded by') && r.includes('noindex')) return 'noindex-excluded';

  // Crawled not indexed
  if (r.includes('crawled') && (r.includes('not indexed') || r.includes('currently not')))
    return 'crawled-not-indexed';

  // Discovered not indexed
  if (r.includes('discovered') && (r.includes('not indexed') || r.includes('currently not')))
    return 'discovered-not-indexed';

  // Duplicates — check before generic "canonical"
  if ((r.includes('duplicate') && r.includes('without')) ||
      (r.includes('duplicate') && r.includes('google chose')) ||
      (r.includes('duplicate') && r.includes('canonical')))
    return 'duplicate-no-canonical';

  // Alternate canonical
  if (r.includes('alternate page') || (r.includes('canonical') && r.includes('proper')))
    return 'canonical-alternate';

  // Robots.txt blocking
  if (r.includes('robots.txt') || r.includes('robots txt'))
    return 'robots-blocked';

  // Soft 404 — must come before plain 404
  if (r.includes('soft 404') || r.includes('soft404'))
    return 'soft-404';

  // 404
  if (r.includes('not found') || (r.includes('404') && !r.includes('soft')))
    return 'not-found-404';

  // 5xx / Server error
  if (r.includes('server error') || r.includes('5xx') ||
      r.includes('500') || r.includes('503'))
    return 'server-error-5xx';

  // 403
  if (r.includes('403') || r.includes('access forbidden') || r.includes('forbidden'))
    return 'forbidden-403';

  // 401
  if (r.includes('401') || r.includes('unauthorized') || r.includes('unauthorised'))
    return 'unauthorized-401';

  // Redirect
  if (r.includes('redirect'))
    return 'redirect';

  // URL unknown
  if (r.includes('unknown'))
    return 'url-unknown';

  // Page removal tool
  if (r.includes('page removal') || r.includes('removal tool'))
    return 'page-removal-blocked';

  return 'other';
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export interface ParseResult {
  records: GSCRecord[];
  sheetName: string;
  rowCount: number;
  detectedColumns: Record<string, string>;
}

export async function parseGSCFile(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<ParseResult> {
  // Dynamic import so xlsx is only loaded client-side and code-split
  const XLSX = await import('xlsx');

  const ext = (fileName.split('.').pop() ?? '').toLowerCase();

  let workbook: ReturnType<typeof XLSX.read>;

  if (ext === 'csv') {
    const text = new TextDecoder('utf-8').decode(buffer);
    workbook   = XLSX.read(text, { type: 'string', raw: false });
  } else {
    // .xlsx / .xls / .ods etc.
    workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', raw: false, cellDates: true });
  }

  // ── Find the most relevant sheet ──────────────────────────────────────
  let sheetName = workbook.SheetNames[0] ?? 'Sheet1';
  for (const name of workbook.SheetNames) {
    const n = name.toLowerCase();
    if (n.includes('coverage') || n.includes('index') ||
        n.includes('page')     || n.includes('url')) {
      sheetName = name;
      break;
    }
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error('No worksheets found in the uploaded file.');

  // Skip any leading summary rows — find the first row that looks like a header
  // by reading as array of arrays first, then trimming metadata rows from top
  const rawAoA: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1, raw: false, defval: '',
  }) as string[][];

  // Find the header row index (first row containing "url" or "page" in any cell)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(10, rawAoA.length); i++) {
    const row = rawAoA[i].map(c => String(c).toLowerCase().trim());
    if (URL_COLS.some(u => row.includes(u)) || row.some(c => c === 'url' || c === 'page')) {
      headerRowIdx = i;
      break;
    }
  }

  // Re-parse with correct header row
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: '',
    range: headerRowIdx,
  }) as Record<string, string>[];

  if (!rows.length) {
    throw new Error(
      'The file appears to be empty or has no data rows. ' +
      'Please export a Coverage / Indexing report from Google Search Console.'
    );
  }

  const headers = Object.keys(rows[0]);
  const urlCol     = findCol(headers, URL_COLS);
  const reasonCol  = findCol(headers, REASON_COLS);
  const validCol   = findCol(headers, VALID_COLS);
  const crawledCol = findCol(headers, CRAWL_COLS);
  const sourceCol  = findCol(headers, SOURCE_COLS);

  if (!urlCol) {
    throw new Error(
      `Could not find a URL column. Detected columns: "${headers.join('", "')}".\n` +
      `Expected a column named "URL", "Page", or "Pages".`
    );
  }

  const detectedColumns: Record<string, string> = { url: urlCol };
  if (reasonCol)  detectedColumns.reason      = reasonCol;
  if (validCol)   detectedColumns.validation  = validCol;
  if (crawledCol) detectedColumns.lastCrawled = crawledCol;
  if (sourceCol)  detectedColumns.source      = sourceCol;

  const records: GSCRecord[] = rows
    .filter(row => {
      const url = String(row[urlCol] ?? '').trim();
      return url.startsWith('http') || url.startsWith('/');
    })
    .map(row => {
      const reason = reasonCol ? String(row[reasonCol] ?? '').trim() : '';
      return {
        url:              String(row[urlCol] ?? '').trim(),
        reason,
        reasonCategory:   categorizeReason(reason),
        validationStatus: validCol   ? String(row[validCol]   ?? '').trim() : '',
        lastCrawled:      crawledCol ? String(row[crawledCol] ?? '').trim() : '',
        source:           sourceCol  ? String(row[sourceCol]  ?? '').trim() : '',
        rawRow:           Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k, String(v)])
        ),
      };
    });

  if (!records.length) {
    throw new Error(
      'No valid URLs found in the file. ' +
      'Make sure the file contains rows starting with "https://".'
    );
  }

  return {
    records,
    sheetName,
    rowCount: rows.length,
    detectedColumns,
  };
}
