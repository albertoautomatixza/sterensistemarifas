'use client';

import { useState } from 'react';
import { Loader2, Search, Ticket, AlertCircle } from 'lucide-react';

type Result =
  | {
      ok: true;
      entry_number: string;
      internal_folio: string;
      status: string;
      created_at: string;
      raffle_name: string | null;
      draw_date: string | null;
    }
  | { ok: false; message: string };

export function ConsultaForm() {
  const [folio, setFolio] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/consulta?folio=${encodeURIComponent(folio)}`);
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setResult({ ok: false, message: body?.message ?? 'No se encontró la participación.' });
      } else {
        setResult(body);
      }
    } catch {
      setResult({ ok: false, message: 'Intenta nuevamente más tarde.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">Folio interno</label>
        <div className="mt-2 flex gap-2">
          <input
            value={folio}
            onChange={(e) => setFolio(e.target.value.toUpperCase())}
            placeholder="Ej. Q2-2026-04829-X92KR"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm uppercase tracking-wider text-slate-800 outline-none focus:border-[#00A3E0] focus:ring-brand"
          />
          <button
            type="submit"
            disabled={loading || folio.length < 4}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00A3E0] px-5 text-sm font-semibold text-white transition hover:bg-[#0090c7] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar
          </button>
        </div>
      </form>

      {result && !result.ok && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
          <div>{result.message}</div>
        </div>
      )}

      {result && result.ok && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="gradient-surface px-5 py-4 text-white">
            <div className="text-xs uppercase tracking-widest opacity-80">Participación encontrada</div>
            <div className="mt-1 text-lg font-semibold">{result.raffle_name ?? 'Rifa Trimestral'}</div>
          </div>
          <div className="p-6">
            <div className="rounded-2xl border-2 border-dashed border-[#00A3E0]/60 bg-[#F4F6F8] p-6 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Número</div>
              <div className="mt-1 font-mono text-5xl font-bold tracking-[0.25em] text-[#003A5D]">
                {result.entry_number}
              </div>
              <div className="mt-2 font-mono text-xs text-slate-500">{result.internal_folio}</div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <KV k="Estatus" v={result.status} highlight />
              <KV k="Registro" v={new Date(result.created_at).toLocaleString('es-MX')} />
              {result.draw_date && <KV k="Fecha de sorteo" v={new Date(result.draw_date).toLocaleDateString('es-MX')} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KV({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{k}</div>
      <div className={`mt-0.5 font-medium ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{v}</div>
    </div>
  );
}
