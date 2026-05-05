import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';

const PRIVACY_SECTIONS = [
  {
    label: 'Responsable',
    body: 'La organización responsable de la campaña trata tus datos únicamente para la operación de la rifa.',
  },
  {
    label: 'Datos recabados',
    items: [
      'Nombre completo',
      'Teléfono',
      'Correo electrónico',
      'Fecha de nacimiento',
      'Identificador del ticket o factura',
    ],
  },
  {
    label: 'Finalidades',
    body: 'Operar la rifa, emitir el boleto virtual, validar compras y contactar al ganador.',
  },
  {
    label: 'Transferencias',
    body: 'No se transfieren datos a terceros fuera del alcance operativo de la campaña.',
  },
  {
    label: 'Derechos ARCO',
    body: 'Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición a través del contacto oficial publicado.',
  },
  {
    label: 'Medidas de seguridad',
    body: 'Cifrado en tránsito, control de acceso a nivel de base de datos y auditoría completa de eventos.',
  },
] as const;

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen gradient-soft">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#00A3E0]">
            Tratamiento de datos personales
          </div>
          <h1 className="mt-2 text-3xl font-bold text-[#003A5D] md:text-4xl">Aviso de privacidad</h1>
          <p className="mt-2 text-sm text-slate-500">Versión v1.0</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PRIVACY_SECTIONS.map((section) => (
            <PrivacySection key={section.label} label={section.label}>
              {renderPrivacyContent(section)}
            </PrivacySection>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function renderPrivacyContent(section: (typeof PRIVACY_SECTIONS)[number]) {
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

function PrivacySection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-3 inline-flex rounded-full bg-[#00A3E0]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0077B6]">
        {label}
      </div>
      <div className="text-sm leading-6 text-slate-600 md:text-base md:leading-7">{children}</div>
    </section>
  );
}
