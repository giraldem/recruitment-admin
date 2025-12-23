// Global variables
let currentStep = 1;
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let bioVideoBlob = null;
let stepMediaBlobs = {}; // { 2: "blob...", 3: "blob..." }
let stepMediaTypes = {}; // { 2: "vid", 3: "aud" }
let recordingStates = {}; // { 2: false, 3: true }
let stepIntervals = {};
let bioTimerInterval = null;
let isRecordingBio = false;

// Expose functions to window for HTML onclick handlers
window.nextStep = function (n) {
    console.log(`Navigating from step-${currentStep} to step-${n}`);
    const currentElem = document.getElementById(`step-${currentStep}`);
    const nextElem = document.getElementById(`step-${n}`);
    if (currentElem) currentElem.classList.remove('active');
    if (nextElem) {
        nextElem.classList.add('active');
        currentStep = n;
        window.scrollTo(0, 0); // Scroll to top of the page
    } else {
        console.warn(`Step element step-${n} not found.`);
    }
};

window.prevStep = function (n) {
    console.log(`Navigating back from step-${currentStep} to step-${n}`);
    if (n === 0) return;
    const currentElem = document.getElementById(`step-${currentStep}`);
    const prevElem = document.getElementById(`step-${n}`);
    if (currentElem) currentElem.classList.remove('active');
    if (prevElem) {
        prevElem.classList.add('active');
        currentStep = n;
        window.scrollTo(0, 0); // Scroll to top of the page
    } else {
        console.warn(`Step element step-${n} not found.`);
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        console.log("Stopped media stream for previous step.");
    }
};

window.toggleBioRecording = async function () {
    const btn = document.getElementById('btn-record-bio');
    if (!btn) {
        console.error("Record bio button not found.");
        return;
    }

    if (!isRecordingBio) {
        console.log("Starting bio recording...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            mediaStream = stream;
            mediaRecorder = new MediaRecorder(stream);
            recordedChunks = [];
            mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                console.log("Bio recording stopped. Processing blob...");
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    bioVideoBlob = reader.result;
                    const preview = document.getElementById('bio-preview');
                    if (preview) {
                        preview.innerHTML = `<video src="${URL.createObjectURL(blob)}" controls></video>`;
                        preview.style.display = 'block';
                    } else {
                        console.warn("Bio preview element not found.");
                    }
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
                console.log("Bio stream tracks stopped.");
            };
            mediaRecorder.start();
            isRecordingBio = true;
            btn.textContent = 'Detener';
            btn.style.background = 'var(--error)';
            const indicator = document.getElementById('bio-rec-indicator');
            if (indicator) indicator.style.display = 'flex';
            startBioTimer();
        } catch (err) {
            alert("Error al iniciar la grabación del bio: " + err);
            console.error("Error starting bio recording:", err);
        }
    } else {
        console.log("Stopping bio recording...");
        if (mediaRecorder) mediaRecorder.stop();
        isRecordingBio = false;
        btn.textContent = 'Volver a Grabar';
        btn.style.background = 'var(--primary)';
        const indicator = document.getElementById('bio-rec-indicator');
        if (indicator) indicator.style.display = 'none';
        clearInterval(bioTimerInterval);
        console.log("Bio timer cleared.");
    }
};

function startBioTimer() {
    let sec = 0;
    const timerElem = document.getElementById('bio-timer');
    if (!timerElem) {
        console.warn("Bio timer element not found.");
        return;
    }
    bioTimerInterval = setInterval(() => {
        sec++;
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        timerElem.textContent = `${m}:${s}`;
    }, 1000);
    console.log("Bio timer started.");
}

window.toggleStepMedia = function (step, type) {
    console.log(`Toggling media type for step ${step} to ${type}`);
    stepMediaTypes[step] = type;
    document.querySelectorAll(`#step-${step} .media-btn`).forEach(b => b.classList.remove('active'));
    // Handle step 2/3 vs 4/5/6 ids if they differ, but unified now:
    const btnId = `btn-step${step}-${type}`;
    const mediaBtn = document.getElementById(btnId);
    if (mediaBtn) mediaBtn.classList.add('active');
    else console.warn(`Media button ${btnId} not found.`);

    const recorderUi = document.getElementById(`step${step}-recorder-ui`);
    if (recorderUi) recorderUi.style.display = 'block';
    else console.warn(`Recorder UI for step ${step} not found.`);

    const preview = document.getElementById(`step${step}-preview`);
    if (preview) preview.style.display = 'none';
};

window.toggleStepRecording = async function (step) {
    const btn = document.getElementById(`btn-record-step${step}`);
    if (!btn) {
        console.error(`Record button for step ${step} not found.`);
        return;
    }

    if (!recordingStates[step]) {
        console.log(`Starting recording for step ${step} (${stepMediaTypes[step]})...`);
        try {
            const constraints = { audio: true, video: stepMediaTypes[step] === 'vid' };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStream = stream;
            mediaRecorder = new MediaRecorder(stream);
            recordedChunks = [];
            mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                console.log(`Recording for step ${step} stopped. Processing blob...`);
                const blob = new Blob(recordedChunks, { type: stepMediaTypes[step] === 'vid' ? 'video/webm' : 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    stepMediaBlobs[step] = reader.result;
                    const preview = document.getElementById(`step${step}-preview`);
                    if (preview) {
                        preview.innerHTML = stepMediaTypes[step] === 'vid'
                            ? `<video src="${URL.createObjectURL(blob)}" controls></video>`
                            : `<audio src="${URL.createObjectURL(blob)}" controls></audio>`;
                        preview.style.display = 'block';
                    } else {
                        console.warn(`Preview element for step ${step} not found.`);
                    }
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
                console.log(`Stream tracks for step ${step} stopped.`);
            };
            mediaRecorder.start();
            recordingStates[step] = true;
            btn.textContent = 'Detener';
            btn.style.background = 'var(--error)';
            const indicator = document.getElementById(`step${step}-rec-indicator`);
            if (indicator) indicator.style.display = 'flex';
            startStepTimer(step);
        } catch (err) {
            alert(`Error al iniciar la grabación para el paso ${step}: ` + err);
            console.error(`Error starting recording for step ${step}:`, err);
        }
    } else {
        console.log(`Stopping recording for step ${step}...`);
        if (mediaRecorder) mediaRecorder.stop();
        recordingStates[step] = false;
        btn.textContent = 'Grabar de nuevo';
        btn.style.background = 'var(--primary)';
        const indicator = document.getElementById(`step${step}-rec-indicator`);
        if (indicator) indicator.style.display = 'none';
        clearInterval(stepIntervals[step]);
        console.log(`Timer for step ${step} cleared.`);
    }
};

function startStepTimer(step) {
    let sec = 0;
    const timerElem = document.getElementById(`step${step}-timer`);
    if (!timerElem) {
        console.warn(`Timer element for step ${step} not found.`);
        return;
    }
    stepIntervals[step] = setInterval(() => {
        sec++;
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        timerElem.textContent = `${m}:${s}`;
    }, 1000);
    console.log(`Timer for step ${step} started.`);
}

async function submitForm() {
    console.log("Attempting to submit form...");
    const btnFinish = document.getElementById('btn-finish');
    if (btnFinish) {
        btnFinish.disabled = true;
        btnFinish.textContent = "Enviando...";
        btnFinish.style.opacity = '0.5';
    }

    const email = localStorage.getItem('userEmail');
    const q8_authorize_elem = document.getElementById('q8_authorize');
    const q9_display_elem = document.getElementById('q9_display');

    const data = {
        action: 'save_testimonial',
        email: email,
        q8_authorize: q8_authorize_elem ? q8_authorize_elem.value : 'N/A',
        q9_display: q9_display_elem ? q9_display_elem.value : 'N/A',
        consent_accepted: true
    };

    // Steps 2-5 Multimedia (Renumbered)
    // Original steps were 2, 3, 4, 5, 6. Step 5 was removed, so original step 6 became new step 5.
    // The loop covers new steps 2, 3, 4, 5.
    for (let i = 2; i <= 5; i++) {
        if (stepMediaBlobs[i]) {
            data[`step${i}Media`] = {
                data: stepMediaBlobs[i].split(',')[1],
                mimeType: stepMediaTypes[i] === 'vid' ? 'video/webm' : 'audio/webm'
            };
            console.log(`Added media for step ${i} to submission data.`);
        }
    }

    // Bio Video
    if (bioVideoBlob) {
        data.bioVideo = { data: bioVideoBlob.split(',')[1], mimeType: 'video/webm' };
        console.log("Added bio video to submission data.");
    }

    try {
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwxXhPZDRv6A04NN7XgzCoW6JHpz1cAoCKLOJrDKNPnloR8I3LenpRxSab-I2l8PbEf/exec';
        console.log("Sending data to Google Apps Script:", data);

        // We use nextStep('final') after successful fetch
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for Google Apps Script as it doesn't send CORS headers
            body: JSON.stringify(data)
        });

        console.log("Form submission initiated. Response (no-cors mode):", response);
        nextStep('final');
    } catch (err) {
        alert("Error al enviar el formulario: " + err);
        console.error("Error submitting form:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Initializing application.");
    // Ensure the first step is active on load
    const firstStepElem = document.getElementById('step-1');
    if (firstStepElem) {
        firstStepElem.classList.add('active');
    } else {
        console.error("Initial step-1 element not found.");
    }

    // Step 5 is video-only
    stepMediaTypes[5] = 'vid';
});
