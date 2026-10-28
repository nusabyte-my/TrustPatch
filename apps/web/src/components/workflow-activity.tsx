"use client";


import { Check, ChevronRight, LoaderCircle, TerminalSquare } from "lucide-react";
import type { RunEvent } from "@trustpatch/contracts";

const agentNames: Record<string, string> = { mend: "Mend", inspector: "Inspector", mapper: "Mapper", seo: "SEO", recon: "Recon", repair: "Repair", verifier: "Verifier" };
const phaseText: Record<string, { title: string; detail: string }> = {
  queued: { title: "Mend is assembling your specialist team", detail: "Preparing the mission and evidence workspace" },
  investigating: { title: "Inspecting the live experience", detail: "Browser, search, source, and runtime evidence in motion" },
  repairing: { title: "Applying the approved repair", detail: "Only the files you authorized" },
  verifying: { title: "Proving the result", detail: "Building and checking the isolated repair" }
};
export function WorkflowActivity({ status, events, onOpen }: { status: string; events: RunEvent[]; onOpen: (trigger: HTMLButtonElement) => void }) {
  const active = ["queued", "investigating", "repairing", "verifying"].includes(status);
  if (!active) return null;
  const phase = phaseText[status] ?? phaseText.queued!;
  const latest = events.filter((event) => event.type === "activity").slice(-2).reverse();
  return <section className="workflow-activity" aria-label="Live agent workflow"><div className="workflow-heading"><span className="workflow-pulse" /><div><p className="workflow-title" key={status}>{phase.title}<span className="workflow-ellipsis" aria-hidden="true">…</span></p><p>{phase.detail}</p></div><span className="workflow-live-label">Live</span></div><div className="workflow-trace">{latest.length ? latest.map((event, index) => <div className={`workflow-line ${index === 0 ? "current" : ""}`} key={event.id}><span className="workflow-line-icon">{index === 0 ? <LoaderCircle size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}</span><span className="workflow-role">{agentNames[event.role] ?? event.role}</span><span className="workflow-message">{event.message}</span></div>) : <div className="workflow-line current"><LoaderCircle size={13} aria-hidden="true" /><span className="workflow-role">mend</span><span>Accepting the mission and preparing the first tool call</span></div>}</div><button className="workflow-expand" type="button" onClick={(event) => onOpen(event.currentTarget)}><TerminalSquare size={14} aria-hidden="true" /> Inspect live execution <ChevronRight size={14} aria-hidden="true" /></button></section>;
}
