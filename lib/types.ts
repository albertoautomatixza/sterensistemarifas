export type Raffle = {
  id: string;
  name: string;
  city: string;
  quarter: string;
  start_date: string;
  end_date: string;
  draw_reference_date: string | null;
  draw_reference_type: string;
  winning_rule: string | null;
  winning_digits_count: number;
  external_winning_number: string | null;
  terms_version: string;
  privacy_version: string;
  prize_description: string | null;
  status: 'draft' | 'active' | 'closed' | 'drawn';
};

export type Entry = {
  id: string;
  raffle_id: string;
  user_id: string;
  sale_id: string;
  entry_number: string;
  internal_folio: string;
  status: 'active' | 'cancelled' | 'winner';
  created_at: string;
};

export type RegistrationInput = {
  full_name: string;
  phone: string;
  email: string;
  birthdate: string;
  sale_type: 'ticket' | 'factura';
  sale_identifier: string;
  accepted_terms: boolean;
  accepted_privacy: boolean;
};

export type RegistrationResult = {
  ok: true;
  entry_number: string;
  internal_folio: string;
  full_name: string;
  email: string;
  raffle_name: string;
  created_at: string;
} | {
  ok: false;
  error_code:
    | 'DUPLICATE_SALE'
    | 'INVALID_SALE'
    | 'VALIDATION_ERROR'
    | 'RATE_LIMITED'
    | 'NO_ACTIVE_RAFFLE'
    | 'INTERNAL_ERROR'
    | 'SERVICE_UNAVAILABLE';
  message: string;
};
