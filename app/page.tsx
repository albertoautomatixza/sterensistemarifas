import Link from 'next/link';
import { ShieldCheck, QrCode, Sparkles, Ticket, ArrowRight, ReceiptText, Mail, Trophy, CircleCheck as CheckCircle2 } from 'lucide-react';

function EntradasIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M448.678,128.219l-10.607,10.608c-8.667,8.667-20.191,13.44-32.449,13.44c-12.258,0-23.78-4.773-32.448-13.44
        c-8.667-8.667-13.44-20.191-13.44-32.448s4.773-23.781,13.44-32.449l10.608-10.608L320.459,0L0,320.459l63.322,63.322
        l10.608-10.608c8.667-8.667,20.191-13.44,32.449-13.44c12.258,0,23.78,4.773,32.448,13.44c8.667,8.667,13.44,20.191,13.44,32.448
        s-4.773,23.781-13.44,32.449l-10.608,10.608L191.541,512L512,191.541L448.678,128.219z M169.61,447.636
        c8.237-12.343,12.662-26.839,12.662-42.015c0-20.272-7.894-39.33-22.229-53.664c-14.334-14.335-33.393-22.229-53.664-22.229
        c-15.176,0-29.672,4.425-42.015,12.662l-21.932-21.931L320.459,42.432l21.931,21.932c-8.237,12.343-12.662,26.839-12.662,42.015
        c0,20.272,7.894,39.33,22.229,53.664c14.334,14.335,33.393,22.229,53.664,22.229c15.176,0,29.672-4.425,42.015-12.662
        l21.932,21.931L191.541,469.568L169.61,447.636z"/>
      <rect x="284.001" y="197.94" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -63.0395 273.8137)" width="30.004" height="30.124"/>
      <rect x="241.404" y="155.325" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -45.3819 231.2119)" width="30.004" height="30.124"/>
      <rect x="326.607" y="240.541" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -80.684 316.4184)" width="30.004" height="30.124"/>
    </svg>
  );
}
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { FloatingTicketsContainer } from '@/components/FloatingTickets';
import { PrizeShowcase } from '@/components/PrizeShowcase';

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative overflow-clip">
        <div className="absolute inset-0 gradient-surface" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Participa y gana increíbles premios
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
              Tu compra se convierte en tu boleto virtual.
            </h1>
            <p className="mt-4 max-w-lg text-white/80">
              Escanea el QR en tienda, registra tu ticket o factura y obtén un número único
              para participar en la rifa trimestral. Sorteo vinculado a resultados oficiales
              de Lotería Nacional.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/registro"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-[#003A5D] shadow-lg shadow-black/10 transition hover:scale-[1.02]"
              >
                Registrar mi compra <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/consulta"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 font-medium text-white transition hover:bg-white/10"
              >
                Consultar mi folio
              </Link>
            </div>
          </div>

          <div className="relative mt-2 min-h-[270px] sm:mt-4 sm:min-h-[330px] md:-mt-4 md:min-h-[410px] lg:-mt-10 lg:min-h-[460px]" aria-hidden>
            <FloatingTicketsContainer />
          </div>
        </div>

      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-[#003A5D]">Cómo funciona</h2>
          <p className="mt-2 text-slate-600">Cuatro pasos simples, transparentes y seguros.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          <Step n={1} icon={QrCode} title="Escanea el QR en tienda" desc="Acceso único desde el punto de venta participante." />
          <Step n={2} icon={ReceiptText} title="Registra tu ticket o factura" desc="Validación oficial contra el sistema de ventas." />
          <Step n={3} icon={EntradasIcon} title="Recibe tu número único" desc="Generado con control transaccional y auditable." />
          <Step n={4} icon={Mail} title="Confirmación por correo" desc="Boleto virtual enviado a tu correo al instante." />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid md:grid-cols-5">
            <div className="gradient-surface p-10 text-white md:col-span-2">
              <Trophy className="h-8 w-8" />
              <div className="mt-4 text-sm uppercase tracking-widest opacity-80">Gran premio</div>
              <div className="mt-1 text-3xl font-bold">Premio tecnológico premium</div>
              <div className="mt-6 text-sm opacity-90">
                Valuado en <span className="font-semibold">$50,000 MXN</span>, más 10 premios secundarios.
              </div>
              <PrizeShowcase />
            </div>
            <div className="p-10 md:col-span-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#00A3E0]">Mecánica resumida</div>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Participa con cada compra válida</h3>
              <ul className="mt-4 space-y-3 text-slate-600">
                {[
                  'Campaña vigente del 1 de abril al 30 de junio 2026.',
                  'Cada ticket o factura válido genera una participación.',
                  'Números de 5 dígitos, únicos e irrepetibles.',
                  'Ganador determinado por los últimos 5 dígitos del premio mayor oficial de Lotería Nacional.',
                  'Sorteo programado para el 5 de julio 2026.',
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-[#00A3E0]" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <Link href="/bases" className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50">
                  Ver bases completas
                </Link>
                <Link href="/privacidad" className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50">
                  Aviso de privacidad
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#003A5D] text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#00A3E0]">Paso {n}</div>
      <div className="mt-1 font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{desc}</div>
    </div>
  );
}

function Trust({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <Icon className="h-6 w-6 text-[#00A3E0]" />
      <div className="mt-3 font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{desc}</div>
    </div>
  );
}

function TicketPreview() {
  return (
    <div className="relative mx-auto max-w-[260px] md:max-w-none md:mx-0">
      <div className="absolute -inset-8 rounded-[32px] bg-white/10 blur-2xl" />
      <div className="relative flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-xl md:flex-row md:items-center md:justify-between md:gap-6 md:p-5">
        <div className="flex items-center justify-between md:flex-col md:items-start md:justify-center md:gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Boleto virtual</div>
          <Ticket className="h-4 w-4 text-[#00A3E0] md:h-6 md:w-6" />
        </div>
        <div className="flex-1 rounded-xl border-2 border-dashed border-[#00A3E0]/60 bg-[#F4F6F8] p-4 text-center md:py-3">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
            Número de participación
          </div>
          <div className="mt-1.5 font-mono text-3xl font-bold tracking-[0.18em] text-[#003A5D] md:text-4xl">
            04829
          </div>
          <div className="mt-2 text-[9px] text-slate-500 md:text-[10px]">Folio Q2-2026-04829-X92KR</div>
        </div>
      </div>
    </div>
  );
}
