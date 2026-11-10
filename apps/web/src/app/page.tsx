import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
          AACT
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
          CommissionHub
        </h1>
        <p className="max-w-xl text-lg text-stone-600">
          Plataforma self-hosted de atribuição e liquidação de comissões. Nome
          provisório — fase 0: fundação executável.
        </p>
      </div>

      <nav className="flex flex-wrap gap-3" aria-label="Áreas da aplicação">
        <Link
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          href="/login"
        >
          Iniciar sessão
        </Link>
        <Link
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
          href="/admin"
        >
          Administração
        </Link>
        <Link
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
          href="/portal"
        >
          Portal do referrer
        </Link>
      </nav>
    </main>
  );
}
