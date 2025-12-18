// 1. CONFIGURACIÓN DE CONEXIÓN Y DESTINATARIOS
const CONFIG = {
  SPREADSHEET_ID: '1j3GA0IeS9LheBw72-WwttReRsw4waiBFdrTWhMH8ROQ',
  SHEET_NAME: 'Respuestas de formulario 1',
  EVALUADOR_1_EMAIL: 'cotidianoips@gmail.com',
  EVALUADOR_2_EMAIL: 'giraldem@gmail.com',
  RECRUITMENT_WHATSAPP: '573137333094'
};

// 2. CONFIGURACIÓN DE COLUMNAS (Nombres exactos o palabras clave en el Excel)
const COL = {
  NAME: 'Full Name',
  EMAIL: 'Email Address',
  EMAIL_ALT: 'correo', // Alternativo para formularios antiguos
  PHONE: 'Phone',
  POSITIONS: 'positions',
  EXPERIENCE_IDX: 14, // Índice 14 (Columna O)
  ENGLISH_IDX: 19,    // Índice 19 (Columna T)
  NATIONALITY: 'Nationality',
  RESUME: 'Resume',
  VIDEO: 'video',
  PHOTO: 'photo',
  STATUS_EVAL1: 'Evaluator 1 Status',
  STATUS_EVAL2: 'Evaluator 2 Status',
  STATUS_EVAL3: 'Evaluator 3 Status',
  EMAIL_EVAL3: 'Evaluator 3 Email',
  REJECTION_REASON: 'Rejection Reason'
};

// 3. ESTILOS VISUALES (TEMA OSCURO PREMIUM)
const THEME = {
  bg: '#0d1117',
  surface: '#161b22',
  primary: '#7164f0',
  text: '#f0f6fc',
  muted: '#8b949e',
  success: '#238636',
  error: '#da3633',
  border: '#30363d'
};

/**
 * FUNCIÓN DE UTILIDAD: Límite de Correos
 * Úsala manualmente para ver cuántos envíos te quedan antes del error.
 */
function checkQuota() {
  const remaining = MailApp.getRemainingDailyQuota();
  Logger.log("Te quedan " + remaining + " correos disponibles por hoy.");
  return remaining;
}

/**
 * FUNCIÓN DE UTILIDAD: Envío Seguro de Correo
 * Evita que el programa se detenga si Google bloquea el envío por cuota.
 */
function safeSendEmail(recipient, subject, htmlBody, senderName) {
  try {
    if (MailApp.getRemainingDailyQuota() > 0) {
      GmailApp.sendEmail(recipient, subject, '', {
        htmlBody: htmlBody,
        name: senderName || "Recruitment System"
      });
      return true;
    } else {
      console.warn("Cuota de correo agotada. No se pudo enviar a: " + recipient);
      return false;
    }
  } catch (e) {
    console.error("Error enviando correo a " + recipient + ": " + e.toString());
    return false;
  }
}

/**
 * 1. TRIGGER: On Form Submit
 */
function onFormSubmit(e) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) return;
    ensureColumns(sheet);

    let row = (e && e.range) ? e.range.getRow() : sheet.getLastRow();
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
      "row": row
    };

    const webAppUrl = ScriptApp.getService().getUrl().replace('/dev', '/exec');
    const htmlBody = getEmailTemplate('Evaluator 1 - Profile Review', candidateData, webAppUrl, 'eval1');

    safeSendEmail(CONFIG.EVALUADOR_1_EMAIL, `[RECRUITMENT] New Application: ${candidateData.Name}`, htmlBody);

    sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL1)).setValue('Pending');
  } catch (error) {
    console.error("Error in onFormSubmit: " + error.toString());
  }
}

/**
 * 2. WEB APP: Handles button actions
 */
function doGet(e) {
  const action = e.parameter.action;
  const row = parseInt(e.parameter.row);
  const status = e.parameter.status;

  if (!action || isNaN(row)) return renderMessage("Invalid Request.");

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
    "row": row
  };

  const currentWebAppUrl = ScriptApp.getService().getUrl().replace('/dev', '/exec');

  if (action === 'eval1') {
    if (status === 'approved') {
      sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL1)).setValue('Approved');
      const htmlEval2 = getEmailTemplate('Evaluator 2 - Interview Scheduling', fullCandidateData, currentWebAppUrl, 'eval2');
      safeSendEmail(CONFIG.EVALUADOR_2_EMAIL, `[RECRUITMENT] Approved Profile: ${candidate.name}`, htmlEval2);
      return renderMessage("Profile Approved. Evaluator 2 has been notified.");
    } else if (status === 'rejected') {
      return renderRejectionForm(row, 'eval1', candidate.name, candidate.email, currentWebAppUrl);
    }
  }

  if (action === 'eval2') {
    if (status === 'approved') return renderScheduleForm(row, candidate, currentWebAppUrl);
    else if (status === 'rejected') return renderRejectionForm(row, 'eval2', candidate.name, candidate.email, currentWebAppUrl);
  }

  if (action === 'eval3') {
    if (status === 'approved') {
      sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL3)).setValue('Approved');
      return renderMessage("Profile approved by Evaluator 3.");
    } else if (status === 'rejected') {
      return renderRejectionForm(row, 'eval3', candidate.name, candidate.email, currentWebAppUrl);
    }
  }

  return renderMessage("Invalid or expired link.");
}

/**
 * 3. WEB APP (doPost)
 */
function doPost(e) {
  const params = e.parameter;
  const action = params.form_action;
  const row = params.row;
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (action === 'process_rejection') {
    const evalType = params.eval_type;
    const reason = params.reason;
    let colName = (evalType === 'eval1') ? COL.STATUS_EVAL1 : (evalType === 'eval2') ? COL.STATUS_EVAL2 : COL.STATUS_EVAL3;

    sheet.getRange(row, getColumnIndex(sheet, colName)).setValue('Rejected');
    sheet.getRange(row, getColumnIndex(sheet, COL.REJECTION_REASON)).setValue(reason);

    safeSendEmail(
      params.candidate_email,
      "Update on your application",
      `<p>Hello ${params.candidate_name},</p><p>We have decided not to move forward for the following reason:</p><p><em>"${reason}"</em></p><p>Best of luck.</p>`,
      "Recruitment Team"
    );
    return renderMessage("Candidate rejected.");
  }

  if (action === 'process_schedule') {
    const dateStr = params.date;
    const timeStr = params.time;
    const link = params.link || "";
    const eval3Email = params.eval3_email;

    try {
      const startDateTime = new Date(dateStr.replace(/-/g, '/') + ' ' + timeStr);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60000);

      let guests = `${params.candidate_email}, ${CONFIG.EVALUADOR_1_EMAIL}, ${CONFIG.EVALUADOR_2_EMAIL}`;
      if (eval3Email) guests += `, ${eval3Email}`;

      // CALENDAR EVENT (This must execute first and not fail)
      try {
        CalendarApp.getDefaultCalendar().createEvent(`Interview: ${params.candidate_name}`, startDateTime, endDateTime, {
          description: `Meeting link: ${link}`,
          guests: guests,
          sendInvites: true
        });
      } catch (calErr) {
        console.error("Error creating calendar event: " + calErr.toString());
      }

      sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL2)).setValue('Scheduled');
      sheet.getRange(row, getColumnIndex(sheet, COL.REJECTION_REASON)).setValue(`Scheduled: ${dateStr} ${timeStr}`);

      // 1. PREPARE FULL DATA
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
        "row": row
      };

      // 2. EVALUATOR 3 - ASSESSMENT REQUEST
      if (eval3Email) {
        const webAppUrl = ScriptApp.getService().getUrl().replace('/dev', '/exec');
        const htmlEval3 = getEmailTemplate('Evaluator 3 - Assessment Request', fullCandidateData, webAppUrl, 'eval3');
        safeSendEmail(eval3Email, `[RECRUITMENT] Assessment: ${params.candidate_name}`, htmlEval3);

        sheet.getRange(row, getColumnIndex(sheet, COL.EMAIL_EVAL3)).setValue(eval3Email);
        sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL3)).setValue('Pending Assessment');
      }

      // 3. CANDIDATE - FORMAL INVITATION
      const candidateMsg = params.candidate_msg || "";
      const candidateHtml = getCandidateInviteTemplate(params.candidate_name, { date: dateStr, time: timeStr, link: link }, candidateMsg);
      safeSendEmail(params.candidate_email, `Interview Invitation: ${params.candidate_name}`, candidateHtml, "Recruitment Selection");

      // 4. EVALUATORS - NOTIFICATIONS
      const phoneRaw = fullCandidateData.Phone.toString().replace(/\D/g, '');
      let phoneFinal = phoneRaw.length === 10 ? "57" + phoneRaw : phoneRaw;

      const emails = [CONFIG.EVALUADOR_1_EMAIL, CONFIG.EVALUADOR_2_EMAIL];
      if (eval3Email) emails.push(eval3Email);

      emails.forEach(email => {
        const isEval1 = (email === CONFIG.EVALUADOR_1_EMAIL);
        const notificationHtml = getNotificationTemplate(
          "Confirmed Interview Invitation",
          { Name: params.candidate_name, Position: rowData[4] || "N/A", Phone: phoneFinal },
          { date: dateStr, time: timeStr, link: link },
          isEval1
        );
        safeSendEmail(email, `[CONFIRMED] Interview: ${params.candidate_name}`, notificationHtml);
      });

      return renderMessage("Interview scheduled. Evaluators and Candidate have been notified (pending quota).");
    } catch (err) {
      return renderMessage("Error: " + err.toString());
    }
  }
}

/**
 * 4. RENDERING FUNCTIONS
 */
function renderMessage(msg) {
  return HtmlService.createHtmlOutput(`
    <html><head><style>
      body { background: ${THEME.bg}; color: ${THEME.text}; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { background: ${THEME.surface}; padding: 40px; border-radius: 12px; border: 1px solid ${THEME.border}; text-align: center; max-width: 400px; width: 100%; }
      .btn { background: ${THEME.primary}; border: none; padding: 12px 24px; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 20px; }
    </style></head>
    <body><div class="card">
      <h2 style="color:${THEME.primary}">Result</h2>
      <p id="msg">${msg}</p>
      <button id="closeBtn" class="btn" onclick="cw()">Close Window</button>
    </div>
    <script>
      function cw(){ window.close(); setTimeout(function(){ document.getElementById('msg').innerHTML = "${msg}<br><br><b>Please close this tab manually.</b>"; document.getElementById('closeBtn').style.display='none'; }, 600); }
    </script></body></html>`).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getEmailTemplate(title, data, url, type) {
  let rows = "";
  let photoHtml = "";

  if (data.Photo && data.Photo !== "N/A") {
    const photoId = data.Photo.match(/[-\w]{25,}/);
    if (photoId) {
      photoHtml = `<div style="text-align:center; margin-bottom:20px;">
        <img src="https://drive.google.com/uc?export=view&id=${photoId}" style="width:120px; height:150px; object-fit:cover; border-radius:8px; border:2px solid ${THEME.border};" alt="Candidate Photo">
      </div>`;
    }
  }

  for (let key in data) {
    if (key !== 'row' && key !== 'Resume' && key !== 'Video' && key !== 'Photo' && key !== 'Phone') {
      rows += `<tr><td style="padding:10px;color:${THEME.muted}">${key}</td><td style="color:${THEME.text}">${data[key]}</td></tr>`;
    }
  }

  // Generar link de WhatsApp para la fila de botones
  let waLink = "";
  if (data.Phone && data.Phone !== "N/A") {
    const rawP = data.Phone.toString().replace(/\D/g, '');
    const finalP = rawP.length === 10 ? "57" + rawP : rawP;
    waLink = ` | <a href="https://wa.me/${finalP}" style="color:#25d366; font-weight:bold; text-decoration:none;">WHATSAPP</a>`;
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
      <div style="display:flex;gap:10px;">
        <a href="${url}?action=${type}&status=approved&row=${data.row}" style="background:${THEME.primary};color:white;padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none">${type === 'eval2' ? 'SCHEDULE' : 'APPROVE'}</a>
        <a href="${url}?action=${type}&status=rejected&row=${data.row}" style="border:1px solid ${THEME.error};color:${THEME.error};padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none">REJECT</a>
      </div>
    </div>
  </div>`;
}

function getNotificationTemplate(title, data, info, showWhatsApp) {
  let waButton = "";

  if (showWhatsApp && data.Phone) {
    const waMsg = `Hola ${data.Name}, te saluda el equipo de Selección. Tu entrevista ha sido confirmada para el día ${info.date} a las ${info.time}. Puedes unirte aquí: ${info.link}. ¡Te esperamos!`;
    const waUrl = `https://wa.me/${data.Phone}?text=${encodeURIComponent(waMsg)}`;
    waButton = `
      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid ${THEME.border};">
        <a href="${waUrl}" style="background-color: #25d366; color: white; padding: 14px 20px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 0.9rem; display: block; text-align: center;">
          ENVIAR WHATSAPP AL CANDIDATO
        </a>
      </div>`;
  }

  return `<div style="background-color: ${THEME.bg}; padding: 30px; font-family: 'Segoe UI', Arial, sans-serif; color: ${THEME.text};">
    <div style="max-width: 500px; margin: 0 auto; background-color: ${THEME.surface}; border: 1px solid ${THEME.border}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="padding: 25px; text-align: center; background: linear-gradient(135deg, ${THEME.surface} 0%, #1c2128 100%); border-bottom: 1px solid ${THEME.border};">
        <h2 style="color: ${THEME.primary}; margin: 0; font-size: 1.3rem; letter-spacing: 1px;">${title}</h2>
      </div>
      <div style="padding: 30px; text-align: center;">
        <p style="font-size: 1.1rem; margin-bottom: 20px;">Has confirmed an interview with:</p>
        <h3 style="color: ${THEME.primary}; font-size: 1.5rem; margin: 0 0 5px 0;">${data.Name}</h3>
        <p style="color: ${THEME.muted}; font-size: 1rem; margin: 0 0 25px 0; font-weight: 500;">${data.Position}</p>
        
        <div style="background: rgba(113, 100, 240, 0.05); border: 1px solid ${THEME.border}; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: left;">
          <p style="margin: 5px 0; color: ${THEME.text};"><strong>Date:</strong> ${info.date}</p>
          <p style="margin: 5px 0; color: ${THEME.text};"><strong>Time:</strong> ${info.time}</p>
          <p style="margin: 15px 0 0 0;"><a href="${info.link}" style="color: ${THEME.primary}; font-weight: bold; text-decoration: none;">[ JOIN MEETING ]</a></p>
        </div>
        
        <p style="color: ${THEME.muted}; font-size: 0.9rem; line-height: 1.5;">Please be prepared for the interview. The candidate has been notified via calendar invitation.</p>
        ${waButton}
        <p style="padding-top: 20px; font-size: 0.8rem; color: ${THEME.muted};">Recruitment Selection System</p>
      </div>
    </div>
  </div>`;
}

function getCandidateInviteTemplate(name, info, extraMsg) {
  return `<div style="background-color: ${THEME.bg}; padding: 30px; font-family: 'Segoe UI', Arial, sans-serif; color: ${THEME.text};">
    <div style="max-width: 500px; margin: 0 auto; background-color: ${THEME.surface}; border: 1px solid ${THEME.border}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="padding: 25px; text-align: center; background: linear-gradient(135deg, ${THEME.surface} 0%, #1c2128 100%); border-bottom: 1px solid ${THEME.border};">
        <h2 style="color: ${THEME.primary}; margin: 0; font-size: 1.3rem; letter-spacing: 1px;">INTERVIEW INVITATION</h2>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 1.1rem;">Hello <strong>${name}</strong>,</p>
        <p>We are pleased to invite you to an interview for our recruitment process. Below are the details of the meeting:</p>
        
        <div style="background: rgba(113, 100, 240, 0.05); border: 1px solid ${THEME.border}; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <p style="margin: 5px 0; color: ${THEME.text};"><strong>Date:</strong> ${info.date}</p>
          <p style="margin: 5px 0; color: ${THEME.text};"><strong>Time:</strong> ${info.time}</p>
          <p style="margin: 15px 0 0 0;"><a href="${info.link}" style="color: ${THEME.primary}; font-weight: bold; text-decoration: none;">[ JOIN MEETING ]</a></p>
        </div>
        
        ${extraMsg ? `<div style="padding: 15px; border-left: 4px solid ${THEME.primary}; background: rgba(255,255,255,0.02); margin-bottom: 25px;"><p style="margin: 0; font-style: italic; color: ${THEME.text};">${extraMsg}</p></div>` : ''}
        
        <p style="color: ${THEME.muted}; font-size: 0.95rem;">Please ensure you have a stable internet connection and are in a quiet environment. We look forward to meeting you.</p>
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="https://wa.me/${CONFIG.RECRUITMENT_WHATSAPP}?text=Hola, soy ${encodeURIComponent(name)} y tengo una duda sobre mi entrevista agendada." style="background-color: transparent; border: 1px solid #25d366; color: #25d366; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 0.85rem; display: inline-block;">
            CONTACT VIA WHATSAPP
          </a>
        </div>

        <p style="border-top: 1px solid ${THEME.border}; padding-top: 20px; margin-top: 30px; font-size: 0.8rem; color: ${THEME.muted}; text-align: center;">Recruitment Team</p>
      </div>
    </div>
  </div>`;
}

function renderRejectionForm(row, type, name, email, url) {
  return HtmlService.createHtmlOutput(`<html><body style="background:${THEME.bg};color:${THEME.text};font-family:sans-serif;padding:30px;">
    <div style="background:${THEME.surface};border:1px solid ${THEME.border};border-radius:12px;padding:30px;max-width:450px;margin:0 auto;">
      <h2 style="color:${THEME.error}">Reject ${name}</h2>
      <form action="${url}" method="post">
        <input type="hidden" name="form_action" value="process_rejection"><input type="hidden" name="row" value="${row}"><input type="hidden" name="eval_type" value="${type}"><input type="hidden" name="candidate_name" value="${name}"><input type="hidden" name="candidate_email" value="${email}">
        <textarea name="reason" placeholder="Reason..." required style="width:100%;height:100px;background:#000;color:white;border:1px solid ${THEME.border};padding:10px;"></textarea>
        <button type="submit" style="background:${THEME.error};color:white;border:none;width:100%;padding:15px;margin-top:15px;border-radius:8px;">Reject Candidate</button>
      </form>
    </div></body></html>`);
}

function renderScheduleForm(row, candidate, url) {
  return HtmlService.createHtmlOutput(`<html><body style="background:${THEME.bg};color:${THEME.text};font-family:sans-serif;padding:30px;">
    <div style="background:${THEME.surface};border:1px solid ${THEME.border};border-radius:12px;padding:30px;max-width:450px;margin:0 auto;">
      <h2 style="color:${THEME.primary}">Schedule Interview</h2>
      <p>Candidate: ${candidate.name}</p>
      <form action="${url}" method="post">
        <input type="hidden" name="form_action" value="process_schedule"><input type="hidden" name="row" value="${row}"><input type="hidden" name="candidate_name" value="${candidate.name}"><input type="hidden" name="candidate_email" value="${candidate.email}">
        <div style="margin-bottom:15px"><label>Date</label><input type="date" name="date" required style="width:100%;padding:10px;background:#000;color:white;border:1px solid ${THEME.border}"></div>
        <div style="margin-bottom:15px"><label>Time</label><input type="time" name="time" required style="width:100%;padding:10px;background:#000;color:white;border:1px solid ${THEME.border}"></div>
        <div style="margin-bottom:15px"><label>Evaluator 3 (Optional)</label><input type="email" name="eval3_email" style="width:100%;padding:10px;background:#000;color:white;border:1px solid ${THEME.border}"></div>
        <div style="margin-bottom:15px"><label>Meeting Link</label><input type="url" name="link" required style="width:100%;padding:10px;background:#000;color:white;border:1px solid ${THEME.border}"></div>
        <div style="margin-bottom:20px"><label>Message to Candidate (Optional)</label>
          <textarea name="candidate_msg" placeholder="Tell the candidate something important..." style="width:100%;height:80px;background:#000;color:white;border:1px solid ${THEME.border};padding:10px;border-radius:5px;"></textarea>
        </div>
        <button type="submit" style="background:${THEME.primary};color:white;border:none;width:100%;padding:15px;border-radius:8px;font-weight:bold;">Schedule & Send Invitations</button>
      </form>
    </div></body></html>`);
}

function ensureColumns(sheet) {
  const headers = sheet.getDataRange().getValues()[0];
  const req = [COL.STATUS_EVAL1, COL.STATUS_EVAL2, COL.STATUS_EVAL3, COL.EMAIL_EVAL3, COL.REJECTION_REASON];
  req.forEach(c => { if (headers.indexOf(c) === -1) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(c); });
}

function getColumnIndex(sheet, name) {
  const h = sheet.getDataRange().getValues()[0];
  const idx = h.indexOf(name);
  return idx !== -1 ? idx + 1 : -1;
}

function queryParamSafe(v) { return v || ""; }
