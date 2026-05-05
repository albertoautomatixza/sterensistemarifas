import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="font-semibold text-[#003A5D]">Rifa Trimestral</div>
            <p className="mt-2 text-xs leading-relaxed">
              Participa con compras verificadas. Sorteo vinculado al resultado oficial de
              Lotería Nacional.
            </p>
          </div>
          <div>
            <div className="mb-2 font-medium text-slate-700">Participar</div>
            <ul className="space-y-1 text-xs">
              <li><Link href="/registro" className="hover:text-[#00A3E0]">Registro</Link></li>
              <li><Link href="/consulta" className="hover:text-[#00A3E0]">Consultar folio</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-2 font-medium text-slate-700">Legal</div>
            <ul className="space-y-1 text-xs">
              <li><Link href="/bases" className="hover:text-[#00A3E0]">Bases y condiciones</Link></li>
              <li><Link href="/privacidad" className="hover:text-[#00A3E0]">Aviso de privacidad</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-2 font-medium text-slate-700">Soporte</div>
            <p className="text-xs">
              Comunícate con la sucursal donde realizaste tu compra para recibir atención.
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-6 text-xs" aria-hidden />
      </div>
    </footer>
  );
}
