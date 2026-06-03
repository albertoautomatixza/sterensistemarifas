'use client';

import { useEffect, useState, type FormEvent } from 'react';
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
  LogOut,
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
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  birthdate?: string | null;
  sale_identifier?: string | null;
  sale_type?: string | null;
  branch?: string | null;
  sale_date?: string | null;
  total_amount?: number | string | null;
  email_delivery_status?: string | null;
};

export function AdminDashboard() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'same-origin' });
      if (res.status === 401) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      const body = await res.json();
      if (!body.ok) {
        setError('No fue posible cargar las métricas.');
      } else {
        setStats(body.stats);
        setRecent(body.recent_entries);
        setAuthed(true);
      }
    } catch {
      setError('Intenta nuevamente más tarde.');
    } finally {
      setLoading(false);
    }
  }

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json();
      if (!body.ok) {
        setError(body.message ?? 'Usuario o contraseña inválidos.');
        return;
      }
      setPassword('');
      await load();
    } catch {
      setError('Intenta nuevamente más tarde.');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    setAuthed(false);
    setStats(null);
    setRecent([]);
  }

  useEffect(() => {
    load();
  }, []);

  if (!authed) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2 text-[#003A5D]">
          <ShieldCheck className="h-5 w-5" />
          <div className="font-semibold">Acceso administrativo</div>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Ingresa tus credenciales para visualizar los registros y métricas del sorteo.
        </p>
        <form onSubmit={login} className="mt-6 space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuario"
            autoComplete="username"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#00A3E0] focus:ring-brand"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#00A3E0] focus:ring-brand"
          />
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#003A5D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#002a45] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Ingresar
          </button>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#003A5D] transition hover:border-[#00A3E0] hover:text-[#00A3E0]"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={Users} label="Usuarios registrados" value={stats?.users ?? 0} tone="blue" />
        <Kpi icon={Ticket} label="Participaciones" value={stats?.entries ?? 0} tone="brand" />
        <Kpi icon={CheckCircle2} label="Ventas válidas" value={stats?.valid_sales ?? 0} tone="green" />
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
            <div className="font-semibold text-slate-900">Últimos registros</div>
          </div>
          <div className="text-xs text-slate-500">Mostrando 50</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Número</th>
                <th className="px-5 py-3">Folio</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Telefono</th>
                <th className="px-5 py-3">Correo</th>
                <th className="px-5 py-3">Comprobante</th>
                <th className="px-5 py-3">Venta</th>
                <th className="px-5 py-3">Estatus</th>
                <th className="px-5 py-3">Registrado</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    Aún no hay registros.
                  </td>
                </tr>
              )}
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-mono font-semibold text-[#003A5D]">{r.entry_number}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.internal_folio}</td>
                  <td className="px-5 py-3 text-slate-700">
                    <div className="font-medium">{r.full_name ?? '—'}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {formatDateOnly(r.birthdate)}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.phone ?? '—'}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    <div>{r.email ?? '—'}</div>
                    {r.email_delivery_status && (
                      <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${emailStatusTone(r.email_delivery_status)}`}>
                        {emailStatusLabel(r.email_delivery_status)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-mono text-xs text-slate-600">{r.sale_identifier ?? '—'}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                      {r.sale_type ?? ''}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    <div>{r.branch ?? '—'}</div>
                    <div className="mt-0.5 text-slate-400">{formatDateOnly(r.sale_date)}</div>
                  </td>
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

function formatDateOnly(value?: string | null) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

function emailStatusLabel(value: string) {
  const labels: Record<string, string> = {
    sent: 'Correo enviado',
    failed: 'Correo fallido',
    pending: 'Correo pendiente',
    bounced: 'Correo rechazado',
  };
  return labels[value] ?? value;
}

function emailStatusTone(value: string) {
  const tones: Record<string, string> = {
    sent: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    bounced: 'bg-red-100 text-red-700',
  };
  return tones[value] ?? 'bg-slate-100 text-slate-600';
}
