const express = require('express');
const { getPropertyReportList, getTerminatedContractReport, getRemovedPropertyReport, getRentalContractOptions, getAdvertisedPropertyReport } = require('../controllers/propertyController');
const router = express.Router();

router.get('/rental/contract/options', getRentalContractOptions);
router.post('/rental/contract/report/list', getPropertyReportList);
router.post('/rental/contract/terminated/list', getTerminatedContractReport);
router.post('/property/property/report/list', getRemovedPropertyReport);
router.post('/property/property/report/advertised', getAdvertisedPropertyReport);

module.exports = router;
