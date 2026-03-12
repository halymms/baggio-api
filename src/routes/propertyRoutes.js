const express = require('express');
const { getPropertyReportList, getTerminatedContractReport, getRentalContractOptions } = require('../controllers/propertyController');
const router = express.Router();

router.get('/rental/contract/options', getRentalContractOptions);
router.post('/rental/contract/report/list', getPropertyReportList);
router.post('/rental/contract/terminated/list', getTerminatedContractReport);

module.exports = router;
