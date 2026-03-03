-- ENUMS
-- =========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_enum') THEN
    CREATE TYPE public.currency_enum AS ENUM ('GBP', 'USD', 'LKR');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'currency_enum'
      AND e.enumlabel = 'LKR'
  ) THEN
    ALTER TYPE public.currency_enum ADD VALUE 'LKR';
  END IF;
END$$;

-- =========
-- TABLES
-- =========

create table if not exists public.consignee (
  con_id          bigint generated always as identity primary key,
  name            text not null,
  country         text,
  opening_balance numeric default 0 not null,
  currency        currency_enum default 'GBP' not null
);

create table if not exists public.supplier (
  supp_id         bigint generated always as identity primary key,
  name            text not null,
  opening_balance numeric default 0 not null,
  currency        currency_enum default 'LKR' not null
);

create table if not exists public.shipment (
  awb_no                     text primary key,
  date                       date,
  invoice_no                 text,
  commercial_invoice_value   numeric,
  currency                   currency_enum,
  requested_weight           numeric,
  boxes                      integer,
  con_id                     bigint references public.consignee (con_id)
                               on update cascade
                               on delete restrict
);

create table if not exists public.bill (
  bill_id   text primary key,
  date      date,
  weight    numeric,
  amount    numeric,
  supp_id   bigint references public.supplier (supp_id)
              on update cascade
              on delete restrict,
  awb_no    text references public.shipment (awb_no)
              on update cascade
              on delete restrict
);

create table if not exists public.pay (
  pay_id   bigint generated always as identity primary key,
  date     date,
  amount   numeric,
  currency currency_enum default 'LKR' not null,
  supp_id  bigint references public.supplier (supp_id)
             on update cascade
             on delete restrict
);

create table if not exists public.receive (
  receive_id bigint generated always as identity primary key,
  date       date,
  amount     numeric,
  currency   currency_enum,
  con_id     bigint references public.consignee (con_id)
               on update cascade
               on delete restrict
);

create table if not exists public.additional_charges (
  id              bigint generated always as identity primary key,
  processing_cost numeric,
  freight_cost    numeric,
  awb_no          text unique references public.shipment (awb_no)
                    on update cascade
                    on delete restrict
);

create table if not exists public.settings (
  id              integer primary key,
  gbp_rate        numeric default 400,
  usd_rate        numeric default 300,
  company_name    text,
  company_address text,
  logo_url        text
);

create table if not exists public.exchange_rate_daily (
  rate_date date primary key,
  gbp_rate  numeric not null,
  usd_rate  numeric not null,
  created_at timestamptz default now() not null
);

insert into public.settings (id)
values (1)
on conflict (id) do nothing;

-- =========
-- INDEXES
-- =========
create index if not exists idx_shipment_con_id on public.shipment (con_id);
create index if not exists idx_bill_supp_id on public.bill (supp_id);
create index if not exists idx_bill_awb_no on public.bill (awb_no);
create index if not exists idx_pay_supp_id on public.pay (supp_id);
create index if not exists idx_receive_con_id on public.receive (con_id);

-- =========
-- VIEWS
-- =========

-- Shipment financials
create or replace view public.shipment_financials_view as
with bill_totals as (
  select b.awb_no,
         coalesce(sum(b.amount), 0) as bills_total,
         coalesce(sum(b.weight), 0) as billed_weight_total
  from public.bill b
  group by b.awb_no
),
charges as (
  select ac.awb_no,
         coalesce(ac.processing_cost, 0) as processing_cost,
         coalesce(ac.freight_cost, 0) as freight_cost
  from public.additional_charges ac
)
select s.awb_no, s.date, s.invoice_no, s.commercial_invoice_value,
       s.currency, s.requested_weight, s.boxes, s.con_id,
       ct.name as consignee_name,
       case s.currency
         when 'GBP' then s.commercial_invoice_value * coalesce(ed.gbp_rate, st.gbp_rate)
         when 'USD' then s.commercial_invoice_value * coalesce(ed.usd_rate, st.usd_rate)
         else s.commercial_invoice_value
       end as invoice_lkr,
       coalesce(bt.bills_total, 0) as bills_total,
       coalesce(ch.processing_cost, 0) as processing_cost,
       coalesce(ch.freight_cost, 0) as freight_cost,
       coalesce(bt.billed_weight_total, 0) as billed_weight_total,
       case s.currency
         when 'GBP' then s.commercial_invoice_value * coalesce(ed.gbp_rate, st.gbp_rate)
         when 'USD' then s.commercial_invoice_value * coalesce(ed.usd_rate, st.usd_rate)
         else s.commercial_invoice_value
       end - (coalesce(bt.bills_total, 0)
              + coalesce(ch.processing_cost, 0)
              + coalesce(ch.freight_cost, 0)) as profit_lkr,
       (coalesce(s.requested_weight, 0) - coalesce(bt.billed_weight_total, 0)) as weight_difference
from public.shipment s
left join bill_totals bt on bt.awb_no = s.awb_no
left join charges ch on ch.awb_no = s.awb_no
left join public.settings st on st.id = 1
left join lateral (
  select d.gbp_rate, d.usd_rate
  from public.exchange_rate_daily d
  where d.rate_date <= coalesce(s.date, current_date)
  order by d.rate_date desc
  limit 1
) ed on true
left join public.consignee ct on ct.con_id = s.con_id;

-- Monthly profit
create or replace view public.monthly_profit_view as
select date_trunc('month', sf.date)::date as month,
       count(*) as shipment_count,
       sum(sf.invoice_lkr) as total_revenue_lkr,
       sum(sf.bills_total + sf.processing_cost + sf.freight_cost) as total_expense_lkr,
       sum(sf.profit_lkr) as net_profit_lkr
from public.shipment_financials_view sf
group by date_trunc('month', sf.date)
order by month;

-- Supplier summary
create or replace view public.supplier_summary_view as
with bill_with_profit as (
  select b.supp_id, b.awb_no, b.weight, b.amount, sf.profit_lkr
  from public.bill b
  left join public.shipment_financials_view sf on sf.awb_no = b.awb_no
)
select s.supp_id, s.name as supplier_name,
       coalesce(sum(bwp.amount), 0) as total_bills_lkr,
       coalesce(sum(bwp.weight), 0) as total_weight,
       case when coalesce(sum(bwp.weight), 0) > 0
            then sum(bwp.amount) / sum(bwp.weight)
            else null end as avg_cost_per_kg,
       coalesce(sum(bwp.profit_lkr), 0) as associated_profit_lkr
from public.supplier s
left join bill_with_profit bwp on bwp.supp_id = s.supp_id
group by s.supp_id, s.name
order by s.name;

-- Consignee summary
create or replace view public.consignee_summary_view as
with shipments_by_consignee as (
  select sf.con_id, sf.awb_no, sf.date as shipment_date,
         sf.invoice_lkr, sf.profit_lkr
  from public.shipment_financials_view sf
),
receipts_by_consignee as (
  select r.con_id, r.date, r.amount
  from public.receive r
),
payment_delays as (
  select s.con_id, r.date as receive_date, s.shipment_date,
         (r.date - s.shipment_date) as delay_days
  from shipments_by_consignee s
  join receipts_by_consignee r
    on r.con_id = s.con_id
   and r.date >= s.shipment_date
)
select c.con_id, c.name as consignee_name,
       coalesce(count(distinct s.awb_no), 0) as total_shipments,
       coalesce(sum(s.invoice_lkr), 0) as total_revenue_lkr,
       case when coalesce(count(distinct s.awb_no), 0) > 0
            then sum(s.profit_lkr) / count(distinct s.awb_no)
            else null end as avg_profit_per_shipment_lkr,
       avg(pd.delay_days) as avg_payment_delay_days
from public.consignee c
left join shipments_by_consignee s on s.con_id = c.con_id
left join payment_delays pd on pd.con_id = c.con_id
group by c.con_id, c.name
order by c.name;