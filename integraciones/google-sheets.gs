/**
 * Guarda cada aplicación de la landing en una hoja de Google Sheets.
 *
 * Instalación (5 min):
 * 1. Crea una hoja de Google Sheets (p. ej. "Aplicaciones landing Bastián").
 * 2. Extensiones → Apps Script → pega este archivo completo → Guardar.
 * 3. Implementar → Nueva implementación → Tipo: Aplicación web.
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier usuario
 * 4. Copia la URL que termina en /exec y pégala en CONFIG.formEndpoint (main.js).
 *
 * Cada fila trae la ruta asignada, así se puede filtrar por rango
 * y cruzar con llamadas, ventas y cash collected.
 */

const SHEET_NAME = "Aplicaciones";
const COLUMNS = [
  "fecha", "ruta", "nombre", "whatsapp", "email", "edad", "ubicacion", "ocupacion",
  "objetivo", "coach_previo", "inversion", "inversion_hoy", "compromiso",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "pagina",
  // Columnas para llenar a mano después de la llamada
  "agendo", "asistio", "compro", "producto", "cash_collected",
];

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = getSheet_();
  sheet.appendRow(COLUMNS.map((key) => data[key] || ""));
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
