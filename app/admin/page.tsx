import { SiteHeader } from '@/components/site/SiteHeader';
import { AdminDashboard } from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#00A3E0]">Operacion</div>
          <h1 className="mt-1 text-3xl font-bold text-[#003A5D]">Panel administrativo</h1>
          <p className="mt-1 text-slate-600">
            Metricas operativas, registros recientes y estado de entregas.
          </p>
        </div>
        <AdminDashboard />
      </main>
    </div>
  );
}
