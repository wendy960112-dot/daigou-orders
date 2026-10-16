import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="text-sm text-muted">找不到頁面</p>
      <h1 className="mt-1 text-2xl font-bold">這筆資料不在這裡</h1>
      <Link href="/" className="mt-6 text-sm font-medium text-brand">
        回訂單列表
      </Link>
    </main>
  );
}
