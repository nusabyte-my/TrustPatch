export function TrustPatchMark({ size = 36 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="TrustPatch">
    <path d="M5 7h30v7H24v19h-8V14H5z" fill="currentColor" />
    <path d="M18 22h4v6h-4z" fill="var(--verified)" />
  </svg>;
}
