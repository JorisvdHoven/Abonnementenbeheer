# Abonnementenbeheer — werkafspraken

## Branche-workflow

**Nieuwe features altijd eerst op `beta`-branch.** Niet direct op `main`.

```bash
git checkout beta            # zorg dat je op beta staat voordat je begint
# ...wijzigingen + commit...
git push origin beta
git push personal beta
```

`main` is productie-stabiel. Pas wanneer een feature is uitgetest op beta
mergen naar main (via PR of `git checkout main && git merge beta`).

Dev-server (`npm run dev` op localhost) draait standaard op de checked-out
branch — dus checkout `beta` eerst.

## Remotes

- `origin` / `flexuritybv` → https://github.com/Flexuritybv/Abonnementenbeheer (productie)
- `personal` → https://github.com/JorisvdHoven/Abonnementenbeheer (persoonlijke kopie)

Push altijd naar zowel `origin` als `personal`.

## Git-identiteit (belangrijk voor deploys)

Commit altijd met een account dat lid is van het Vercel-team *flexurity's projects*:

```bash
git config user.name "JorisvdHoven"
git config user.email "stage@flexurity.nl"
```

Vercel weigert deployments van commits waarvan de GitHub-auteur geen teamlid is:
de deployment krijgt status `BLOCKED` en er verschijnt nooit een build. De push
naar GitHub slaagt gewoon, dus je merkt het alleen aan het uitblijven van een
nieuwe versie. Dit is eerder gebeurd met de accounts `Joris-vdh` (oud persoonlijk
account) en `EdwinvanAlmkerk`.

Controleer bij twijfel met `git log -1 --format='%an <%ae>'` vóórdat je pusht.

## Stack

- React + Vite + Tailwind
- Supabase (Postgres + Edge Functions + pg_cron)
- Modern Linear/Vercel-stijl UI

## Bekende patronen

- Soft-delete via `archived_at` kolom (subscriptions + subscription_accounts)
- `getEntityLabels(sub)` helper voor account/kenteken-label switching (parking model)
- `effectiveAutoRenew(sub)` voor per_account/parking subs — kijkt naar account-niveau
- `deriveRenewalDate(sub)` voor afgeleide vervaldatums uit start + periode
