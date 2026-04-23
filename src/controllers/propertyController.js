const { getProperfyToken } = require("./properfyController");

const MONTH_NAMES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const getPropertyReportList = async (req, res) => {
    try {
        const token = await getProperfyToken();
        if (!token) {
            return res.status(401).json({ error: 'Login inválido na Properfy' });
        }

        // Mês atual vindo do frontend
        const [currentStart, currentEnd] = req.body.dteStart;
        const currentDate = new Date(currentStart + 'T00:00:00');
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth(); // 0-indexed

        // Calcula o início dos últimos 6 meses (mês atual + 5 anteriores)
        const pad = (n) => String(n).padStart(2, '0');
        const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);
        const sixMonthStart = `${sixMonthsAgo.getFullYear()}-${pad(sixMonthsAgo.getMonth() + 1)}-01`;

        const expandedBody = { ...req.body, dteStart: [sixMonthStart, currentEnd], page: 1 };

        // Busca a primeira página para descobrir o total de páginas
        const firstResponse = await fetch('https://adm.baggioimoveis.com.br/api/rental/contract/report/list', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(expandedBody)
        });
        const firstResult = await firstResponse.json();
        const lastPage = firstResult.last_page || 1;

        // Monta todas as requisições em paralelo
        const requests = [];
        for (let page = 1; page <= lastPage; page++) {
            requests.push(
                fetch('https://adm.baggioimoveis.com.br/api/rental/contract/report/list', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ...req.body, dteStart: [sixMonthStart, currentEnd], page })
                }).then(res => res.json())
            );
        }

        const results = await Promise.all(requests);
        const allData = results.flatMap(r => r.data || []);

        // Stats (contractType, districts, guarantees, pcf, readjustments) apenas do mês atual
        const currentMonthData = allData.filter(item =>
            item.dteStart && item.dteStart >= currentStart && item.dteStart <= currentEnd
        );
        const formattedData = transformData(currentMonthData);

        // Últimos 6 meses: do mais antigo ao mais recente
        const lastMonths = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - i, 1);
            const monthKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
            const contractsAmount = allData.filter(item =>
                item.dteStart && item.dteStart.slice(0, 7) === monthKey
            ).length;
            lastMonths.push({ month: MONTH_NAMES_PT[d.getMonth()], contractsAmount });
        }

        res.json({ ...formattedData, lastMonths });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const transformData = (data) => {
    const guaranteesMap = new Map();
    const districtsMap = new Map();
    const contractTypeMap = new Map();
    data.forEach((item) => {
        const guarantee = item.guarantee?.type;
        const contract = item.chrContractType;
        const district = item.chrAddressDistrict;
        if (guarantee) {
            guaranteesMap.set(guarantee, (guaranteesMap.get(guarantee) ?? 0) + 1);
        }
        if (contract) {
            contractTypeMap.set(contract, (contractTypeMap.get(contract) ?? 0) + 1);
        }
        if (district) {
            districtsMap.set(district, (districtsMap.get(district) ?? 0) + 1);
        }
    });

    const pcfResult = data.reduce(
        (acc, item) => {
            if (item.pcf?.subscribed === true) {
                acc.ACTIVE++;
            } else if (item.pcf?.subscribed === false) {
                acc.INACTIVE++;
            }
            return acc;
        },
        { ACTIVE: 0, INACTIVE: 0 }
    );

    const readjustmentResult = data.reduce((acc, item) => {
        const date = item.dteLastReadjustment;
        if (!date) return acc;

        const monthKey = date.slice(0, 7);

        acc[monthKey] = (acc[monthKey] ?? 0) + 1;
        return acc;
    }, {});

    return {
        guarantees: Object.fromEntries(guaranteesMap),
        contractType: Object.fromEntries(contractTypeMap),
        districts: Object.fromEntries(districtsMap),
        data: data,
        pcf: pcfResult,
        readjustments: readjustmentResult
    }
}

const getTerminatedContractReport = async (req, res) => {
    try {
        const body = { ...req.body, chrStatus: ['TERMINATED'], page: 1 };
        const token = await getProperfyToken();
        if (!token) {
            return res.status(401).json({ error: 'Login inválido na Properfy' });
        }

        const firstResponse = await fetch('https://adm.baggioimoveis.com.br/api/rental/contract/report/list', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const firstResult = await firstResponse.json();
        const lastPage = firstResult.last_page || 1;

        const requests = [];
        for (let page = 1; page <= lastPage; page++) {
            const pageBody = { ...req.body, chrStatus: ['TERMINATED'], page };
            requests.push(
                fetch('https://adm.baggioimoveis.com.br/api/rental/contract/report/list', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(pageBody)
                }).then(res => res.json())
            );
        }

        const results = await Promise.all(requests);
        const allData = results.flatMap(r => r.data || []);

        res.json(transformTerminatedData(allData));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const transformTerminatedData = (data) => {
    const terminationReasonMap = new Map();
    const guaranteesMap = new Map();
    const contractTypeMap = new Map();

    data.forEach((item) => {
        const reason = item.chrTerminationReason;
        if (reason) {
            terminationReasonMap.set(reason, (terminationReasonMap.get(reason) ?? 0) + 1);
        }

        const guarantee = item.guarantee?.type;
        if (guarantee) {
            guaranteesMap.set(guarantee, (guaranteesMap.get(guarantee) ?? 0) + 1);
        }

        const contractType = item.chrContractType;
        if (contractType) {
            contractTypeMap.set(contractType, (contractTypeMap.get(contractType) ?? 0) + 1);
        }
    });

    return {
        terminationReasons: Object.fromEntries(terminationReasonMap),
        guarantees: Object.fromEntries(guaranteesMap),
        contractType: Object.fromEntries(contractTypeMap),
        data,
    };
};

const getRemovedPropertyReport = async (req, res) => {
    try {
        const body = { ...req.body, page: 1 };
        const token = await getProperfyToken();
        if (!token) {
            return res.status(401).json({ error: 'Login inválido na Properfy' });
        }

        const firstResponse = await fetch('https://adm.baggioimoveis.com.br/api/property/property/report/list', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const firstResult = await firstResponse.json();
        const lastPage = firstResult.last_page || 1;

        const requests = [];
        for (let page = 1; page <= lastPage; page++) {
            const pageBody = { ...req.body, page };
            requests.push(
                fetch('https://adm.baggioimoveis.com.br/api/property/property/report/list', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(pageBody)
                }).then(res => res.json())
            );
        }

        const results = await Promise.all(requests);
        const allData = results.flatMap(r => r.data || []);

        res.json(transformRemovedData(allData));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const transformRemovedData = (data) => {
    const statusMap = new Map();
    const terminationReasonMap = new Map();
    const purposesMap = new Map();

    data.forEach((item) => {
        const status = item.chrTransactionType;
        if (status) {
            statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
        }

        const reason = item.enlistment?.chrTerminationReason;
        if (reason) {
            terminationReasonMap.set(reason, (terminationReasonMap.get(reason) ?? 0) + 1);
        }

        const purpose = item.chrPurpose;
        if (purpose) {
            purposesMap.set(purpose, (purposesMap.get(purpose) ?? 0) + 1);
        }
    });

    const purposes = Object.fromEntries(purposesMap);
    purposes.TOTAL = Object.values(purposes).reduce((acc, v) => acc + v, 0);

    return {
        status: Object.fromEntries(statusMap),
        terminationReasons: Object.fromEntries(terminationReasonMap),
        purposes,
        data,
    };
};

const getAdvertisedPropertyReport = async (req, res) => {
    try {
        const token = await getProperfyToken();
        if (!token) {
            return res.status(401).json({ error: 'Login inválido na Properfy' });
        }

        const { dteNewListing } = req.body;
        const body = {
            activeContract: [],
            chrStatus: ['LISTED'],
            dteNewListing,
            page: 1,
        };

        const firstResponse = await fetch('https://adm.baggioimoveis.com.br/api/property/property/report/list', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const firstResult = await firstResponse.json();
        const lastPage = firstResult.last_page || 1;

        const requests = [];
        for (let page = 2; page <= lastPage; page++) {
            requests.push(
                fetch('https://adm.baggioimoveis.com.br/api/property/property/report/list', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ...body, page }),
                }).then(r => r.json())
            );
        }

        const otherResults = await Promise.all(requests);
        const allData = [firstResult, ...otherResults].flatMap(r => r.data || []);

        const pad = (n) => String(n).padStart(2, '0');
        const startDate = new Date(dteNewListing[0] + 'T00:00:00');
        const endDate = new Date(dteNewListing[1] + 'T00:00:00');

        const lastMonths = [];
        const d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (d <= endDate) {
            const monthKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
            const contractsAmount = allData.filter(item =>
                item.dtePublication && item.dtePublication.slice(0, 7) === monthKey
            ).length;
            lastMonths.push({ month: MONTH_NAMES_PT[d.getMonth()], contractsAmount });
            d.setMonth(d.getMonth() + 1);
        }

        // Filtra somente o mês atual para purposes
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
        const currentMonthData = allData.filter(item =>
            item.dtePublication && item.dtePublication.slice(0, 7) === currentMonthKey
        );

        const purposesMap = new Map();
        currentMonthData.forEach(item => {
            const purpose = item.chrPurpose;
            if (!purpose) return;
            const entry = purposesMap.get(purpose) || { amount: 0, value: 0 };
            entry.amount++;
            entry.value += item.dcmRentRawValue || 0;
            purposesMap.set(purpose, entry);
        });
        const purposes = Object.fromEntries(purposesMap);

        purposes.TOTAL = Object.values(purposes).reduce(
            (acc, p) => ({ amount: acc.amount + p.amount, value: acc.value + p.value }),
            { amount: 0, value: 0 }
        );

        res.json({ lastMonths, purposes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getRentalContractOptions = async (req, res) => {
    try {
        const token = await getProperfyToken();
        if (!token) {
            return res.status(401).json({ error: 'Login inválido na Properfy' });
        }

        const response = await fetch('https://adm.baggioimoveis.com.br/api/rental/contract/options', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getPropertyReportList, getTerminatedContractReport, getRemovedPropertyReport, getRentalContractOptions, getAdvertisedPropertyReport };