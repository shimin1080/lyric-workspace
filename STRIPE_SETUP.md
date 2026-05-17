# Stripe / Supabase Billing Setup

Lyric Workspace uses a Free / Pro split.

- Free: 5 projects, 3 music tracks, 3 recordings, local save only
- Pro: all current features, cloud sync, unlimited projects/tracks/recordings

## Stripe

1. Create a Stripe product: `Lyric Workspace Pro`
2. Create a recurring monthly price:
   - Currency: `JPY`
   - Amount: `500`
   - Billing interval: monthly
3. Copy the Price ID, for example `price_...`.
4. Enable Customer Portal in Stripe Billing settings.

## Supabase database

Run the migration:

```bash
supabase db push
```

or paste `supabase/migrations/202605170001_billing_profiles.sql` into the Supabase SQL editor.

## Supabase Edge Function secrets

Set these secrets in Supabase:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_PRO_PRICE_ID=price_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_RETURN_URL=https://jlcawjxsxamxcwyexsqk.supabase.co/functions/v1/billing-return
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available automatically in hosted Supabase Edge Functions.

## Deploy functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-billing-portal-session
supabase functions deploy stripe-webhook
supabase functions deploy billing-return
```

## Stripe webhook endpoint

Add this endpoint in Stripe:

```text
https://jlcawjxsxamxcwyexsqk.supabase.co/functions/v1/stripe-webhook
```

Events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

After checkout completes, return to the app settings screen and press `更新`.
