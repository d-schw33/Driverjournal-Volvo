# Körjournal v2 – Vercel + Volvo + Outlook

Fullständig deployment med automatisk token-förnyelse för både Volvo och Microsoft.

---

## Del 1: Microsoft Azure App Registration

1. Gå till https://portal.azure.com → **Azure Active Directory** → **App registrations**
2. Klicka **New registration**
   - Name: `Körjournal`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: `https://DIN-URL.vercel.app/auth/ms/callback`
3. Klicka **Register**
4. Kopiera **Application (client) ID** → detta är `MS_CLIENT_ID`
5. Gå till **Certificates & secrets** → **New client secret** → kopiera värdet → `MS_CLIENT_SECRET`
6. Gå till **API permissions** → **Add permission** → **Microsoft Graph** → **Delegated**
   - Lägg till: `Calendars.Read`, `User.Read`, `offline_access`

---

## Del 2: Volvo Developer Portal

1. Gå till https://developer.volvocars.com → din app
2. Under **Publish**, lägg till redirect URI: `https://DIN-URL.vercel.app/auth/volvo/callback`
3. Notera **Client ID**, **Client Secret** och **VCC API Key**

---

## Del 3: Vercel deployment

### Installera Vercel CLI
```
npm install -g vercel
```

### Driftsätt
```
cd korjournal-v2
vercel
```

### Aktivera Vercel KV
1. Gå till https://vercel.com → ditt projekt → **Storage**
2. Klicka **Create Database** → välj **KV**
3. Koppla till projektet – miljövariablerna `KV_URL` etc. sätts automatiskt

### Sätt miljövariabler
```
vercel env add VOLVO_CLIENT_ID
vercel env add VOLVO_CLIENT_SECRET
vercel env add VOLVO_REDIRECT_URI     # https://DIN-URL.vercel.app/auth/volvo/callback
vercel env add MS_CLIENT_ID
vercel env add MS_CLIENT_SECRET
vercel env add MS_REDIRECT_URI        # https://DIN-URL.vercel.app/auth/ms/callback
```

### Driftsätt med miljövariabler
```
vercel --prod
```

---

## Användning

1. Öppna appen → **Logga in med Volvo ID** → logga in
2. **Logga in med Microsoft** → logga in
3. Klicka **Analysera resor** – resor matchas automatiskt mot kalender
4. Tokens förnyas automatiskt – du behöver aldrig logga in igen

---

## Projektstruktur
```
korjournal-v2/
├── vercel.json
├── api/
│   ├── _utils.js           Session + token refresh helpers
│   ├── me.js               Session status endpoint
│   ├── trips.js            Volvo trips endpoint
│   ├── events.js           Outlook events endpoint
│   └── auth/
│       ├── volvo-login.js
│       ├── volvo-callback.js
│       ├── ms-login.js
│       ├── ms-callback.js
│       └── logout.js
└── public/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── app.js
        ├── api.js
        ├── data.js
        ├── match.js
        ├── ui.js
        └── export.js
```
