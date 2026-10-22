# Landing VSL — Asesoría Legionaria 1:1 (Bastián Almaráz)

Landing estática (HTML + CSS + JS, sin build). Tráfico casi todo desde Instagram en celular: **mobile first**.
Objetivo único: que el lead vea el VSL, llene el formulario y, si califica, agende con Bastián. Si no califica, se le ofrece el siguiente paso (Gold Members o El Sistema Legionario).

## Archivos
- `index.html`: estructura y todo el copy.
- `styles.css`: diseño (fondo casi negro, acento rojo/vino, Oswald + Poppins). Gutter de 22 px en móvil.
- `main.js`: formulario, ruteo, Calendly, VSL (Wistia) y tracking. **Todos los links y números editables están en `CONFIG`, arriba del archivo.**
- `assets/`: fotos optimizadas (casos en `assets/casos/`, encuadre 3:4 con `object-position` por foto).
- `integraciones/google-sheets.gs`: Apps Script que guarda cada aplicación en Google Sheets.

## Orden de secciones
Hero (call-out + headline + VSL + stats + credenciales) → formulario → casos → dolor → 3 tipos de coaches → "tu plan estaba hecho para otra vida" → 4 pasos → después (12 semanas) → delegar → qué incluye → filtro no es / sí es para ti → quién soy → FAQ → cierre de dos caminos.

## Ruteo del formulario (`decideRoute` en main.js)
| Respuestas | Ruta |
|---|---|
| Más de $450 USD | `bastian` → Calendly de Bastián |
| $200–450 | `closer` → agenda del closer (si está vacía, la de Bastián) |
| Menos de $200 + ya pagó coach + profesionista/negocio + $100–200 hoy | `excepcion` → igual que closer |
| Menos de $200, $100–200 hoy | `gold_whatsapp` → WhatsApp de Dani con mensaje precargado |
| Menos de $200, $50–100 hoy | `gold` → checkout de Gold en Hotmart |
| Menos de $50 hoy | `programa` → checkout de El Sistema Legionario |
| Menor de `CONFIG.edadMinimaLlamada` (24) | Nunca va a llamada: se rutea por presupuesto |

Las pantallas del paso 2 son `<template>` en `index.html` (`tpl-llamada`, `tpl-gold-whatsapp`, `tpl-gold`, `tpl-programa`).

## Reglas de copy (no negociables)
- Español de México, **tuteo**. Prohibido el voseo ("tenés", "querés", "vos").
- A los clientes de Bastián se les dice **"pacientes"**, nunca "clientes" (salvo cuando se habla de los clientes del propio lead).
- Tono directo, con autoridad, sin hype. "Dirección, no motivación."
- **No inventar** cifras, testimonios, nombres ni credenciales. Lo no confirmado va como `[PENDIENTE: …]` visible (clase `pending`).
- La promesa es **8–12 kg en 12 semanas**. Escasez solo la real: "trabajo con pocos pacientes a la vez", sin número de cupos ni fechas falsas.
- El precio de la asesoría 1:1 **no** se muestra en la landing: se platica en la llamada.
- No mezclar con Legionarios (la marca de ropa).
- Nunca usar la estética de Shadow Ops System.

## Tracking
Pixel de Meta (pendiente de ID, comentado en el `<head>`). Solo los calificados disparan `Lead`. El clic en una oferta dispara `InitiateCheckout` y la cita agendada, `Schedule`. Además se registran `vsl_play` y `vsl_progress` (25/50/75/95) y se pasan UTMs a Calendly y a Hotmart (`src`, `sck=landing_<ruta>`).

## Antes de terminar un cambio
- Revisar en ancho de celular (390 px) que no haya scroll horizontal y que el titular, el VSL y el botón entren en la primera pantalla.
- `node --check main.js`.
