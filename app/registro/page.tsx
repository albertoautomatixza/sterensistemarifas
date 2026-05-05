import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { RegistrationWizard } from './RegistrationWizard';

export default function RegistroPage() {
  return (
    <div className="min-h-screen gradient-soft">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <div className="mb-8 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#00A3E0]">
            Registro de participación
          </div>
          <h1 className="mt-2 text-3xl font-bold text-[#003A5D] md:text-4xl">
            Registra tu compra en 3 pasos
          </h1>
          <p className="mt-2 text-slate-600">
            Tus datos se usan únicamente para la rifa trimestral.
          </p>
        </div>
        <RegistrationWizard />
      </main>
      <SiteFooter />
    </div>
  );
}
