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
  Send,
  Search,
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
  const [testEmail, setTestEmail] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<string | null>(null);
  const [sterenIdentifier, setSterenIdentifier] = useState('');
  const [sterenType, setSterenType] = useState<'ticket' | 'factura'>('ticket');
  const [sterenLoading, setSterenLoading] = useState(false);
  const [sterenDiagnostic, setSterenDiagnostic] = useState<any | null>(null);

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

  async function sendTestEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTestEmailLoading(true);
    setTestEmailMessage(null);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });
      const body = await res.json().catch(() => ({}));
      if (body.ok) {
        setTestEmailMessage('Correo de prueba enviado. Revisa bandeja de entrada y spam.');
      } else {
        const detail = body?.provider_response?.error ? ` ${body.provider_response.error}` : '';
        setTestEmailMessage(`${body?.message ?? 'Correo fallido.'}${detail}`);
      }
    } catch {
      setTestEmailMessage('No fue posible probar el correo.');
    } finally {
      setTestEmailLoading(false);
    }
  }

  async function runSterenDiagnostic(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSterenLoading(true);
    setSterenDiagnostic(null);
    try {
      const res = await fetch('/api/admin/steren-diagnostic', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale_identifier: sterenIdentifier || undefined,
          sale_type: sterenType,
        }),
      });
      const body = await res.json().catch(() => ({}));
      setSterenDiagnostic(body?.diagnostic ?? { ok: false, message: body?.message ?? 'Diagnóstico fallido.' });
    } catch {
      setSterenDiagnostic({ ok: false, message: 'No fue posible ejecutar el diagnóstico.' });
    } finally {
      setSterenLoading(false);
    }
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

      <form
        onSubmit={sendTestEmail}
        className="rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#00A3E0]">
              Prueba de correo
            </div>
            <label className="mt-2 block text-sm font-medium text-slate-700">
              Enviar boleto de prueba a
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#00A3E0] focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            disabled={testEmailLoading || !testEmail}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#003A5D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#002a45] disabled:opacity-60"
          >
            {testEmailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar prueba
          </button>
        </div>
        {testEmailMessage && (
          <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {testEmailMessage}
          </div>
        )}
      </form>

      <form
        onSubmit={runSterenDiagnostic}
        className="rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#00A3E0]">
              Diagnóstico Steren
            </div>
            <label className="mt-2 block text-sm font-medium text-slate-700">
              Probar conexión o validar ticket sin registrar
            </label>
            <div className="mt-2 grid gap-2 md:grid-cols-[150px_1fr]">
              <select
                value={sterenType}
                onChange={(e) => setSterenType(e.target.value as 'ticket' | 'factura')}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#00A3E0] focus:ring-brand"
              >
                <option value="ticket">Ticket</option>
                <option value="factura">Factura</option>
              </select>
              <input
                type="text"
                value={sterenIdentifier}
                onChange={(e) => setSterenIdentifier(e.target.value)}
                placeholder="Ej. 6500000099885"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm uppercase outline-none focus:border-[#00A3E0] focus:ring-brand"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Sin identificador solo prueba login y StoreGroups. Con identificador busca la venta en Steren sin guardarla.
            </p>
          </div>
          <button
            type="submit"
            disabled={sterenLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#003A5D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#002a45] disabled:opacity-60"
          >
            {sterenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Probar Steren
          </button>
        </div>
        {sterenDiagnostic && (
          <DiagnosticResult result={sterenDiagnostic} />
        )}
      </form>

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

function DiagnosticResult({ result }: { result: any }) {
  const ok = Boolean(result?.ok);
  const validation = result?.validation;
  const error = result?.error;

  return (
    <div
      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
        ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      <div className="font-semibold">
        {ok ? 'Conexión con Steren correcta' : 'Falla en conexión con Steren'}
      </div>
      {result?.stage && <div className="mt-1">Etapa: {result.stage}</div>}
      {error && (
        <div className="mt-1">
          Error: {error.kind}
          {error.status ? ` (${error.status})` : ''}
          {error.message ? ` - ${error.message}` : ''}
        </div>
      )}
      {result?.message && <div className="mt-1">{result.message}</div>}
      {result?.range_checked && (
        <div className="mt-1">
          Rango revisado: {result.range_checked.startDate} a {result.range_checked.endDate}
        </div>
      )}
      {result?.first_page && (
        <div className="mt-1">
          Primera página: {result.first_page.orders} ventas en {result.first_page.date_groups} grupos de fecha.
        </div>
      )}
      {validation && (
        <div className="mt-2 rounded-lg bg-white/70 p-3 text-slate-700">
          {validation.status === 'valid' ? (
            <>
              <div className="font-semibold text-emerald-700">Venta encontrada en Steren</div>
              <div>Fecha: {validation.sale_date ?? '—'}</div>
              <div>Sucursal: {validation.branch ?? '—'}</div>
              <div>Total: {validation.total_amount ?? '—'}</div>
            </>
          ) : (
            <>
              <div className="font-semibold text-amber-700">Venta no encontrada en Steren</div>
              <div>Motivo: {validation.reason ?? 'not_found'}</div>
            </>
          )}
        </div>
      )}
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
