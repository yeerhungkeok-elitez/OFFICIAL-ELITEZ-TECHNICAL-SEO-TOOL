'use client';

import { useState, useCallback } from 'react';

interface Props {
  raw: string;
  isValid: boolean;
  types: string[];
  parseError?: string;
  defaultExpanded?: boolean;
  label?: string;
}

/** Lightweight JSON syntax highlighter — no external dependencies */
function highlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match)) {
          if (/:$/.test(match)) return `<span class="json-key">${match}</span>`;
          return `<span class="json-string">${match}</span>`;
        }
        if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`;
        if (/null/.test(match))       return `<span class="json-null">${match}</span>`;
        return `<span class="json-num">${match}</span>`;
      }
    );
}

function prettyPrint(raw: string): { formatted: string; ok: boolean } {
  try {
    const parsed = JSON.parse(raw);
    return { formatted: JSON.stringify(parsed, null, 2), ok: true };
  } catch {
    return { formatted: raw, ok: false };
  }
}

export default function SchemaPreview({ raw, isValid, types, parseError, defaultExpanded = false, label }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied,   setCopied]   = useState(false);

  const { formatted } = prettyPrint(raw);

  const copyCode = useCallback(() => {
    const scriptTag = `<script type="application/ld+json">\n${formatted}\n</script>`;
    navigator.clipboard.writeText(scriptTag).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* ignore */ });
  }, [formatted]);

  return (
    <div className={`rounded-xl border overflow-hidden ${isValid ? 'border-slate-200' : 'border-red-200'}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer
          ${isValid ? 'bg-slate-800 hover:bg-slate-700' : 'bg-red-900 hover:bg-red-800'}
          transition-colors`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            isValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isValid ? '✓ Valid' : '✗ Invalid'}
          </span>
          {types.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {types.map(t => (
                <span key={t} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-medium">
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">No @type detected</span>
          )}
          {label && <span className="text-xs text-slate-400 hidden sm:inline">{label}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isValid && (
            <button
              onClick={e => { e.stopPropagation(); copyCode(); }}
              className="text-xs bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 px-2 py-1 rounded transition-colors"
            >
              {copied ? '✓ Copied!' : '⎘ Copy'}
            </button>
          )}
          <span className="text-slate-400 transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
            ▾
          </span>
        </div>
      </div>

      {/* Expanded: syntax-highlighted JSON */}
      {expanded && (
        <div className="bg-slate-950 overflow-x-auto">
          {!isValid && parseError && (
            <div className="px-4 py-2 bg-red-950 border-b border-red-800 text-red-400 text-xs font-mono">
              ⚠ Parse error: {parseError}
            </div>
          )}
          <pre
            className="p-4 text-xs leading-relaxed font-mono min-h-0 overflow-x-auto"
            style={{ maxHeight: '400px', overflowY: 'auto' }}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: highlight(formatted) }}
          />
        </div>
      )}

      {/* Inline CSS for syntax highlighting */}
      <style>{`
        .json-key    { color: #93c5fd; }
        .json-string { color: #86efac; }
        .json-bool   { color: #c084fc; }
        .json-null   { color: #fca5a5; }
        .json-num    { color: #fde68a; }
      `}</style>
    </div>
  );
}
