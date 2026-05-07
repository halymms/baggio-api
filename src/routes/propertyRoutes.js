const express = require('express');
const {
    getPropertyReportList,
    getTerminatedContractReport,
    getRemovedPropertyReport,
    getRentalContractOptions,
    getAdvertisedPropertyReport,
    getActiveContractSummary,
    getActiveContractTimeseries,
    getTerminatedContractCount,
    getActivePropertyCount,
    getTerminatedTimeseries,
    getRemovedTimeseries,
} = require('../controllers/propertyController');
const router = express.Router();

router.get('/rental/contract/options', getRentalContractOptions);
router.post('/rental/contract/report/list', getPropertyReportList);
router.post('/rental/contract/terminated/list', getTerminatedContractReport);
router.post('/property/property/report/list', getRemovedPropertyReport);
router.post('/property/property/report/advertised', getAdvertisedPropertyReport);

router.post('/rental/contract/active/summary', getActiveContractSummary);
router.post('/rental/contract/active/timeseries', getActiveContractTimeseries);
router.post('/rental/contract/terminated/count', getTerminatedContractCount);
router.post('/rental/contract/terminated/timeseries', getTerminatedTimeseries);
router.post('/property/property/active/count', getActivePropertyCount);
router.post('/property/property/removed/timeseries', getRemovedTimeseries);

module.exports = router;
