
const URL = 'https://script.google.com/macros/s/AKfycbyQyxPNO2D73WYPyEtY1HERcai0Nju9ix3CeFuNYUnTCoK_JCAxeKEqA93S4usY8jrv/exec';

const jobs = [
    { title: 'Maid', count: 18 },
    { title: 'Afternoon maid', count: 3 },
    { title: 'Cleaner', count: 4 },
    { title: 'Male cleaner', count: 3 },
    { title: 'Laundry worker', count: 2 },
    { title: 'Male laundry worker', count: 3 },
    { title: 'Worker for the working clothes/laundry', count: 2 },
    { title: 'Beach boy', count: 4 }
];

const commonValues = {
    basic: "EUR 820,00",
    travel: "EUR 50,00",
    bonus: "EUR 140,00",
    total: "EUR 1010,00"
};

async function createJob(job) {
    const description = `
Salario Básico: ${commonValues.basic}
Transporte: ${commonValues.travel}
Bono Temporada Alta (Jun-Sep): ${commonValues.bonus}
Total Mensual (Jun-Sep): ${commonValues.total}

Vacantes Disponibles: ${job.count}
    `.trim();

    const payload = {
        action: 'save_job',
        isNew: true, // Boolean true logic in GAS
        title: job.title,
        location: 'Skopje, Macedonia',
        type: 'Temporada (Jun-Sep)',
        description: description
    };

    console.log(`Creating ${job.title}...`);

    try {
        const res = await fetch(URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            redirect: 'follow'
        });
        const text = await res.text();
        // GAS sometimes returns HTML execution successful page if not ContentService, 
        // but our code uses ContentService so it should be JSON.
        // However, if there's a 302 redirect to the output, fetch might just follow it.
        try {
            const json = JSON.parse(text);
            console.log(`Result for ${job.title}:`, json);
        } catch (e) {
            console.log(`Result for ${job.title} (Raw):`, text);
        }
    } catch (e) {
        console.error(`Error creating ${job.title}:`, e);
    }
}

async function run() {
    for (const job of jobs) {
        await createJob(job);
        // Delay to be nice to the API
        await new Promise(r => setTimeout(r, 1500));
    }
}

run();
