'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Ticket,
  CheckCircle2,
  AlertTriangle,
  Mail,
  MailWarning,
  MailX,
  Loader2,
  ShieldCheck,
  LogIn,
} from 'lucide-react';

type Stats = {
  users: number;
  entries: number;
  valid_sales: number;
  duplicates: number;
  emails: { sent: number; failed: number; pending: number };
};

type RecentEntry = {
  id: string;
  entry_number: string;
  internal_folio: string;
  status: string;
  created_at: string;
};

export function AdminDashboard() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  async function load(t: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats', { headers: { 'x-admin-token': t } });
      if (res.status === 401) {
        setError('Token invalido.');
        setLoading(false);
        return;
      }
      const body = await res.json();
      if (!body.ok) {
        setError('No fue posible cargar las metricas.');
      } else {
        setStats(body.stats);
        setRecent(body.recent_entries);
        setAuthed(true);
      }
    } catch {
      setError('Intenta nuevamente mas tarde.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Try loading without token (dev mode if ADMIN_TOKEN is not set)
    load('');
  }, []);

  if (!authed) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2 text-[#003A5D]">
          <ShieldCheck className="h-5 w-5" />
          <div className="font-semibold">Acceso administrativo</div>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Ingresa el token operativo para visualizar las metricas.
        </p>
        <div className="mt-6 space-y-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token de acceso"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#00A3E0] focus:ring-brand"
          />
          <button
            onClick={() => load(token)}
            disabled={loading || !token}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#003A5D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#002a45] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Ingresar
          </button>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={Users} label="Usuarios registrados" value={stats?.users ?? 0} tone="blue" />
        <Kpi icon={Ticket} label="Participaciones" value={stats?.entries ?? 0} tone="brand" />
        <Kpi icon={CheckCircle2} label="Ventas validas" value={stats?.valid_sales ?? 0} tone="green" />
        <Kpi icon={AlertTriangle} label="Intentos duplicados" value={stats?.duplicates ?? 0} tone="amber" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MiniKpi icon={Mail} label="Correos enviados" value={stats?.emails.sent ?? 0} tone="green" />
        <MiniKpi icon={MailWarning} label="Correos pendientes" value={stats?.emails.pending ?? 0} tone="amber" />
        <MiniKpi icon={MailX} label="Correos fallidos" value={stats?.emails.failed ?? 0} tone="red" />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[#00A3E0]">
              Actividad reciente
            </div>
            <div className="font-semibold text-slate-900">Ultimos registros</div>
          </div>
          <div className="text-xs text-slate-500">Mostrando 10</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Numero</th>
                <th className="px-5 py-3">Folio</th>
                <th className="px-5 py-3">Estatus</th>
                <th className="px-5 py-3">Registrado</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                    Aun no hay registros.
                  </td>
                </tr>
              )}
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-mono font-semibold text-[#003A5D]">{r.entry_number}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.internal_folio}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {new Date(r.created_at).toLocaleString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: 'blue' | 'brand' | 'green' | 'amber';
}) {
  const tones: Record<string, string> = {
    blue: 'bg-[#003A5D] text-white',
    brand: 'bg-[#00A3E0] text-white',
    green: 'bg-emerald-600 text-white',
    amber: 'bg-amber-500 text-white',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value.toLocaleString('es-MX')}</div>
    </div>
  );
}

function MiniKpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: 'green' | 'amber' | 'red';
}) {
  const tones: Record<string, string> = {
    green: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
        <div className="text-2xl font-bold text-slate-900">{value.toLocaleString('es-MX')}</div>
      </div>
    </div>
  );
}
