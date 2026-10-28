"use client";

import dynamic from "next/dynamic";
const Sticker = dynamic(() => import("../stickers/Sticker").then((module) => module.Sticker), { ssr: false });
import { brand } from "../stickers/fun";
import { proofShield } from "../stickers/icons";

export function ProofSticker() {
  return <div className="proof-sticker"><Sticker icon={proofShield} palette={brand("#2457e6", "#17a673")} enter={0.15} replayOnHover label="Animated isometric verified proof shield" /><span>Proof, not promises.</span></div>;
}
