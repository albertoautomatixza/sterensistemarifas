import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ConsultaForm } from './ConsultaForm';

export default function ConsultaPage() {
  return (
    <div className="min-h-screen gradient-soft">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-10 md:py-16">
        <div className="mb-8 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#00A3E0]">
            Consulta de participación
          </div>
          <h1 className="mt-2 text-3xl font-bold text-[#003A5D] md:text-4xl">
            Consulta tu folio
          </h1>
          <p className="mt-2 text-slate-600">
            Ingresa tu folio interno para ver el estatus de tu participación.
          </p>
        </div>
        <ConsultaForm />
      </main>
      <SiteFooter />
    </div>
  );
}
