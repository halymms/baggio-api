const express = require('express');
const router = express.Router();
const { properfyLogin, getProperfyRealTimeReport, getProperfyCollectTransaction, getProperfyOpenFinancialStatement, getProperfyOpenFinancialStatementAllPages, getProperfyOpenFinancialStatementDelinquency } = require('../controllers/properfyController');
const { getCashFlow, getWallets } = require('../controllers/cashFlowController');
const { getItemData, upsertItemData, getClosingData, upsertClosingData, getManagerCommission, upsertManagerCommission, getInnovationFund, upsertInnovationFund } = require('../controllers/realtimeReportController');
const { getReferencias, getInadimplencia, getFechamentos, getPagos, getAbertos, syncInadimplenciaHandler, syncReferenciaHandler, patchAbertoAtualizado, capturePagoDia1Handler, captureAbertoDia16Handler } = require('../controllers/inadimplenciaController');
// Rotas para dados de planejado do item

router.get('/properfy/item-data/:item_id', getItemData);
router.post('/properfy/item-data/:item_id', upsertItemData);
router.put('/properfy/item-data/:item_id', upsertItemData);

router.get('/properfy/monthly-closing', getClosingData);
router.post('/properfy/monthly-closing', upsertClosingData);
router.put('/properfy/monthly-closing', upsertClosingData);

router.get('/properfy/manager-commission', getManagerCommission);
router.post('/properfy/manager-commission', upsertManagerCommission);

router.get('/properfy/innovation-fund', getInnovationFund);
router.post('/properfy/innovation-fund', upsertInnovationFund);
router.put('/properfy/manager-commission', upsertManagerCommission);

router.post('/properfy/login', properfyLogin);
router.post('/properfy/real-time-report', getProperfyRealTimeReport);
router.get('/properfy/collect-transaction', getProperfyCollectTransaction);
router.get('/properfy/cash-flow', getCashFlow);
router.get('/properfy/wallets', getWallets);
router.post('/properfy/open-financial-statement', getProperfyOpenFinancialStatement);
router.post('/properfy/open-financial-statement/delinquency', getProperfyOpenFinancialStatementDelinquency);
router.post('/properfy/open-financial-statement/all', getProperfyOpenFinancialStatementAllPages);

router.get('/properfy/inadimplencia/referencias', getReferencias);
router.get('/properfy/inadimplencia/fechamentos', getFechamentos);
router.get('/properfy/inadimplencia/pagos', getPagos);
router.get('/properfy/inadimplencia/abertos', getAbertos);
router.get('/properfy/inadimplencia', getInadimplencia);
router.patch('/properfy/inadimplencia/aberto-atualizado', patchAbertoAtualizado);
router.post('/properfy/inadimplencia/sync', syncInadimplenciaHandler);
router.post('/properfy/inadimplencia/sync-referencia', syncReferenciaHandler);
router.post('/properfy/inadimplencia/capture/pago-dia-1', capturePagoDia1Handler);
router.post('/properfy/inadimplencia/capture/aberto-dia-16', captureAbertoDia16Handler);

module.exports = router;
