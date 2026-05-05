'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationSchema, type RegistrationPayload } from '@/lib/validators';
import {
  User,
  Phone,
  Mail,
  Calendar,
  ReceiptText,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

type Step = 0 | 1 | 2;

export function RegistrationWizard() {
  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const router = useRouter();

  const form = useForm<RegistrationPayload>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur',
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      birthdate: '',
      sale_type: 'ticket',
      sale_identifier: '',
      accepted_terms: false as any,
      accepted_privacy: false as any,
    },
  });

  const { register, handleSubmit, formState, watch, setValue, trigger } = form;

  async function next() {
    if (step === 0) {
      const ok = await trigger(['full_name', 'phone', 'email', 'birthdate']);
      if (ok) setStep(1);
    } else if (step === 1) {
      const ok = await trigger(['sale_type', 'sale_identifier']);
      if (ok) setStep(2);
    }
  }

  function back() {
    if (step > 0) setStep((step - 1) as Step);
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/participacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setServerError(body?.message ?? 'No fue posible completar el registro.');
        setSubmitting(false);
        return;
      }
      const params = new URLSearchParams({
        n: body.entry_number,
        f: body.internal_folio,
        name: body.full_name,
        email: body.email,
        r: body.raffle_name,
      });
      router.push(`/exito?${params.toString()}`);
    } catch {
      setServerError('Intenta nuevamente más tarde.');
      setSubmitting(false);
    }
  });

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <Stepper step={step} />

      <form onSubmit={onSubmit} className="p-6 md:p-8">
        {step === 0 && (
          <div className="space-y-4">
            <Field
              label="Nombre completo"
              icon={User}
              error={formState.errors.full_name?.message}
              input={
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Ej. María Rodríguez"
                  {...register('full_name')}
                  className="input"
                />
              }
            />
            <Field
              label="Teléfono (10 dígitos)"
              icon={Phone}
              error={formState.errors.phone?.message}
              input={
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="4491234567"
                  {...register('phone')}
                  className="input"
                />
              }
            />
            <Field
              label="Correo electrónico"
              icon={Mail}
              error={formState.errors.email?.message}
              input={
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  {...register('email')}
                  className="input"
                />
              }
            />
            <Field
              label="Fecha de nacimiento"
              icon={Calendar}
              error={formState.errors.birthdate?.message}
              input={<input type="date" {...register('birthdate')} className="input" />}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">Tipo de comprobante</div>
              <div className="grid grid-cols-2 gap-3">
                {(['ticket', 'factura'] as const).map((t) => {
                  const selected = watch('sale_type') === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setValue('sale_type', t, { shouldValidate: true })}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? 'border-[#00A3E0] bg-[#00A3E0]/5 ring-brand'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ReceiptText className={`h-5 w-5 ${selected ? 'text-[#00A3E0]' : 'text-slate-400'}`} />
                        <span className="font-semibold capitalize text-slate-900">{t}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {t === 'ticket' ? 'Compra en punto de venta.' : 'Compra con facturación.'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <Field
              label="Identificador del ticket o factura"
              icon={ReceiptText}
              error={formState.errors.sale_identifier?.message}
              input={
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. TKT-0045123 o FA-77821"
                  {...register('sale_identifier')}
                  className="input font-mono uppercase tracking-wider"
                />
              }
            />
            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              Puedes encontrar este identificador impreso en tu ticket o en el encabezado de tu
              factura. Usaremos este dato únicamente para validar tu compra.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-[#00A3E0]" />
                <div className="text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Revisa antes de enviar</div>
                  <div className="mt-1 text-slate-600">
                    Al continuar confirmas tus datos y aceptas los documentos legales.
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <Summary k="Nombre" v={watch('full_name')} />
                <Summary k="Teléfono" v={watch('phone')} />
                <Summary k="Correo" v={watch('email')} />
                <Summary k="Tipo" v={watch('sale_type')} />
                <Summary k="Identificador" v={watch('sale_identifier')} />
              </div>
            </div>

            <Checkbox
              label={
                <>
                  He leído y acepto las{' '}
                  <button type="button" onClick={() => setShowTerms(true)} className="text-[#00A3E0] underline">
                    bases y condiciones
                  </button>
                  .
                </>
              }
              registerProps={register('accepted_terms')}
              error={formState.errors.accepted_terms?.message as string | undefined}
            />
            <Checkbox
              label={
                <>
                  He leído y acepto el{' '}
                  <a href="/privacidad" target="_blank" className="text-[#00A3E0] underline">
                    aviso de privacidad
                  </a>
                  .
                </>
              }
              registerProps={register('accepted_privacy')}
              error={formState.errors.accepted_privacy?.message as string | undefined}
            />

            {serverError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
                <div>{serverError}</div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || submitting}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            Atrás
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-full bg-[#00A3E0] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0090c7]"
            >
              Continuar
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#003A5D] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002a45] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Confirmar registro
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid hsl(var(--border));
          background: #fff;
          padding: 0.7rem 0.9rem 0.7rem 2.5rem;
          font-size: 0.95rem;
          color: #1f2937;
          outline: none;
          transition: all 0.15s ease;
        }
        .input:focus {
          border-color: #00a3e0;
          box-shadow: 0 0 0 4px rgba(0, 163, 224, 0.18);
        }
      `}</style>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const items = ['Tus datos', 'Tu compra', 'Confirmar'];
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 px-4 py-5 sm:gap-4 sm:px-6 md:px-8">
      {items.map((label, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <div key={label} className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? 'bg-[#00A3E0] text-white'
                    : done
                    ? 'bg-[#003A5D] text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < items.length - 1 && <div className="hidden h-px flex-1 bg-slate-200 sm:block" />}
            </div>
            <div
              className={`mt-2 whitespace-nowrap text-[12px] leading-none sm:text-xs md:text-sm ${
                active ? 'font-semibold text-[#003A5D]' : 'text-slate-500'
              }`}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  error,
  input,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  error?: string;
  input: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-medium text-slate-700">{label}</div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {input}
      </div>
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </label>
  );
}

function Checkbox({
  label,
  registerProps,
  error,
}: {
  label: React.ReactNode;
  registerProps: any;
  error?: string;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
        <input type="checkbox" {...registerProps} className="mt-0.5 h-4 w-4 accent-[#00A3E0]" />
        <span className="text-sm text-slate-700">{label}</span>
      </label>
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  );
}

function Summary({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{k}</div>
      <div className="mt-0.5 truncate font-medium text-slate-800">{v || '—'}</div>
    </div>
  );
}

function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 md:items-center">
      <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="font-semibold text-[#003A5D]">Bases y condiciones</div>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-slate-500 hover:bg-slate-100">
            Cerrar
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5 text-sm text-slate-600">
          <p className="mb-3">
            <strong>Vigencia.</strong> La campaña es válida únicamente durante el trimestre
            vigente publicado en la pantalla principal.
          </p>
          <p className="mb-3">
            <strong>Participación.</strong> Cada compra válida, registrada únicamente una vez,
            genera un número de participación único.
          </p>
          <p className="mb-3">
            <strong>Sorteo.</strong> El ganador se determinará comparando los últimos 5 dígitos
            del número premio mayor oficial publicado por Lotería Nacional contra los números
            de participación generados.
          </p>
          <p className="mb-3">
            <strong>Restricciones.</strong> No aplica para menores de edad. Los datos se usan
            exclusivamente para la operación de la rifa.
          </p>
          <p>
            <strong>Privacidad.</strong> Los datos personales serán tratados según el aviso de
            privacidad publicado.
          </p>
        </div>
      </div>
    </div>
  );
}
