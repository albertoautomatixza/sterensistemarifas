import nodemailer from 'nodemailer';

type EmailDeliveryStatus = 'pending' | 'sent' | 'failed';

export type RaffleConfirmationEmailParams = {
  email: string;
  full_name: string;
  entry_number: string;
  internal_folio: string;
  raffle_name: string;
  created_at: string;
};

export type EmailDeliveryResult = {
  status: EmailDeliveryStatus;
  providerResponse: Record<string, unknown>;
  sentAt: string | null;
};

export async function sendRaffleConfirmationEmail(
  params: RaffleConfirmationEmailParams
): Promise<EmailDeliveryResult> {
  if (shouldUseSmtp()) {
    return sendWithSmtp(params);
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      status: 'pending',
      providerResponse: { note: 'RESEND_API_KEY not configured; email queued only.' },
      sentAt: null,
    };
  }

  try {
    const timeoutMs = Number(process.env.EMAIL_TIMEOUT_MS ?? 10_000);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 10_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'Steren Rifa <onboarding@resend.dev>',
        to: params.email,
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: `Tu boleto de participación - ${params.entry_number}`,
        html: renderRaffleConfirmationHtml(params),
        text: renderRaffleConfirmationText(params),
      }),
    });

    const body = await res.json().catch(() => ({}));
    return {
      status: res.ok ? 'sent' : 'failed',
      providerResponse: body,
      sentAt: res.ok ? new Date().toISOString() : null,
    };
  } catch (err: any) {
    return {
      status: 'failed',
      providerResponse: { error: String(err?.message ?? err) },
      sentAt: null,
    };
  }
}

function shouldUseSmtp() {
  return process.env.MAIL_PROVIDER === 'smtp' || Boolean(process.env.SMTP_HOST);
}

async function sendWithSmtp(params: RaffleConfirmationEmailParams): Promise<EmailDeliveryResult> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT ?? 587);

  if (!host || !user || !password) {
    return {
      status: 'pending',
      providerResponse: { note: 'SMTP config not complete; email queued only.' },
      sentAt: null,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure: port === 465,
      auth: { user, pass: password },
      connectionTimeout: Number(process.env.EMAIL_TIMEOUT_MS ?? 10_000),
      greetingTimeout: Number(process.env.EMAIL_TIMEOUT_MS ?? 10_000),
      socketTimeout: Number(process.env.EMAIL_TIMEOUT_MS ?? 10_000),
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? user,
      to: params.email,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      subject: `Tu boleto de participación - ${params.entry_number}`,
      html: renderRaffleConfirmationHtml(params),
      text: renderRaffleConfirmationText(params),
    });

    return {
      status: 'sent',
      providerResponse: {
        provider: 'smtp',
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      },
      sentAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      status: 'failed',
      providerResponse: { provider: 'smtp', error: String(err?.message ?? err) },
      sentAt: null,
    };
  }
}

export function renderRaffleConfirmationHtml(p: RaffleConfirmationEmailParams) {
  const dateLabel = formatDateTime(p.created_at);
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tu boleto de participación</title>
  </head>
  <body style="margin:0;background:#eef4f8;color:#102333;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Tu número de participación es ${escapeHtml(p.entry_number)}. Conserva este correo como comprobante.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef4f8;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d9e6ee;box-shadow:0 14px 40px rgba(0,58,93,.14);">
            <tr>
              <td style="background:linear-gradient(135deg,#003A5D 0%,#007eb1 55%,#00A3E0 100%);padding:24px 28px;color:#ffffff;">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.85;">Steren</div>
                <div style="margin-top:6px;font-size:26px;line-height:1.15;font-weight:800;">Tu boleto virtual está listo</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 10px;">
                <p style="margin:0;font-size:16px;line-height:1.6;color:#31465a;">Hola <strong>${escapeHtml(p.full_name)}</strong>, gracias por participar. Este es tu boleto oficial para la rifa trimestral.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 18px 8px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;background:#fbfdff;border:1px solid #c9e8f5;border-radius:20px;overflow:hidden;">
                  <tr>
                    <td style="padding:26px 26px 24px;border-right:2px dashed #b4ccd9;width:58%;vertical-align:top;">
                      <div style="font-size:28px;line-height:1;font-weight:900;letter-spacing:.5px;color:#005A9C;">TU BOLETO</div>
                      <div style="margin-top:6px;font-size:18px;font-weight:800;color:#102333;">DE PARTICIPACIÓN</div>
                      <div style="display:inline-block;margin-top:22px;background:#005A9C;color:#ffffff;border-radius:999px;padding:8px 13px;font-size:12px;font-weight:800;letter-spacing:.6px;">NÚMERO ÚNICO</div>
                      <div style="margin-top:10px;font-size:54px;line-height:1;font-weight:900;letter-spacing:5px;color:#142535;">${escapeHtml(p.entry_number)}</div>
                    </td>
                    <td style="padding:26px 24px 24px;vertical-align:top;background:linear-gradient(180deg,#ffffff 0%,#eef8fc 100%);">
                      <div style="font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#00A3E0;">Rifa Trimestral</div>
                      <div style="margin-top:8px;font-size:15px;line-height:1.45;font-weight:800;color:#003A5D;">${escapeHtml(p.raffle_name)}</div>
                      <div style="height:1px;background:#d7e7ef;margin:18px 0;"></div>
                      <div style="font-size:12px;color:#6b7b8c;">Folio interno</div>
                      <div style="margin-top:4px;font-size:14px;font-weight:800;color:#142535;">${escapeHtml(p.internal_folio)}</div>
                      <div style="margin-top:14px;font-size:12px;color:#6b7b8c;">Registro</div>
                      <div style="margin-top:4px;font-size:13px;color:#31465a;">${escapeHtml(dateLabel)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 28px;">
                <p style="margin:0;font-size:14px;line-height:1.65;color:#465b70;">Conserva este correo como comprobante. El sorteo se realizará con base en los resultados oficiales de Lotería Nacional y el número de participación generado por el sistema.</p>
                <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#7b8b9b;">Este correo fue generado automáticamente al validar tu ticket o factura en el sistema de participación.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderRaffleConfirmationText(p: RaffleConfirmationEmailParams) {
  return [
    `Hola ${p.full_name},`,
    '',
    `Tu boleto virtual para ${p.raffle_name} está listo.`,
    `Número de participación: ${p.entry_number}`,
    `Folio interno: ${p.internal_folio}`,
    `Registro: ${formatDateTime(p.created_at)}`,
    '',
    'Conserva este correo como comprobante.',
  ].join('\n');
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(date);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}
