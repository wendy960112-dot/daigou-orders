"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">頁面發生問題</h1>
      <p className="mt-2 text-sm text-muted">請再試一次。如果一直出現，把畫面告訴幫忙安裝的人。</p>
      <button type="button" onClick={() => reset()} className="mt-6 min-h-11 rounded-xl bg-brand px-4 text-white">
        再試一次
      </button>
    </main>
  );
}
