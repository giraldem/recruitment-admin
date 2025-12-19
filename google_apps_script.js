/**
 * SISTEMA INTEGRADO DE RECLUTAMIENTO - POLYTECH
 * Sincronizado con Hoja: 110RrcE1J2DjznIXT4fhgs5LKjvvSNSrHdh-TIfeAcgA
 */

// 1. CONFIGURACIÓN GLOBAL
const CONFIG = {
  SPREADSHEET_ID: '110RrcE1J2DjznIXT4fhgs5LKjvvSNSrHdh-TIfeAcgA',
  SHEET_NAME_APPLICATIONS: 'Respuestas de formulario 1',
  SHEET_NAME_USERS: 'Usuarios',
  SHEET_NAME_JOBS: 'Vacantes',
  EVALUADOR_1_EMAIL: 'polytechcontacto@gmail.com',
  EVALUADOR_2_EMAIL: 'tmark2022.co@gmail.com',
  RECRUITMENT_WHATSAPP: '573137333094'
};

// 2. CONFIGURACIÓN DE COLUMNAS
const COL = {
  NAME: 'Full Name',
  EMAIL: 'Email Address',
  EMAIL_ALT: 'correo',
  PHONE: 'Phone',
  POSITIONS: 'positions',
  EXPERIENCE_IDX: 14, // Columna O
  ENGLISH_IDX: 19,    // Columna T
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

// 3. ESTILOS VISUALES
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

/************************************************************
 * ENTRADAS PRINCIPALES (doGet & doPost)
 ************************************************************/

function doGet(e) {
  // Manejo de botones de correos (Aprobaciones)
  if (e.parameter.action && (e.parameter.action.includes('eval') || e.parameter.status)) {
    return handleApprovalActions(e);
  }

  // Manejo de API (Consultas GET del Portal)
  try {
    const action = e.parameter.action || 'get_jobs';
    return doPost({
      postData: { contents: JSON.stringify({ action: action, admin: e.parameter.admin === 'true' }) }
    });
  } catch (err) {
    return createResponse({ error: true, message: err.message });
  }
}

function doPost(e) {
  // Manejo de formularios de envío (Rechazo / Programación)
  if (e.parameter && e.parameter.form_action) {
    return handleFormActions(e);
  }

  // Manejo de API JSON (Portal Web)
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch (action) {
      case 'login': return apiLogin(data);
      case 'register': return apiRegister(data);
      case 'get_jobs': return apiGetJobs(data);
      case 'save_job': return apiSaveJob(data);
      case 'toggle_job': return apiToggleJob(data);
      case 'apply_job': return apiApply(data);
      case 'get_applications': return apiGetApplications(data);
      case 'check_status': return apiCheckStatus(data);
      default: throw new Error("Acción desconocida");
    }
  } catch (error) {
    return createResponse({ error: true, message: error.message });
  }
}

/************************************************************
 * LÓGICA DE APROBACIONES
 ************************************************************/

function handleApprovalActions(e) {
  const action = e.parameter.action;
  const row = parseInt(e.parameter.row);
  const status = e.parameter.status;
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_APPLICATIONS);

  const headers = sheet.getDataRange().getValues()[0];
  const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

  const getHeaderVal = (name) => {
    const idx = headers.findIndex(h => h.toString().toLowerCase().includes(name.toLowerCase()));
    return (idx !== -1 && rowData[idx] !== "") ? rowData[idx] : "N/A";
  };

  const candidate = {
    "Nombre": getHeaderVal(COL.NAME),
    "Correo": getHeaderVal(COL.EMAIL) !== "N/A" ? getHeaderVal(COL.EMAIL) : getHeaderVal(COL.EMAIL_ALT),
    "Teléfono": getHeaderVal(COL.PHONE),
    "Cargo": getHeaderVal(COL.POSITIONS),
    "Experiencia": rowData[COL.EXPERIENCE_IDX] || "N/A",
    "Nacionalidad": getHeaderVal(COL.NATIONALITY),
    "Inglés": rowData[COL.ENGLISH_IDX] || "N/A",
    "CV": getHeaderVal(COL.RESUME),
    "Video": getHeaderVal(COL.VIDEO),
    "Photo": getHeaderVal(COL.PHOTO),
    "row": row
  };

  const currentWebAppUrl = ScriptApp.getService().getUrl().replace('/dev', '/exec');

  if (action === 'eval1') {
    if (status === 'approved') {
      sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL1)).setValue('Aprobado');
      const htmlEval2 = getEmailTemplate('Revisión de Perfil - Evaluador 2', candidate, currentWebAppUrl, 'eval2');
      safeSendEmail(CONFIG.EVALUADOR_2_EMAIL, `[APROBADO] Perfil de: ${candidate.Nombre}`, htmlEval2);
      return renderMessage("Perfil aprobado. El Evaluador 2 ha sido notificado para programar la entrevista.");
    } else {
      return renderRejectionForm(row, 'eval1', candidate.Nombre, candidate.Correo, currentWebAppUrl);
    }
  }

  if (action === 'eval2') {
    if (status === 'approved') return renderScheduleForm(row, { name: candidate.Nombre, email: candidate.Correo }, currentWebAppUrl);
    else return renderRejectionForm(row, 'eval2', candidate.Nombre, candidate.Correo, currentWebAppUrl);
  }

  if (action === 'eval3') {
    if (status === 'approved') {
      sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL3)).setValue('Aprobado');
      return renderMessage("Perfil aprobado por el Evaluador 3.");
    } else return renderRejectionForm(row, 'eval3', candidate.Nombre, candidate.Correo, currentWebAppUrl);
  }

  return renderMessage("Solicitud procesada.");
}

function handleFormActions(e) {
  const params = e.parameter;
  const action = params.form_action;
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_APPLICATIONS);

  if (action === 'process_rejection') {
    let colName = (params.eval_type === 'eval1') ? COL.STATUS_EVAL1 : (params.eval_type === 'eval2') ? COL.STATUS_EVAL2 : COL.STATUS_EVAL3;
    sheet.getRange(params.row, getColumnIndex(sheet, colName)).setValue('Rechazado');
    sheet.getRange(params.row, getColumnIndex(sheet, COL.REJECTION_REASON)).setValue(params.reason);

    safeSendEmail(params.candidate_email, "Novedades sobre tu postulación", `<p>Hola ${params.candidate_name},</p><p>Lamentamos informarte que no avanzaremos en esta ocasión. Razón: <em>"${params.reason}"</em></p><p>¡Mucha suerte!</p>`);
    return renderMessage("Candidato rechazado y notificado.");
  }

  if (action === 'process_schedule') {
    const dateStr = params.date;
    const timeStr = params.time;
    const link = params.link || "";
    const eval3Email = params.eval3_email;
    const row = params.row;

    try {
      const startDateTime = new Date(dateStr.replace(/-/g, '/') + ' ' + timeStr);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60000);

      // Crear evento en calendario
      try {
        CalendarApp.getDefaultCalendar().createEvent(`Entrevista: ${params.candidate_name}`, startDateTime, endDateTime, {
          description: `Enlace: ${link}`,
          guests: `${params.candidate_email}, ${CONFIG.EVALUADOR_1_EMAIL}, ${CONFIG.EVALUADOR_2_EMAIL}${eval3Email ? ', ' + eval3Email : ''}`,
          sendInvites: true
        });
      } catch (e) { console.error("Error calendario: " + e.message); }

      sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL2)).setValue('Programada');
      sheet.getRange(row, getColumnIndex(sheet, COL.REJECTION_REASON)).setValue(`Programada para: ${dateStr} ${timeStr}`);

      // Datos completos para el correo
      const headers = sheet.getDataRange().getValues()[0];
      const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
      const getV = (n) => {
        const i = headers.findIndex(h => h.toString().toLowerCase().includes(n.toLowerCase()));
        return (i !== -1 && rowData[i] !== "") ? rowData[i] : "N/A";
      };

      const fullCandidateData = {
        "Nombre": params.candidate_name,
        "Correo": params.candidate_email,
        "Teléfono": getV(COL.PHONE),
        "Cargo": getV(COL.POSITIONS),
        "Experiencia": rowData[COL.EXPERIENCE_IDX] || "N/A",
        "Nacionalidad": getV(COL.NATIONALITY),
        "Inglés": rowData[COL.ENGLISH_IDX] || "N/A",
        "CV": getV(COL.RESUME),
        "Video": getV(COL.VIDEO),
        "Photo": getV(COL.PHOTO),
        "row": row
      };

      // Notificar a Evaluador 3 si existe
      if (eval3Email) {
        const webAppUrl = ScriptApp.getService().getUrl().replace('/dev', '/exec');
        const htmlEval3 = getEmailTemplate('Solicitud de Evaluación - Evaluador 3', fullCandidateData, webAppUrl, 'eval3');
        safeSendEmail(eval3Email, `[EVALUACIÓN] Candidato: ${params.candidate_name}`, htmlEval3);
        sheet.getRange(row, getColumnIndex(sheet, COL.EMAIL_EVAL3)).setValue(eval3Email);
        sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL3)).setValue('Pendiente');
      }

      // Notificar al candidato
      const candHtml = getCandidateInviteTemplate(params.candidate_name, { date: dateStr, time: timeStr, link: link }, params.candidate_msg);
      safeSendEmail(params.candidate_email, `Invitación a Entrevista: ${params.candidate_name}`, candHtml);

      // Notificar a evaluadores
      const phoneRaw = fullCandidateData.Teléfono.toString().replace(/\D/g, '');
      const phoneFinal = phoneRaw.length === 10 ? "57" + phoneRaw : phoneRaw;
      const emails = [CONFIG.EVALUADOR_1_EMAIL, CONFIG.EVALUADOR_2_EMAIL];
      if (eval3Email) emails.push(eval3Email);

      emails.forEach(email => {
        const htmlNotif = getNotificationTemplate("Cita de Entrevista Confirmada", { Nombre: params.candidate_name, Cargo: fullCandidateData.Cargo, Teléfono: phoneFinal }, { date: dateStr, time: timeStr, link: link }, email === CONFIG.EVALUADOR_1_EMAIL);
        safeSendEmail(email, `[CONFIRMADO] Entrevista: ${params.candidate_name}`, htmlNotif);
      });

      return renderMessage("Entrevista programada y notificaciones enviadas.");
    } catch (err) {
      return renderMessage("Error: " + err.toString());
    }
  }
}

/************************************************************
 * API DEL PORTAL WEB
 ************************************************************/

function apiLogin(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_USERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.email && rows[i][1] == data.password) {
      return createResponse({ success: true, user: { email: rows[i][0], name: rows[i][2], role: rows[i][3] } });
    }
  }
  return createResponse({ error: true, message: "Datos de acceso incorrectos" });
}

function apiRegister(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_USERS);
  if (sheet.getDataRange().getValues().some(r => r[0] == data.email)) return createResponse({ error: true, message: "El usuario ya existe" });
  sheet.appendRow([data.email, data.password, data.name, 'user', new Date()]);
  return createResponse({ success: true, message: "Usuario registrado con éxito" });
}

function apiGetJobs(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_JOBS);
  const rows = sheet.getDataRange().getValues();
  const jobs = rows.slice(1).map(row => ({
    id: row[0], title: row[1], location: row[2], type: row[3], description: row[4], active: row[5], createdAt: row[6]
  })).filter(j => data.admin || (j.active === true || String(j.active).toLowerCase() === 'true'));
  return createResponse({ success: true, jobs: jobs });
}

function apiSaveJob(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_JOBS);
  if (data.isNew) {
    const id = 'JOB-' + Date.now();
    sheet.appendRow([id, data.title, data.location, data.type, data.description, true, new Date()]);
    return createResponse({ success: true, message: "Vacante creada" });
  } else {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.id) {
        sheet.getRange(i + 1, 2, 1, 4).setValues([[data.title, data.location, data.type, data.description]]);
        return createResponse({ success: true, message: "Vacante actualizada" });
      }
    }
  }
}

function apiToggleJob(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_JOBS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      const current = rows[i][5];
      const next = !(current === true || String(current).toLowerCase() === 'true');
      sheet.getRange(i + 1, 6).setValue(next);
      return createResponse({ success: true, newState: next });
    }
  }
}

function apiApply(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_APPLICATIONS);
  const cvUrl = saveToDrive(data.cvFile, `CV_${data.fullName}`);
  const workUrl = saveToDrive(data.workFile, `CERT_${data.fullName}`);
  const videoUrl = data.videoUrl || saveToDrive(data.videoFile, `VIDEO_${data.fullName}`);

  sheet.appendRow([
    'APP-' + Date.now(), new Date(), data.jobId, data.fullName, data.email, data.phone,
    cvUrl, workUrl, "", "", "", videoUrl, 'Recibido', ''
  ]);

  onFormSubmit(); // Lanzar flujo de aprobación
  return createResponse({ success: true, message: "Postulación enviada" });
}

function apiGetApplications(data) {
  if (!data.admin) return createResponse({ error: true });
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_APPLICATIONS);
  const rows = sheet.getDataRange().getValues();
  const apps = rows.slice(1).map(r => ({ appId: r[0], date: r[1], fullName: r[3], email: r[4], status: r[12] }));
  return createResponse({ success: true, applications: apps.reverse() });
}

function apiCheckStatus(data) {
  return createResponse(lookupStatus(data.email));
}

/************************************************************
 * UTILIDADES Y HTML
 ************************************************************/

function onFormSubmit(e) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_APPLICATIONS);
  ensureColumns(sheet);

  let row = (e && e.range) ? e.range.getRow() : sheet.getLastRow();
  const headers = sheet.getDataRange().getValues()[0];
  const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

  const getV = (n) => {
    const search = n.toLowerCase();
    const idx = headers.findIndex(h => h.toString().toLowerCase().includes(search));
    return (idx !== -1 && rowData[idx] !== "") ? rowData[idx] : "N/A";
  };

  const candidate = {
    "Nombre": getV(COL.NAME),
    "Correo": getV(COL.EMAIL) !== "N/A" ? getV(COL.EMAIL) : getV(COL.EMAIL_ALT),
    "Teléfono": getV(COL.PHONE),
    "Cargo": getV(COL.POSITIONS),
    "Experiencia": rowData[COL.EXPERIENCE_IDX] || "N/A",
    "Nacionalidad": getV(COL.NATIONALITY),
    "Inglés": rowData[COL.ENGLISH_IDX] || "N/A",
    "CV": getV(COL.RESUME),
    "Video": getV(COL.VIDEO),
    "Photo": getV(COL.PHOTO),
    "row": row
  };

  const url = ScriptApp.getService().getUrl().replace('/dev', '/exec');
  const html = getEmailTemplate('Nuevo Perfil para Revisión - Evaluador 1', candidate, url, 'eval1');
  safeSendEmail(CONFIG.EVALUADOR_1_EMAIL, `[RECLUTAMIENTO] Nueva Postulación: ${candidate.Nombre}`, html);
  sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL1)).setValue('Pendiente');
}

function getEmailTemplate(title, data, url, type) {
  let rows = "";
  let photoHtml = "";

  if (data.Photo && data.Photo !== "N/A") {
    const photoId = data.Photo.match(/[-\w]{25,}/);
    if (photoId) {
      photoHtml = `<div style="text-align:center; margin-bottom:20px;">
        <img src="https://drive.google.com/uc?export=view&id=${photoId}" style="width:120px; height:150px; object-fit:cover; border-radius:8px; border:2px solid ${THEME.border};" alt="Foto">
      </div>`;
    }
  }

  for (let key in data) {
    if (['row', 'CV', 'Video', 'Photo', 'Teléfono'].indexOf(key) === -1) {
      rows += `<tr><td style="padding:10px;color:${THEME.muted}">${key}</td><td style="color:${THEME.text}">${data[key]}</td></tr>`;
    }
  }

  let waLink = "";
  if (data["Teléfono"] && data["Teléfono"] !== "N/A") {
    const rawP = data["Teléfono"].toString().replace(/\D/g, '');
    const finalP = rawP.length === 10 ? "57" + rawP : rawP;
    waLink = ` | <a href="https://wa.me/${finalP}" style="color:#25d366; font-weight:bold; text-decoration:none;">WHATSAPP</a>`;
  }

  return `<div style="background:${THEME.bg};padding:25px;font-family:sans-serif;">
    <div style="background:${THEME.surface};border:1px solid ${THEME.border};border-radius:12px;padding:25px;max-width:500px;margin:0 auto;">
      <h2 style="color:${THEME.primary};text-align:center">${title}</h2>
      ${photoHtml}
      <table style="width:100%">${rows}</table>
      <div style="text-align:center;margin:20px 0; font-size: 0.85rem;">
        ${data.CV ? `<a href="${data.CV}" style="color:${THEME.primary}; font-weight:bold; text-decoration:none;">CV</a> | ` : ''}
        ${data.Video ? `<a href="${data.Video}" style="color:${THEME.primary}; font-weight:bold; text-decoration:none;">VIDEO</a>` : ''}
        ${waLink}
      </div>
      <div style="display:flex;">
        <a href="${url}?action=${type}&status=approved&row=${data.row}" style="background:${THEME.primary};color:white;padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none;margin-right:5px;font-weight:bold;">${type === 'eval2' ? 'PROGRAMAR' : 'APROBAR'}</a>
        <a href="${url}?action=${type}&status=rejected&row=${data.row}" style="border:1px solid ${THEME.error};color:${THEME.error};padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;">RECHAZAR</a>
      </div>
    </div>
  </div>`;
}

function getNotificationTemplate(title, data, info, showWhatsApp) {
  let waButton = "";
  if (showWhatsApp && data.Teléfono) {
    const waMsg = `Hola ${data.Nombre}, te saluda el equipo de Selección. Tu entrevista ha sido confirmada para el día ${info.date} a las ${info.time}. Únete aquí: ${info.link}`;
    const waUrl = `https://wa.me/${data.Teléfono}?text=${encodeURIComponent(waMsg)}`;
    waButton = `<div style="margin-top:25px; border-top:1px solid ${THEME.border}; padding-top:20px;"><a href="${waUrl}" style="background-color:#25d366; color:white; padding:14px; border-radius:10px; text-decoration:none; font-weight:bold; display:block; text-align:center;">ENVIAR WHATSAPP AL CANDIDATO</a></div>`;
  }

  return `<div style="background-color:${THEME.bg}; padding:30px; font-family:sans-serif; color:${THEME.text};">
    <div style="max-width:500px; margin:0 auto; background-color:${THEME.surface}; border:1px solid ${THEME.border}; border-radius:16px; overflow:hidden;">
      <div style="padding:25px; text-align:center; border-bottom:1px solid ${THEME.border};"><h2 style="color:${THEME.primary}; margin:0;">${title}</h2></div>
      <div style="padding:30px; text-align:center;">
        <p>Entrevista confirmada con:</p>
        <h3 style="color:${THEME.primary}; font-size:1.5rem; margin:5px 0;">${data.Nombre}</h3>
        <p style="color:${THEME.muted}; margin-bottom:20px;">${data.Cargo}</p>
        <div style="background:rgba(113,100,240,0.05); border:1px solid ${THEME.border}; border-radius:12px; padding:20px; text-align:left;">
          <p><strong>Fecha:</strong> ${info.date}</p><p><strong>Hora:</strong> ${info.time}</p>
          <p style="margin-top:15px;"><a href="${info.link}" style="color:${THEME.primary}; font-weight:bold; text-decoration:none;">[ UNIRSE A REUNIÓN ]</a></p>
        </div>
        ${waButton}
      </div>
    </div>
  </div>`;
}

function getCandidateInviteTemplate(name, info, extraMsg) {
  const waUrl = `https://wa.me/${CONFIG.RECRUITMENT_WHATSAPP}?text=Hola, soy ${encodeURIComponent(name)} y tengo una duda sobre mi entrevista.`;
  return `<div style="background-color:${THEME.bg}; padding:30px; font-family:sans-serif; color:${THEME.text};">
    <div style="max-width:500px; margin:0 auto; background-color:${THEME.surface}; border:1px solid ${THEME.border}; border-radius:16px; overflow:hidden;">
      <div style="padding:25px; text-align:center; border-bottom:1px solid ${THEME.border};"><h2 style="color:${THEME.primary}; margin:0;">INVITACIÓN A ENTREVISTA</h2></div>
      <div style="padding:30px;">
        <p>Hola <strong>${name}</strong>,</p>
        <p>Tienes una invitación a entrevista:</p>
        <div style="background:rgba(113,100,240,0.05); border:1px solid ${THEME.border}; border-radius:12px; padding:20px; margin:25px 0;">
          <p><strong>Fecha:</strong> ${info.date}</p><p><strong>Hora:</strong> ${info.time}</p>
          <p style="margin-top:15px;"><a href="${info.link}" style="color:${THEME.primary}; font-weight:bold; text-decoration:none;">[ ENTRAR A LA ENTREVISTA ]</a></p>
        </div>
        ${extraMsg ? `<div style="padding:15px; border-left:4px solid ${THEME.primary}; font-style:italic; margin-bottom:25px;"><p>${extraMsg}</p></div>` : ''}
        <div style="margin-top:30px; text-align:center;"><a href="${waUrl}" style="border:1px solid #25d366; color:#25d366; padding:12px; border-radius:8px; text-decoration:none; font-weight:bold;">CONTACTAR POR WHATSAPP</a></div>
      </div>
    </div>
  </div>`;
}

function renderMessage(msg) {
  return HtmlService.createHtmlOutput(`<html><body style="background:${THEME.bg};color:${THEME.text};font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="background:${THEME.surface};padding:40px;border-radius:12px;border:1px solid ${THEME.border};text-align:center;max-width:400px;"><h2>Resultado</h2><p>${msg}</p><button onclick="window.close()" style="background:${THEME.primary};border:none;padding:12px;color:white;width:100%;border-radius:8px;font-weight:bold;cursor:pointer;">Cerrar</button></div></body></html>`).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderRejectionForm(row, type, name, email, url) {
  return HtmlService.createHtmlOutput(`<html><body style="background:${THEME.bg};color:${THEME.text};font-family:sans-serif;padding:30px;"><div style="background:${THEME.surface};border:1px solid ${THEME.border};border-radius:12px;padding:30px;max-width:450px;margin:0 auto;"><h2 style="color:${THEME.error}">Rechazar a ${name}</h2><form action="${url}" method="post"><input type="hidden" name="form_action" value="process_rejection"><input type="hidden" name="row" value="${row}"><input type="hidden" name="eval_type" value="${type}"><input type="hidden" name="candidate_name" value="${name}"><input type="hidden" name="candidate_email" value="${email}"><textarea name="reason" placeholder="Razón del rechazo..." required style="width:100%;height:100px;background:#000;color:white;border:1px solid ${THEME.border};padding:10px;"></textarea><button type="submit" style="background:${THEME.error};color:white;border:none;width:100%;padding:15px;margin-top:15px;border-radius:8px;font-weight:bold;">Confirmar Rechazo</button></form></div></body></html>`);
}

function renderScheduleForm(row, candidate, url) {
  return HtmlService.createHtmlOutput(`<html><body style="background:${THEME.bg};color:${THEME.text};font-family:sans-serif;padding:30px;"><div style="background:${THEME.surface};border:1px solid ${THEME.border};border-radius:12px;padding:30px;max-width:450px;margin:0 auto;"><h2 style="color:${THEME.primary}">Programar Entrevista</h2><p>Candidato: ${candidate.name}</p><form action="${url}" method="post"><input type="hidden" name="form_action" value="process_schedule"><input type="hidden" name="row" value="${row}"><input type="hidden" name="candidate_name" value="${candidate.name}"><input type="hidden" name="candidate_email" value="${candidate.email}"><div style="margin-bottom:15px"><label>Fecha</label><input type="date" name="date" required style="width:100%;background:#000;color:white;border:1px solid ${THEME.border};padding:8px"></div><div style="margin-bottom:15px"><label>Hora</label><input type="time" name="time" required style="width:100%;background:#000;color:white;border:1px solid ${THEME.border};padding:8px"></div><div style="margin-bottom:15px"><label>Enlace de Reunión</label><input type="url" name="link" required style="width:100%;background:#000;color:white;border:1px solid ${THEME.border};padding:8px"></div><button type="submit" style="background:${THEME.primary};color:white;border:none;width:100%;padding:15px;border-radius:8px;font-weight:bold;">Programar Entrevista</button></form></div></body></html>`);
}

function safeSendEmail(recipient, subject, htmlBody, senderName) {
  try {
    if (MailApp.getRemainingDailyQuota() > 0) {
      GmailApp.sendEmail(recipient, subject, '', { htmlBody: htmlBody, name: senderName || "Sistema de Selección" });
      return true;
    }
    return false;
  } catch (e) { return false; }
}

function createResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function getColumnIndex(sheet, name) {
  const h = sheet.getDataRange().getValues()[0];
  const idx = h.indexOf(name);
  return idx !== -1 ? idx + 1 : -1;
}

function ensureColumns(sheet) {
  const headers = sheet.getDataRange().getValues()[0];
  const req = [COL.STATUS_EVAL1, COL.STATUS_EVAL2, COL.STATUS_EVAL3, COL.EMAIL_EVAL3, COL.REJECTION_REASON];
  req.forEach(c => { if (headers.indexOf(c) === -1) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(c); });
}

function saveToDrive(fileData, prefix) {
  if (!fileData || !fileData.data) return "";
  try {
    const blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, prefix);
    const file = DriveApp.getRootFolder().createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return "Error subida"; }
}

function lookupStatus(email) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME_APPLICATIONS) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { status: 'sin_datos' };
  const h = data[0];
  const eIdx = h.findIndex(col => col.toString().toLowerCase().includes('mail') || col.toString().toLowerCase().includes('correo'));
  for (let i = 1; i < data.length; i++) {
    if (data[i][eIdx] && data[i][eIdx].toString().toLowerCase().trim() === email.toLowerCase().trim()) {
      return { status: data[i][getColumnIndex(sheet, COL.STATUS_EVAL1) - 1] || 'Recibido' };
    }
  }
  return { status: 'no_encontrado' };
}

function setupDatabase() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  [CONFIG.SHEET_NAME_USERS, CONFIG.SHEET_NAME_JOBS, CONFIG.SHEET_NAME_APPLICATIONS].forEach(n => { if (!ss.getSheetByName(n)) ss.insertSheet(n); });
  console.log("✅ Base de datos Polytech sincronizada.");
}
