const fetch = require('node-fetch');
const { getProperfyToken } = require('../controllers/properfyController');
const InadimplenciaData = require('../models/inadimplenciaData');
const InadimplenciaFechamento = require('../models/inadimplenciaFechamento');
const {
  parseDteReference,
  parseBrDate,
  formatReferenciaLabel,
} = require('../utils/parseDteReference');

const PROPERFY_OPEN_FS_URL = 'https://adm.baggioimoveis.com.br/api/property/financial-statement/open-fs';
const WINDOW_MONTHS = 24;

const DELINQUENCY_FS_STATUS = [
  'PENDING_CHARGE_CREATION',
  'PENDING_REMITTANCE',
  'PENDING_RETURN',
  'GENERATING_BANKSLIP',
  'REGISTERED',
  'RETAINED_DELAYED',
  'RETAINED_CHARGE_NOT',
  'RETAINED_STATUS',
];

const PAID_FS_STATUS = ['PAID', 'PARTIALLY_PAID'];

function nowInBrazil(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  return {
    mes: Number(parts.find((part) => part.type === 'month').value),
    ano: Number(parts.find((part) => part.type === 'year').value),
  };
}

function shiftMonth(mes, ano, offset) {
  const date = new Date(Date.UTC(ano, mes - 1 + offset, 1));
  return {
    mes: date.getUTCMonth() + 1,
    ano: date.getUTCFullYear(),
  };
}

function getWindowStart(now = new Date()) {
  const current = nowInBrazil(now);
  return shiftMonth(current.mes, current.ano, -(WINDOW_MONTHS - 1));
}

function listWindowMonths(now = new Date()) {
  const current = nowInBrazil(now);
  const months = [];
  for (let offset = WINDOW_MONTHS - 1; offset >= 0; offset -= 1) {
    months.push(shiftMonth(current.mes, current.ano, -offset));
  }
  return months;
}

/** Referência cujo vencimento é o mês calendário informado. */
function referenceFromDueMonth(dueMes, dueAno) {
  return shiftMonth(dueMes, dueAno, -1);
}

/** Mês de vencimento da referência. */
function dueMonthFromReference(mes, ano) {
  return shiftMonth(mes, ano, 1);
}

/**
 * Dia 1: congela pago da referência cujo vencimento acabou no mês anterior.
 * Ex.: em 1/ago → Ref junho (vencto julho).
 */
function getReferenciaForPagoDia1(now = new Date()) {
  const current = nowInBrazil(now);
  return shiftMonth(current.mes, current.ano, -2);
}

/**
 * Dia 16: congela aberto da referência cujo vencimento é o mês corrente.
 * Ex.: em 16/jul → Ref junho (vcto julho).
 */
function getReferenciaForAbertoDia16(now = new Date()) {
  const current = nowInBrazil(now);
  return shiftMonth(current.mes, current.ano, -1);
}

function buildFsBody(mes, ano, fsStatuses, page = 1) {
  const monthIndex = mes - 1;
  const startDate = new Date(Date.UTC(ano, monthIndex, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(ano, monthIndex + 1, 0, 23, 59, 59));

  return {
    fkRenter: 0,
    chrType: [],
    chrStatus: [],
    chrFinancialStatus: [],
    chrFsStatus: fsStatuses,
    chrChargeMethod: [],
    fkBankAccount: 0,
    chrInsurance: [],
    dteDue: [startDate.toISOString(), endDate.toISOString()],
    dteDueOwner: [],
    dteSolved: [],
    dteSolvedOwner: [],
    chrAssurance: [],
    chrOrder: 'NAME',
    page,
    size: 50,
  };
}

async function fetchOpenFsAllPages(token, mes, ano, fsStatuses) {
  const firstResponse = await fetch(PROPERFY_OPEN_FS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildFsBody(mes, ano, fsStatuses, 1)),
  });
  const firstResult = await firstResponse.json();
  const lastPage = firstResult.last_page || 1;
  const pages = [firstResult];

  const remaining = [];
  for (let page = 2; page <= lastPage; page += 1) {
    remaining.push(
      fetch(PROPERFY_OPEN_FS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildFsBody(mes, ano, fsStatuses, page)),
      }).then((response) => response.json())
    );
  }

  if (remaining.length) {
    pages.push(...(await Promise.all(remaining)));
  }

  return pages.flatMap((result) => result.data || []);
}

function mapProperfyItem(item) {
  const fsId = Number(item.fsId);
  if (!fsId) return { skipReason: 'missing_fs_id' };

  const reference = parseDteReference(item.dteReference);
  if (!reference) return { skipReason: 'invalid_dte_reference' };

  return {
    row: {
      fs_id: fsId,
      mes_referencia: reference.mes,
      ano_referencia: reference.ano,
      dte_reference: reference.label,
      dte_due: parseBrDate(item.dteDue),
      chr_status: item.chrStatus || null,
      status_fs: item.statusFs || null,
      dcm_amount: item.dcmAmount != null ? Number(item.dcmAmount) : null,
      fk_contract: item.fkContract != null ? Number(item.fkContract) : null,
      status: item.status || null,
      status_fin: item.statusFin || null,
      chr_identifier: item.chrIdentifier || null,
      renter_name: item.renterName || null,
      renter_email: item.renterEmail || null,
      renter_phone: item.renterPhone || null,
      chr_bank: item.chrBank || null,
      bank_slip: item.bankSlip || null,
      raw_payload: item,
    },
  };
}

function sumAmounts(items) {
  return items.reduce((total, item) => {
    const amount = Number(item.dcmAmount);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

function aggregateByReference(items) {
  const map = new Map();

  for (const item of items) {
    const reference = parseDteReference(item.dteReference);
    if (!reference) continue;

    const key = `${reference.ano}-${reference.mes}`;
    const current = map.get(key) || {
      mes: reference.mes,
      ano: reference.ano,
      label: reference.label,
      total: 0,
      items: [],
    };
    const amount = Number(item.dcmAmount);
    current.total += Number.isFinite(amount) ? amount : 0;
    current.items.push(item);
    map.set(key, current);
  }

  return map;
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function calcPercent(aberto, pago) {
  const totalGerado = (Number(pago) || 0) + (Number(aberto) || 0);
  if (totalGerado <= 0) return null;
  return roundMoney(((Number(aberto) || 0) / totalGerado) * 100);
}

function enrichFechamentoRow(row) {
  if (!row) return null;

  const pagoDia1 = row.valor_pago_dia_1 != null ? Number(row.valor_pago_dia_1) : null;
  const abertoDia16 = row.valor_aberto_dia_16 != null ? Number(row.valor_aberto_dia_16) : null;
  const pagoAtual = row.valor_pago_atual != null ? Number(row.valor_pago_atual) : null;
  const abertoAtual = row.valor_aberto_atual != null ? Number(row.valor_aberto_atual) : null;
  const abertoAtualizado =
    row.valor_aberto_atualizado != null ? Number(row.valor_aberto_atualizado) : null;

  const totalGeradoFechamento =
    pagoDia1 != null && abertoDia16 != null ? roundMoney(pagoDia1 + abertoDia16) : null;
  const totalGeradoAtual =
    pagoAtual != null && abertoAtual != null ? roundMoney(pagoAtual + abertoAtual) : null;

  const totalGeradoBase =
    totalGeradoFechamento != null
      ? totalGeradoFechamento
      : totalGeradoAtual;

  return {
    ...row,
    valor_pago_dia_1: pagoDia1,
    valor_aberto_dia_16: abertoDia16,
    valor_pago_atual: pagoAtual,
    valor_aberto_atual: abertoAtual,
    valor_aberto_atualizado: abertoAtualizado,
    total_gerado_fechamento: totalGeradoFechamento,
    total_gerado_atual: totalGeradoAtual,
    inadimplencia_fechamento_pct: calcPercent(abertoDia16, pagoDia1),
    inadimplencia_atual_pct: calcPercent(abertoAtual, pagoAtual),
    inadimplencia_acumulada_atualizada_pct:
      abertoAtualizado != null && totalGeradoBase != null && totalGeradoBase > 0
        ? roundMoney((abertoAtualizado / totalGeradoBase) * 100)
        : null,
  };
}

function calcAcumulado12Meses(rows, now = new Date()) {
  const current = nowInBrazil(now);
  const endExclusive = shiftMonth(current.mes, current.ano, -2);
  const startInclusive = shiftMonth(endExclusive.mes, endExclusive.ano, -11);

  const startKey = startInclusive.ano * 12 + startInclusive.mes;
  const endKey = endExclusive.ano * 12 + endExclusive.mes;

  let sumAberto = 0;
  let sumGerado = 0;
  const included = [];

  for (const row of rows) {
    const key = row.ano_referencia * 12 + row.mes_referencia;
    if (key < startKey || key > endKey) continue;

    const pago =
      row.valor_pago_dia_1 != null
        ? Number(row.valor_pago_dia_1)
        : row.valor_pago_atual != null
          ? Number(row.valor_pago_atual)
          : null;
    const aberto =
      row.valor_aberto_dia_16 != null
        ? Number(row.valor_aberto_dia_16)
        : row.valor_aberto_atual != null
          ? Number(row.valor_aberto_atual)
          : null;

    if (pago == null || aberto == null) continue;

    sumAberto += aberto;
    sumGerado += pago + aberto;
    included.push({
      mes: row.mes_referencia,
      ano: row.ano_referencia,
      label: row.dte_reference,
    });
  }

  return {
    from: startInclusive,
    to: endExclusive,
    months_included: included.length,
    referencias: included,
    total_aberto: roundMoney(sumAberto),
    total_gerado: roundMoney(sumGerado),
    percentual: sumGerado > 0 ? roundMoney((sumAberto / sumGerado) * 100) : null,
  };
}

async function fetchTotalsForDueMonth(token, dueMes, dueAno) {
  const [paidItems, openItems] = await Promise.all([
    fetchOpenFsAllPages(token, dueMes, dueAno, PAID_FS_STATUS),
    fetchOpenFsAllPages(token, dueMes, dueAno, DELINQUENCY_FS_STATUS),
  ]);

  return {
    paidItems,
    openItems,
    paidByRef: aggregateByReference(paidItems),
    openByRef: aggregateByReference(openItems),
  };
}

async function applyTotalsFromDueMonth(token, dueMes, dueAno, options = {}) {
  const { persistOpenDetail = false } = options;
  const expectedRef = referenceFromDueMonth(dueMes, dueAno);
  const { paidByRef, openByRef, openItems } = await fetchTotalsForDueMonth(token, dueMes, dueAno);

  const paidBucket = paidByRef.get(`${expectedRef.ano}-${expectedRef.mes}`);
  const openBucket = openByRef.get(`${expectedRef.ano}-${expectedRef.mes}`);

  const valorPago = roundMoney(paidBucket ? paidBucket.total : 0);
  const valorAberto = roundMoney(openBucket ? openBucket.total : 0);
  const label = formatReferenciaLabel(expectedRef.mes, expectedRef.ano);

  const fechamento = await InadimplenciaFechamento.upsertCurrentTotals({
    mes: expectedRef.mes,
    ano: expectedRef.ano,
    label,
    valorPagoAtual: valorPago,
    valorAbertoAtual: valorAberto,
  });

  let detailCount = 0;
  if (persistOpenDetail) {
    const rows = [];
    for (const item of openItems) {
      const mapped = mapProperfyItem(item);
      if (!mapped.row) continue;
      if (
        mapped.row.mes_referencia !== expectedRef.mes ||
        mapped.row.ano_referencia !== expectedRef.ano
      ) {
        continue;
      }
      rows.push(mapped.row);
    }

    await InadimplenciaData.deleteByReferencia(expectedRef.mes, expectedRef.ano);
    detailCount = await InadimplenciaData.upsertBatch(rows);
  }

  return {
    referencia: expectedRef,
    label,
    valor_pago_atual: valorPago,
    valor_aberto_atual: valorAberto,
    detail_count: detailCount,
    fechamento: enrichFechamentoRow(fechamento),
  };
}

async function syncInadimplencia(now = new Date()) {
  const token = await getProperfyToken();
  if (!token) {
    throw new Error('Login inválido na Properfy');
  }

  const windowStart = getWindowStart(now);
  // Buscamos pelo mês de vencimento; a janela de referências cobre 24 meses,
  // então os vencimentos vão de (windowStart+1) até (current+1).
  const current = nowInBrazil(now);
  const dueStart = dueMonthFromReference(windowStart.mes, windowStart.ano);
  const dueEnd = dueMonthFromReference(current.mes, current.ano);
  const dueMonths = [];
  let cursor = { ...dueStart };
  while (cursor.ano * 12 + cursor.mes <= dueEnd.ano * 12 + dueEnd.mes) {
    dueMonths.push({ ...cursor });
    cursor = shiftMonth(cursor.mes, cursor.ano, 1);
  }

  const monthSummaries = [];
  let syncedDetail = 0;
  let skipped = 0;
  const touchedRefs = [];

  for (const { mes: dueMes, ano: dueAno } of dueMonths) {
    try {
      const [paidItems, openItems] = await Promise.all([
        fetchOpenFsAllPages(token, dueMes, dueAno, PAID_FS_STATUS),
        fetchOpenFsAllPages(token, dueMes, dueAno, DELINQUENCY_FS_STATUS),
      ]);

      const expectedRef = referenceFromDueMonth(dueMes, dueAno);
      const paidByRef = aggregateByReference(paidItems);
      const openByRef = aggregateByReference(openItems);
      const paidBucket = paidByRef.get(`${expectedRef.ano}-${expectedRef.mes}`);
      const openBucket = openByRef.get(`${expectedRef.ano}-${expectedRef.mes}`);

      const valorPago = roundMoney(paidBucket ? paidBucket.total : 0);
      const valorAberto = roundMoney(openBucket ? openBucket.total : 0);
      const label = formatReferenciaLabel(expectedRef.mes, expectedRef.ano);

      await InadimplenciaFechamento.upsertCurrentTotals({
        mes: expectedRef.mes,
        ano: expectedRef.ano,
        label,
        valorPagoAtual: valorPago,
        valorAbertoAtual: valorAberto,
      });

      const rows = [];
      for (const item of openItems) {
        const mapped = mapProperfyItem(item);
        if (!mapped.row) {
          skipped += 1;
          continue;
        }
        if (
          mapped.row.mes_referencia !== expectedRef.mes ||
          mapped.row.ano_referencia !== expectedRef.ano
        ) {
          continue;
        }
        rows.push(mapped.row);
      }

      await InadimplenciaData.deleteByReferencia(expectedRef.mes, expectedRef.ano);
      const upserted = await InadimplenciaData.upsertBatch(rows);
      syncedDetail += upserted;
      touchedRefs.push(expectedRef);

      monthSummaries.push({
        due_mes: dueMes,
        due_ano: dueAno,
        mes: expectedRef.mes,
        ano: expectedRef.ano,
        valor_pago_atual: valorPago,
        valor_aberto_atual: valorAberto,
        detail_count: upserted,
        error: null,
      });

      console.log(
        `[sync] vcto ${dueAno}-${String(dueMes).padStart(2, '0')} → ref ${label}: ` +
          `pago=${valorPago} aberto=${valorAberto} detalhe=${upserted}`
      );
    } catch (error) {
      monthSummaries.push({
        due_mes: dueMes,
        due_ano: dueAno,
        count: 0,
        error: error.message,
      });
      console.error(
        `[sync] vcto ${dueAno}-${String(dueMes).padStart(2, '0')}: falhou — ${error.message}`
      );
    }
  }

  const deletedDetail = await InadimplenciaData.deleteOutsideWindow(
    windowStart.mes,
    windowStart.ano
  );
  const deletedFechamento = await InadimplenciaFechamento.deleteOutsideWindow(
    windowStart.mes,
    windowStart.ano
  );

  return {
    synced: syncedDetail,
    skipped,
    deleted: deletedDetail,
    deleted_fechamento: deletedFechamento,
    months: monthSummaries,
    referencias: touchedRefs,
    window: {
      from: { mes: windowStart.mes, ano: windowStart.ano },
      to: { mes: current.mes, ano: current.ano },
    },
  };
}

async function syncReferenciaAtual(mes, ano) {
  const token = await getProperfyToken();
  if (!token) {
    throw new Error('Login inválido na Properfy');
  }

  const due = dueMonthFromReference(mes, ano);
  return applyTotalsFromDueMonth(token, due.mes, due.ano, { persistOpenDetail: true });
}

async function capturePagoDia1(now = new Date()) {
  const token = await getProperfyToken();
  if (!token) {
    throw new Error('Login inválido na Properfy');
  }

  const ref = getReferenciaForPagoDia1(now);
  const due = dueMonthFromReference(ref.mes, ref.ano);
  const totals = await applyTotalsFromDueMonth(token, due.mes, due.ano, {
    persistOpenDetail: false,
  });

  const existing = await InadimplenciaFechamento.findByReferencia(ref.mes, ref.ano);
  const alreadyFrozen = existing && existing.valor_pago_dia_1 != null;

  const fechamento = await InadimplenciaFechamento.freezePagoDia1({
    mes: ref.mes,
    ano: ref.ano,
    label: totals.label,
    valor: totals.valor_pago_atual,
  });

  return {
    snapshot: 'pago_dia_1',
    already_frozen: alreadyFrozen,
    referencia: ref,
    valor: totals.valor_pago_atual,
    fechamento: enrichFechamentoRow(fechamento),
  };
}

async function captureAbertoDia16(now = new Date()) {
  const token = await getProperfyToken();
  if (!token) {
    throw new Error('Login inválido na Properfy');
  }

  const ref = getReferenciaForAbertoDia16(now);
  const due = dueMonthFromReference(ref.mes, ref.ano);
  const totals = await applyTotalsFromDueMonth(token, due.mes, due.ano, {
    persistOpenDetail: true,
  });

  const existing = await InadimplenciaFechamento.findByReferencia(ref.mes, ref.ano);
  const alreadyFrozen = existing && existing.valor_aberto_dia_16 != null;

  const fechamento = await InadimplenciaFechamento.freezeAbertoDia16({
    mes: ref.mes,
    ano: ref.ano,
    label: totals.label,
    valor: totals.valor_aberto_atual,
  });

  return {
    snapshot: 'aberto_dia_16',
    already_frozen: alreadyFrozen,
    referencia: ref,
    valor: totals.valor_aberto_atual,
    detail_count: totals.detail_count,
    fechamento: enrichFechamentoRow(fechamento),
  };
}

function pickPagosFields(row) {
  const enriched = enrichFechamentoRow(row);
  if (!enriched) return null;
  return {
    mes_referencia: enriched.mes_referencia,
    ano_referencia: enriched.ano_referencia,
    dte_reference: enriched.dte_reference,
    valor_pago_dia_1: enriched.valor_pago_dia_1,
    valor_pago_atual: enriched.valor_pago_atual,
    pago_dia_1_captured_at: enriched.pago_dia_1_captured_at || null,
    synced_at: enriched.synced_at || null,
    chrFsStatus: PAID_FS_STATUS,
  };
}

function pickAbertosFields(row) {
  const enriched = enrichFechamentoRow(row);
  if (!enriched) return null;
  return {
    mes_referencia: enriched.mes_referencia,
    ano_referencia: enriched.ano_referencia,
    dte_reference: enriched.dte_reference,
    valor_aberto_dia_16: enriched.valor_aberto_dia_16,
    valor_aberto_atual: enriched.valor_aberto_atual,
    valor_aberto_atualizado: enriched.valor_aberto_atualizado,
    aberto_dia_16_captured_at: enriched.aberto_dia_16_captured_at || null,
    aberto_atualizado_at: enriched.aberto_atualizado_at || null,
    synced_at: enriched.synced_at || null,
    inadimplencia_fechamento_pct: enriched.inadimplencia_fechamento_pct,
    inadimplencia_atual_pct: enriched.inadimplencia_atual_pct,
    inadimplencia_acumulada_atualizada_pct: enriched.inadimplencia_acumulada_atualizada_pct,
    chrFsStatus: DELINQUENCY_FS_STATUS,
  };
}

async function fetchPaidItemsForReferencia(mes, ano) {
  const token = await getProperfyToken();
  if (!token) {
    throw new Error('Login inválido na Properfy');
  }

  const due = dueMonthFromReference(mes, ano);
  const paidItems = await fetchOpenFsAllPages(token, due.mes, due.ano, PAID_FS_STATUS);
  const rows = [];
  let total = 0;

  for (const item of paidItems) {
    const mapped = mapProperfyItem(item);
    if (!mapped.row) continue;
    if (mapped.row.mes_referencia !== mes || mapped.row.ano_referencia !== ano) continue;
    rows.push(mapped.row);
    const amount = Number(mapped.row.dcm_amount);
    total += Number.isFinite(amount) ? amount : 0;
  }

  return {
    mes,
    ano,
    label: formatReferenciaLabel(mes, ano),
    due: due,
    total: roundMoney(total),
    count: rows.length,
    data: rows,
  };
}

module.exports = {
  syncInadimplencia,
  syncReferenciaAtual,
  capturePagoDia1,
  captureAbertoDia16,
  getWindowStart,
  listWindowMonths,
  getReferenciaForPagoDia1,
  getReferenciaForAbertoDia16,
  enrichFechamentoRow,
  calcAcumulado12Meses,
  calcPercent,
  roundMoney,
  pickPagosFields,
  pickAbertosFields,
  fetchPaidItemsForReferencia,
  DELINQUENCY_FS_STATUS,
  PAID_FS_STATUS,
  sumAmounts,
};
