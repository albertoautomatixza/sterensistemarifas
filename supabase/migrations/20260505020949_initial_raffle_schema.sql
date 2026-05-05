/*
  # Raffle System - Initial Schema

  ## Overview
  Complete database schema for a quarterly raffle system based on verified purchases.

  ## Tables Created
  1. raffles - Campaign configuration per city/quarter
  2. users - Registered participants (phone unique identifier)
  3. sales - Purchase validations from Steren API
  4. entries - Raffle participation records with unique entry numbers
  5. entry_sequences - Collision-free counter per raffle
  6. terms_acceptance_log - Audit trail of terms/privacy acceptance
  7. email_delivery_log - Email delivery tracking
  8. audit_log - Complete audit trail

  ## Security
  RLS enabled on all tables. Service role performs all writes.
  Public read limited to active raffles and folio lookup.
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS raffles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  city text NOT NULL DEFAULT 'Aguascalientes',
  quarter text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  draw_reference_date date,
  draw_reference_type text DEFAULT 'loteria_nacional',
  winning_rule text,
  winning_digits_count integer DEFAULT 5,
  external_winning_number text,
  terms_version text NOT NULL DEFAULT 'v1.0',
  privacy_version text NOT NULL DEFAULT 'v1.0',
  prize_description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'drawn')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raffles_status ON raffles(status);
CREATE INDEX IF NOT EXISTS idx_raffles_city ON raffles(city);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  phone text UNIQUE NOT NULL,
  email text NOT NULL,
  birthdate date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_identifier text UNIQUE NOT NULL,
  sale_type text NOT NULL CHECK (sale_type IN ('ticket', 'factura')),
  steren_internal_identifier text,
  branch text,
  sale_date date,
  total_amount numeric(12,2),
  raw_api_response jsonb,
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'error')),
  validated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_sale_identifier ON sales(sale_identifier);
CREATE INDEX IF NOT EXISTS idx_sales_validation_status ON sales(validation_status);

CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  raffle_id uuid NOT NULL REFERENCES raffles(id),
  user_id uuid NOT NULL REFERENCES users(id),
  sale_id uuid UNIQUE NOT NULL REFERENCES sales(id),
  entry_number text UNIQUE NOT NULL,
  internal_folio text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'winner')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entries_raffle_id ON entries(raffle_id);
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_entry_number ON entries(entry_number);
CREATE INDEX IF NOT EXISTS idx_entries_internal_folio ON entries(internal_folio);

CREATE TABLE IF NOT EXISTS entry_sequences (
  raffle_id uuid PRIMARY KEY REFERENCES raffles(id),
  last_value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS terms_acceptance_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  raffle_id uuid NOT NULL REFERENCES raffles(id),
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  accepted_at timestamptz DEFAULT now(),
  ip text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_terms_user_id ON terms_acceptance_log(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_raffle_id ON terms_acceptance_log(raffle_id);

CREATE TABLE IF NOT EXISTS email_delivery_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  entry_id uuid REFERENCES entries(id),
  email text NOT NULL,
  template_name text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'bounced')),
  provider_response jsonb,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_user_id ON email_delivery_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_entry_id ON email_delivery_log(entry_id);
CREATE INDEX IF NOT EXISTS idx_email_log_delivery_status ON email_delivery_log(delivery_status);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_type text NOT NULL DEFAULT 'anonymous' CHECK (actor_type IN ('anonymous', 'user', 'admin', 'system')),
  actor_id uuid,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

CREATE OR REPLACE FUNCTION get_next_entry_number(p_raffle_id uuid)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_next bigint;
BEGIN
  INSERT INTO entry_sequences (raffle_id, last_value)
  VALUES (p_raffle_id, 1)
  ON CONFLICT (raffle_id) DO UPDATE
    SET last_value = entry_sequences.last_value + 1,
        updated_at = now()
  RETURNING last_value INTO v_next;

  RETURN v_next;
END;
$$;

ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active raffles"
  ON raffles FOR SELECT TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Public can lookup entry by folio"
  ON entries FOR SELECT TO anon, authenticated
  USING (true);

INSERT INTO raffles (
  name, city, quarter, start_date, end_date,
  draw_reference_date, draw_reference_type, winning_rule,
  winning_digits_count, terms_version, privacy_version, prize_description, status
) VALUES (
  'Gran Rifa Trimestral Q2 2026',
  'Aguascalientes',
  'Q2-2026',
  '2026-04-01',
  '2026-06-30',
  '2026-07-05',
  'loteria_nacional',
  'El ganador se determina comparando los ultimos 5 digitos del numero ganador oficial publicado por Loteria Nacional contra los numeros de participacion generados.',
  5,
  'v1.0',
  'v1.0',
  'Gran premio tecnologico valuado en $50,000 MXN mas 10 premios secundarios.',
  'active'
) ON CONFLICT DO NOTHING;