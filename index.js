const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const chrono = require("chrono-node");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 3000;

if (process.env.GOOGLE_CREDENTIALS) {
  fs.writeFileSync("g-service.json", process.env.GOOGLE_CREDENTIALS);
}

const calendarId = "primary";
const auth = new google.auth.GoogleAuth({
  keyFile: "g-service.json",
  scopes: ["https://www.googleapis.com/auth/calendar"],
});
const calendar = google.calendar({ version: "v3", auth });

const BUSINESS_HOURS = { start: 8, end: 18 };

function getTimeSlot(dateTime) {
  const dt = new Date(dateTime);
  dt.setMinutes(dt.getMinutes() < 30 ? 0 : 30);
  return dt;
}

function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

async function getEventsOnDay(date) {
  const start = new Date(date);
  start.setHours(BUSINESS_HOURS.start, 0, 0, 0);
  const end = new Date(date);
  end.setHours(BUSINESS_HOURS.end, 0, 0, 0);

  const res = await calendar.events.list({
    calendarId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items;
}

function formatDateTime(date) {
  return date.toISOString().slice(0, 16);
}

app.use(bodyParser.json());

app.post("/check_and_book", async (req, res) => {
  try {
    const { name, timePhrase } = req.body;
    const parsedDate = chrono.parseDate(timePhrase);
    if (!parsedDate || !isWeekday(parsedDate)) return res.status(400).send("Invalid or weekend date");

    const slot = getTimeSlot(parsedDate);
    const events = await getEventsOnDay(slot);
    const slotISO = formatDateTime(slot);

    const isFree = !events.find(e => e.start.dateTime.startsWith(slotISO));

    if (!isFree) return res.status(409).send("Slot not available");

    await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `Probetraining – ${name}`,
        start: { dateTime: slot.toISOString() },
        end: { dateTime: new Date(slot.getTime() + 30 * 60000).toISOString() },
      },
    });

    res.send("Booked");
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

app.post("/cancel", async (req, res) => {
  try {
    const { name } = req.body;
    const now = new Date();
    const events = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    const match = events.data.items.find(e => e.summary.includes(name));
    if (!match) return res.status(404).send("Event not found");

    await calendar.events.delete({ calendarId, eventId: match.id });
    res.send("Canceled");
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

app.post("/reschedule", async (req, res) => {
  try {
    const { name, newTime } = req.body;
    const parsedDate = chrono.parseDate(newTime);
    if (!parsedDate || !isWeekday(parsedDate)) return res.status(400).send("Invalid date");

    const slot = getTimeSlot(parsedDate);
    const events = await getEventsOnDay(slot);
    const slotISO = formatDateTime(slot);

    const isFree = !events.find(e => e.start.dateTime.startsWith(slotISO));
    if (!isFree) return res.status(409).send("Slot not available");

    const all = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const match = all.data.items.find(e => e.summary.includes(name));
    if (!match) return res.status(404).send("Event not found");

    await calendar.events.update({
      calendarId,
      eventId: match.id,
      requestBody: {
        summary: match.summary,
        start: { dateTime: slot.toISOString() },
        end: { dateTime: new Date(slot.getTime() + 30 * 60000).toISOString() },
      },
    });

    res.send("Rescheduled");
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

app.listen(port, () => {
  console.log("Server running on port " + port);
});