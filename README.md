# SENTINEL Live Lab — AP CSP Project

This version uses a real web server and can display genuine event records from a Cowrie honeypot running in your own controlled lab. **Do not expose the honeypot service to the public internet for this school project.** The dashboard may be hosted publicly; the honeypot should remain private and isolated. Have your teacher or a knowledgeable adult supervise any lab setup.

## What this package does

- `server.js`: Express web server and authenticated ingestion endpoint.
- `public/`: hosted dashboard that refreshes from the API every five seconds.
- `bridge.py`: local bridge that tails Cowrie JSONL logs and uploads only selected metadata over HTTPS.
- Public dashboard masks source IP addresses and does not show raw Cowrie logs or credentials.
- Events are held in server memory for this starter version. A restart clears them.

## Step 1 — Run the website locally

Install Node.js LTS, then open this folder in VS Code's terminal:

```bash
npm install
```

Set an ingest token in your terminal (make up a long random value and keep it private):

macOS/Linux:
```bash
export INGEST_TOKEN='replace-with-a-long-random-secret'
npm start
```

Windows PowerShell:
```powershell
$env:INGEST_TOKEN='replace-with-a-long-random-secret'
npm start
```

Open `http://localhost:10000`. The dashboard should show API CONNECTED and an empty event list until events arrive.

## Step 2 — Create a controlled local honeypot lab

Cowrie is a defensive SSH/Telnet honeypot with JSON event logs. Follow its official installation documentation and use the supported Docker setup only in a local lab. Bind its listening port to loopback (127.0.0.1) rather than all network interfaces, and do not configure router port forwarding or a public listener. The Cowrie docs describe JSON logs under its log directory; locate the actual `cowrie.json` file created by your install.

Make only an authorized test connection from your own computer to your own local lab. Do not attempt connections to third-party systems. Because the port is loopback-only, it should not accept connections from the public internet.

Official docs:
- Cowrie install and log files: https://docs.cowrie.org/en/stable/README.html
- Cowrie event fields: https://docs.cowrie.org/en/latest/OUTPUT.html

## Step 3 — Host the dashboard

A straightforward option is Render or another Node.js host. Push this project to a private Git repository, then create a Node web service using:
- Build command: `npm install`
- Start command: `npm start`
- Environment variable: `INGEST_TOKEN` = the same long secret you use in the bridge

Use HTTPS. Do not put the secret into `public/app.js`, HTML, CSS, a public repository, screenshots, or your school presentation. See https://render.com/docs/web-services and https://render.com/docs/configure-environment-variables.

## Step 4 — Run the local bridge

Keep the honeypot private on your own machine. Find the actual path to Cowrie's JSON log file. In a second terminal, set these variables and run the bridge:

macOS/Linux:
```bash
export SENTINEL_URL='https://YOUR-DASHBOARD.onrender.com'
export SENTINEL_INGEST_TOKEN='same-long-secret-as-INGEST_TOKEN'
export COWRIE_JSON_LOG='/actual/path/to/cowrie.json'
python3 bridge.py
```

Windows PowerShell:
```powershell
$env:SENTINEL_URL='https://YOUR-DASHBOARD.onrender.com'
$env:SENTINEL_INGEST_TOKEN='same-long-secret-as-INGEST_TOKEN'
$env:COWRIE_JSON_LOG='C:\actual\path\to\cowrie.json'
python bridge.py
```

Use the real path from your Cowrie install. The bridge starts at the end of the log so it doesn't upload old records. Make an authorized local test connection and the new event should appear on the hosted dashboard.

## Security checklist

- Do not publish the honeypot's SSH/Telnet port.
- Do not disable your firewall or set router port forwarding for this project.
- Keep the ingestion token private and use HTTPS.
- The server masks source IPs on the public dashboard.
- Don't collect or publish credentials, shell transcripts, uploaded files, or other sensitive data.
- Use only your own lab and test devices with teacher/adult supervision.
- The dashboard is an educational display; its risk labels are simple keyword rules and are not professional threat intelligence.

## AP CSP concepts you can explain

- **Input:** Cowrie emits log events; the bridge reads each JSON line.
- **List / data abstraction:** the server stores normalized event objects in the `events` array.
- **Procedure with parameters:** `classify(eventId, message)` processes event values and returns a risk label.
- **Selection:** `if` statements classify event types.
- **Iteration:** the bridge loops over log lines; the dashboard loops over event records to render rows.
- **Output:** live metrics, event stream, details panel, and searchable event table.
- **Testing:** API health, valid/invalid token, test connection event, search, and mobile layout.

## Troubleshooting

- **API offline:** check that the server is running and visit `/api/health`.
- **No events:** confirm the Cowrie log path, make a new authorized local test connection, and check the bridge terminal.
- **401 Unauthorized:** the bridge token and hosted `INGEST_TOKEN` must match exactly.
- **Old events only:** the bridge intentionally skips existing lines when started; generate a new event after starting it.
- **Hosted events disappear after restart:** expected in this starter because it uses in-memory storage; a persistent database is a later improvement.
