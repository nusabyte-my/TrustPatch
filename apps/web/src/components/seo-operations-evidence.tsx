"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";

interface Operation { findingId: string; kind: string; red: { challenge: string; attackPath: string }; blue: { action: string; verification: string } }
export function SeoOperationsEvidence({ id }: { id: string }) {
  const [operations, setOperations] = useState<Operation[] | null>(null);
  const [limitations, setLimitations] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { void fetch(`/api/evidence/${id}`).then(async (response) => { if (!response.ok) throw new Error("Could not load SEO operations"); return response.json() as Promise<{ operations: Operation[]; limitations: string }>; }).then((data) => { setOperations(data.operations); setLimitations(data.limitations); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load SEO operations")); }, [id]);
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!operations) return <p className="muted">Loading Red/Blue operation ledger…</p>;
  if (!operations.length) return <div className="seo-operation-empty"><ShieldCheck size={24} /><h3>No selected SEO challenges found.</h3><p>Red Team found no defects in the selected checks. Blue Team will not invent optimization work or ranking claims.</p><span>{limitations}</span></div>;
  return <div className="seo-operations"><div className="seo-operation-legend"><span><ShieldAlert size={15} /> Red Team challenges</span><span><ShieldCheck size={15} /> Blue Team verifies</span></div>{operations.map((operation) => <article className="seo-operation" key={operation.findingId}><h3>{operation.kind.replaceAll("_", " ")}</h3><div className="seo-operation-grid"><section className="seo-red"><span>Red Team · challenge</span><strong>{operation.red.challenge}</strong><p>{operation.red.attackPath}</p></section><section className="seo-blue"><span>Blue Team · optimization</span><strong>{operation.blue.action}</strong><p><b>Verify:</b> {operation.blue.verification}</p></section></div></article>)}<p className="seo-operation-limit">{limitations}</p></div>;
}
