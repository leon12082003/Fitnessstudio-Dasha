1. Gehe zu https://console.cloud.google.com/
2. Erstelle ein neues Projekt
3. Aktiviere die "Google Calendar API"
4. Erstelle unter "APIs & Dienste > Anmeldedaten" eine neue Dienstkonto-JSON-Datei
5. Lade die Datei herunter und benenne sie 'credentials.json'
6. Lege sie im selben Ordner wie die index.js
7. Teile deinen Kalender mit der Service-Mail aus der JSON (z. B. xyz@project.iam.gserviceaccount.com)
8. Lade dieses Projekt auf GitHub hoch und deploye es auf https://render.com (Free Tier reicht)
9. Notiere dir die API-URL von Render (z. B. https://your-api.onrender.com)

→ Diese URL wird dann in Dasha für Webhooks verwendet.