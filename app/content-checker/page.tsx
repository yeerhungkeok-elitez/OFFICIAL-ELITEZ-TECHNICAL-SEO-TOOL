'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Main Page (V9)
// Full page: article input form → score → fix panel → preview → export.
// Two-column layout: input left | results right (stacks on mobile).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';

import type { ArticleDraft, ContentScoreResult, ContentChange } from '@/types/content';
import { scoreContent }          from '@/lib/contentScorer';
import { autoFixDraft, applyFixResult } from '@/lib/contentAutoFixer';
import { createEmptyDraft, saveDraft }  from '@/lib/contentDraftStore';

import ContentScorePanel  from '@/components/ContentScorePanel';
import AutoFixPanel       from '@/components/AutoFixPanel';
import BeforeAfterPreview from '@/components/BeforeAfterPreview';

// ─── Initial form state ─────────────────────────────────────────────────────────

interface FormState {
  title:           string;
  focusKeyphrase:  string;
  brandName:       string;
  city:            string;
  serviceType:     string;
  category:        ArticleDraft['category'];
  metaTitle:       string;
  metaDescription: string;
  content:         string;
}

const EMPTY_FORM: FormState = {
  title:           '',
  focusKeyphrase:  '',
  brandName:       '',
  city:            '',
  serviceType:     '',
  category:        'blog',
  metaTitle:       '',
  metaDescription: '',
  content:         '',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formToDraft(form: FormState, existing?: ArticleDraft): ArticleDraft {
  const now = new Date().toISOString();
  return {
    id:              existing?.id              ?? `draft-${Date.now()}`,
    title:           form.title,
    focusKeyphrase:  form.focusKeyphrase,
    content:         form.content,
    metaTitle:       form.metaTitle,
    metaDescription: form.metaDescription,
    brandName:       form.brandName,
    city:            form.city,
    serviceType:     form.serviceType,
    category:        form.category,
    createdAt:       existing?.createdAt       ?? now,
    updatedAt:       now,
    scoreHistory:    existing?.scoreHistory     ?? [],
  };
}

// ─── Input field wrapper ────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition';
const selectCls = inputCls + ' cursor-pointer';

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ContentCheckerPage() {
  const [form,         setForm]         = useState<FormState>(EMPTY_FORM);
  const [draft,        setDraft]        = useState<ArticleDraft | null>(null);
  const [scoreResult,  setScoreResult]  = useState<ContentScoreResult | null>(null);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [originalScore,   setOriginalScore]   = useState<{ overall: number; readiness: string } | null>(null);
  const [allChanges,   setAllChanges]   = useState<ContentChange[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fixingId,     setFixingId]     = useState<string | null>(null);
  const [saveMsg,      setSaveMsg]      = useState('');

  // Track ignored issue IDs locally (without re-scoring)
  const ignoredIdsRef = useRef<Set<string>>(new Set());

  // ── Form helpers ─────────────────────────────────────────────────────────────

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Score ─────────────────────────────────────────────────────────────────────

  const handleScore = useCallback(() => {
    if (!form.content.trim()) return;

    const d = formToDraft(form, draft ?? undefined);
    setDraft(d);
    setOriginalContent(d.content);

    const result = scoreContent(d);

    // Restore ignored state
    const patchedIssues = result.issues.map(i => ({
      ...i,
      isIgnored: ignoredIdsRef.current.has(i.id),
    }));

    setScoreResult({ ...result, issues: patchedIssues });
    setOriginalScore({ overall: result.overall, readiness: result.readiness });
    setAllChanges([]);
  }, [form, draft]);

  // ── Apply fix result ──────────────────────────────────────────────────────────

  const applyResult = useCallback((result: ReturnType<typeof autoFixDraft>, currentDraft: ArticleDraft) => {
    const updated = applyFixResult(currentDraft, result, result.issueIdsFixed);
    setDraft(updated);
    setForm(prev => ({
      ...prev,
      content:         result.updatedContent,
      metaTitle:       result.updatedMetaTitle,
      metaDescription: result.updatedMetaDescription,
    }));

    const newScore = scoreContent(updated);
    const patchedIssues = newScore.issues.map(i => ({
      ...i,
      isIgnored: ignoredIdsRef.current.has(i.id),
      isFixed:   result.issueIdsFixed.includes(i.id),
    }));
    setScoreResult({ ...newScore, issues: patchedIssues });
    setAllChanges(prev => [...prev, ...result.changes]);
    saveDraft(updated);
  }, []);

  // ── Fix handlers ──────────────────────────────────────────────────────────────

  const handleFixCritical = useCallback(() => {
    if (!draft) return;
    setIsProcessing(true);
    setTimeout(() => {
      const result = autoFixDraft(draft, 'critical-only');
      applyResult(result, draft);
      setIsProcessing(false);
    }, 100);
  }, [draft, applyResult]);

  const handleFixSafe = useCallback(() => {
    if (!draft) return;
    setIsProcessing(true);
    setTimeout(() => {
      const result = autoFixDraft(draft, 'safe-only');
      applyResult(result, draft);
      setIsProcessing(false);
    }, 100);
  }, [draft, applyResult]);

  const handleFixAll = useCallback(() => {
    if (!draft) return;
    setIsProcessing(true);
    setTimeout(() => {
      const result = autoFixDraft(draft, 'all');
      applyResult(result, draft);
      setIsProcessing(false);
    }, 100);
  }, [draft, applyResult]);

  const handleFixSingle = useCallback((issueId: string) => {
    if (!draft) return;
    setFixingId(issueId);
    setTimeout(() => {
      const result = autoFixDraft(draft, 'single', issueId);
      applyResult(result, draft);
      setFixingId(null);
    }, 100);
  }, [draft, applyResult]);

  const handleIgnoreIssue = useCallback((issueId: string) => {
    ignoredIdsRef.current.add(issueId);
    setScoreResult(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        issues: prev.issues.map(i =>
          i.id === issueId ? { ...i, isIgnored: true } : i,
        ),
      };
    });
  }, []);

  const handleRescore = useCallback(() => {
    if (!draft) return;
    const updated = formToDraft(form, draft);
    setDraft(updated);
    const result = scoreContent(updated);
    const patchedIssues = result.issues.map(i => ({
      ...i,
      isIgnored: ignoredIdsRef.current.has(i.id),
    }));
    setScoreResult({ ...result, issues: patchedIssues });
    saveDraft(updated);
  }, [draft, form]);

  // ── Export ────────────────────────────────────────────────────────────────────

  const handleCopyHtml = useCallback(() => {
    if (!form.content) return;
    navigator.clipboard.writeText(form.content).then(() => {
      setSaveMsg('Copied!');
      setTimeout(() => setSaveMsg(''), 2000);
    });
  }, [form.content]);

  const handleDownloadHtml = useCallback(() => {
    if (!form.content) return;
    const blob = new Blob([form.content], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(form.title || 'article').replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setSaveMsg('Downloaded!');
    setTimeout(() => setSaveMsg(''), 2000);
  }, [form.content, form.title]);

  const handleNewArticle = useCallback(() => {
    setForm(EMPTY_FORM);
    setDraft(null);
    setScoreResult(null);
    setOriginalContent('');
    setOriginalScore(null);
    setAllChanges([]);
    ignoredIdsRef.current.clear();
  }, []);

  // ── Current score for before/after ───────────────────────────────────────────

  const currentScoreSnap = scoreResult
    ? { overall: scoreResult.overall, readiness: scoreResult.readiness }
    : null;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-slate-600 text-sm">← Back</Link>
            <span className="text-slate-200">|</span>
            <span className="text-sm font-semibold text-slate-800">✍️ Content Checker</span>
          </div>
          <div className="flex items-center gap-2">
            {saveMsg && (
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                {saveMsg}
              </span>
            )}
            <button
              onClick={handleNewArticle}
              className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition"
            >
              + New Article
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-700 to-violet-700 text-white py-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2">Auto Content Fixer</h1>
          <p className="text-indigo-200 text-base max-w-2xl mx-auto">
            Paste your article, score it for SEO + readability + completeness, fix issues with one click,
            and export clean HTML ready for WordPress.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── LEFT: Input form ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Article meta */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">
                Article Details
              </h2>

              <Field label="Article Title" required>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="e.g. Top HR Consulting Services in Singapore"
                  className={inputCls}
                />
              </Field>

              <Field label="Focus Keyphrase" required>
                <input
                  type="text"
                  value={form.focusKeyphrase}
                  onChange={e => set('focusKeyphrase', e.target.value)}
                  placeholder="e.g. HR consulting Singapore"
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Brand / Company Name">
                  <input
                    type="text"
                    value={form.brandName}
                    onChange={e => set('brandName', e.target.value)}
                    placeholder="e.g. Elitez Group"
                    className={inputCls}
                  />
                </Field>
                <Field label="City / Location">
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    placeholder="e.g. Singapore"
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Service Type">
                  <input
                    type="text"
                    value={form.serviceType}
                    onChange={e => set('serviceType', e.target.value)}
                    placeholder="e.g. HR Consulting"
                    className={inputCls}
                  />
                </Field>
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={e => set('category', e.target.value as ArticleDraft['category'])}
                    className={selectCls}
                  >
                    <option value="blog">Blog</option>
                    <option value="service">Service</option>
                    <option value="landing">Landing Page</option>
                    <option value="faq">FAQ</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* Meta SEO */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">
                Meta SEO
              </h2>
              <Field label="Meta Title">
                <input
                  type="text"
                  value={form.metaTitle}
                  onChange={e => set('metaTitle', e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {form.metaTitle.length} / 60 chars {form.metaTitle.length > 60 && '⚠️ Too long'}
                </p>
              </Field>
              <Field label="Meta Description">
                <textarea
                  rows={2}
                  value={form.metaDescription}
                  onChange={e => set('metaDescription', e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className={inputCls + ' resize-none'}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {form.metaDescription.length} / 160 chars {form.metaDescription.length > 160 && '⚠️ Too long'}
                </p>
              </Field>
            </div>

            {/* Article content */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-sm font-semibold text-slate-700">Article Content</h2>
                <span className="text-xs text-slate-400">
                  HTML, Markdown, or plain text
                </span>
              </div>

              <textarea
                rows={16}
                value={form.content}
                onChange={e => set('content', e.target.value)}
                placeholder={`Paste your article content here.\n\nHTML example:\n<h2>Introduction</h2>\n<p>Your article body...</p>`}
                className={inputCls + ' resize-y font-mono text-xs leading-relaxed'}
              />

              <p className="text-xs text-slate-400">
                {form.content.trim()
                  ? `~${form.content.trim().split(/\s+/).length} words`
                  : 'No content yet'}
              </p>
            </div>

            {/* Score button */}
            <button
              onClick={handleScore}
              disabled={!form.content.trim() || !form.focusKeyphrase.trim()}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl
                         hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors text-sm"
            >
              {scoreResult ? '🔄 Re-Score Article' : '📊 Score Article'}
            </button>

            {/* Export buttons — show after scoring */}
            {scoreResult && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3">
                <h2 className="text-sm font-semibold text-slate-700">Export</h2>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ Review all <strong>[⚠️ NEEDS REVIEW]</strong> markers before exporting to WordPress.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyHtml}
                    className="flex-1 py-2 text-xs font-semibold rounded-lg border border-indigo-200
                               text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                  >
                    📋 Copy HTML
                  </button>
                  <button
                    onClick={handleDownloadHtml}
                    className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200
                               text-slate-700 bg-slate-50 hover:bg-slate-100 transition"
                  >
                    ⬇ Download .html
                  </button>
                </div>
                {form.metaTitle && (
                  <div className="space-y-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Meta Title</p>
                      <p className="text-xs text-slate-700">{form.metaTitle}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Meta Description</p>
                      <p className="text-xs text-slate-700">{form.metaDescription}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Results ────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {!scoreResult ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
                <p className="text-4xl mb-4">📝</p>
                <p className="text-slate-600 font-medium mb-1">No article scored yet</p>
                <p className="text-sm text-slate-400">Fill in your article details and click "Score Article" to get started.</p>
              </div>
            ) : (
              <>
                <ContentScorePanel result={scoreResult} />

                <AutoFixPanel
                  scoreResult={scoreResult}
                  onFixSingle={handleFixSingle}
                  onIgnoreIssue={handleIgnoreIssue}
                  onFixCritical={handleFixCritical}
                  onFixSafe={handleFixSafe}
                  onFixAll={handleFixAll}
                  onRescore={handleRescore}
                  fixingIssueId={fixingId}
                  isProcessing={isProcessing}
                  hasContent={!!form.content.trim()}
                />

                {(allChanges.length > 0 || originalContent) && (
                  <BeforeAfterPreview
                    beforeContent={originalContent}
                    afterContent={form.content}
                    changes={allChanges}
                    scoreBefore={originalScore ?? undefined}
                    scoreAfter={currentScoreSnap ?? undefined}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center">
        <p className="text-xs text-slate-400">
          Elitez Content Checker V9 — For internal use only.{' '}
          <span className="text-amber-600">
            Always review AI-generated content before publishing.
          </span>
        </p>
      </footer>
    </div>
  );
}
