import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <img
            src="/images/steren-logo.svg"
            alt="Steren"
            className="h-8 w-auto max-w-[112px] shrink-0 sm:h-9 sm:max-w-[146px]"
          />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/consulta"
            className="rounded-full px-3 py-2 text-slate-600 transition hover:bg-slate-100"
          >
            Consultar folio
          </Link>
          <Link
            href="/registro"
            className="rounded-full bg-[#00A3E0] px-4 py-2 font-medium text-white transition hover:bg-[#0090c7]"
          >
            Participar
          </Link>
        </nav>
      </div>
    </header>
  );
}
