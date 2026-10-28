import { useId } from "react";

export function IsometricStudio({ stage, active }: { stage: number; active: boolean }) {
  const id = useId().replaceAll(":", "");
  return <svg className={`isometric-studio ${active ? "is-active" : ""}`} data-stage={stage} viewBox="0 0 520 250" aria-hidden="true">
    <defs><linearGradient id={`${id}-plane`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#243442" /><stop offset="1" stopColor="#17242f" /></linearGradient><linearGradient id={`${id}-scan`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#76a2ff" stopOpacity="0" /><stop offset=".5" stopColor="#76a2ff" stopOpacity=".7" /><stop offset="1" stopColor="#76a2ff" stopOpacity="0" /></linearGradient></defs>
    <g className="iso-plane"><path d="M55 166 263 54 459 164 250 236Z" fill={`url(#${id}-plane)`} stroke="#405362" /><path d="m55 166 195 70v14l-195-70Z" fill="#0c151d" /><path d="m250 236 209-72v14l-209 72Z" fill="#101c26" /><path d="m104 166 159-92 147 90-159 56Z" fill="none" stroke="#344856" strokeDasharray="3 6" /></g>
    <g className="iso-site"><path d="m177 118 86-47 91 49-88 48Z" fill="#2e4355" stroke="#547082" /><path d="m177 118 89 50v48l-89-49Z" fill="#192b39" /><path d="m266 168 88-48v48l-88 48Z" fill="#223747" /><path d="m194 122 68-37 73 37-69 37Z" fill="#375065" /><path d="m205 125 57-30 60 30-58 30Z" fill="#162631" /><path d="m217 126 44-23 47 23-45 23Z" fill="#29415a" /></g>
    <g className="iso-faults"><path d="m191 158 17-9 17 9-17 9Z" fill="#d68173" /><path d="m295 176 17-9 17 9-17 9Z" fill="#d68173" /><path d="m253 101 14-7 14 7-14 8Z" fill="#d68173" /></g>
    <g className="iso-file file-one"><path d="m111 143 31-17 32 17-32 17Z" fill="#3b5b82" /><path d="m111 143 31 17v28l-31-17Z" fill="#203956" /><path d="m142 160 32-17v28l-32 17Z" fill="#29496d" /><path d="m119 144 23-12 24 12-24 13Z" fill="#5b83c1" /></g>
    <g className="iso-file file-two"><path d="m335 119 31-17 32 17-32 17Z" fill="#3b5b82" /><path d="m335 119 31 17v28l-31-17Z" fill="#203956" /><path d="m366 136 32-17v28l-32 17Z" fill="#29496d" /><path d="m343 120 23-12 24 12-24 13Z" fill="#5b83c1" /></g>
    <path className="iso-scope" d="m88 148 119-66 204 104-12 42-146 22-151-62Z" fill="none" stroke="#6591f5" strokeWidth="2" strokeDasharray="5 5" />
    <path className="iso-patch-path" d="m144 156 70 36 54-27 66-34" fill="none" stroke="#76a2ff" strokeWidth="3" strokeLinecap="round" strokeDasharray="180" />
    <g className="iso-proof proof-one"><path d="m135 183 22-12 22 12-22 12Z" fill="#227d60" /><path d="m135 183 22 12v14l-22-12Z" fill="#164c3d" /><path d="m157 195 22-12v14l-22 12Z" fill="#1b614c" /><path d="m142 183 15-8 15 8-15 8Z" fill="#54c69a" /></g>
    <g className="iso-proof proof-two"><path d="m341 155 22-12 22 12-22 12Z" fill="#227d60" /><path d="m341 155 22 12v14l-22-12Z" fill="#164c3d" /><path d="m363 167 22-12v14l-22 12Z" fill="#1b614c" /><path d="m348 155 15-8 15 8-15 8Z" fill="#54c69a" /></g>
    <path className="iso-proof-path" d="m158 186 63 23 54-25 65-23" fill="none" stroke="#54c69a" strokeWidth="3" strokeLinecap="round" />
    <g className="iso-scanner"><path d="m140 88 124-67 20 10-124 68Z" fill={`url(#${id}-scan)`} /><path d="m147 96 121-66" stroke="#8eb4ff" strokeWidth="2" /></g>
    <g className="iso-status-node"><path d="m239 46 18-10 18 10-18 10Z" fill={stage === 3 ? "#54c69a" : "#6f98f5"} /><path d="m239 46 18 10v18l-18-10Z" fill={stage === 3 ? "#1c624b" : "#2c4778"} /><path d="m257 56 18-10v18l-18 10Z" fill={stage === 3 ? "#258263" : "#3a5c99"} /></g>
  </svg>;
}
