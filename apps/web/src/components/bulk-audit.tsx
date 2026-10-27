"use client";

import { useEffect, useState, type FormEvent } from "react";

interface BulkSite { runId: string; targetUrl: string; status: string; findings: number; error: string | null }
interface BulkJob { id: string; scopeDomain: string; status: string; sites: BulkSite[]; completed: number; total: number }

export function BulkAudit() {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState("");
  const [targets, setTargets] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [job, setJob] = useState<BulkJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!job || ["completed", "completed_with_errors"].includes(job.status)) return;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/bulk/${job.id}`, { cache: "no-store" });
      if (response.ok) setJob((await response.json() as { job: BulkJob }).job);
    }, 2000);
    return () => clearInterval(timer);
  }, [job]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const urls = targets.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      if (!urls.length) throw new Error("Add at least one authorized target URL");
      const response = await fetch("/api/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scopeDomain: scope, targets: urls.map((url) => ({ url, paths: ["/"], authorized: true })), ownershipConfirmed: confirmed }) });
      const data = await response.json() as { job?: BulkJob; error?: string };
      if (!response.ok || !data.job) throw new Error(data.error ?? "Bulk audit failed");
      setJob(data.job);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Bulk audit failed"); }
    finally { setBusy(false); }
  }
  return <section className="bulk"><button className="bulk-toggle" aria-expanded={open} onClick={() => setOpen(!open)}><span>Bulk authorized-site audit</span><span>{open ? "−" : "+"}</span></button>{open && <div className="bulk-content"><p>Passive SEO, AI-search, metadata, and response-policy checks. All targets must belong to the approved scope. No exploit attempts or automatic changes. Public customer use additionally requires a signed manifest or DNS verification; the demo checkbox is not proof of ownership.</p><form onSubmit={submit}><div className="bulk-fields"><label htmlFor="scope">Approved domain / TLD scope<input id="scope" value={scope} onChange={(event) => setScope(event.target.value)} placeholder="example.com" required /></label><label htmlFor="targets">Authorized target URLs, one per line<textarea id="targets" rows={4} value={targets} onChange={(event) => setTargets(event.target.value)} placeholder={"https://example.com\nhttps://www.example.com\nhttps://docs.example.com"} required /></label></div><label className="ownership"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required /> I confirm these targets are mine or I have explicit permission to audit them.</label><button className="secondary" disabled={busy || !confirmed}>{busy ? "Queueing authorized audit…" : "Start passive bulk audit"}</button></form>{error && <p className="error" role="alert">{error}</p>}{job && <div className="bulk-results" aria-live="polite"><div className="section-heading"><h3>Audit {job.scopeDomain}</h3><span>{job.completed} / {job.total} sites complete</span></div>{job.sites.map((site) => <article className="bulk-site" key={site.runId}><div><strong>{site.targetUrl}</strong><p>{site.findings} findings · {site.status.replaceAll("_", " ")}{site.error ? ` · ${site.error}` : ""}</p></div><a href={`/?run=${site.runId}`} title="Open the stored run and its evidence">Run evidence</a></article>)}</div>}</div>}</section>;
}
