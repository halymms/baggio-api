const { getProperfyToken } = require("./properfyController");

const getPropertyReportList = async (req, res) => {
    try {
        const body = { ...req.body, page: 1 };
        const token = await getProperfyToken();
        if (!token) {
            return res.status(401).json({ error: 'Login inválido na Properfy' });
        }

        // Busca a primeira página para descobrir o total de páginas
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

        // Monta todas as requisições em paralelo
        const requests = [];
        for (let page = 1; page <= lastPage; page++) {
            const pageBody = { ...req.body, page };
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

        formattedData = transformData(allData);

        res.json(formattedData);
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

    data.forEach((item) => {
        const reason = item.chrTerminationReason;
        if (reason) {
            terminationReasonMap.set(reason, (terminationReasonMap.get(reason) ?? 0) + 1);
        }

        const guarantee = item.guarantee?.type;
        if (guarantee) {
            guaranteesMap.set(guarantee, (guaranteesMap.get(guarantee) ?? 0) + 1);
        }
    });

    return {
        terminationReasons: Object.fromEntries(terminationReasonMap),
        guarantees: Object.fromEntries(guaranteesMap),
        data,
    };
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

module.exports = { getPropertyReportList, getTerminatedContractReport, getRentalContractOptions };