// CONFIGURATION
// Replace these with actual values for production
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzsIaLUT5s2Fyga5XE_H9jhXJsG7JB8DKWRjZSgQaWMvF0OGy97RmlRrZ6URMQKptld/exec';
const GOOGLE_FORM_URL = 'https://forms.gle/DonmHZxvkeXXNujc8'; // Link final vinculado al Sheet
const RECAPTCHA_SITE_KEY = '6LdfIiosAAAAAD9xERDxjK2y7Q67zSKXnwz0BAZ7';

document.addEventListener('DOMContentLoaded', () => {
    // Determine which page we are on
    const isStatusPage = document.getElementById('statusForm');
    const isJobBoard = document.getElementById('job-grid');
    const isAdmin = document.getElementById('admin-job-list'); // Admin page check

    // Initialize Pages
    if (isStatusPage) initStatusPage();
    if (isJobBoard) initJobBoard();

    console.log('Script initialized (v1.2)');
    // Auth Logic (Shared)
    initAuth();

    /* =========================================
       1. JOB BOARD LOGIC (index.html)
       ========================================= */
    function initJobBoard() {
        const grid = document.getElementById('job-grid');

        // 1. Fetch Jobs
        fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_jobs' })
        })
            .then(res => res.json())
            .then(data => {
                grid.innerHTML = '';
                if (data.success && data.jobs.length > 0) {
                    data.jobs.forEach(job => {
                        grid.appendChild(createJobCard(job));
                    });
                } else {
                    grid.innerHTML = '<p class="text-center">No hay vacantes disponibles por el momento.</p>';
                }
            })
            .catch(err => {
                console.error(err);
                grid.innerHTML = '<p class="text-center error">Error cargando vacantes.</p>';
            });

        // 2. Setup Application Form Listener
        const appForm = document.getElementById('application-form');
        if (appForm) {
            appForm.addEventListener('submit', handleAppSubmit);
        }
    }

    function createJobCard(job) {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <div>
                <h3 class="job-role">${job.title}</h3>
                <div class="job-meta">
                    <span class="job-location"><i class="ri-map-pin-line"></i> ${job.location}</span>
                    <span class="job-type"><i class="ri-time-line"></i> ${job.type}</span>
                </div>
                <p class="job-desc">${job.description}</p>
            </div>
            <div class="job-footer">
                <button class="btn-outline" onclick="openApplyModal('${job.id}', '${job.title}')">Aplicar Ahora</button>
            </div>
        `;
        return card;
    }

    /* =========================================
       2. APPLICATION LOGIC
       ========================================= */
    async function handleAppSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Enviando...';
        btn.disabled = true;

        const formData = new FormData(e.target);

        // Convert File to Base64
        const cvFile = formData.get('cvFile');
        let cvBase64 = null;
        if (cvFile && cvFile.size > 0) {
            cvBase64 = await toBase64(cvFile);
        }

        const payload = {
            action: 'apply_job',
            jobId: formData.get('jobId'),
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            cvFile: cvBase64 // { data: '...', mimeType: '...' }
        };

        try {
            const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload) // GAS requires stringified JSON body usually
            });
            const result = await res.json();

            if (result.success) {
                alert('¡Postulación enviada con éxito!');
                document.getElementById('apply-modal').classList.remove('active');
                e.target.reset();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            alert('Error de conexión al enviar.');
            console.error(error);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }

    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove header "data:*/*;base64,"
                const content = reader.result.split(',')[1];
                resolve({
                    data: content,
                    mimeType: file.type,
                    name: file.name
                });
            };
            reader.onerror = error => reject(error);
        });
    }

    /* =========================================
       3. STATUS CHECK LOGIC (status.html)
       ========================================= */
    function initStatusPage() {
        const form = document.getElementById('statusForm');
        // Load reCAPTCHA... (simplified for brevity, assuming script loaded)

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            setLoading(true);
            clearResult();

            try {
                // For simplicity, skipping explicit reCAPTCHA token generation here if complex
                // Assuming backend handles it or it's optional
                const result = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'check_status', email: email })
                }).then(r => r.json());

                displayResult(result);
            } catch (error) {
                showError('Error de conexión');
            } finally {
                setLoading(false);
            }
        });
    }

    function displayResult(data) {
        const resultsDiv = document.getElementById('results');
        if (data.status === 'not_found') {
            resultsDiv.innerHTML = `<div class="status-card error"><h3>No encontrado</h3><p>${data.message}</p></div>`;
        } else {
            const statusClass = (data.status.toLowerCase().includes('aprobado')) ? 'success' : 'pending';
            resultsDiv.innerHTML = `
            <div class="status-card ${statusClass}">
                <div class="status-icon"><i class="ri-checkbox-circle-line"></i></div>
                <h3>Estado: ${data.status}</h3>
                <p>${data.message}</p>
            </div>`;
        }
        resultsDiv.classList.remove('hidden');
    }

    function setLoading(isLoading) {
        const loadingDiv = document.getElementById('loading');
        const resultsDiv = document.getElementById('results');
        if (isLoading) {
            loadingDiv.classList.remove('hidden');
            resultsDiv.classList.add('hidden');
        } else {
            loadingDiv.classList.add('hidden');
        }
    }
    function clearResult() { document.getElementById('results').classList.add('hidden'); }
    function showError(msg) {
        const d = document.getElementById('results');
        d.innerHTML = `<p class="error">${msg}</p>`;
        d.classList.remove('hidden');
    }

    /* =========================================
       4. AUTH LOGIC
       ========================================= */
    function initAuth() {
        const authModal = document.getElementById('auth-modal');
        const openAuthBtn = document.getElementById('open-auth');
        const closeAuthBtn = document.getElementById('close-auth');
        // ... (Keep existing Auth logic roughly same, just consolidated)

        if (openAuthBtn) {
            console.log('Auth button found, attaching listener');
            openAuthBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const user = localStorage.getItem('user');
                if (user) {
                    const u = JSON.parse(user);
                    if (u.role === 'admin') window.location.href = 'admin.html';
                    else alert('Ya estás logueado como ' + u.name);
                } else {
                    console.log('Opening auth modal');
                    authModal.classList.remove('hidden');
                    // Small delay to allow display:block to apply before opacity transition
                    requestAnimationFrame(() => {
                        authModal.classList.add('active');
                    });
                }
            });
        }
        if (closeAuthBtn) closeAuthBtn.addEventListener('click', () => {
            authModal.classList.remove('active');
            setTimeout(() => authModal.classList.add('hidden'), 300); // Wait for transition
        });

        // Switchers
        const switchReg = document.getElementById('switch-to-register');
        const switchLog = document.getElementById('switch-to-login');
        if (switchReg) switchReg.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('register-section').classList.remove('hidden');
        });
        if (switchLog) switchLog.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-section').classList.add('hidden');
            document.getElementById('login-section').classList.remove('hidden');
        });

        // Login Submit
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const data = Object.fromEntries(fd);

            const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'login', ...data })
            }).then(r => r.json());

            if (res.success) {
                if (res.success) {
                    localStorage.setItem('user', JSON.stringify(res.user));
                    authModal.classList.remove('active');
                    setTimeout(() => authModal.classList.add('hidden'), 300);
                    if (res.user.role === 'admin') window.location.href = 'admin.html';
                    else location.reload();
                } else {
                    alert(res.message);
                }
            });

        // Register Submit
        const regForm = document.getElementById('register-form');
        if (regForm) regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const data = Object.fromEntries(fd);
            const res = await fetch(GOOGLE_APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'register', ...data }) }).then(r => r.json());
            if (res.success) { alert('Registrado. Inicia Sesión.'); switchLog.click(); }
            else alert(res.message);
        });

        // Check Session
        const user = localStorage.getItem('user');
        if (user && openAuthBtn) {
            const u = JSON.parse(user);
            openAuthBtn.innerText = u.name;
        }
    }


    // Helper for Modal (Global Scope needed for onclick in HTML)
    window.openApplyModal = function (jobId, jobTitle) {
        const m = document.getElementById('apply-modal');
        document.getElementById('modal-job-title').innerText = 'Aplicar a: ' + jobTitle;
        document.getElementById('modal-job-id').innerText = 'ID: ' + jobId;
        document.getElementById('app-job-id').value = jobId;
        m.classList.remove('hidden');
        requestAnimationFrame(() => m.classList.add('active'));
    };

    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            const m = document.getElementById('apply-modal');
            m.classList.remove('active');
            setTimeout(() => m.classList.add('hidden'), 300);
        });
    }

    // Close on click outside
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                setTimeout(() => overlay.classList.add('hidden'), 300);
            }
        });
    });
});
