# Customer Journey — Jersey page (CS-11)

M11NTX **does not sell directly**. It acts as an **intermediary** for imported
jerseys: the customer explores a piece, consults availability, and M11NTX runs
the whole import until delivery. The Jersey page communicates this journey
clearly and transparently — and **nothing resembles a traditional e-commerce**
(no cart, no checkout, no live stock).

## Where it lives

Rendered by `catalog.js` (`Catalog.initJerseyPage` → `jerseyDetailTemplate` +
`journeySections`) on `pages/jersey.html`. Styled by the additive
`assets/css/journey.css` — the design system (`style.css`) is untouched.

## The three sections

1. **How It Works** — a 5-step vertical timeline:
   1. Explore the Jersey → 2. Contact M11NTX → 3. Availability Confirmation →
   4. International Import → 5. Estimated delivery (**25–40 dias corridos**).
2. **Import Information** — states that M11NTX is an intermediary for imported
   jerseys, that availability is confirmed before service, and the estimated
   lead time (25–40 dias corridos).
3. **FAQ** — native `<details>` accordion (no JS): Prazo, Disponibilidade, Como
   funciona, Atendimento.

## CTA — "Consultar Disponibilidade"

Every buy button was replaced by a single CTA: **Consultar Disponibilidade**.
It opens the **official M11NTX Instagram** in a new tab — the only service
channel. The URL is a single source of truth:

```js
// assets/js/catalog.js
const INSTAGRAM_URL = "https://www.instagram.com/m11ntx/";
```

> **Confirm the handle.** `m11ntx` is assumed from the brand name. If the real
> Instagram handle differs, change this one constant.

## Stock / availability

Because availability is confirmed **during service**, the page shows no
In/Out-of-Stock badge and no per-size stock state. The size grid is
**reference-only**, and a discreet note reads:
_"Importação sob consulta · Prazo estimado 25–40 dias corridos."_

The `sizes[].stock` data and the CS-10 availability filter are unaffected — this
is purely how the product page presents itself.

## Editing the content

The steps and FAQ are data arrays at the top of the journey block in
`catalog.js` (`JOURNEY_STEPS`, `FAQ_ITEMS`) — edit there; the markup is
generated from them.
