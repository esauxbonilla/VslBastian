/* ==========================================================
   Landing Asesoría Legionaria 1:1
   - UTMs → campos ocultos
   - Ruteo por inversión: < $400 USD → closer, ≥ $400 → Bastián
   - Eventos: vsl_play, form_submit, cta_click, call_booked (Meta Pixel / dataLayer)
   ========================================================== */

const CONFIG = {
  // VSL en Wistia (https://esafb007.wistia.com/s/zis7ucelqpw0vbz)
  vslId: "pqjxn17x75",
  // [PENDIENTE] URLs de agenda (Calendly o iClosed). Se embeben en el paso 2.
  agendaBastian: "",
  agendaCloser: "",
  // [PENDIENTE] Endpoint que recibe la aplicación (webhook de Zapier/Make/CRM). Vacío = no se envía.
  formEndpoint: "",
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const HIGH_TICKET = new Set(["400-799", "800+"]);

function track(event, data = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
  if (typeof window.fbq === "function") {
    const standard = { form_submit: "Lead", call_booked: "Schedule" };
    if (standard[event]) window.fbq("track", standard[event], data);
    else window.fbq("trackCustom", event, data);
  }
}

/* ---------- UTMs ---------- */
function readStoredUtms() {
  try {
    return JSON.parse(sessionStorage.getItem("utms") || "null") || {};
  } catch (_) {
    return {};
  }
}

function storeUtms(utms) {
  try {
    sessionStorage.setItem("utms", JSON.stringify(utms));
  } catch (_) {
    /* sin storage: los UTMs igual viajan en la URL */
  }
}

function captureUtms() {
  const params = new URLSearchParams(window.location.search);
  const stored = readStoredUtms();
  const utms = {};
  UTM_KEYS.forEach((key) => {
    utms[key] = params.get(key) || stored[key] || "";
    const input = document.querySelector(`#apply-form input[name="${key}"]`);
    if (input) input.value = utms[key];
  });
  storeUtms(utms);
}

/* ---------- Formulario ---------- */
function validate(form) {
  let ok = true;
  form.querySelectorAll(".field").forEach((field) => {
    const inputs = field.querySelectorAll("input, select");
    if (!inputs.length) return;
    const first = inputs[0];
    const valid = first.type === "radio"
      ? [...inputs].some((i) => i.checked)
      : first.checkValidity() && first.value.trim() !== "";
    field.classList.toggle("is-invalid", !valid);
    if (!valid) ok = false;
  });
  return ok;
}

function buildCalendarUrl(base, data) {
  if (!base) return "";
  const url = new URL(base);
  // Prefill compatible con Calendly (name/email) + UTMs
  url.searchParams.set("name", data.nombre || "");
  url.searchParams.set("email", data.email || "");
  UTM_KEYS.forEach((key) => {
    if (data[key]) url.searchParams.set(key, data[key]);
  });
  return url.toString();
}

function goToStep(step) {
  document.querySelectorAll("[data-step]").forEach((el) => {
    el.hidden = el.dataset.step !== String(step);
  });
  document.querySelectorAll("[data-step-indicator]").forEach((el) => {
    el.classList.toggle("is-active", Number(el.dataset.stepIndicator) <= step);
  });
  document.getElementById("aplicar").scrollIntoView({ behavior: "smooth", block: "start" });
}

function initForm() {
  const form = document.getElementById("apply-form");
  if (!form) return;
  const errorEl = form.querySelector(".form-error");

  form.addEventListener("change", (e) => {
    const field = e.target.closest(".field");
    if (field) field.classList.remove("is-invalid");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate(form)) {
      errorEl.hidden = false;
      form.querySelector(".is-invalid input, .is-invalid select")?.focus();
      return;
    }
    errorEl.hidden = true;

    const data = Object.fromEntries(new FormData(form).entries());
    const route = HIGH_TICKET.has(data.inversion) ? "bastian" : "closer";
    data.ruta = route;

    track("form_submit", { inversion: data.inversion, ruta: route });

    if (CONFIG.formEndpoint) {
      try {
        await fetch(CONFIG.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.error("No se pudo enviar la aplicación", err);
      }
    }

    const base = route === "bastian" ? CONFIG.agendaBastian : CONFIG.agendaCloser;
    const calendarUrl = buildCalendarUrl(base, data);

    if (calendarUrl) {
      const iframe = document.createElement("iframe");
      iframe.src = calendarUrl;
      iframe.title = "Agenda tu consulta";
      iframe.loading = "lazy";
      document.getElementById("calendar").replaceChildren(iframe);
    } else {
      document.getElementById("route-label").textContent =
        `Ruta asignada: ${route === "bastian" ? "agenda de Bastián" : "agenda del closer"}`;
    }

    goToStep(2);
  });

  // Calendly avisa cuando se agenda (postMessage). iClosed: [PENDIENTE] confirmar evento.
  window.addEventListener("message", (e) => {
    if (e.data && e.data.event === "calendly.event_scheduled") track("call_booked");
  });
}

/* ---------- VSL ---------- */
const VSL_MILESTONES = [25, 50, 75, 95];

function initVsl() {
  const sent = new Set();
  window._wq = window._wq || [];
  window._wq.push({
    id: CONFIG.vslId,
    onReady(video) {
      video.bind("play", () => {
        if (sent.has("play")) return;
        sent.add("play");
        track("vsl_play");
      });
      video.bind("percentwatchedchanged", (percent) => {
        VSL_MILESTONES.forEach((milestone) => {
          if (percent * 100 >= milestone && !sent.has(milestone)) {
            sent.add(milestone);
            track("vsl_progress", { percent: milestone });
          }
        });
      });
    },
  });
}

/* ---------- CTAs ---------- */
function initCtas() {
  document.querySelectorAll("[data-track]").forEach((el) => {
    el.addEventListener("click", () => track("cta_click", { cta: el.dataset.track }));
  });
}

captureUtms();
initForm();
initVsl();
initCtas();
