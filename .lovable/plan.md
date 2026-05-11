## Hyttekalender – Plan

En enkel, delt månedskalender for 3 familiemedlemmer (Bestefar, Far, Onkel) som erstatter et Excel-ark. Ingen innlogging, ingen administrasjon – bare se kalenderen og legg til bookinger.

### Sider (kun én)

`/` – Hovedside med:
- Stor månedstittel + store «← forrige / neste →»-knapper
- Stor månedskalender. Hver dag viser fargemarkering hvis booket. I dag er tydelig uthevet.
- Fargekode-forklaring øverst (Bestefar = blå, Far = grønn, Onkel = oransje)
- Stor «+ Ny booking»-knapp nederst (sticky på mobil)
- Tom-tilstand når ingen bookinger finnes

### Booking-flyt

1. Trykk på en dato i kalenderen ELLER «+ Ny booking»
2. Modal åpnes med:
   - Hvem booker? – 3 store knapper med farge (Bestefar / Far / Onkel)
   - Fra-dato og Til-dato (store datovelgere, forhåndsutfylt fra valgt dag)
   - «Bekreft booking»-knapp
3. Validering: overlappende datoer blokkeres med tydelig melding («Disse datoene er allerede booket av Far»)
4. Bekreftelses-toast: «Booking lagret ✓»

Trykk på en eksisterende booking → liten popup med detaljer + «Slett booking»-knapp (bekreft først).

### Design

- Skandinavisk minimalisme: mye luft, off-white bakgrunn, mørk grå tekst
- Store fonter (basis 18px, kalenderdager ~20px)
- Avrundede kort og knapper (radius ~16px)
- Rolige farger: dempet blå, grønn, oransje på hvit bakgrunn med svake fargede prikker/bånd
- Mobile-first, fungerer like godt på nettbrett
- Subtile transitions (fade/scale) på modal og dato-hover

### Database (Lovable Cloud / Supabase)

Én tabell:

```text
bookings
  id            uuid (pk)
  person        text  -- 'grandfather' | 'father' | 'uncle'
  start_date    date
  end_date      date
  created_at    timestamptz default now()
```

- RLS: åpen lese-/skrive-tilgang (ingen auth, intern familiebruk)
- Ingen seed-data – klar for senere Excel-import (samme kolonner)
- Indeks på `start_date, end_date` for raskt overlapp-oppslag

### Komponenter

- `CalendarGrid` – månedsvisning, viser bookinger som fargede bånd
- `MonthHeader` – tittel + navigasjon
- `PersonLegend` – fargeforklaring
- `BookingDialog` – opprett booking
- `BookingDetailsDialog` – vis/slett booking
- `personColors.ts` – sentral fargemapping (design tokens i `styles.css`)

### Tech-stack

- TanStack Start + React + Tailwind v4
- Lovable Cloud for database
- `createServerFn` for `listBookings`, `createBooking` (med overlap-sjekk server-side), `deleteBooking`
- React Query for caching og automatisk re-fetch
- `date-fns` for datologikk

### Det jeg IKKE bygger

- Ingen innlogging, brukerprofiler eller roller
- Ingen admin/dashboard
- Ingen e-post/varsler
- Ingen ukesvisning, gjentakende bookinger eller redigering (kun opprett/slett)
- Ingen hardkodede bookinger – tom database fra start

### Åpne spørsmål

Si fra hvis noe av dette skal endres, ellers går jeg videre med planen over:
1. Skal man kunne **redigere** en booking, eller holder det med slett + opprett ny?
2. Skal **fortid** være låst (kan ikke booke datoer som har vært)?
3. Språk – jeg antar **norsk** i UI. OK?
