const MONTH_NAMES = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  março: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function normalizeMonthName(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseDteReference(value) {
  if (!value) return null;

  const text = String(value).trim();
  const match = text.match(/^([a-zA-ZçÇáàâãéêíóôõúÁÀÂÃÉÊÍÓÔÕÚ]+)\s+de\s+(\d{4})$/i);
  if (!match) return null;

  const mes = MONTH_NAMES[normalizeMonthName(match[1])];
  const ano = Number(match[2]);

  if (!mes || Number.isNaN(ano) || ano < 1900) return null;

  return {
    mes,
    ano,
    label: `${MONTH_LABELS[mes - 1]} de ${ano}`,
  };
}

function formatReferenciaLabel(mes, ano) {
  if (!mes || !ano || mes < 1 || mes > 12) return '';
  return `${MONTH_LABELS[mes - 1]} de ${ano}`;
}

function parseBrDate(value) {
  if (!value) return null;

  const text = String(value).trim();
  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

module.exports = {
  parseDteReference,
  formatReferenciaLabel,
  parseBrDate,
};
