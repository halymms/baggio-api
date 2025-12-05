const express = require('express');
const router = express.Router();
const { properfyLogin, getProperfyRealTimeReport, getProperfyCollectTransaction, getProperfyOpenFinancialStatement, getProperfyOpenFinancialStatementAllPages } = require('../controllers/properfyController');
const { getItemData, upsertItemData } = require('../controllers/realtimeReportController');
// Rotas para dados de planejado do item

router.get('/properfy/item-data/:item_id', getItemData);
router.post('/properfy/item-data/:item_id', upsertItemData);
router.put('/properfy/item-data/:item_id', upsertItemData);





router.post('/properfy/login', properfyLogin);
router.post('/properfy/real-time-report', getProperfyRealTimeReport);
router.get('/properfy/collect-transaction', getProperfyCollectTransaction);
router.post('/properfy/open-financial-statement', getProperfyOpenFinancialStatement);
router.post('/properfy/open-financial-statement/all', getProperfyOpenFinancialStatementAllPages);

module.exports = router;
