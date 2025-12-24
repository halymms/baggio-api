const fetch = require('node-fetch');

async function test() {
    const baseUrl = 'http://localhost:3000/api/properfy/monthly-closing';
    const testData = {
        mes: 12,
        ano: 2025,
        sinais_negocio: 1000.50,
        comissoes_receber: 2000.75,
        comissoes_receber_prox_mes: 3000.00,
        observacao: 'Test Observation'
    };

    console.log('Testing Upsert...');
    try {
        const upsertRes = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        const upsertJson = await upsertRes.json();
        console.log('Upsert Response:', upsertJson);

        console.log('Testing Get...');
        const getRes = await fetch(`${baseUrl}?mes=12&ano=2025`);
        const getJson = await getRes.json();
        console.log('Get Response:', getJson);

        if (
            Number(getJson.sinais_negocio) === testData.sinais_negocio &&
            Number(getJson.comissoes_receber) === testData.comissoes_receber &&
            Number(getJson.comissoes_receber_prox_mes) === testData.comissoes_receber_prox_mes
        ) {
            console.log('PASSED: Data matches.');
        } else {
            console.log('FAILED: Data mismatch.');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

test();
