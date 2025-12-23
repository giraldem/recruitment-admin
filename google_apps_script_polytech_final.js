/**
 * SISTEMA INTEGRADO DE RECLUTAMIENTO - POLYTECH & MACEDO INTEGRATION
 * V 2.0 - Final Version
 * 
 * CARACTERÍSTICAS:
 * 1. API del Portal (Login, Registro, Vacantes, Status) -> Heredado de Polytech
 * 2. Flujo de Aprobación Avanzado -> Heredado de Macedo
 * 3. Templates de Correo Premium (Dark Mode) -> Heredado de Macedo
 * 4. Compatibilidad con Email (Botones <a>) -> Heredado de Macedo (Fix)
 * 5. Links de WhatsApp Verdes (Texto simple) -> Heredado de Macedo (Fix)
 */

// ==========================================
// 1. CONFIGURACIÓN GLOBAL & TEMAS
// ==========================================
const CONFIG = {
    // Base de Datos (Polytech)
    SPREADSHEET_ID: '110RrcE1J2DjznIXT4fhgs5LKjvvSNSrHdh-TIfeAcgA',

    // Nombres de Hojas
    SHEET_NAME_APPLICATIONS: 'Respuestas de formulario 1',
    SHEET_NAME_USERS: 'Usuarios',
    SHEET_NAME_JOBS: 'Vacantes',

    // Emails de Evaluadores
    EVALUADOR_1_EMAIL: 'polytechcontacto@gmail.com', // Polytech
    EVALUADOR_2_EMAIL: 'tmark2022.co@gmail.com',     // TMark

    // Configuración General
    RECRUITMENT_WHATSAPP: '573137333094',
    APP_NAME: 'Polytech Recruitment System'
};

const COL = {
    NAME: 'Full Name',
    EMAIL: 'Email Address',
    EMAIL_ALT: 'correo',
    PHONE: 'Phone',
    POSITIONS: 'positions',

    // Índices específicos de Polytech (Base 0)
    // Ajustar si la estructura del formulario cambia
    EXPERIENCE_IDX: 14, // Columna O
    ENGLISH_IDX: 19,    // Columna T

    NATIONALITY: 'Nationality',
    RESUME: 'Resume',
    VIDEO: 'video',
    PHOTO: 'photo', // 'Photo of your Identification Document'
    SELFIE: 'selfie', // Campo opcional (Macedo feature)

    // Columnas de Gestión Interna
    STATUS_EVAL1: 'Evaluator 1 Status',
    STATUS_EVAL2: 'Evaluator 2 Status',
    STATUS_EVAL3: 'Evaluator 3 Status',
    EMAIL_EVAL3: 'Evaluator 3 Email',
    REJECTION_REASON: 'Rejection Reason'
};

const THEME = {
    bg: '#0d1117',
    surface: '#161b22',
    primary: '#7164f0',
    text: '#f0f6fc',
    muted: '#8b949e',
    success: '#238636',
    error: '#da3633',
    whatsapp: '#25D366',
    border: '#30363d'
};

// ==========================================
// 2. ENTRADA PRINCIPAL (ROUTING)
// ==========================================

function doGet(e) {
    // Verificación de parámetros básicos
    if (!e || !e.parameter) return createResponse({ error: true, message: "No parameters" });

    // RUTA A: Acciones de Aprobación (Clicks en Correos)
    // Ej: ?action=eval1&status=approved
    if (e.parameter.action && (e.parameter.action.startsWith('eval') || ['eval1', 'eval2', 'eval3'].includes(e.parameter.action))) {
        return handleApprovalActions(e);
    }

    // RUTA B: API GET (Portal Web)
    // Ej: ?action=get_jobs
    try {
        const action = e.parameter.action || 'get_jobs';
        // Reenviar a doPost para lógica centralizada de API
        const simPost = {
            postData: { contents: JSON.stringify({ action: action, admin: e.parameter.admin === 'true', email: e.parameter.email }) },
            parameter: e.parameter
        };
        return doPost(simPost);
    } catch (err) {
        return createResponse({ error: true, message: err.message });
    }
}

function doPost(e) {
    if (!e) return createResponse({ error: true, message: "No post data" });

    // RUTA A: Formularios HTML Internos (Rechazo / Agendamiento)
    if (e.parameter && e.parameter.form_action) {
        return handleFormActions(e);
    }

    // RUTA B: API JSON (Portal Web)
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;

        switch (action) {
            // Autenticación
            case 'login': return apiLogin(data);
            case 'register': return apiRegister(data);

            // Vacantes
            case 'get_jobs': return apiGetJobs(data);
            case 'save_job': return apiSaveJob(data);
            case 'toggle_job': return apiToggleJob(data);

            // Aplicaciones
            case 'apply_job': return apiApply(data); // Web Form
            case 'get_applications': return apiGetApplications(data);
            case 'check_status': return apiCheckStatus(data); // Status Checker

            default: return createResponse({ error: true, message: `Unknown action: ${action}` });
        }
    } catch (error) {
        return createResponse({ error: true, message: "JSON Parse Error: " + error.message });
    }
}

// ==========================================
// 3. LÓGICA DE APROBACIÓN (MACEDO CORE)
// ==========================================

function handleApprovalActions(e) {
    const action = e.parameter.action; // eval1, eval2, eval3
    const row = parseInt(e.parameter.row);
    const status = e.parameter.status; // approved, rejected
    const webAppUrl = ScriptApp.getService().getUrl().replace('/dev', '/exec');

    console.log(`>>> PROCESSING: ${action} - ${status} - Row: ${row}`);

    try {
        const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_APPLICATIONS);

        // Leer Datos Candidato
        const headers = sheet.getDataRange().getValues()[0];
        const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

        const getVal = (nameOrIdx) => {
            if (typeof nameOrIdx === 'number') return rowData[nameOrIdx] || "N/A";
            const search = nameOrIdx.toLowerCase();
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

        // --- EVALUADOR 1 (Polytech) ---
        if (action === 'eval1') {
            if (status === 'approved') {
                // Actualizar Status
                sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL1)).setValue('Approved');

                // Notificar Evaluador 2
                console.log(`Notifying Evaluator 2: ${CONFIG.EVALUADOR_2_EMAIL}`);
                const htmlEval2 = getEmailTemplate('Evaluator 2 - Technical Interview', candidateData, webAppUrl, 'eval2');

                if (safeSendEmail(CONFIG.EVALUADOR_2_EMAIL, `[EVAL 2] Technical Interview: ${candidateData.Name}`, htmlEval2)) {
                    sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL2)).setValue('Pending');
                    return renderMessage("✅ Profile Approved! Evaluator 2 has been notified.", "Success");
                } else {
                    return renderMessage("⚠️ Approved, but failed to email Evaluator 2.", "Warning");
                }
            } else {
                return renderRejectionForm(row, 'eval1', candidateData.Name, candidateData.Email, webAppUrl);
            }
        }

        // --- EVALUADOR 2 (TMark) ---
        if (action === 'eval2') {
            if (status === 'approved') {
                // "Approved" aquí significa ir a Agendar
                return renderScheduleForm(row, { name: candidateData.Name, email: candidateData.Email }, webAppUrl);
            } else {
                return renderRejectionForm(row, 'eval2', candidateData.Name, candidateData.Email, webAppUrl);
            }
        }

        // --- EVALUADOR 3 (Cliente Final) ---
        if (action === 'eval3') {
            if (status === 'approved') {
                sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL3)).setValue('Approved');
                return renderMessage("✅ Candidate Final Approval Recorded!", "Success");
            } else {
                return renderRejectionForm(row, 'eval3', candidateData.Name, candidateData.Email, webAppUrl);
            }
        }

        return renderMessage("Unknown Action", "Error");

    } catch (error) {
        console.error(error);
        return renderMessage("Error: " + error.message, "Error");
    }
}

// ==========================================
// 4. LÓGICA DE FORMULARIOS INTERNOS
// ==========================================

function handleFormActions(e) {
    const params = e.parameter;
    const action = params.form_action;
    const webAppUrl = ScriptApp.getService().getUrl().replace('/dev', '/exec');
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_APPLICATIONS);
    const row = parseInt(params.row);

    // --- RECHAZOS ---
    if (action === 'process_rejection') {
        const evalType = params.eval_type;
        const reason = params.reason;

        // Determinar columna de status
        let colName = (evalType === 'eval1') ? COL.STATUS_EVAL1 :
            (evalType === 'eval2') ? COL.STATUS_EVAL2 :
                COL.STATUS_EVAL3;

        sheet.getRange(row, getColumnIndex(sheet, colName)).setValue('Rejected');
        sheet.getRange(row, getColumnIndex(sheet, COL.REJECTION_REASON)).setValue(reason);

        // Notificar Candidato
        const body = `
      <p>Hello ${params.candidate_name},</p>
      <p>Thank you for your interest. Unfortunately, we will not be proceeding with your application.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Best regards,<br>Polytech Recruitment Team</p>
    `;
        safeSendEmail(params.candidate_email, "Update on your application", body);

        return renderMessage("🚫 Candidate Rejected and Notified.", "Success");
    }

    // --- AGENDAMIENTO (SCHEDULE) ---
    if (action === 'process_schedule') {
        const interviewInfo = {
            date: params.interview_date,
            time: params.interview_time,
            link: params.meeting_link
        };

        const eval3Email = params.eval3_email;

        // 1. Invitación Candidato
        const htmlCand = getCandidateInviteTemplate(params.candidate_name, interviewInfo);
        safeSendEmail(params.candidate_email, `[INVITATION] Interview with Polytech`, htmlCand);

        // 2. Confirmación Evaluadores 1 y 2
        // Reconstruir objeto data simple
        const notifData = { Name: params.candidate_name, Position: "Candidate" };
        const htmlNotif = getNotificationTemplate("Interview Confirmed", notifData, interviewInfo, false);

        safeSendEmail(CONFIG.EVALUADOR_1_EMAIL, `[CONFIRMED] Interview: ${params.candidate_name}`, htmlNotif);
        safeSendEmail(CONFIG.EVALUADOR_2_EMAIL, `[CONFIRMED] Interview: ${params.candidate_name}`, htmlNotif);

        // 3. Notificar Eval 3 (Si existe)
        if (eval3Email && eval3Email.includes('@')) {
            sheet.getRange(row, getColumnIndex(sheet, COL.EMAIL_EVAL3)).setValue(eval3Email);
            sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL3)).setValue('Pending');

            // Recuperar datos completos para el template combinado
            const headers = sheet.getDataRange().getValues()[0];
            const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
            const getVal = (name) => {
                const idx = headers.findIndex(h => h.toString().toLowerCase().includes(name.toLowerCase()));
                return (idx !== -1 && rowData[idx] !== "") ? rowData[idx] : "N/A";
            };
            const fullData = {
                "Name": getVal(COL.NAME), "Email": params.candidate_email, "Phone": getVal(COL.PHONE),
                "Video": getVal(COL.VIDEO), "Resume": getVal(COL.RESUME), "Selfie": getVal(COL.SELFIE), "row": row,
                "Position": getVal(COL.POSITIONS), "Experience": rowData[COL.EXPERIENCE_IDX] || "N/A"
            };

            const htmlEval3 = getEvaluator3Template(fullData, interviewInfo, webAppUrl);
            safeSendEmail(eval3Email, `[EVAL 3] Candidate Review & Interview`, htmlEval3);

            return renderMessage("📅 Interview Scheduled! All parties (including Eval 3) notified.", "Success");
        }

        return renderMessage("📅 Interview Scheduled! Candidate and Evaluators notified.", "Success");
    }

    return renderMessage("Unknown Form Action", "Error");
}

// ==========================================
// 5. API DEL PORTAL (POLYTECH FUNCTIONS)
// ==========================================

function apiLogin(data) { // data = { email, password }
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_USERS);
    const rows = sheet.getDataRange().getValues();
    // Estructura User Sheet: Email(0), Password(1), Name(2), Role(3)
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] == data.email && rows[i][1] == data.password) {
            return createResponse({
                success: true,
                user: { email: rows[i][0], name: rows[i][2], role: rows[i][3] }
            });
        }
    }
    return createResponse({ error: true, message: "Invalid Credentials" });
}

function apiRegister(data) { // data = { email, password, name }
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_USERS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] == data.email) return createResponse({ error: true, message: "Email already exists" });
    }
    sheet.appendRow([data.email, data.password, data.name, 'candidate', new Date()]);
    return createResponse({ success: true, message: "User registered" });
}

function apiGetJobs(data) { // data = { admin: boolean }
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_JOBS);
    if (!sheet) return createResponse({ success: true, jobs: [] });

    const rows = sheet.getDataRange().getValues();
    // Estructura Jobs: ID, Title, Location, Type, Description, Active, Created
    const jobs = rows.slice(1).map(r => ({
        id: r[0], title: r[1], location: r[2], type: r[3], description: r[4], active: r[5], createdAt: r[6]
    })).filter(j => data.admin || (j.active === true || j.active === 'TRUE'));

    return createResponse({ success: true, jobs: jobs });
}

function apiSaveJob(data) { // Create/Update Job
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_JOBS);
    const id = data.id || Utilities.getUuid();
    // Simplificado: Siempre crea nuevo. Para editar se requeriría búsqueda por ID.
    sheet.appendRow([id, data.title, data.location, data.type, data.description, true, new Date()]);
    return createResponse({ success: true, message: "Job Saved" });
}

function apiApply(data) { // { email, jobId, answers... }
    // Llamado desde el portal web personalizado
    // Debería insertar en SHEET_NAME_APPLICATIONS
    return createResponse({ success: true, message: "Application Logic Placeholder (Use Google Form normally)" });
}

function apiCheckStatus(data) { // { email }
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME_APPLICATIONS);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];

    const emailIdx = headers.indexOf(COL.EMAIL); // Buscar columna Email
    const statusIdx = headers.indexOf(COL.STATUS_EVAL1);

    if (emailIdx === -1) return createResponse({ error: true, message: "Config Error: Email col not found" });

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][emailIdx] == data.email) {
            return createResponse({
                success: true,
                status: rows[i][statusIdx] || "In Review",
                step: "Initial Screening"
            });
        }
    }
    return createResponse({ error: true, message: "No application found for this email" });
}

// ==========================================
// 6. TRIGGER AUTOMATICO (GOOGLE FORMS)
// ==========================================

function onFormSubmit(e) {
    console.log("► New Form Submission");
    try {
        const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_APPLICATIONS);
        ensureColumns(sheet);

        // Obtener Fila
        let row, rowData;
        const headers = sheet.getDataRange().getValues()[0];

        if (e && e.range) {
            row = e.range.getRow();
            rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
        } else {
            row = sheet.getLastRow();
            rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
        }

        const getVal = (name) => {
            const idx = headers.findIndex(h => h.toString().toLowerCase().includes(name.toLowerCase()));
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

        const webAppUrl = ScriptApp.getService().getUrl().replace('/dev', '/exec');
        const htmlBody = getEmailTemplate('Evaluator 1 - Profile Review', candidateData, webAppUrl, 'eval1');

        safeSendEmail(CONFIG.EVALUADOR_1_EMAIL, `[NEW] Candidate: ${candidateData.Name}`, htmlBody);
        sheet.getRange(row, getColumnIndex(sheet, COL.STATUS_EVAL1)).setValue('Pending');
        console.log("✓ Email sent to Eval 1");

    } catch (error) {
        console.error(error);
    }
}

// ==========================================
// 7. TEMPLATES HTML (EMAILS)
// ==========================================

function getEmailTemplate(title, data, url, type) {
    let rows = "";
    let photoHtml = "";

    // Selfie
    if (data.Selfie && data.Selfie !== "N/A") {
        const selfieId = data.Selfie.match(/[-\w]{25,}/);
        if (selfieId) photoHtml = `<div style="text-align:center; margin-bottom:20px;"><img src="https://drive.google.com/uc?export=view&id=${selfieId}" style="width:120px; height:150px; object-fit:cover; border-radius:8px; border:2px solid ${THEME.border};"></div>`;
    }

    // Data Rows
    for (let key in data) {
        if (!['row', 'Resume', 'Video', 'Photo', 'Selfie', 'Phone'].includes(key)) {
            rows += `<tr><td style="padding:10px;color:${THEME.muted}">${key}</td><td style="color:${THEME.text}">${data[key]}</td></tr>`;
        }
    }

    // WhatsApp Link (Green Text)
    let waLink = "";
    if (data.Phone && data.Phone !== "N/A") {
        const rawP = data.Phone.toString().replace(/\D/g, '');
        const finalP = rawP.length === 10 ? "57" + rawP : rawP;
        const firstName = data.Name ? data.Name.split(' ')[0] : 'Candidate';
        waLink = ` | <a href="https://wa.me/${finalP}?text=${encodeURIComponent(`Hello ${firstName}...`)}" target="_blank" style="color:${THEME.whatsapp}; font-weight:bold; text-decoration:none;">WHATSAPP</a>`;
    }

    // Button Label (Schedule vs Approve)
    const btnLabel = (type === 'eval2') ? 'SCHEDULE' : 'APPROVE';

    // Usamos <a> tags en lugar de <button> para compatibilidad Email
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
        <a href="${url}?action=${type}&status=approved&row=${data.row}" style="background:${THEME.primary};color:white;padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;display:block;">${btnLabel}</a>
        <a href="${url}?action=${type}&status=rejected&row=${data.row}" style="border:1px solid ${THEME.error};background:transparent;color:${THEME.error};padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;display:block;">REJECT</a>
      </div>
    </div>
  </div>`;
}

function getEvaluator3Template(candidateData, interviewInfo, url) {
    // Similar logic to above but combined
    let photoHtml = "";
    if (candidateData.Selfie && candidateData.Selfie !== "N/A") {
        const selfieId = candidateData.Selfie.match(/[-\w]{25,}/);
        if (selfieId) photoHtml = `<div style="text-align:center; margin-bottom:20px;"><img src="https://drive.google.com/uc?export=view&id=${selfieId}" style="width:120px; height:150px;object-fit:cover;border-radius:8px;border:2px solid ${THEME.border};"></div>`;
    }

    let rows = "";
    for (let key in candidateData) {
        if (!['row', 'Resume', 'Video', 'Photo', 'Selfie', 'Phone'].includes(key)) {
            rows += `<tr><td style="padding:10px;color:${THEME.muted}">${key}</td><td style="color:${THEME.text}">${candidateData[key]}</td></tr>`;
        }
    }

    let waLink = "";
    if (candidateData.Phone && candidateData.Phone !== "N/A") {
        const rawP = candidateData.Phone.toString().replace(/\D/g, '');
        const finalP = rawP.length === 10 ? "57" + rawP : rawP;
        waLink = ` | <a href="https://wa.me/${finalP}" target="_blank" style="color:${THEME.whatsapp}; font-weight:bold; text-decoration:none;">WHATSAPP</a>`;
    }

    return `<div style="background:${THEME.bg};padding:25px;font-family:sans-serif;">
    <div style="background:${THEME.surface};border:1px solid ${THEME.border};border-radius:12px;padding:25px;max-width:500px;margin:0 auto;">
      <h2 style="color:${THEME.primary};text-align:center">Evaluator 3 - Assessment</h2>
      ${photoHtml}
      <table style="width:100%">${rows}</table>
      <div style="text-align:center;margin:20px 0; font-size: 0.85rem;">
        ${candidateData.Resume ? `<a href="${candidateData.Resume}" style="color:${THEME.primary}; font-weight:bold; text-decoration:none;">RESUME</a> | ` : ''}
        ${candidateData.Video ? `<a href="${candidateData.Video}" style="color:${THEME.primary}; font-weight:bold; text-decoration:none;">VIDEO</a>` : ''}
        ${waLink}
      </div>
      
      <div style="border-top:1px solid ${THEME.border};margin:20px 0;"></div>
      
      <h3 style="color:${THEME.primary};text-align:center;">Interview Details</h3>
      <div style="background:rgba(113,100,240,0.1);padding:15px;border-radius:8px;margin-bottom:20px;">
        <p style="margin:5px 0;color:${THEME.text}"><strong>Date:</strong> ${interviewInfo.date}</p>
        <p style="margin:5px 0;color:${THEME.text}"><strong>Time:</strong> ${interviewInfo.time}</p>
        <p style="margin:5px 0;"><a href="${interviewInfo.link}" style="color:${THEME.primary};font-weight:bold;">[ JOIN MEETING ]</a></p>
      </div>

      <div style="display:flex;gap:10px;">
        <a href="${url}?action=eval3&status=approved&row=${candidateData.row}" style="background:${THEME.primary};color:white;padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;display:block;">APPROVE</a>
        <a href="${url}?action=eval3&status=rejected&row=${candidateData.row}" style="border:1px solid ${THEME.error};background:transparent;color:${THEME.error};padding:12px;flex:1;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;display:block;">REJECT</a>
      </div>
    </div>
  </div>`;
}

function getCandidateInviteTemplate(name, info) {
    const firstName = name ? name.split(' ')[0] : name;
    return `<div style="background:${THEME.bg};padding:30px;font-family:sans-serif;color:${THEME.text};">
    <div style="max-width:500px;margin:0 auto;background:${THEME.surface};border-radius:12px;padding:30px;">
      <h2 style="color:${THEME.primary};text-align:center;">Interview Invitation</h2>
      <p>Hello ${firstName},</p>
      <p>We are pleased to invite you to an interview:</p>
      <div style="background:rgba(113,100,240,0.1);padding:20px;border-radius:8px;margin:20px 0;">
        <p><strong>Date:</strong> ${info.date}</p>
        <p><strong>Time:</strong> ${info.time}</p>
        <p><a href="${info.link}" style="color:${THEME.primary};font-weight:bold;">[ JOIN MEETING ]</a></p>
      </div>
      <div style="text-align:center;margin-top:20px;">
        <a href="https://wa.me/${CONFIG.RECRUITMENT_WHATSAPP}" style="color:${THEME.whatsapp};font-weight:bold;text-decoration:none;border:1px solid ${THEME.whatsapp};padding:10px 20px;border-radius:8px;">CONTACT VIA WHATSAPP</a>
      </div>
    </div>
  </div>`;
}

function getNotificationTemplate(title, data, info, showWhatsApp) {
    return `<div>${title}: ${data.Name}. Data: ${info.date} ${info.time}. Link: ${info.link}</div>`;
}

// ==========================================
// 8. HELPERS & RENDERERS (FORMS)
// ==========================================

function renderRejectionForm(row, evalType, name, email, url) {
    return HtmlService.createHtmlOutput(`
     <html><body style="background:${THEME.bg};color:${THEME.text};font-family:sans-serif;display:flex;justify-content:center;padding-top:50px;">
       <form action="${url}" method="post" style="background:${THEME.surface};padding:30px;border-radius:12px;border:1px solid ${THEME.border};width:90%;max-width:400px;">
         <h3 style="color:${THEME.error};margin-top:0;text-align:center;">Reject Candidate</h3>
         <p style="text-align:center;">Candidate: <strong>${name}</strong></p>
         
         <input type="hidden" name="form_action" value="process_rejection">
         <input type="hidden" name="eval_type" value="${evalType}">
         <input type="hidden" name="row" value="${row}">
         <input type="hidden" name="candidate_email" value="${email}">
         <input type="hidden" name="candidate_name" value="${name}">
         
         <label style="display:block;margin:15px 0 5px 0;color:${THEME.muted};font-size:0.9rem;">Reason for rejection:</label>
         <textarea name="reason" style="width:100%;height:100px;background:#0d1117;border:1px solid ${THEME.border};color:white;border-radius:6px;padding:10px;box-sizing:border-box;" required></textarea>
         
         <button type="submit" style="background:${THEME.error};color:white;border:none;padding:12px;width:100%;border-radius:6px;font-weight:bold;cursor:pointer;margin-top:20px;">CONFIRM REJECTION</button>
       </form>
     </body></html>
   `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderScheduleForm(row, candidate, url) { // candidate={name, email}
    return HtmlService.createHtmlOutput(`
    <html><body style="background:${THEME.bg};color:${THEME.text};font-family:sans-serif;display:flex;justify-content:center;padding-top:30px;">
      <form action="${url}" method="post" style="background:${THEME.surface};padding:30px;border-radius:12px;border:1px solid ${THEME.border};width:90%;max-width:450px;">
        <h3 style="color:${THEME.primary};margin-top:0;text-align:center;">Schedule Interview</h3>
        <p style="text-align:center;margin-bottom:20px;">Candidate: <strong>${candidate.name}</strong></p>
        
        <input type="hidden" name="form_action" value="process_schedule">
        <input type="hidden" name="row" value="${row}">
        <input type="hidden" name="candidate_email" value="${candidate.email}">
        <input type="hidden" name="candidate_name" value="${candidate.name}">

        <div style="margin-bottom:15px;">
          <label style="display:block;margin-bottom:5px;color:${THEME.muted};font-size:0.85rem;">Date</label>
          <input type="date" name="interview_date" style="width:100%;padding:10px;background:#0d1117;border:1px solid ${THEME.border};color:white;border-radius:6px;box-sizing:border-box;" required>
        </div>

        <div style="margin-bottom:15px;">
          <label style="display:block;margin-bottom:5px;color:${THEME.muted};font-size:0.85rem;">Time</label>
          <input type="time" name="interview_time" style="width:100%;padding:10px;background:#0d1117;border:1px solid ${THEME.border};color:white;border-radius:6px;box-sizing:border-box;" required>
        </div>

        <div style="margin-bottom:15px;">
          <label style="display:block;margin-bottom:5px;color:${THEME.muted};font-size:0.85rem;">Meeting Link</label>
          <input type="text" name="meeting_link" placeholder="https://meet.google.com/..." style="width:100%;padding:10px;background:#0d1117;border:1px solid ${THEME.border};color:white;border-radius:6px;box-sizing:border-box;" required>
        </div>

        <div style="margin-bottom:25px;padding-top:15px;border-top:1px solid ${THEME.border};">
          <label style="display:block;margin-bottom:5px;color:${THEME.muted};font-size:0.85rem;">Evaluator 3 Email (Optional)</label>
          <input type="email" name="eval3_email" placeholder="client@company.com" style="width:100%;padding:10px;background:#0d1117;border:1px solid ${THEME.border};color:white;border-radius:6px;box-sizing:border-box;">
          <small style="color:${THEME.muted};font-size:0.75rem;">If added, they will receive the profile + interview details.</small>
        </div>

        <button type="submit" style="background:${THEME.primary};color:white;border:none;padding:12px;width:100%;border-radius:6px;font-weight:bold;cursor:pointer;">SCHEDULE & NOTIFY</button>
      </form>
    </body></html>
  `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderMessage(msg, type) {
    const color = type === 'Success' ? THEME.success : (type === 'Warning' ? '#d29922' : THEME.error);
    return HtmlService.createHtmlOutput(`<div style="background:${THEME.bg};color:${THEME.text};font-family:sans-serif;height:100vh;display:flex;justify-content:center;align-items:center;">
    <div style="background:${THEME.surface};padding:40px;border-radius:12px;border:1px solid ${color};text-align:center;">
      <h2 style="color:${color}">${msg}</h2>
      <p style="color:${THEME.muted}">You can close this window now.</p>
    </div>
  </div>`).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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

function safeSendEmail(recipient, subject, htmlBody) {
    try {
        if (MailApp.getRemainingDailyQuota() > 0) {
            GmailApp.sendEmail(recipient, subject, '', { htmlBody: htmlBody, name: CONFIG.APP_NAME });
            return true;
        }
    } catch (e) { console.error(e); }
    return false;
}

function createResponse(payload) {
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function setupDatabase() {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    [CONFIG.SHEET_NAME_USERS, CONFIG.SHEET_NAME_JOBS, CONFIG.SHEET_NAME_APPLICATIONS].forEach(n => {
        if (!ss.getSheetByName(n)) ss.insertSheet(n);
    });
    console.log("DB Setup Complete");
}
