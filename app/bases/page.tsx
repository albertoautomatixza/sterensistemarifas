import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';

const BASES = [
  {
    title: 'Vigencia',
    body: 'La campaña es válida del 1 de abril al 30 de junio de 2026.',
  },
  {
    title: 'Participación',
    body: 'Cada ticket o factura válido genera una participación. Una venta solo puede registrarse una vez.',
  },
  {
    title: 'Validación',
    body: 'Toda compra se valida oficialmente contra el sistema de ventas autorizado. La IA no define la validez de la compra.',
  },
  {
    title: 'Número de participación',
    body: 'Se genera un número único de 5 dígitos mediante una secuencia transaccional auditable.',
  },
  {
    title: 'Sorteo',
    body: 'El ganador se determina comparando los últimos 5 dígitos del premio mayor oficial publicado por Lotería Nacional en la fecha del sorteo.',
  },
  {
    title: 'Restricciones',
    items: [
      'Solo pueden participar personas mayores de edad.',
      'No aplica para compras canceladas o reembolsadas.',
      'La organización se reserva el derecho de invalidar registros fraudulentos.',
    ],
  },
  {
    title: 'Entrega del premio',
    body: 'El ganador será contactado por los medios proporcionados al momento de registrarse.',
  },
] as const;

export default function BasesPage() {
  return (
    <div className="min-h-screen gradient-soft">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#00A3E0]">
            Campaña Q2 2026 · Aguascalientes
          </div>
          <h1 className="mt-2 text-3xl font-bold text-[#003A5D] md:text-4xl">Bases y condiciones</h1>
          <p className="mt-2 text-sm text-slate-500">Versión v1.0</p>
        </div>

        <div className="space-y-4">
          {BASES.map((section, index) => (
            <LegalSection key={section.title} number={index + 1} title={section.title}>
              {renderLegalContent(section)}
            </LegalSection>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function renderLegalContent(section: (typeof BASES)[number]) {
  if ('items' in section) {
    return (
      <ul className="space-y-2">
        {section.items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[#00A3E0]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return <p>{section.body}</p>;
}

function LegalSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#003A5D] text-sm font-bold text-white">
          {number}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#003A5D]">{title}</h2>
          <div className="mt-2 text-sm leading-6 text-slate-600 md:text-base md:leading-7">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
