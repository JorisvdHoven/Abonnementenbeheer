# Changelog — Flexurity

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

---

### Supabase

#### Database
- Nieuwe tabel `profiles` — slaat gebruikersnaam en rol (admin/viewer) op, gekoppeld aan `auth.users`
- Nieuwe tabel `evaluaties` — gebruikspercentage en notitie per abonnement, bijgehouden per gebruiker
- Nieuwe tabel `monthly_snapshots` — maandelijkse kostengeschiedenis per gebruiker (jaar, maand, totaalkosten + details per abonnement)
- Nieuwe kolom `auto_renew` op `subscriptions` — bepaalt of een abonnement automatisch verlengt
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
