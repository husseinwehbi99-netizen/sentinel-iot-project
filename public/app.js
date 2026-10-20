const stream = document.getElementById("stream");
const tableBody = document.getElementById("tableBody");
const search = document.getElementById("search");
const selected = new Map();
let allEvents = [];
let totalEventCount = 0;
let selectedId = null;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function time(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
}
function render() {
  const q = search.value.trim().toLowerCase();
  const shown = allEvents.filter(e => [e.eventType,e.source,e.protocol,e.message,e.risk].join(" ").toLowerCase().includes(q));
  document.getElementById("eventCount").textContent = totalEventCount;
  document.getElementById("highCount").textContent = allEvents.filter(e => e.risk === "High").length;
  document.getElementById("connectionCount").textContent = allEvents.filter(e => /connect|session|login/i.test(e.eventType)).length;
  document.getElementById("recordCount").textContent = `${totalEventCount} records`;
  document.getElementById("lastUpdated").textContent = new Date().toLocaleTimeString();
  document.getElementById("empty").style.display = shown.length ? "none" : "block";
  tableBody.innerHTML = shown.map(e => `<tr data-id="${escapeHTML(e.id)}"><td>${escapeHTML(time(e.timestamp))}</td><td>${escapeHTML(e.eventType)}<br><small>${escapeHTML(e.message)}</small></td><td>${escapeHTML(e.source)}</td><td>${escapeHTML(e.protocol)}</td><td><span class="risk ${escapeHTML(e.risk)}">${escapeHTML(e.risk)}</span></td></tr>`).join("");
  const recent = shown.slice(0, 20);
  stream.innerHTML = recent.length ? recent.map(e => `<div class="stream-item ${selectedId===e.id?"selected":""}" data-id="${escapeHTML(e.id)}"><div class="stream-icon ${escapeHTML(e.risk.toLowerCase())}">${e.risk==="High"?"⚑":e.risk==="Medium"?"⌁":"✓"}</div><div class="stream-copy"><b>${escapeHTML(e.eventType)}</b><small>${escapeHTML(e.message)}<br>Source ${escapeHTML(e.source)} · ${escapeHTML(e.protocol)}</small></div><span class="stream-time">${escapeHTML(new Date(e.timestamp).toLocaleTimeString())}</span></div>`).join("") : `<div class="placeholder">Waiting for lab events…<small>Generate a connection to your own local lab to populate this feed.</small></div>`;
  document.querySelectorAll("[data-id]").forEach(el => el.addEventListener("click", () => showDetails(el.dataset.id)));
  if (selectedId && allEvents.some(e => e.id === selectedId)) showDetails(selectedId);
}
function showDetails(id) {
  const e = allEvents.find(item => item.id === id);
  if (!e) return;
  selectedId = id;
  document.getElementById("details").className = "";
  document.getElementById("details").innerHTML = `<div class="detail-list">
    <div class="detail-row"><span>Event type</span><span>${escapeHTML(e.eventType)}</span></div>
    <div class="detail-row"><span>Timestamp</span><span>${escapeHTML(time(e.timestamp))}</span></div>
    <div class="detail-row"><span>Source (masked)</span><span>${escapeHTML(e.source)}</span></div>
    <div class="detail-row"><span>Protocol</span><span>${escapeHTML(e.protocol)}</span></div>
    <div class="detail-row"><span>Risk label</span><span class="risk ${escapeHTML(e.risk)}">${escapeHTML(e.risk)}</span></div>
    <div class="detail-row"><span>Recorded message</span><span>${escapeHTML(e.message)}</span></div>
  </div>`;
  renderSelection();
}
function renderSelection() {
  document.querySelectorAll(".stream-item").forEach(el => el.classList.toggle("selected", el.dataset.id === selectedId));
}
async function loadEvents() {
  try {
    const response = await fetch("/api/events", {cache:"no-store"});
    if (!response.ok) throw new Error("API unavailable");
    const data = await response.json();
    allEvents = Array.isArray(data.events) ? data.events : [];
    totalEventCount = Number(data.count) || allEvents.length;
    document.getElementById("healthText").textContent = "API CONNECTED";
    document.querySelector(".connection").classList.add("online");
    render();
  } catch (_error) {
    document.getElementById("healthText").textContent = "API OFFLINE";
    document.querySelector(".connection").classList.remove("online");
  }
}
search.addEventListener("input", render);
document.getElementById("refreshBtn").addEventListener("click", loadEvents);
loadEvents();
setInterval(loadEvents, 5000);
