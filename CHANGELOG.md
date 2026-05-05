# Changelog — Flexurity

## V3.0 — Mei 2026

### Highlights

- **Multi-account abonnementen** — abonnementen zoals ChatGPT Plus voor meerdere medewerkers krijgen één regel met losse accounts eronder. Elk account heeft eigen vervaldatum, auto-verlenging en (optioneel) eigen prijs
- **Archief in plaats van verwijderen** — abonnementen én accounts gaan bij verwijderen naar het archief, zodat historische cashflow nooit verloren gaat. Restore en definitief verwijderen blijven mogelijk
- **Vijf duidelijke kostenmodellen** — vast bedrag, per gebruiker, per persoonlijk account, vaste licentie + per gebruiker, op basis van verbruik. Eén dropdown ipv losse toggles
- **FX-rates uit de database** — wisselkoersen staan nu org-wide in Postgres ipv localStorage. Snapshots bewaren de gebruikte koers per regel zodat historische bedragen achteraf herleidbaar zijn
- **Modernere UI** — Linear/Vercel-stijl met dotted-underline links, glassmorphism tooltips, amber-confirm voor reversibele acties

---

### Alle wijzigingen

#### Multi-account abonnementen
- Nieuw kostenmodel `per_account` — een sub kan meerdere persoonlijke accounts hebben (bijv. ChatGPT Plus voor 3 medewerkers)
- Per account: naam, startdatum, vervaldatum, auto-verlenging, optionele eigen prijs (anders fallback op parent cost)
- Auto-verlenging-pill (↻) inline naast vervaldatum — geen verschuiving van velden meer
- DB-cron `advance_subscription_renewals` schuift account-vervaldatums automatisch door bij auto-verlenging aan
- Detailpaneel toont alleen de actieve accounts in een aparte "Accounts · N" sectie
- Bij `per_account` worden parent-vervaldatum en parent-auto-verlenging verborgen (geldt niet meer)

#### Archief (soft-delete)
- Abonnementen verwijderen verplaatst ze naar een gearchiveerde sectie onderaan de Abonnementen-pagina (collapsible, dichtgeklapt by default)
- Counter "X in archief" als dotted-underline link in de subtitle — smooth scroll naar de sectie
- Restore + Definitief verwijderen per gearchiveerd abonnement
- Account-niveau archief in de modal: collapsible "Gearchiveerd (N)" sectie binnen AccountsManager
- Bulk-verwijderen heet nu "Bulk-archiveren" — knop in amber ipv rood, copy "verplaatst naar archief"
- Empty-state in archief bij gefilterde zoektocht: "Geen gearchiveerde abonnementen voor deze filters · 0 van N"
- Cron functies (`take_daily_snapshot`, `advance_subscription_renewals`) negeren gearchiveerde rijen
- `countActiveAccountsNow` is strikter dan historische logic — UI badges dalen direct na archive, snapshots blijven historisch

#### Kostenmodellen
- Vijf mutually-exclusive billing models in één dropdown:
  - Vast bedrag (`flat`)
  - Per gebruiker (`per_seat`)
  - Per persoonlijk account (`per_account`)
  - Vaste licentie + per gebruiker (`license_plus_seats`)
  - Op basis van verbruik (`variable`)
- Filter "Alle kostenmodellen" op de Abonnementen-pagina
- `getBillingModel(sub)` afgeleid uit bestaande velden — één bron van waarheid

#### FX-rates
- Nieuwe DB-tabel `exchange_rates` (currency PK + rate + updated_at) met seed USD/GBP/CHF
- RPC `upsert_exchange_rate` — authenticated-only, EUR rate impliciet 1.0
- `take_daily_snapshot()` is FX-aware: `total_cost` en `monthly_equivalent` in EUR, `monthly_equivalent_native` + `fx_rate` per detail bewaard
- JS `backfillSubscriptionSnapshots` idem — historische maanden hebben nu opgeslagen koers
- Wisselkoers-instelling synct naar DB via RPC ipv localStorage (localStorage blijft als snel-pad)

#### Taxonomieën
- Categorie / afdeling hernoemen via Postgres RPC (`rename_subscription_category`, `rename_subscription_department`) — atomair binnen één transactie
- Master + cascade naar subscriptions slagen of falen samen, geen out-of-sync staat meer
- Toast meldt hoeveel abonnementen zijn bijgewerkt

#### UI / UX
- AccountsManager mobile-friendly: op telefoon eigen header-rij met "Account 1/2/3" label + archive-knop rechtsboven
- Modal-grid op desktop blijft `[1fr,140px,180px,140px,auto]`, valt netjes terug naar 1 kolom < 640px
- Subscription-tabel: dotted-underline link "X in archief" in subtitle
- Filter-counts in MultiSelect dropdowns negeren gearchiveerde subs
- Bulk-archive confirm: kleur amber + copy uitlegt dat data bewaard blijft + restore mogelijk is
- Permanent-delete confirm-tekst voor accounts is eerlijker over timing (pas definitief na save)
- DetailPanel verbergt gearchiveerde accounts uit de hoofdlijst (anders rommel na 3 jaar)
- Generieke placeholder "Naam" voor account-eigenaar (geen persoonlijk voorbeeld meer)

#### Foutafhandeling
- `persistAccounts` gooit nu errors per stap (insert/update/delete) ipv stille fail
- `handleSubmit` in modal vangt accounts/snapshot-errors op met try/catch + duidelijke error-toast
- Sub wordt sowieso opgeslagen, gebruiker krijgt advies om opnieuw te openen + controleren bij sync-failure

---

### Supabase

#### Database
- Nieuwe kolom `archived_at` op `subscriptions` en `subscription_accounts` — soft-delete pattern, alleen `NULL` betekent actief
- Nieuwe tabel `subscription_accounts` — multi-account per subscription, met eigen `start_date`, `end_date`, `auto_renew`, `cost`, `archived_at`
- Nieuwe tabel `exchange_rates` — org-wide wisselkoersen, currency als PK
- FK `subscription_accounts.subscription_id ON DELETE CASCADE` — geen orphan accounts bij permanent delete

#### Functies (SECURITY DEFINER + REVOKE/GRANT authenticated)
- `take_daily_snapshot()` — herschreven, account-aware + archive-aware + FX-aware
- `advance_subscription_renewals()` — cycled vervaldatums door op auto-verlenging, skipt archived
- `rename_subscription_category(p_id, p_new_name)` — transactionele rename met cascade
- `rename_subscription_department(p_id, p_new_name)` — idem voor afdelingen
- `upsert_exchange_rate(p_currency, p_rate)` — wisselkoers updaten

#### Cron (pg_cron)
- `0 2 * * *` → `daily-subscription-snapshot` — dagelijkse snapshot van huidige maand (org-wide)
- `30 2 * * *` → `advance-subscription-renewals` — dagelijks om 02:30
- `0 2 * * *` → `update-expired-subscriptions` — ongewijzigd
- `monthly-snapshot` (Edge Function cron) — uitgeschakeld; daily snapshot vervangt deze

---

### Technisch
- Nieuwe gedeelde helper `activeAccountsNow(accounts)` in `costUtils.js` — één bron voor "welke accounts tellen NU mee"
- `countActiveAccountsNow` is nu een wrapper rond `activeAccountsNow`
- Modal preview, DetailPanel en lijst gebruiken allemaal dezelfde actief-definitie — geen 1-account verschillen meer
- `recomputeSubscriptionSnapshots` wordt na elke account-mutatie aangeroepen om historische maanden up-to-date te houden
- `BILLING_MODELS` constanten in `costUtils.js` — single source of truth voor labels en filter-opties

---

## v2.0.0 — April 2026

### Highlights

- **Compleet nieuw dashboard** — stat cards, interactieve kostengrafiek met historische data + prognose, categorie-verdeling, verloopt-binnenkort widget en weinig-gebruikt overzicht
- **Evaluatiepagina** — vervangt de oude reviewpagina; kaartjes per abonnement met gebruikspercentage, notities en sortering op gebruik
- **Rollen & gebruikersbeheer** — admins kunnen gebruikers uitnodigen en rollen (admin/viewer) instellen vanuit Instellingen
- **Historische snapshots** — maandelijkse kostengeschiedenis wordt automatisch bijgehouden en teruggevuld als je een abonnement met een oude startdatum toevoegt
- **Automatische statuswijziging** — verlopen abonnementen worden 's nachts automatisch op 'verlopen' gezet via een geplande taak

---

### Alle wijzigingen

#### Dashboard
- Stat cards: actieve abonnementen, maandkosten, jaarkosten, verouderde evaluaties
- SVG-kostengrafiek met historische lijn en stippellijn voor de prognose
- Tooltip met vaste positie zodat deze nooit achter een container verdwijnt
- Jaar-navigatie met ‹ › pijltjes en schuivend venster van 3 jaar
- Prognose houdt rekening met einddatums en auto-verlenging per abonnement
- Kostenverdeling per categorie (schakelbaar: maand / kwartaal / jaar)
- Widget: abonnementen die binnenkort verlopen (zonder auto-verlenging)
- Widget: abonnementen met laag gebruikspercentage (≤ 30%)

#### Abonnementen
- Tabelweergave met logo, naam, categorie-pill, maandkosten, verlengdatum + countdown
- Klikbare rijen openen een detailpaneel met alle informatie incl. auto-verlenging
- Sortering per kolom (naam, kosten, datum), nulls altijd onderaan
- Consistente kolombreedtes over secties via `table-fixed`

#### Evaluatie *(was: Reviews)*
- Kaartjesweergave per abonnement in responsief grid
- Gebruiksbalk per kaartje met kleurverloop (groen → rood)
- Sortering op meest of minst gebruikt
- Sectieverdeling: opnieuw evalueren (> 4 maanden oud), geëvalueerd, nog niet geëvalueerd
- Archief-tab voor verlopen abonnementen met een bestaande evaluatie
- "Evaluatie toevoegen"-knop altijd zichtbaar: oranje voor nieuwe evaluaties, grijs voor bewerken

#### Gebruikersbeheer
- Overzicht van alle gebruikers met naam, e-mail en rol
- Admin kan rollen aanpassen (eigen rol niet wijzigbaar)
- Gebruikers uitnodigen via e-mail met directe roltoewijzing
- Toegankelijk via Instellingen → Gebruikersbeheer (niet via de navbar)

#### Instellingen
- Compacte lijstweergave voor categorieën en types (verwijderknop zichtbaar bij hover)
- Info-tooltip alleen zichtbaar bij hover op het ⓘ-icoon zelf

#### Notificaties
- Melding bij recent verlopen abonnementen (afgelopen 7 dagen)
- "Momenteel geen notificaties" als er niets te melden is
- Dropdown sluit automatisch bij klik buiten het paneel

#### Snapshots & data
- Dagelijkse snapshot bij openen van de app (maximaal 1× per dag via localStorage)
- Automatisch terugvullen van historische snapshots bij toevoegen of bewerken van een abonnement met een datum in het verleden
- Snapshot-cleanup bij verwijderen van een abonnement

#### Abonnement toevoegen / bewerken
- Nieuw veld **"Prijs per seat"** — checkbox die de kosten vermenigvuldigt met het aantal seats, handig voor per-gebruiker-licenties
- Info-tooltip (ⓘ) toegevoegd naast Categorie en Type met uitleg over het veld

#### Navbar
- Compacter (lagere hoogte)
- Avatar met initialen naast de gebruikersnaam
- Bell-icoon subtiele stijl met rood stipje bij notificaties
- Notificatie-dropdown netter met rounded hoeken en scheidingslijnen
- Uitlog-knop vervangen door icoon met label

#### Detailpaneel abonnement
- Secties in lichtgrijze blokjes voor meer overzicht
- Sluit nu ook met de Escape-toets
- Paneel iets breder (`max-w-lg`)
- Kosten tonen vermenigvuldiging als "Prijs per seat" actief is

#### Dashboard
- Y-as van de kostengrafiek schaalt nu op basis van het maximum over álle jaren — geen sprongen meer bij wisselen van jaar

#### Abonnementen
- "Bekijken →" kolom had te weinig breedte en werd afgeknipt — opgelost

---

### Supabase

#### Database
- Nieuwe tabel `profiles` — slaat gebruikersnaam en rol (admin/viewer) op, gekoppeld aan `auth.users`
- Nieuwe tabel `evaluaties` — gebruikspercentage en notitie per abonnement, bijgehouden per gebruiker
- Nieuwe tabel `monthly_snapshots` — maandelijkse kostengeschiedenis per gebruiker (jaar, maand, totaalkosten + details per abonnement)
- Nieuwe kolom `auto_renew` op `subscriptions` — bepaalt of een abonnement automatisch verlengt
- Nieuwe kolom `cost_per_seat` op `subscriptions` — bepaalt of de kosten per seat berekend worden
- RLS-policy fix op `profiles` UPDATE — recursie opgelost via een `SECURITY DEFINER` functie `is_admin()`

#### Edge Functions
- `invite-user` — admin-only: nodigt een gebruiker uit via e-mail en wijst direct een rol toe
- `update-expired-subscriptions` — controleert dagelijks welke actieve abonnementen verlopen zijn op basis van `end_date` of `renewal_date` en zet de status op 'verlopen'
- `monthly-snapshot` — berekent de totale maandkosten per gebruiker als maandelijks equivalent

#### Cron (pg_cron)
- `0 2 * * *` → `update-expired-subscriptions` draait elke nacht om 02:00
- Maandelijkse trigger → `monthly-snapshot`

---

### Technisch
- `useCurrentUser` hook voor profiel en rol uit Supabase
- `costUtils.js` — `toMonthly` / `toYearly` voor consistente kostenberekeningen
- `snapshotUtils.js` — backfill en cleanup logica voor historische snapshots
- Rol-gebaseerde toegangscontrole (RBAC) toegepast op alle pagina's en componenten
