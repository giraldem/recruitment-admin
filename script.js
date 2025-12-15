// CONFIGURATION
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbySm_pemkD4Vu_UcjPCKPGb9au1HW5GNzZ6WC5Ij7MVoPMS9wyJJ1RUBPLlyBkQBdYWPw/exec';

document.addEventListener('DOMContentLoaded', () => {

    const isStatusPage = document.getElementById('statusForm');
    const isJobBoard = document.getElementById('job-grid');

    if (isStatusPage) initStatusPage();
    if (isJobBoard) initJobBoard();
    initAuth();

    /* ================= JOB BOARD ================= */
    function initJobBoard() {
        const grid = document.getElementById('job-grid');

        fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_jobs' })
        })
        .then(res => res.json())
        .then(data => {
            grid.innerHTML = '';
            if (data.success && data.jobs.length) {
                data.jobs.forEach(job => grid.appendChild(createJobCard(job)));
            } else {
                grid.innerHTML = '<p>No hay vacantes disponibles.</p>';
            }
        })
        .catch(() => grid.innerHTML = '<p>Error cargando vacantes.</p>');

        const appForm = document.getElementById('application-form');
        if (appForm) appForm.addEventListener('submit', handleAppSubmit);
    }

    function createJobCard(job) {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <h3>${job.title}</h3>
            <p>${job.location} · ${job.type}</p>
            <p>${job.description}</p>
            <button onclick="openApplyModal('${job.id}','${job.title}')">Aplicar</button>
        `;
        return card;
    }

    /* ================= APPLY ================= */
    async function handleAppSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const cvFile = formData.get('cvFile');

        const payload = {
            action: 'apply_job',
            jobId: formData.get('jobId'),
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            cvFile: cvFile ? await toBase64(cvFile) : null
        };

        const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.success) {
            alert('Postulación enviada');
            document.getElementById('apply-modal').classList.remove('active');
            e.target.reset();
        } else {
            alert(res.message);
        }
    }

    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
                data: reader.result.split(',')[1],
                mimeType: file.type,
                name: file.name
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /* ================= STATUS ================= */
    function initStatusPage() {
        document.getElementById('statusForm').addEventListener('submit', async e => {
            e.preventDefault();
            const email = document.getElementById('email').value;

            const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check_status', email })
            }).then(r => r.json());

            document.getElementById('results').innerHTML =
                `<p>${res.message || res.status}</p>`;
        });
    }

    /* ================= AUTH ================= */
    function initAuth() {
        const authModal = document.getElementById('auth-modal');
        const openBtn = document.getElementById('open-auth');
        const closeBtn = document.getElementById('close-auth');

        if (openBtn) openBtn.onclick = e => {
            e.preventDefault();
            authModal.classList.remove('hidden');
            authModal.classList.add('active');
        };

        if (closeBtn) closeBtn.onclick = () => {
            authModal.classList.remove('active');
            setTimeout(() => authModal.classList.add('hidden'), 300);
        };

        /* LOGIN */
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.target));

                const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', ...data })
                }).then(r => r.json());

                if (res.success) {
                    localStorage.setItem('user', JSON.stringify(res.user));
                    location.reload();
                } else alert(res.message);
            });
        }

        /* REGISTER */
        const regForm = document.getElementById('register-form');
        if (regForm) {
            regForm.addEventListener('submit', async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.target));

                const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'register', ...data })
                }).then(r => r.json());

                alert(res.message || 'Registrado');
            });
        }
    }

    /* ================= MODAL ================= */
    window.openApplyModal = (id, title) => {
        document.getElementById('modal-job-title').innerText = title;
        document.getElementById('app-job-id').value = id;
        const m = document.getElementById('apply-modal');
        m.classList.remove('hidden');
        m.classList.add('active');
    };
});
