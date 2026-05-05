import { z } from 'zod';

const phoneRegex = /^[0-9]{10}$/;
const saleIdRegex = /^[A-Za-z0-9\-]{4,40}$/;

export const registrationSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, 'Nombre demasiado corto')
    .max(120, 'Nombre demasiado largo')
    .regex(/^[A-Za-zÀ-ÿ'\s.\-]+$/, 'Nombre inválido'),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Teléfono debe tener 10 dígitos'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Correo inválido')
    .max(180),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine((d) => {
      const date = new Date(d);
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      return age >= 18 && age <= 110;
    }, 'Debes ser mayor de edad'),
  sale_type: z.enum(['ticket', 'factura']),
  sale_identifier: z
    .string()
    .trim()
    .regex(saleIdRegex, 'Identificador de venta inválido'),
  accepted_terms: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar las bases y condiciones' }),
  }),
  accepted_privacy: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar el aviso de privacidad' }),
  }),
});

export type RegistrationPayload = z.infer<typeof registrationSchema>;

export const folioLookupSchema = z.object({
  folio: z
    .string()
    .trim()
    .regex(/^[A-Z0-9\-]{4,40}$/i, 'Folio inválido'),
});
