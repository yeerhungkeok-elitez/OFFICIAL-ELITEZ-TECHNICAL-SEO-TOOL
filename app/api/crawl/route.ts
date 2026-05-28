// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Crawl API Route (SSE streaming) V1+V2
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest } from 'next/server';
import { crawlWebsite, getDomain } from '@/lib/seoCrawler';
import { runAllChecks } from '@/lib/seoChecks';
import { calculateScore, buildSummary } from '@/lib/scoring';
import { buildSchemaAudit } from '@/lib/schemaChecks';
import { attachSchemaScore } from '@/lib/schemaScoring';
import type { ScanResult, CrawlProgressEvent } from '@/types/seo';

export const dynamic     = 'force-dynamic';
export const maxDuration = 120; // 2 min — increase for Vercel Pro

function encodeSSE(data: CrawlProgressEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

function validateUrl(raw: string): URL {
  if (!raw || raw.trim() === '') throw new Error('URL is required');
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP/HTTPS URLs are supported');
  if (!parsed.hostname || parsed.hostname.length < 2)  throw new Error('Invalid hostname');
  return parsed;
}

export async function POST(req: NextRequest) {
  let body: { url?: string; maxPages?: number; publicMode?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = validateUrl(body.url ?? '');
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const startUrl   = parsedUrl.toString();
  const publicMode = body.publicMode === true;
  // Public mode is limited to 10 pages; internal mode allows up to 50
  const maxPages   = publicMode
    ? Math.min(Math.max(Number(body.maxPages ?? 10), 1), 10)
    : Math.min(Math.max(Number(body.maxPages ?? 50), 1), 50);
  const crawlStart = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: CrawlProgressEvent) => {
        try { controller.enqueue(encodeSSE(event)); } catch { /* stream closed */ }
      };

      try {
        const onProgress = (crawled: number, queued: number, currentUrl: string) => {
          send({
            type: 'progress',
            crawled,
            queued: Math.min(queued, maxPages - crawled),
            currentUrl,
            message: `Crawling ${crawled + 1} of ~${Math.min(crawled + queued + 1, maxPages)}: ${currentUrl}`,
          });
        };

        // ── Crawl ───────────────────────────────────────────────────────────
        const { pages, robots, sitemap } = await crawlWebsite(startUrl, maxPages, onProgress);

        // ── V1 Checks ───────────────────────────────────────────────────────
        const issues  = runAllChecks(pages, robots, sitemap);
        const score   = calculateScore(pages, robots, sitemap);
        const summary = buildSummary(pages, issues);

        // ── V2 Schema Audit ─────────────────────────────────────────────────
        let schemaAudit = buildSchemaAudit(pages);
        schemaAudit     = attachSchemaScore(schemaAudit, pages);

        // ── Strip heavy parsed objects before serialising ───────────────────
        // `parsed` is used only for in-memory checks; remove before sending to client.
        // In publicMode, also strip full schemaBlocks to reduce payload size.
        const pagesLean = pages.map(p => ({
          ...p,
          schemaBlocks: publicMode
            ? []  // don't send raw schema in public mode before lead capture
            : (p.schemaBlocks ?? []).map(b => ({ ...b, parsed: null })),
        }));

        const result: ScanResult = {
          id:            `scan_${Date.now()}`,
          domain:        getDomain(startUrl),
          startUrl,
          crawledAt:     new Date().toISOString(),
          crawlDuration: Math.round((Date.now() - crawlStart) / 1000),
          pages:         pagesLean,
          robots,
          sitemap,
          issues,
          score,
          summary,
          schemaAudit,
        };

        send({ type: 'complete', crawled: pagesLean.length, queued: 0, result });

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        let userMessage = message;
        if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
          userMessage = `Cannot reach the domain "${getDomain(startUrl)}". Check the URL is correct and the site is online.`;
        } else if (message.includes('AbortError') || message.includes('timeout')) {
          userMessage = 'The website took too long to respond. Try again or check your connection.';
        } else if (message.includes('SSL') || message.includes('certificate')) {
          userMessage = 'SSL certificate error. The site may have an invalid HTTPS certificate.';
        }
        send({ type: 'error', crawled: 0, queued: 0, error: userMessage });
      }

      try { controller.close(); } catch { /* already closed */ }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
