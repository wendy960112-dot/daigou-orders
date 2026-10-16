import Link from "next/link";

export function AuthFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Link href="/login" className="mb-8 flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-brand text-lg font-bold text-white">代</div>
        <div>
          <p className="text-sm text-muted">日本代購</p>
          <p className="text-xl font-bold leading-6">代購單</p>
        </div>
      </Link>
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-4">{children}</div>
    </main>
  );
}
