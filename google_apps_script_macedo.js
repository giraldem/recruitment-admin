/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SISTEMA DE APROBACIÓN DE RECLUTAMIENTO - MACEDO
 * ═══════════════════════════════════════════════════════════════════════════
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1j3GA0IeS9LheBw72-WwttReRsw4waiBFdrTWhMH8ROQ/edit
 * Última actualización: 2025-12-22
 * Por: Antigravity AI
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. CONFIGURACIÓN GLOBAL
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SPREADSHEET_ID: '1j3GA0IeS9LheBw72-WwttReRsw4waiBFdrTWhMH8ROQ',
  SHEET_NAME: 'Respuestas de formulario 1',
  EVALUADOR_1_EMAIL: 'cotidianoips@gmail.com',
  EVALUADOR_2_EMAIL: 'giraldem@gmail.com',
  RECRUITMENT_WHATSAPP: '573137333094'
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. CONFIGURACIÓN DE COLUMNAS
// ═══════════════════════════════════════════════════════════════════════════

const COL = {
  NAME: 'Full Name',
  EMAIL: 'Email Address',
  EMAIL_ALT: 'correo',
  PHONE: 'Phone',
  POSITIONS: 'positions',
  EXPERIENCE_IDX: 15, // Columna P - "Briefly describe your experience and the tasks you performed"
  ENGLISH_IDX: 20,    // Columna U - "English"
  NATIONALITY: 'Nationality',
  RESUME: 'Resume',
  VIDEO: 'video',
  PHOTO: 'Photo of your Identification Document',
  SELFIE: 'selfie',
  STATUS_EVAL1: 'Evaluator 1 Status',
  STATUS_EVAL2: 'Evaluator 2 Status',
  STATUS_EVAL3: 'Evaluator 3 Status',
  EMAIL_EVAL3: 'Evaluator 3 Email',
  REJECTION_REASON: 'Rejection Reason'
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. TEMA VISUAL
// ═══════════════════════════════════════════════════════════════════════════

const THEME = {
  bg: '#0d1117',
  surface: '#161b22',
  primary: '#7164f0',
  text: '#f0f6fc',
  muted: '#8b949e',
  success: '#238636',
  error: '#da3633',
  border: '#30363d',
  whatsapp: '#25D366'
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica cuántos correos te quedan disponibles hoy
 */
function checkQuota() {
  const remaining = MailApp.getRemainingDailyQuota();
  Logger.log("✓ Correos disponibles hoy: " + remaining);
  return remaining;
}

/**
 * Envío seguro de correo con logging mejorado
 * @returns {boolean} true si se envió exitosamente, false si falló
 */
function safeSendEmail(recipient, subject, htmlBody, senderName) {
  try {
    const quota = MailApp.getRemainingDailyQuota();
    console.log(`━━━ Enviando correo ━━━`);
    console.log(`  Para: ${recipient}`);
    console.log(`  Asunto: ${subject}`);
    console.log(`  Cuota restante: ${quota}`);

    if (quota > 0) {
      GmailApp.sendEmail(recipient, subject, '', {
        htmlBody: htmlBody,
        name: senderName || "Sistema de Reclutamiento"
      });
      console.log(`✓ Correo enviado exitosamente`);
      return true;
    } else {
      console.error(`✗ CUOTA DE CORREO AGOTADA - No se puede enviar a: ${recipient}`);
      console.error(`  Límite diario alcanzado. Intenta mañana o contacta soporte de Google.`);
      return false;
    }
  } catch (e) {
    console.error(`✗ ERROR AL ENVIAR CORREO`);
    console.error(`  Destinatario: ${recipient}`);
    console.error(`  Error: ${e.message}`);
    console.error(`  Stack: ${e.stack}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER: ON FORM SUBMIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Se ejecuta automáticamente cuando se envía el formulario de Google
 */
function onFormSubmit(e) {
  console.log("═══ NUEVO FORMULARIO RECIBIDO ═══");
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

    if (!sheet) {
      console.error(`✗ Hoja no encontrada: ${CONFIG.SHEET_NAME}`);
      return;
    }

    ensureColumns(sheet);

    let row = (e && e.range) ? e.range.getRow() : sheet.getLastRow();
    console.log(`Procesando fila: ${row}`);

    const headers = sheet.getDataRange().getValues()[0];
    const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

    const getVal = (name) => {
      const search = name.toLowerCase();
      const idx = headers.findIndex(h => h.toString().toLowerCase().includes(search));
      return (idx !== -1 && rowData[idx] !== "") ? rowData[idx] : "N/A";
    };

    const candidateData = {
      "Name": getVal(COL.NAME),
      "Email": getVal(COL.EMAIL) !== "N/A" ? getVal(COL.EMAIL) : getVal(COL.EMAIL_ALT),
      "Phone": getVal(COL.PHONE),
      "Position": getVal(COL.POSITIONS),
      "Experience": rowData[COL.EXPERIENCE_IDX] || "N/A",
      "Nationality": getVal(COL.NATIONALITY),
      "English Level": rowData[COL.ENGLISH_IDX] || "N/A",
      "Resume": getVal(COL.RESUME),
      "Video": getVal(COL.VIDEO),
      "Photo": getVal(COL.PHOTO),
      "Selfie": getVal(COL.SELFIE),
      "row": row
    };

    console.log(`Candidato: ${candidateData.Name}`);
    console.log(`Email: ${candidateData.Email}`);

    const webAppUrl = ScriptApp.getService().getUrl().replace('/dev', '/exec');
    const htmlBody = getEmailTemplate('Evaluator 1 - Profile Review', candidateData, webAppUrl, 'eval1');

    const emailSent = safeSendEmail(
      CONFIG.EVALUADOR_1_EMAIL,
      `[RECRUITMENT] New Application: ${candidateData.Name}`,
      htmlBody
    );

    if (emailSent) {
      sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL1)).setValue('Pending');
      console.log("✓ Proceso completado exitosamente");
    } else {
      console.error("✗ Email no enviado - revisar cuota o permisos");
    }

  } catch (error) {
    console.error("═══ ERROR EN onFormSubmit ═══");
    console.error(error.toString());
    console.error(error.stack);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WEB APP: doGet - Maneja clics en botones de correos
// ═══════════════════════════════════════════════════════════════════════════

function doGet(e) {
  console.log("═══ SOLICITUD doGet RECIBIDA ═══");

  const action = e.parameter.action;
  const row = parseInt(e.parameter.row);
  const status = e.parameter.status;

  console.log(`Action: ${action}, Row: ${row}, Status: ${status}`);

  if (!action || isNaN(row)) {
    console.warn("Solicitud inválida - parámetros faltantes");
    return renderMessage("Solicitud inválida. Este enlace debe abrirse desde un correo de notificación.");
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const headers = sheet.getDataRange().getValues()[0];
  const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

  const getHeaderVal = (name) => {
    const idx = headers.findIndex(h => h.toString().toLowerCase().includes(name.toLowerCase()));
    return (idx !== -1 && rowData[idx] !== "") ? rowData[idx] : "N/A";
  };

  const candidate = {
    name: getHeaderVal(COL.NAME),
    email: getHeaderVal(COL.EMAIL) !== "N/A" ? getHeaderVal(COL.EMAIL) : getHeaderVal(COL.EMAIL_ALT),
    row: row
  };

  const fullCandidateData = {
    "Name": candidate.name,
    "Email": candidate.email,
    "Phone": getHeaderVal(COL.PHONE),
    "Position": getHeaderVal(COL.POSITIONS),
    "Experience": rowData[COL.EXPERIENCE_IDX] || "N/A",
    "Nationality": getHeaderVal(COL.NATIONALITY),
    "English Level": rowData[COL.ENGLISH_IDX] || "N/A",
    "Resume": getHeaderVal(COL.RESUME),
    "Video": getHeaderVal(COL.VIDEO),
    "Photo": getHeaderVal(COL.PHOTO),
    "Selfie": getHeaderVal(COL.SELFIE),
    "row": row
  };

  const currentWebAppUrl = ScriptApp.getService().getUrl().replace('/dev', '/exec');

  // ─────────────────────────────────────────────────────────────────────────
  // EVALUADOR 1: Aprobar o Rechazar perfil
  // ─────────────────────────────────────────────────────────────────────────
  if (action === 'eval1') {
    if (status === 'approved') {
      console.log("═══ EVALUADOR 1 - APROBACIÓN ═══");
      console.log(`Candidato: ${candidate.name}`);
      console.log(`Email a enviar a: ${CONFIG.EVALUADOR_2_EMAIL}`);

      sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL1)).setValue('Approved');

      const htmlEval2 = getEmailTemplate('Evaluator 2 - Interview Scheduling', fullCandidateData, currentWebAppUrl, 'eval2');

      console.log("Intentando enviar correo a Evaluador 2...");
      const emailSent = safeSendEmail(
        CONFIG.EVALUADOR_2_EMAIL,
        `[RECRUITMENT] Approved Profile: ${candidate.name}`,
        htmlEval2
      );

      if (emailSent) {
        console.log("✓ Email a Evaluador 2 enviado exitosamente");
        sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL2)).setValue('Pending');
        return renderMessage("✓ Profile Approved Successfully!<br><br>Evaluator 2 has been notified to schedule the interview.");
      } else {
        console.error("✗ FALLO al enviar email a Evaluador 2");
        return renderMessage("⚠ Profile Approved<br><br>ERROR: Could not send email to Evaluator 2. Please check the execution logs.");
      }

    } else if (status === 'rejected') {
      console.log("═══ EVALUADOR 1 - RECHAZO ═══");
      return renderRejectionForm(row, 'eval1', candidate.name, candidate.email, currentWebAppUrl);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVALUADOR 2: Programar o Rechazar
  // ─────────────────────────────────────────────────────────────────────────
  if (action === 'eval2') {
    if (status === 'approved') {
      console.log("═══ EVALUADOR 2 - PROGRAMACIÓN ═══");
      return renderScheduleForm(row, candidate, currentWebAppUrl);
    } else if (status === 'rejected') {
      console.log("═══ EVALUADOR 2 - RECHAZO ═══");
      return renderRejectionForm(row, 'eval2', candidate.name, candidate.email, currentWebAppUrl);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVALUADOR 3: Aprobar o Rechazar
  // ─────────────────────────────────────────────────────────────────────────
  if (action === 'eval3') {
    if (status === 'approved') {
      console.log("═══ EVALUADOR 3 - APROBACIÓN ═══");
      sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL3)).setValue('Approved');
      return renderMessage("✓ Profile approved by Evaluator 3.");
    } else if (status === 'rejected') {
      console.log("═══ EVALUADOR 3 - RECHAZO ═══");
      return renderRejectionForm(row, 'eval3', candidate.name, candidate.email, currentWebAppUrl);
    }
  }

  return renderMessage("Solicitud procesada.");
}

// ═══════════════════════════════════════════════════════════════════════════
// WEB APP: doPost - Procesa formularios de rechazo y programación
// ═══════════════════════════════════════════════════════════════════════════

function doPost(e) {
  console.log("═══ SOLICITUD doPost RECIBIDA ═══");

  const params = e.parameter;
  const action = params.form_action;
  const row = params.row;
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // ─────────────────────────────────────────────────────────────────────────
  // PROCESAR RECHAZO
  // ─────────────────────────────────────────────────────────────────────────
  if (action === 'process_rejection') {
    console.log("═══ PROCESANDO RECHAZO ═══");
    const evalType = params.eval_type;
    const reason = params.reason;
    let colName = (evalType === 'eval1') ? COL.STATUS_EVAL1 : (evalType === 'eval2') ? COL.STATUS_EVAL2 : COL.STATUS_EVAL3;

    console.log(`Evaluador: ${evalType}`);
    console.log(`Candidato: ${params.candidate_name}`);
    console.log(`Razón: ${reason}`);

    sheet.getRange(row, getColumnIndex(sheet, colName)).setValue('Rejected');
    sheet.getRange(row, getColumnIndex(sheet, COL.REJECTION_REASON)).setValue(reason);

    safeSendEmail(
      params.candidate_email,
      "Update on your application",
      `<div style="font-family:sans-serif;padding:20px;"><p>Hello ${params.candidate_name},</p><p>Thank you for your interest in our recruitment process. We have decided not to move forward with your application at this time.</p><p><strong>Reason:</strong> <em>"${reason}"</em></p><p>We wish you the best in your future endeavors.</p><p>Best regards,<br>Recruitment Team</p></div>`,
      "Recruitment Team"
    );

    return renderMessage("✓ Candidate rejected and notified successfully.");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROCESAR PROGRAMACIÓN DE ENTREVISTA
  // ─────────────────────────────────────────────────────────────────────────
  if (action === 'process_schedule') {
    console.log("═══ PROCESANDO PROGRAMACIÓN ═══");
    const dateStr = params.date;
    const timeStr = params.time;
    const link = params.link || "";
    const eval3Email = params.eval3_email;
    const candidateMsg = params.candidate_msg || "";

    console.log(`Candidato: ${params.candidate_name}`);
    console.log(`Fecha: ${dateStr} ${timeStr}`);
    console.log(`Link: ${link}`);

    try {
      const startDateTime = new Date(dateStr.replace(/-/g, '/') + ' ' + timeStr);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60000);

      let guests = `${params.candidate_email}, ${CONFIG.EVALUADOR_1_EMAIL}, ${CONFIG.EVALUADOR_2_EMAIL}`;
      if (eval3Email) guests += `, ${eval3Email}`;

      // ─── Crear evento de calendario ───
      try {
        CalendarApp.getDefaultCalendar().createEvent(
          `Interview: ${params.candidate_name}`,
          startDateTime,
          endDateTime,
          {
            description: `Meeting link: ${link}`,
            guests: guests,
            sendInvites: true
          }
        );
        console.log("✓ Evento de calendario creado");
      } catch (calErr) {
        console.error("✗ Error creando evento de calendario:", calErr.message);
      }

      sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL2)).setValue('Scheduled');
      sheet.getRange(row, getColumnIndex(sheet, COL.REJECTION_REASON)).setValue(`Scheduled: ${dateStr} ${timeStr}`);

      // ─── Obtener datos completos del candidato ───
      const headers = sheet.getDataRange().getValues()[0];
      const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
      const getVal = (name) => {
        const idx = headers.findIndex(h => h.toString().toLowerCase().includes(name.toLowerCase()));
        return (idx !== -1 && rowData[idx] !== "") ? rowData[idx] : "N/A";
      };

      const fullCandidateData = {
        "Name": params.candidate_name,
        "Email": params.candidate_email,
        "Phone": getVal(COL.PHONE),
        "Position": getVal(COL.POSITIONS),
        "Experience": rowData[COL.EXPERIENCE_IDX] || "N/A",
        "Nationality": getVal(COL.NATIONALITY),
        "English Level": rowData[COL.ENGLISH_IDX] || "N/A",
        "Resume": getVal(COL.RESUME),
        "Video": getVal(COL.VIDEO),
        "Photo": getVal(COL.PHOTO),
        "Selfie": getVal(COL.SELFIE),
        "row": row
      };

      const interviewInfo = { date: dateStr, time: timeStr, link: link };

      // ─── Notificar a Evaluador 3 (si existe) con template especial ───
      if (eval3Email) {
        console.log(`Notificando a Evaluador 3: ${eval3Email}`);
        const webAppUrl = ScriptApp.getService().getUrl().replace('/dev', '/exec');

        // Template especial que combina info del candidato + info de la reunión
        const htmlEval3 = getEvaluator3Template(fullCandidateData, interviewInfo, webAppUrl);
        safeSendEmail(eval3Email, `[RECRUITMENT] Assessment & Interview: ${params.candidate_name}`, htmlEval3);

        sheet.getRange(row, getColumnIndex(sheet, COL.EMAIL_EVAL3)).setValue(eval3Email);
        sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL3)).setValue('Pending Assessment');
      }

      // ─── Notificar al candidato ───
      console.log("Enviando invitación al candidato...");
      const candidateHtml = getCandidateInviteTemplate(
        params.candidate_name,
        interviewInfo,
        candidateMsg
      );
      safeSendEmail(
        params.candidate_email,
        `Interview Invitation: ${params.candidate_name}`,
        candidateHtml,
        "Recruitment Selection"
      );

      // ─── Notificar a evaluadores 1 y 2 ───
      const phoneRaw = fullCandidateData.Phone.toString().replace(/\D/g, '');
      let phoneFinal = phoneRaw.length === 10 ? "57" + phoneRaw : phoneRaw;

      const evaluators = [CONFIG.EVALUADOR_1_EMAIL, CONFIG.EVALUADOR_2_EMAIL];

      evaluators.forEach(email => {
        const isEval1 = (email === CONFIG.EVALUADOR_1_EMAIL);
        const notificationHtml = getNotificationTemplate(
          "Confirmed Interview Invitation",
          { Name: params.candidate_name, Position: fullCandidateData.Position, Phone: phoneFinal },
          interviewInfo,
          isEval1
        );
        safeSendEmail(email, `[CONFIRMED] Interview: ${params.candidate_name}`, notificationHtml);
      });

      console.log("✓ Proceso de programación completado");
      return renderMessage("✓ Interview scheduled successfully!<br><br>Notifications have been sent to all parties (subject to email quota).");

    } catch (err) {
      console.error("✗ Error en process_schedule:", err.toString());
      return renderMessage("✗ Error: " + err.toString());
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES DE CORREO
// ═══════════════════════════════════════════════════════════════════════════

function getEmailTemplate(title, data, url, type) {
  let rows = "";
  let photoHtml = "";

  // ─── Foto Selfie del candidato (SOLO SELFIE) ───
  if (data.Selfie && data.Selfie !== "N/A") {
    const selfieId = data.Selfie.match(/[-\w]{25,}/);
    if (selfieId) {
      photoHtml = `<div style="text-align:center; margin-bottom:20px;">
        <img src="https://drive.google.com/uc?export=view&id=${selfieId}" style="width:120px; height:150px; object-fit:cover; border-radius:8px; border:2px solid ${THEME.border};" alt="Candidate Selfie">
        <p style="margin:5px 0 0 0; font-size:0.75rem; color:${THEME.muted};">Selfie</p>
      </div>`;
    }
  }

  // ─── Tabla de información ───
  for (let key in data) {
    if (key !== 'row' && key !== 'Resume' && key !== 'Video' && key !== 'Photo' && key !== 'Selfie' && key !== 'Phone') {
      rows += `<tr><td style="padding:10px;color:${THEME.muted}">${key}</td><td style="color:${THEME.text}">${data[key]}</td></tr>`;
    }
  }

  // ─── Link de WhatsApp personalizado ───
  let waLink = "";
  if (data.Phone && data.Phone !== "N/A") {
    const rawP = data.Phone.toString().replace(/\D/g, '');
    const finalP = rawP.length === 10 ? "57" + rawP : rawP;
    const firstName = data.Name ? data.Name.split(' ')[0] : 'Candidate';
    const waMessage = `Hello ${firstName}, we are contacting you regarding your application in our recruitment process.`;
    const waUrl = `https://wa.me/${finalP}?text=${encodeURIComponent(waMessage)}`;

    waLink = ` | <a href="${waUrl}" target="_blank" style="color:${THEME.whatsapp}; font-weight:bold; text-decoration:none;">WHATSAPP</a>`;
  }

  return `<div style="background:${THEME.bg};padding:25px;font-family:sans-serif;">
    <div style="background:${THEME.surface};border:1px solid ${THEME.border};border-radius:12px;padding:25px;max-width:500px;margin:0 auto;">
      <h2 style="color:${THEME.primary};text-align:center">${title}</h2>
      ${photoHtml}
      <table style="width:100%">${rows}</table>
      <div style="text-align:center;margin:20px 0; font-size: 0.85rem;">
        ${data.Resume ? `<a href="${data.Resume}" style="color:${THEME.primary}; font-weight:bold; text-decoration:none;">RESUME</a> | ` : ''}
        ${data.Video ? `<a href="${data.Video}" style="color:${THEME.primary}; font-weight:bold; text-decoration:none;">VIDEO</a>` : ''}
        ${waLink}
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;">
        <a href="${url}?action=${type}&status=approved&row=${data.row}" 
           style="background:${THEME.primary};color:white;padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;display:block;">
          ${type === 'eval2' ? 'SCHEDULE' : 'APPROVE'}
        </a>
        <a href="${url}?action=${type}&status=rejected&row=${data.row}" 
           style="border:1px solid ${THEME.error};background:transparent;color:${THEME.error};padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;display:block;">
          REJECT
        </a>
      </div>
    </div>
  </div>`;
}

/**
 * Template especial para Evaluador 3: Combina información del candidato + info de la reunión
 */
function getEvaluator3Template(candidateData, interviewInfo, url) {
  let rows = "";
  let photoHtml = "";

  // ─── Foto Selfie del candidato ───
  if (candidateData.Selfie && candidateData.Selfie !== "N/A") {
    const selfieId = candidateData.Selfie.match(/[-\w]{25,}/);
    if (selfieId) {
      photoHtml = `<div style="text-align:center; margin-bottom:20px;">
        <img src="https://drive.google.com/uc?export=view&id=${selfieId}" style="width:120px; height:150px; object-fit:cover; border-radius:8px; border:2px solid ${THEME.border};" alt="Candidate Selfie">
        <p style="margin:5px 0 0 0; font-size:0.75rem; color:${THEME.muted};">Selfie</p>
      </div>`;
    }
  }

  // ─── Tabla de información del candidato ───
  for (let key in candidateData) {
    if (key !== 'row' && key !== 'Resume' && key !== 'Video' && key !== 'Photo' && key !== 'Selfie' && key !== 'Phone') {
      rows += `<tr><td style="padding:10px;color:${THEME.muted}">${key}</td><td style="color:${THEME.text}">${candidateData[key]}</td></tr>`;
    }
  }

  // ─── Link de WhatsApp personalizado ───
  let waLink = "";
  if (candidateData.Phone && candidateData.Phone !== "N/A") {
    const rawP = candidateData.Phone.toString().replace(/\D/g, '');
    const finalP = rawP.length === 10 ? "57" + rawP : rawP;
    const firstName = candidateData.Name ? candidateData.Name.split(' ')[0] : 'Candidate';
    const waMessage = `Hello ${firstName}, we are contacting you regarding your application in our recruitment process.`;
    const waUrl = `https://wa.me/${finalP}?text=${encodeURIComponent(waMessage)}`;

    waLink = ` | <a href="${waUrl}" target="_blank" style="color:${THEME.whatsapp}; font-weight:bold; text-decoration:none;">WHATSAPP</a>`;
  }

  return `<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      .action-btn {
        padding: 12px;
        flex: 1;
        text-align: center;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        text-decoration: none;
        display: inline-block;
        border: none;
        transition: opacity 0.3s;
      }
      .action-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }
      .approve-btn {
        background: ${THEME.primary};
        color: white;
      }
      .reject-btn {
        border: 1px solid ${THEME.error};
        background: transparent;
        color: ${THEME.error};
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0;">
    <div style="background:${THEME.bg};padding:25px;font-family:sans-serif;">
      <div style="background:${THEME.surface};border:1px solid ${THEME.border};border-radius:12px;padding:25px;max-width:500px;margin:0 auto;">
        
        <!-- SECCIÓN 1: INFORMACIÓN DEL CANDIDATO -->
        <h2 style="color:${THEME.primary};text-align:center">Evaluator 3 - Candidate Assessment</h2>
        ${photoHtml}
        <table style="width:100%">${rows}</table>
        <div style="text-align:center;margin:20px 0; font-size: 0.85rem;">
          ${candidateData.Resume ? `<a href="${candidateData.Resume}" style="color:${THEME.primary}; font-weight:bold; text-decoration:none;">RESUME</a> | ` : ''}
          ${candidateData.Video ? `<a href="${candidateData.Video}" style="color:${THEME.primary}; font-weight:bold; text-decoration:none;">VIDEO</a>` : ''}
          ${waLink}
        </div>
        
        <!-- SEPARADOR -->
        <div style="border-top: 2px solid ${THEME.border}; margin: 30px 0;"></div>
        
        <!-- SECCIÓN 2: INFORMACIÓN DE LA ENTREVISTA -->
        <h3 style="color:${THEME.primary};text-align:center;margin-bottom:20px;">Scheduled Interview</h3>
        <div style="background: rgba(113, 100, 240, 0.05); border: 1px solid ${THEME.border}; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <p style="margin: 5px 0; color: ${THEME.text};"><strong>Date:</strong> ${interviewInfo.date}</p>
          <p style="margin: 5px 0; color: ${THEME.text};"><strong>Time:</strong> ${interviewInfo.time}</p>
          <p style="margin: 15px 0 0 0;">
            <a href="${interviewInfo.link}" style="color: ${THEME.primary}; font-weight: bold; text-decoration: none;">
              [ JOIN MEETING ]
            </a>
          </p>
        </div>
        
        <!-- BOTONES DE ACCIÓN -->
        <div style="display:flex;gap:10px;margin-top:20px;">
          <a href="${url}?action=eval3&status=approved&row=${candidateData.row}" 
             style="background:${THEME.primary};color:white;padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;display:block;">
            APPROVE
          </a>
          <a href="${url}?action=eval3&status=rejected&row=${candidateData.row}" 
             style="border:1px solid ${THEME.error};background:transparent;color:${THEME.error};padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;display:block;">
            REJECT
          </a>
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

function getNotificationTemplate(title, data, info, showWhatsApp) {
  let waLink = "";

  if (showWhatsApp && data.Phone) {
    const firstName = data.Name ? data.Name.split(' ')[0] : data.Name;
    const waMsg = `Hello ${firstName}, your interview has been confirmed for ${info.date} at ${info.time}. You can join here: ${info.link}. We look forward to meeting you!`;
    const waUrl = `https://wa.me/${data.Phone}?text=${encodeURIComponent(waMsg)}`;
    waLink = ` | <a href="${waUrl}" target="_blank" style="color:${THEME.whatsapp}; font-weight:bold; text-decoration:none;">WHATSAPP</a>`;
  }

  return `<div style="background-color: ${THEME.bg}; padding: 30px; font-family: 'Segoe UI', Arial, sans-serif; color: ${THEME.text};">
    <div style="max-width: 500px; margin: 0 auto; background-color: ${THEME.surface}; border: 1px solid ${THEME.border}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="padding: 25px; text-align: center; background: linear-gradient(135deg, ${THEME.surface} 0%, #1c2128 100%); border-bottom: 1px solid ${THEME.border};">
        <h2 style="color: ${THEME.primary}; margin: 0; font-size: 1.3rem; letter-spacing: 1px;">${title}</h2>
      </div>
      <div style="padding: 30px; text-align: center;">
        <p style="font-size: 1.1rem; margin-bottom: 20px;">You have confirmed an interview with:</p>
        <h3 style="color: ${THEME.primary}; font-size: 1.5rem; margin: 0 0 5px 0;">${data.Name}</h3>
        <p style="color: ${THEME.muted}; font-size: 1rem; margin: 0 0 25px 0; font-weight: 500;">${data.Position}</p>
        
        <div style="background: rgba(113, 100, 240, 0.05); border: 1px solid ${THEME.border}; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: left;">
          <p style="margin: 5px 0; color: ${THEME.text};"><strong>Date:</strong> ${info.date}</p>
          <p style="margin: 5px 0; color: ${THEME.text};"><strong>Time:</strong> ${info.time}</p>
          <p style="margin: 15px 0 0 0;"><a href="${info.link}" style="color: ${THEME.primary}; font-weight: bold; text-decoration: none;">[ JOIN MEETING ]</a>${waLink}</p>
        </div>
        
        <p style="color: ${THEME.muted}; font-size: 0.9rem; line-height: 1.5;">Please be prepared for the interview. The candidate has been notified via calendar invitation.</p>
        <p style="padding-top: 20px; font-size: 0.8rem; color: ${THEME.muted};">Recruitment Selection System</p>
      </div>
    </div>
  </div>`;
}

function getCandidateInviteTemplate(name, info, extraMsg) {
  const firstName = name ? name.split(' ')[0] : name;

  return `<div style="background-color: ${THEME.bg}; padding: 30px; font-family: 'Segoe UI', Arial, sans-serif; color: ${THEME.text};">
    <div style="max-width: 500px; margin: 0 auto; background-color: ${THEME.surface}; border: 1px solid ${THEME.border}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="padding: 25px; text-align: center; background: linear-gradient(135deg, ${THEME.surface} 0%, #1c2128 100%); border-bottom: 1px solid ${THEME.border};">
        <h2 style="color: ${THEME.primary}; margin: 0; font-size: 1.3rem; letter-spacing: 1px;">INTERVIEW INVITATION</h2>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 1.1rem;">Hello <strong>${firstName}</strong>,</p>
        <p>We are pleased to invite you to an interview for our recruitment process. Below are the details of the meeting:</p>
        
        <div style="background: rgba(113, 100, 240, 0.05); border: 1px solid ${THEME.border}; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <p style="margin: 5px 0; color: ${THEME.text};"><strong>Date:</strong> ${info.date}</p>
          <p style="margin: 5px 0; color: ${THEME.text};"><strong>Time:</strong> ${info.time}</p>
          <p style="margin: 15px 0 0 0;"><a href="${info.link}" style="color: ${THEME.primary}; font-weight: bold; text-decoration: none;">[ JOIN MEETING ]</a></p>
        </div>
        
        ${extraMsg ? `<div style="padding: 15px; border-left: 4px solid ${THEME.primary}; background: rgba(255,255,255,0.02); margin-bottom: 25px;"><p style="margin: 0; font-style: italic; color: ${THEME.text};">${extraMsg}</p></div>` : ''}
        
        <p style="color: ${THEME.muted}; font-size: 0.95rem;">Please ensure you have a stable internet connection and are in a quiet environment. We look forward to meeting you.</p>
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="https://wa.me/${CONFIG.RECRUITMENT_WHATSAPP}?text=${encodeURIComponent(`Hello, I am ${firstName} and I have a question about my scheduled interview.`)}" 
             style="background-color: transparent; border: 1px solid ${THEME.whatsapp}; color: ${THEME.whatsapp}; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 0.85rem; display: inline-block;">
            CONTACT VIA WHATSAPP
          </a>
        </div>

        <p style="border-top: 1px solid ${THEME.border}; padding-top: 20px; margin-top: 30px; font-size: 0.8rem; color: ${THEME.muted}; text-align: center;">Recruitment Team</p>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIOS WEB
// ═══════════════════════════════════════════════════════════════════════════

function renderMessage(msg) {
  return HtmlService.createHtmlOutput(`
    <html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { background: ${THEME.bg}; color: ${THEME.text}; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: ${THEME.surface}; padding: 40px; border-radius: 12px; border: 1px solid ${THEME.border}; text-align: center; max-width: 400px; width: 100%; }
        h2 { color: ${THEME.primary}; margin-top: 0; }
        .btn { background: ${THEME.primary}; border: none; padding: 12px 24px; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 20px; }
        .btn:hover { opacity: 0.9; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Result</h2>
        <p id="msg">${msg}</p>
        <button id="closeBtn" class="btn" onclick="closeWindow()">Close Window</button>
      </div>
      <script>
        function closeWindow() { 
          window.close(); 
          setTimeout(function() { 
            document.getElementById('msg').innerHTML = "${msg}<br><br><b>Please close this tab manually if it didn't close automatically.</b>"; 
            document.getElementById('closeBtn').style.display='none'; 
          }, 600); 
        }
      </script>
    </body></html>
  `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderRejectionForm(row, type, name, email, url) {
  return HtmlService.createHtmlOutput(`
    <html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="background:${THEME.bg};color:${THEME.text};font-family:sans-serif;padding:30px;">
      <div style="background:${THEME.surface};border:1px solid ${THEME.border};border-radius:12px;padding:30px;max-width:450px;margin:0 auto;">
        <h2 style="color:${THEME.error}">Reject ${name}</h2>
        <p style="color:${THEME.muted};">Please provide a reason for rejection. This will be saved and sent to the candidate.</p>
        <form action="${url}" method="post">
          <input type="hidden" name="form_action" value="process_rejection">
          <input type="hidden" name="row" value="${row}">
          <input type="hidden" name="eval_type" value="${type}">
          <input type="hidden" name="candidate_name" value="${name}">
          <input type="hidden" name="candidate_email" value="${email}">
          <textarea name="reason" placeholder="Reason for rejection..." required style="width:100%;height:100px;background:#000;color:white;border:1px solid ${THEME.border};padding:10px;border-radius:5px;font-family:inherit;"></textarea>
          <button type="submit" style="background:${THEME.error};color:white;border:none;width:100%;padding:15px;margin-top:15px;border-radius:8px;font-weight:bold;cursor:pointer;">Confirm Rejection</button>
        </form>
      </div>
    </body></html>
  `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderScheduleForm(row, candidate, url) {
  return HtmlService.createHtmlOutput(`
    <html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="background:${THEME.bg};color:${THEME.text};font-family:sans-serif;padding:30px;">
      <div style="background:${THEME.surface};border:1px solid ${THEME.border};border-radius:12px;padding:30px;max-width:450px;margin:0 auto;">
        <h2 style="color:${THEME.primary}">Schedule Interview</h2>
        <p>Candidate: <strong>${candidate.name}</strong></p>
        <form action="${url}" method="post">
          <input type="hidden" name="form_action" value="process_schedule">
          <input type="hidden" name="row" value="${row}">
          <input type="hidden" name="candidate_name" value="${candidate.name}">
          <input type="hidden" name="candidate_email" value="${candidate.email}">
          
          <div style="margin-bottom:15px">
            <label style="display:block;margin-bottom:5px;color:${THEME.muted}">Interview Date</label>
            <input type="date" name="date" required style="width:100%;padding:10px;background:#000;color:white;border:1px solid ${THEME.border};border-radius:5px;">
          </div>
          
          <div style="margin-bottom:15px">
            <label style="display:block;margin-bottom:5px;color:${THEME.muted}">Interview Time</label>
            <input type="time" name="time" required style="width:100%;padding:10px;background:#000;color:white;border:1px solid ${THEME.border};border-radius:5px;">
          </div>
          
          <div style="margin-bottom:15px">
            <label style="display:block;margin-bottom:5px;color:${THEME.muted}">Evaluator 3 (Optional)</label>
            <input type="email" name="eval3_email" placeholder="evaluator3@example.com" style="width:100%;padding:10px;background:#000;color:white;border:1px solid ${THEME.border};border-radius:5px;">
          </div>
          
          <div style="margin-bottom:15px">
            <label style="display:block;margin-bottom:5px;color:${THEME.muted}">Meeting Link</label>
            <input type="url" name="link" required placeholder="https://meet.google.com/..." style="width:100%;padding:10px;background:#000;color:white;border:1px solid ${THEME.border};border-radius:5px;">
          </div>
          
          <div style="margin-bottom:20px">
            <label style="display:block;margin-bottom:5px;color:${THEME.muted}">Message to Candidate (Optional)</label>
            <textarea name="candidate_msg" placeholder="Tell the candidate something important..." style="width:100%;height:80px;background:#000;color:white;border:1px solid ${THEME.border};padding:10px;border-radius:5px;font-family:inherit;"></textarea>
          </div>
          
          <button type="submit" style="background:${THEME.primary};color:white;border:none;width:100%;padding:15px;border-radius:8px;font-weight:bold;cursor:pointer;">Schedule & Send Invitations</button>
        </form>
      </div>
    </body></html>
  `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

function ensureColumns(sheet) {
  const headers = sheet.getDataRange().getValues()[0];
  const req = [COL.STATUS_EVAL1, COL.STATUS_EVAL2, COL.STATUS_EVAL3, COL.EMAIL_EVAL3, COL.REJECTION_REASON];
  req.forEach(c => {
    if (headers.indexOf(c) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(c);
      console.log(`✓ Columna creada: ${c}`);
    }
  });
}

function getColumnIndex(sheet, name) {
  const h = sheet.getDataRange().getValues()[0];
  const idx = h.indexOf(name);
  return idx !== -1 ? idx + 1 : -1;
}
