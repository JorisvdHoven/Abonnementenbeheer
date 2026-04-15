# Flexurity AbonnementenBeheer

Hallo! Dit is een complete webapplicatie voor het beheren van abonnementen bij Flexurity. Het is gebouwd met moderne webtechnologieën zoals React (voor de gebruikersinterface), Vite (voor snelle ontwikkeling), Tailwind CSS (voor styling) en Supabase (voor de database en gebruikerslogin).

**Belangrijk:** Wanneer je commando's kopieert uit deze handleiding, kopieer alleen de tekst tussen de ``` tekens. Niet de ``` tekens zelf! Bijvoorbeeld, kopieer `npm install` maar niet ````bash npm install ```.

Met deze app kun je:
- Inloggen met je e-mail en wachtwoord
- Een dashboard zien met statistieken over je abonnementen
- Abonnementen toevoegen, bewerken en verwijderen
- Abonnementen beoordelen met sterren en opmerkingen
- Notificaties krijgen over abonnementen die bijna verlopen

## 🚀 Hoe begin je? Stap-voor-stap handleiding

### Stap 1: Het project downloaden
Als je deze code hebt gekregen via een zip-bestand of repository, pak het uit op je computer. Zorg dat je in de juiste map bent (de map met `package.json` erin).

### Stap 2: Benodigde software installeren
Je hebt Node.js nodig. Ga naar [nodejs.org](https://nodejs.org) en download de LTS versie. Installeer het zoals een normaal programma.

Open een terminal (Command Prompt op Windows, Terminal op Mac) en ga naar de projectmap. Als je al in de map bent waar `package.json` staat, kun je doorgaan naar stap 3.

**Voorbeeld commando (pas het pad aan naar je eigen map):**
```bash
cd "X:\Edwin\Ai Projecten\Abonnementenbeheer\Applicatiemap Abo beheer"
```

**Belangrijk:** Kopieer alleen de tekst tussen de ``` tekens, niet de ``` tekens zelf!

### Stap 3: Dependencies installeren
Typ dit commando in de terminal (zorg dat je in de projectmap bent):
```bash
npm install
```
Dit downloadt alle benodigde bibliotheken. Het kan even duren.

**Opmerking:** Als je al in de map bent waar je de README.md ziet, ben je waarschijnlijk al op de juiste plek. Je hoeft geen `cd` commando te gebruiken. Als je `npm install` al hebt gedaan (je ziet warnings maar geen fouten), ga dan door naar stap 4.

De warnings die je ziet (zoals "deprecated") zijn normaal en geen probleem. Het betekent alleen dat sommige bibliotheken een nieuwere versie hebben, maar de oude versie werkt nog prima.

### Stap 4: Supabase account aanmaken
Supabase is een gratis service voor databases en gebruikersbeheer. Het is als een online opslagplaats voor je data.

1. Ga naar [supabase.com](https://supabase.com) en maak een gratis account aan
2. Klik op "New project" om een nieuw project te maken
3. Geef het een naam, bijvoorbeeld "Flexurity Abos"
4. Kies een database wachtwoord (onthoud dit!)
5. Wacht tot het project klaar is (kan 2-3 minuten duren)

### Stap 5: Database tabellen aanmaken
In Supabase:
1. Ga naar de SQL Editor (links in het menu)
2. Kopieer alle tekst uit het bestand `supabase_setup.sql`
3. Plak het in de SQL Editor
4. Klik op "Run" om de tabellen en regels aan te maken

Dit maakt drie tabellen aan:
- `subscriptions`: voor abonnementen informatie
- `reviews`: voor beoordelingen
- `profiles`: voor gebruikersprofielen

**Belangrijk:** Als je een fout krijgt over "relation does not exist", probeer dan de SQL opnieuw uit te voeren. De volgorde is nu correct.

### Stap 6: API sleutels kopiëren
In Supabase:
1. Ga naar Settings > API (links in het menu)
2. Kopieer de "Project URL" (het adres van je project)
3. Kopieer de "anon public" key (een lange reeks letters en cijfers)

### Stap 7: Environment variabelen instellen
Open het bestand `.env.local` in een teksteditor (bijv. Notepad of VS Code).

Vervang de placeholders:
```
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key
```

Plak hier de URL en key die je net gekopieerd hebt.

**Belangrijk:** Deel dit bestand nooit met anderen! Het bevat geheime informatie.

### Stap 8: De app starten
Typ in de terminal:
```bash
npm run dev
```

De app start op `http://localhost:5173`. Open deze link in je browser.

### Stap 9: Gebruikers aanmaken
Om in te loggen, moet je eerst gebruikers aanmaken in Supabase:
1. Ga naar Authentication > Users in Supabase
2. Klik op "Add user"
3. Voer een e-mail en wachtwoord in
4. Kies rol: "admin" voor volledige toegang, "viewer" voor alleen lezen

Je kunt nu inloggen met deze gegevens!

## 📋 Wat kun je doen in de app?

### Dashboard
- Zie hoeveel actieve abonnementen je hebt
- Bekijk totale maandelijkse kosten
- Zie welke abonnementen binnenkort verlopen
- Grafiek van kosten per categorie
- Voortgangsbalk voor hoeveel abonnementen beoordeeld zijn

### Abonnementen pagina
- Lijst van alle abonnementen
- Zoeken op naam of leverancier
- Filteren op categorie of status
- Klik op een rij om details te bewerken
- Knop "+ Nieuw abonnement" om toe te voegen (alleen admins)

### Reviews pagina
- Klik op een abonnement om het te beoordelen
- Geef sterren (1-5)
- Stel gebruikspercentage in (0-100%)
- Voeg een opmerking toe

### Notificaties
- Bel-icoon rechtsboven toont aantal verlopen abonnementen
- Klik erop voor een lijst
- Rood: verloopt binnen 30 dagen
- Oranje: verloopt binnen 31-60 dagen

## 🏗️ Hoe werkt het technisch?

De app is opgebouwd uit:
- **Frontend**: React componenten voor de gebruikersinterface
- **Backend**: Supabase voor data opslag en authenticatie
- **Styling**: Tailwind CSS voor mooi uiterlijk
- **Routing**: React Router voor navigatie tussen pagina's

Alle data wordt veilig opgeslagen in Supabase met Row Level Security (RLS). Dit betekent dat gebruikers alleen hun eigen data kunnen zien en bewerken.

## 🛠️ Problemen oplossen

### "npm install" werkt niet
- Zorg dat Node.js correct geïnstalleerd is
- Probeer `npm cache clean --force` en daarna opnieuw `npm install`

### Kan niet inloggen
- Controleer of je gebruiker aangemaakt is in Supabase
- Controleer of de environment variabelen correct zijn

### Database fouten
- Controleer of je de SQL uit `supabase_setup.sql` hebt uitgevoerd
- Ga naar Supabase > Table Editor om te zien of de tabellen bestaan

### App start niet
- Controleer of poort 5173 vrij is
- Probeer `npm run dev` opnieuw

## 📊 Database uitleg

### Subscriptions tabel
Slaat informatie op over elk abonnement:
- Naam, leverancier, categorie
- Kosten, aantal gebruikers (seats)
- Start/eind/verlengingsdatum
- Status (actief, verlopen, opgezegd)
- Contractvoorwaarden en notities

### Reviews tabel
Beoordelingen per abonnement:
- Sterrenscore (1-5 sterren)
- Geschat gebruik (0-100%)
- Persoonlijke opmerking

### Profiles tabel
Gebruikersinformatie:
- Naam
- Rol (admin of viewer)

## 🚀 Voor productie

Als je de app online wilt zetten:
1. Typ `npm run build` om een productie versie te maken
2. Upload de `dist` map naar een webhoster (bijv. Vercel, Netlify)
3. Stel de environment variabelen in op de hoster
4. Configureer Supabase voor productie gebruik

## 📞 Hulp nodig?

Als iets niet werkt, check dan:
1. Zijn alle stappen gevolgd?
2. Zijn de environment variabelen correct?
3. Werkt Supabase goed?

Voor technische vragen, bekijk de code in de `src` map. Er staan commentaar bij om uit te leggen wat elke deel doet.

Veel succes met Flexurity AbonnementenBeheer!