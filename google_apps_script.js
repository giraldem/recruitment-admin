// CONFIGURATION
// ¡IMPORTANTE! Crea una NUEVA Hoja de Cálculo y pega su ID aquí abajo:
const SHEET_ID = '110RrcE1J2DjznIXT4fhgs5LKjvvSNSrHdh-TIfeAcgA';

// Nombres de Pestañas (Se crearán con setupDatabase)
const SHEET_NAME_USERS = 'Usuarios';
const SHEET_NAME_JOBS = 'Vacantes';
const SHEET_NAME_APPLICATIONS = 'Postulaciones'; // Aquí caerán los datos (o Respuestas de Formulario)

// EMAILS PARA APROBACIONES
const EVALUADOR_1 = "cotidianoips@gmail.com";
const EVALUADOR_2 = "giraldem@gmail.com";

// COLUMNAS (Para el sistema de aprobación)
const COL_STATUS = 'Status';

/************************************************************
 * 0. SETUP
 ************************************************************/
function setupDatabase() {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // 1. Usuarios (Para el Login del Portal)
    let uSheet = ss.getSheetByName(SHEET_NAME_USERS);
    if (!uSheet) {
        uSheet = ss.insertSheet(SHEET_NAME_USERS);
        uSheet.appendRow(["Email", "Password", "Name", "Role", "Created At"]);
    }

    // 2. Vacantes (Para mostrar en la web)
    let jSheet = ss.getSheetByName(SHEET_NAME_JOBS);
    if (!jSheet) {
        jSheet = ss.insertSheet(SHEET_NAME_JOBS);
        jSheet.appendRow(["ID", "Title", "Location", "Type", "Description", "Active", "Created At"]);
    }

    // 3. Postulaciones (Si usas Google Forms, esta pestaña se creará sola al vincular. 
    // Si usas el Formulario Web directo, usamos esta estructura).
    let aSheet = ss.getSheetByName(SHEET_NAME_APPLICATIONS);
    if (!aSheet) {
        aSheet = ss.insertSheet(SHEET_NAME_APPLICATIONS);
        aSheet.appendRow([
            "Application ID", "Date", "Job ID",
            "Full Name", "Email", "Phone",
            "CV URL", "Work Certs", "Academic Certs", "ID Doc", "Passport", "Video",
            "Status", "Notes"
        ]);
    }

    console.log("✅ Base de datos configurada (Usuarios, Vacantes, Postulaciones).");
}

function setupTriggers() {
    // Limpia y crea el disparador para enviar correos al recibir postulaciones
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
        ScriptApp.deleteTrigger(triggers[i]);
    }
    ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(SHEET_ID).onFormSubmit().create();
    console.log("✅ Notificaciones activadas.");
}

/************************************************************
 * 1. API DEL PORTAL (doPost)
 ************************************************************/
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action || 'check_status';

        switch (action) {
            // Auth
            case 'login': return apiLogin(data);
            case 'register': return apiRegister(data);
            // Jobs
            case 'get_jobs': return apiGetJobs(data);
            case 'save_job': return apiSaveJob(data);
            case 'toggle_job': return apiToggleJob(data);
            // Candidates (Si se usa formulario web)
            case 'apply_job': return apiApply(data);
            case 'get_applications': return apiGetApplications(data); // NEW
            // Status Check
            case 'check_status': return apiCheckStatus(data);
            default: throw new Error("Acción desconocida: " + action);
        }
    } catch (error) {
        return createResponse({ error: true, message: error.message });
    }
}

// ... (Funciones de Login, Register, Jobs... siguen igual, resumido abajo)

function apiLogin(data) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME_USERS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] == data.email && rows[i][1] == data.password) {
            return createResponse({ success: true, user: { email: rows[i][0], name: rows[i][2], role: rows[i][3] } });
        }
    }
    return createResponse({ error: true, message: "Datos incorrectos" });
}

function apiRegister(data) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME_USERS);
    if (sheet.getDataRange().getValues().some(r => r[0] == data.email)) return createResponse({ error: true, message: "Usuario ya existe" });
    sheet.appendRow([data.email, data.password, data.name, 'user', new Date()]);
    return createResponse({ success: true, message: "Registrado" });
}

function apiGetJobs(data) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME_JOBS);
    const rows = sheet.getDataRange().getValues();
    const jobs = [];
    // Start from 1 to skip header
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        // If not admin, filter only active jobs
        // Check for boolean true or string 'true' (case insensitive)
        const isActive = (row[5] === true || String(row[5]).toLowerCase() === 'true');

        if (!data.admin && !isActive) continue;

        jobs.push({
            id: row[0],
            title: row[1],
            location: row[2],
            type: row[3],
            description: row[4],
            active: isActive
        });
    }
    return createResponse({ success: true, jobs: jobs });
}

function apiSaveJob(data) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME_JOBS);

    if (data.isNew || data.isNew === 'true') {
        const newId = 'JOB-' + Date.now();
        // ID, Title, Location, Type, Description, Active, Created At
        sheet.appendRow([newId, data.title, data.location, data.type, data.description, true, new Date()]);
        return createResponse({ success: true, message: "Vacante creada", id: newId });
    } else {
        // Edit existing
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][0]) === String(data.id)) {
                // Update columns (1-indexed for getRange, but i is 0-indexed relative to data)
                // Columns: Title(2), Location(3), Type(4), Description(5)
                const range = sheet.getRange(i + 1, 2, 1, 4);
                range.setValues([[data.title, data.location, data.type, data.description]]);
                return createResponse({ success: true, message: "Vacante actualizada" });
            }
        }
        return createResponse({ error: true, message: "Vacante no encontrada para editar" });
    }
}

function apiToggleJob(data) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME_JOBS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
            const currentStatus = rows[i][5]; // Column F (Active)
            const newStatus = !(currentStatus === true || String(currentStatus).toLowerCase() === 'true');
            sheet.getRange(i + 1, 6).setValue(newStatus);
            return createResponse({ success: true, message: "Estado actualizado", newState: newStatus });
        }
    }
    return createResponse({ error: true, message: "Vacante no encontrada" });
}

// 1.7 Aplicación Web (con Archivos Base64)
function apiApply(data) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME_APPLICATIONS);

    // Validar si sheet existe
    if (!sheet) return createResponse({ error: true, message: "Error interno: Hoja de aplicaciones no encontrada." });

    // Guardamos archivos en Drive (si vienen del web)
    const cvUrl = saveToDrive(data.cvFile, `CV_${data.fullName}`);
    const workUrl = saveToDrive(data.workFile, `WORK_${data.fullName}`);
    const acadUrl = saveToDrive(data.academicFile, `ACAD_${data.fullName}`);
    const idUrl = saveToDrive(data.idFile, `ID_${data.fullName}`);
    const passUrl = saveToDrive(data.passportFile, `PASS_${data.fullName}`);
    const videoUrl = data.videoUrl || saveToDrive(data.videoFile, `VIDEO_${data.fullName}`);

    const appId = 'APP-' + Date.now();
    sheet.appendRow([
        appId, new Date(), data.jobId, data.fullName, data.email, data.phone,
        cvUrl, workUrl, acadUrl, idUrl, passUrl, videoUrl,
        'Recibido', ''
    ]);

    // Enviar notificación opcional
    try {
        GmailApp.sendEmail(EVALUADOR_1, `Nueva Postulación: ${data.fullName}`,
            `Se ha recibido una nueva postulación para la vacante ${data.jobId}.\nRevisa el Sheet para ver los adjuntos.`);
    } catch (e) { console.log("No se pudo enviar email: " + e.message); }

    return createResponse({ success: true, message: "Enviado con éxito" });
}

function apiGetApplications(data) {
    if (!data.admin) return createResponse({ error: true, message: "No autorizado" });

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME_APPLICATIONS);
    if (!sheet) return createResponse({ success: true, applications: [] });

    const rows = sheet.getDataRange().getValues();
    const apps = [];
    // Skip Header
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        apps.push({
            appId: row[0],
            date: row[1],
            jobId: row[2],
            fullName: row[3],
            email: row[4],
            phone: row[5],
            cvUrl: row[6],
            workUrl: row[7],
            acadUrl: row[8],
            idUrl: row[9],
            status: row[12] // Column M
        });
    }
    // Return newest first
    return createResponse({ success: true, applications: apps.reverse() });
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

/************************************************************
 * 2. CONSULTA DE ESTADO (Compatible con Forms o Web)
 ************************************************************/
function apiCheckStatus(data) {
    // Buscamos en la hoja de aplicaciones
    // OJO: Si usas Google Forms, el nombre de la hoja será algo como "Respuestas de formulario 1"
    // Debes asegurarte de que SHEET_NAME_APPLICATIONS coincida o actualizarlo.
    return createResponse(lookupStatus(data.email));
}

function lookupStatus(email) {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    // Intentamos buscar en "Postulaciones" (Web) o "Respuestas de formulario 1" (Forms)
    let sheet = ss.getSheetByName(SHEET_NAME_APPLICATIONS);
    if (!sheet) sheet = ss.getSheets()[0]; // Fallback a la primera hoja si no encuentra el nombre exacto

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { status: 'not_found', message: 'Sin datos' };

    const headers = data[0];
    // Buscamos columnas inteligente
    const emailIndex = headers.findIndex(h => h.toString().toLowerCase().includes('mail') || h.toString().toLowerCase().includes('correo'));
    const statusIndex = headers.findIndex(h => h.toString().toLowerCase().includes('status') || h.toString().toLowerCase().includes('estado'));

    if (emailIndex === -1) return { status: 'error', message: 'Columna Email no encontrada' };

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowEmail = row[emailIndex] ? row[emailIndex].toString().toLowerCase().trim() : '';
        if (rowEmail === email.toLowerCase().trim()) {
            const status = (statusIndex !== -1 && row[statusIndex]) ? row[statusIndex] : 'Recibido';
            return { status: status, message: 'Estado: ' + status };
        }
    }
    return { status: 'not_found', message: 'No encontramos postulación.' };
}

function createResponse(payload) {
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

// 3. TRIGGER AL ENVIAR (Para Google Forms o Web App)
function onFormSubmit(e) {
    // Envia correo de notificación
    const sheet = e ? e.range.getSheet() : SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    const row = e ? e.range.getRow() : sheet.getLastRow();

    GmailApp.sendEmail(EVALUADOR_1, "Nueva Postulación Recibida", "Revisa la hoja de cálculo para ver los detalles y soportes.");
}
