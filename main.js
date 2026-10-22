/* ==========================================================
   Landing Asesoría Legionaria 1:1
   - Formulario con ruteo: llamada (Bastián / closer) o downsell (Gold / Sistema)
   - Cada aplicación se guarda en Google Sheets (Apps Script), califique o no
   - VSL en Wistia: play y % visto
   - Eventos: vsl_play, vsl_progress, form_submit, cta_click, offer_click, call_booked
   ========================================================== */

const CONFIG = {
  // VSL en Wistia (https://esafb007.wistia.com/s/zis7ucelqpw0vbz)
  vslId: "pqjxn17x75",

  // Agendas (Calendly). Mientras no haya closer, su ruta usa la agenda de Bastián.
  agendaBastian: "https://calendly.com/legionarioselite/asesoria--personalizada-bastian-almaraz",
  agendaCloser: "",

  // Downsells. [PENDIENTE] links de Hotmart y número de Dani (solo dígitos, con lada: 5215512345678)
  checkoutGold: "",
  checkoutPrograma: "",
  whatsappDani: "",

  // [PENDIENTE] URL del Apps Script que guarda cada aplicación en Google Sheets (ver integraciones/).
  formEndpoint: "",

  // Menores de esta edad no van a llamada (Calendly de Bastián: solo mayores de 24).
  edadMinimaLlamada: 24,
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const PERFIL_ALTO = new Set(["profesionista", "negocio"]);
const RUTAS_LLAMADA = new Set(["bastian", "closer", "excepcion"]);

function track(event, data = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
  if (typeof window.fbq !== "function") return;
  // Solo los calificados cuentan como Lead para que Meta optimice hacia ellos.
  if (event === "form_submit" && RUTAS_LLAMADA.has(data.ruta)) window.fbq("track", "Lead", data);
  else if (event === "offer_click") window.fbq("track", "InitiateCheckout", data);
  else if (event === "call_booked") window.fbq("track", "Schedule", data);
  else window.fbq("trackCustom", event, data);
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

/* ---------- Ruteo ---------- */
// Devuelve: "bastian" | "closer" | "excepcion" | "gold_whatsapp" | "gold" | "programa"
function decideRoute(d) {
  const puedeLlamada = Number(d.edad) >= CONFIG.edadMinimaLlamada;

  if (puedeLlamada) {
    if (d.inversion === "450+") return "bastian";
    if (d.inversion === "200-450") return "closer";
    // Excepción (caso Daniel): declara menos de $200 pero ya pagó coach, tiene perfil
    // profesional y puede poner $100–200 hoy → vale la pena una llamada.
    if (d.coach_previo === "si" && PERFIL_ALTO.has(d.ocupacion) && d.inversion_hoy === "100-200") {
      return "excepcion";
    }
  }

  // Menor de la edad mínima pero con presupuesto: que lo atienda Dani.
  if (d.inversion !== "0-199") return "gold_whatsapp";
  if (d.inversion_hoy === "100-200") return "gold_whatsapp";
  if (d.inversion_hoy === "50-100") return "gold";
  return "programa";
}

function agendaFor(route) {
  if (route === "bastian") return CONFIG.agendaBastian;
  return CONFIG.agendaCloser || CONFIG.agendaBastian;
}

/* ---------- Formulario ---------- */
function validate(form) {
  let ok = true;
  form.querySelectorAll(".field").forEach((field) => {
    if (field.hidden) return;
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

function toggleInversionHoy(form) {
  const field = document.getElementById("field-hoy");
  const show = form.querySelector('input[name="inversion"]:checked')?.value === "0-199";
  field.hidden = !show;
  if (!show) field.querySelectorAll("input").forEach((i) => { i.checked = false; });
}

function saveApplication(data) {
  if (!CONFIG.formEndpoint) return;
  // text/plain + no-cors: Apps Script lo recibe sin preflight de CORS.
  fetch(CONFIG.formEndpoint, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data),
  }).catch((err) => console.error("No se pudo guardar la aplicación", err));
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

/* ---------- Resultado por ruta ---------- */
function withSource(url, data) {
  if (!url) return "";
  const u = new URL(url);
  // Hotmart registra el origen de la venta con src / sck
  if (data.utm_source) u.searchParams.set("src", data.utm_source);
  u.searchParams.set("sck", `landing_${data.ruta}`);
  return u.toString();
}

function whatsappLink(data) {
  if (!CONFIG.whatsappDani) return "";
  const text = [
    `Hola Dani, soy ${data.nombre}. Vengo de la página de Bastián y quiero empezar con Gold Members.`,
    `Edad: ${data.edad} · ${data.ubicacion}`,
    `Objetivo: ${data.objetivo}`,
  ].join("\n");
  return `https://wa.me/${CONFIG.whatsappDani}?text=${encodeURIComponent(text)}`;
}

function setOfferLink(el, href, data) {
  if (!href) {
    el.removeAttribute("href");
    el.classList.add("is-pending");
    el.insertAdjacentHTML("afterend", '<p class="micro center"><span class="pending">[PENDIENTE: link en CONFIG de main.js]</span></p>');
    return;
  }
  el.href = href;
  el.addEventListener("click", () => track("offer_click", { ruta: data.ruta, oferta: el.dataset.offer }));
}

function loadCalendly() {
  if (window.Calendly) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://assets.calendly.com/assets/external/widget.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function mountCalendly(container, url, data) {
  loadCalendly()
    .then(() => {
      window.Calendly.initInlineWidget({
        url: `${url}?hide_gdpr_banner=1`,
        parentElement: container,
        prefill: { name: data.nombre, email: data.email },
        utm: {
          utmSource: data.utm_source,
          utmMedium: data.utm_medium,
          utmCampaign: data.utm_campaign,
          utmContent: data.utm_content,
          utmTerm: data.utm_term,
        },
      });
    })
    .catch(() => {
      container.innerHTML = `<p class="form-note center">No se pudo cargar el calendario. <a href="${url}" target="_blank" rel="noopener">Ábrelo aquí</a>.</p>`;
    });
}

function renderResult(data) {
  const route = data.ruta;
  const tplId = RUTAS_LLAMADA.has(route) ? "tpl-llamada" : `tpl-${route.replace("_", "-")}`;
  const result = document.getElementById("result");
  result.replaceChildren(document.getElementById(tplId).content.cloneNode(true));
  result.querySelectorAll("[data-nombre]").forEach((el) => {
    el.textContent = data.nombre.split(" ")[0];
  });

  if (RUTAS_LLAMADA.has(route)) {
    const url = agendaFor(route);
    result.querySelector("[data-agenda-link]").href = url;
    mountCalendly(result.querySelector("#calendar"), url, data);
    return;
  }

  const link = {
    gold_whatsapp: whatsappLink(data),
    gold: withSource(CONFIG.checkoutGold, data),
    programa: withSource(CONFIG.checkoutPrograma, data),
  }[route];
  setOfferLink(result.querySelector("[data-offer]"), link, data);
}

function initForm() {
  const form = document.getElementById("apply-form");
  if (!form) return;
  const errorEl = form.querySelector(".form-error");

  form.addEventListener("change", (e) => {
    const field = e.target.closest(".field");
    if (field) field.classList.remove("is-invalid");
    if (e.target.name === "inversion") toggleInversionHoy(form);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate(form)) {
      errorEl.hidden = false;
      form.querySelector(".is-invalid input, .is-invalid select")?.focus();
      return;
    }
    errorEl.hidden = true;

    const data = Object.fromEntries(new FormData(form).entries());
    data.inversion_hoy = data.inversion_hoy || "";
    data.ruta = decideRoute(data);
    data.fecha = new Date().toISOString();
    data.pagina = window.location.href.split("?")[0];

    track("form_submit", { ruta: data.ruta, inversion: data.inversion, inversion_hoy: data.inversion_hoy });
    saveApplication(data);
    renderResult(data);
    goToStep(2);
  });

  window.addEventListener("message", (e) => {
    if (e.origin !== "https://calendly.com" || !e.data || typeof e.data.event !== "string") return;
    if (e.data.event === "calendly.event_scheduled") track("call_booked");
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
