export function ProxyNote({ on }: { on: boolean }) {
  if (!on) return null;
  return <span className="ml-2 inline-flex rounded-full bg-sea-soft px-2 py-0.5 align-middle text-xs font-medium text-sea">由管理員代填</span>;
}
