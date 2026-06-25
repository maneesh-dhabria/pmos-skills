# Payments platform — H2 roadmap

> **Anonymized synthetic sample** — not a real document. Authored for the story 260624-aa8 standalone
> dogfood of `/artifact-critique` to exercise the **Roadmap** applicability column (Pricing → N/A,
> AI → N/A, Customer → conditional). Names and numbers are invented.

## 1. Theme

H2 is about reliability and merchant trust. After two outages last quarter, the platform's job is to stop
losing merchants to flakiness before we chase new payment methods.

## 2. Now (this quarter)

Ship idempotency keys on the charge API and a real retry-with-backoff path. These are table stakes we never
built; merchants who hit a timeout today can double-charge a customer.

## 3. Next

Add a merchant-facing status page and webhook delivery guarantees. We will define what "delivered" means
and back it with a redrive queue.

## 4. Later

Explore alternative payment methods (bank debit, wallets) once the core is trustworthy. Sequenced last on
purpose — new rails on a flaky core just multiply the failure surface.

## 5. Success

We will know H2 worked when outage minutes fall and merchant churn stops climbing.

## 6. Risks

The redrive queue could replay stale webhooks and confuse downstream merchant systems if we don't dedupe
on delivery.
