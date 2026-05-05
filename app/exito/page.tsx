import Link from 'next/link';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { CheckCircle2, Ticket, Mail, Copy } from 'lucide-react';
import { CopyButton } from './CopyButton';

type SearchParams = {
  n?: string;
  f?: string;
  name?: string;
  email?: string;
  r?: string;
};

export default function ExitoPage({ searchParams }: { searchParams: SearchParams }) {
  const entry = searchParams.n ?? '00000';
  const folio = searchParams.f ?? '—';
  const name = searchParams.name ?? 'Participante';
  const email = searchParams.email ?? '';
  const raffle = searchParams.r ?? 'Rifa Trimestral';

  return (
    <div className="min-h-screen gradient-soft">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 md:py-14">
        <div className="mb-6 flex items-center justify-center gap-2 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
          <span className="text-sm font-semibold uppercase tracking-widest">Registro exitoso</span>
        </div>
        <h1 className="text-center text-3xl font-bold text-[#003A5D] md:text-4xl">
          Estas dentro, {name.split(' ')[0]}.
        </h1>
        <p className="mt-2 text-center text-slate-600">
          Guarda tu boleto virtual. Te enviamos una copia a {email || 'tu correo'}.
        </p>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
          <div className="gradient-surface p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest opacity-80">Boleto virtual</div>
              <Ticket className="h-5 w-5 opacity-80" />
            </div>
            <div className="mt-1 text-sm opacity-90">{raffle}</div>
          </div>
          <div className="p-6">
            <div className="rounded-2xl border-2 border-dashed border-[#00A3E0]/60 bg-[#F4F6F8] p-8 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Numero de participacion
              </div>
              <div className="mt-2 font-mono text-6xl font-bold text-[#003A5D] tracking-[0.25em]">
                {entry}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
                <span>Folio:</span>
                <span className="font-mono">{folio}</span>
                <CopyButton text={folio} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] uppercase text-slate-400">Participante</div>
                <div className="font-medium text-slate-800">{name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-400">Correo</div>
                <div className="truncate font-medium text-slate-800">{email}</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs text-slate-500 md:flex-row">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Confirmacion enviada a tu correo.
            </div>
            <Link href="/consulta" className="font-medium text-[#00A3E0] hover:underline">
              Consultar mi folio despues
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            Volver al inicio
          </Link>
          <Link
            href="/registro"
            className="inline-flex items-center justify-center rounded-full bg-[#00A3E0] px-6 py-3 font-semibold text-white hover:bg-[#0090c7]"
          >
            Registrar otra compra
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
