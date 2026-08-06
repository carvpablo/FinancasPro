import { Injectable, BadRequestException } from '@nestjs/common';

export interface ParsedTransaction {
  title: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string; // yyyy-MM-dd
  suggestedCategoryName: string | null;
}

// ─── Auto-categorization keywords ────────────────────────────────────────────
const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['mercado', 'supermercado', 'hortifruti', 'padaria', 'açougue', 'pão de açúcar', 'extra', 'carrefour', 'atakarejo', 'atacadão'], category: 'Alimentação' },
  { keywords: ['restaurante', 'lanchonete', 'ifood', 'rappi', 'uber eats', 'delivery', 'pizza', 'burger', 'mcdonalds', 'subway', 'cafe', 'café'], category: 'Restaurante' },
  { keywords: ['posto', 'gasolina', 'combustivel', 'shell', 'ipiranga', 'petrobras', 'br distribuidora'], category: 'Combustível' },
  { keywords: ['uber', '99', 'cabify', 'táxi', 'taxi', 'onibus', 'metro', 'metrô', 'brt', 'passagem'], category: 'Transporte' },
  { keywords: ['farmacia', 'farmácia', 'drogaria', 'ultrafarma', 'drogasil', 'droga raia', 'medico', 'médico', 'hospital', 'clínica', 'clinica', 'unimed', 'amil', 'sulamerica'], category: 'Saúde' },
  { keywords: ['netflix', 'spotify', 'amazon prime', 'hbo', 'disney', 'youtube premium', 'apple', 'google play', 'steam', 'nubank', 'inter', 'assinatura'], category: 'Assinaturas' },
  { keywords: ['aluguel', 'condominio', 'condomínio', 'iptu', 'agua', 'água', 'luz', 'energia', 'gás', 'gas', 'internet', 'telefone', 'celular', 'tim', 'vivo', 'claro', 'oi'], category: 'Moradia' },
  { keywords: ['salario', 'salário', 'pagamento', 'vale', 'adiantamento', 'bonus', 'bônus', 'prolabore', 'pró-labore', 'renda'], category: 'Salário' },
  { keywords: ['shopping', 'lojas americanas', 'renner', 'riachuelo', 'hering', 'c&a', 'marisa', 'zara', 'roupa', 'calçado', 'sapato', 'magazine luiza', 'magalu', 'casas bahia', 'americanas'], category: 'Compras' },
  { keywords: ['academia', 'gym', 'smartfit', 'bluefit', 'bodytech'], category: 'Saúde' },
  { keywords: ['escola', 'faculdade', 'curso', 'udemy', 'alura', 'mensalidade', 'livro', 'livraria'], category: 'Educação' },
  { keywords: ['hotel', 'pousada', 'airbnb', 'passagem aerea', 'voo', 'viagem', 'azul', 'latam', 'gol linhas', 'booking'], category: 'Viagem' },
  { keywords: ['investimento', 'tesouro', 'cdb', 'lci', 'lca', 'fundo', 'ação', 'acoes', 'bolsa'], category: 'Investimentos' },
];

function guessCategory(description: string): string | null {
  const lower = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
      return category;
    }
  }
  return null;
}

// ─── OFX Parser ───────────────────────────────────────────────────────────────
function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Extract all <STMTTRN>...</STMTTRN> blocks (handles both SGML and XML variants)
  const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>|<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    const block = match[1] || match[2] || '';
    if (!block.trim()) continue;

    const get = (tag: string) => {
      const m = new RegExp(`<${tag}>([^<\r\n]+)`, 'i').exec(block);
      return m ? m[1].trim() : '';
    };

    const rawAmount = get('TRNAMT') || get('TRNAMT');
    const rawDate = get('DTPOSTED') || get('DTUSER');
    const memo = get('MEMO') || get('NAME') || get('FITID') || 'Sem descrição';
    const trnType = (get('TRNTYPE') || '').toUpperCase();

    if (!rawAmount || !rawDate) continue;

    const amount = Math.abs(parseFloat(rawAmount.replace(',', '.')));
    if (isNaN(amount) || amount === 0) continue;

    // OFX date format: YYYYMMDD[HHMM[SS[.XXX][±ZZzz]]]
    const year = rawDate.slice(0, 4);
    const month = rawDate.slice(4, 6);
    const day = rawDate.slice(6, 8);
    const date = `${year}-${month}-${day}`;

    // Determine type: OFX DEBIT/CREDIT or sign of amount
    let type: 'INCOME' | 'EXPENSE';
    if (trnType === 'CREDIT' || trnType === 'INT' || trnType === 'DIV') {
      type = 'INCOME';
    } else if (trnType === 'DEBIT' || trnType === 'ATM' || trnType === 'POS' || trnType === 'XFER') {
      type = 'EXPENSE';
    } else {
      type = parseFloat(rawAmount) >= 0 ? 'INCOME' : 'EXPENSE';
    }

    transactions.push({
      title: memo,
      amount,
      type,
      date,
      suggestedCategoryName: guessCategory(memo),
    });
  }

  return transactions;
}

// ─── Monetary value parser (handles BR and US formats) ───────────────────────
/**
 * Detects and parses monetary values for both formats:
 * - Brazilian: 1.500,99 → 1500.99  (dot = thousands, comma = decimal)
 * - US/International: -1500.99 or 1500.99 (dot = decimal)
 * - Comma-only decimal: 1500,99 → 1500.99
 */
function parseMonetaryValue(raw: string): number {
  const s = raw.trim().replace(/\s/g, '');
  if (!s) return NaN;

  // Extract sign
  const negative = s.startsWith('-');
  const digits = s.replace(/[^0-9,.-]/g, '');

  let normalized: string;

  const hasComma = digits.includes(',');
  const hasDot   = digits.includes('.');

  if (hasComma && hasDot) {
    // Both separators present — determine which is decimal by position
    const lastComma = digits.lastIndexOf(',');
    const lastDot   = digits.lastIndexOf('.');
    if (lastComma > lastDot) {
      // BR format: 1.500,99 → remove dots, swap comma→dot
      normalized = digits.replace(/\./g, '').replace(',', '.');
    } else {
      // US format with thousands comma: 1,500.99 → remove commas
      normalized = digits.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Comma-only: could be decimal (159,99) or thousands (1,500)
    const parts = digits.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal comma: 159,99 → 159.99
      normalized = digits.replace(',', '.');
    } else {
      // Thousands comma: 1,500 → 1500
      normalized = digits.replace(/,/g, '');
    }
  } else {
    // Dot only or no separator → standard float
    normalized = digits;
  }

  const value = parseFloat(normalized);
  return negative && value > 0 ? -value : value;
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Auto-detect separator
  const sep = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === sep && !inQ) { result.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''));

  // Map columns by common Brazilian bank header names
  const find = (...names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h) => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colDate = find('data', 'date', 'dt');
  const colDesc = find('title', 'titulo', 'descricao', 'descri', 'historico', 'memo', 'lancamento', 'nome', 'estabelecimento', 'descr');
  const colAmount = find('valor', 'value', 'amount', 'montante', 'quantia');
  const colCredit = find('credito', 'entrada', 'receita');
  const colDebit = find('debito', 'saida', 'despesa');
  const colType = find('tipo', 'type', 'natureza');

  if (colDate === -1 || (colDesc === -1 && colAmount === -1)) {
    throw new BadRequestException('Formato CSV não reconhecido. Certifique-se de que o arquivo contém colunas de Data, Descrição e Valor.');
  }

  const transactions: ParsedTransaction[] = [];

  // ── Auto-detect credit card vs bank statement format ──────────────────────
  // Credit card CSV: positive = purchase (expense), negative = payment/refund (income)
  // Bank statement:  positive = income, negative = expense
  // Heuristic: scan data rows — if ≥85% of values are positive, or ≥70% positive
  // AND descriptions contain payment keywords → credit card format.
  let isCreditCardFormat = false;
  if (colType === -1 && colAmount !== -1 && colCredit === -1 && colDebit === -1) {
    let pos = 0, neg = 0, keywordHits = 0;
    const paymentWords = ['pagamento', 'estorno', 'payment', 'refund', 'credito em conta', 'cashback'];
    const sample = Math.min(lines.length - 1, 20);
    for (let i = 1; i <= sample; i++) {
      const r = parseLine(lines[i]);
      const v = parseMonetaryValue(r[colAmount] ?? '');
      if (!isNaN(v) && v !== 0) { if (v > 0) pos++; else neg++; }
      if (colDesc !== -1 && r[colDesc]) {
        const d = r[colDesc].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (paymentWords.some((k) => d.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) keywordHits++;
      }
    }
    const total = pos + neg;
    if (total > 0) {
      const ratio = pos / total;
      isCreditCardFormat = (ratio >= 0.7 && keywordHits > 0) || ratio >= 0.85;
    }
  }


  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    if (row.length < 2) continue;

    const rawDate = row[colDate] ?? '';
    const rawDesc = colDesc !== -1 ? (row[colDesc] ?? '') : '';

    // Parse date: dd/MM/yyyy or yyyy-MM-dd or MM/dd/yyyy
    let date = '';
    const d1 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(rawDate);
    const d2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawDate);
    const d3 = /^(\d{2})-(\d{2})-(\d{4})$/.exec(rawDate);
    if (d1) date = `${d1[3]}-${d1[2]}-${d1[1]}`;
    else if (d2) date = rawDate;
    else if (d3) date = `${d3[3]}-${d3[2]}-${d3[1]}`;
    else continue;

    let amount = 0;
    let type: 'INCOME' | 'EXPENSE' = 'EXPENSE';

    if (colCredit !== -1 && colDebit !== -1) {
      // Two-column format: credit and debit separate
      const credit = parseMonetaryValue(row[colCredit] ?? '0');
      const debit  = parseMonetaryValue(row[colDebit]  ?? '0');
      if (credit > 0) { amount = credit; type = 'INCOME'; }
      else if (debit > 0) { amount = debit; type = 'EXPENSE'; }
      else continue;
    } else if (colAmount !== -1) {
      const parsed = parseMonetaryValue(row[colAmount] ?? '');
      if (isNaN(parsed) || parsed === 0) continue;
      amount = Math.abs(parsed);
      if (colType !== -1) {
        const t = (row[colType] ?? '').toLowerCase();
        type = t.includes('cred') || t.includes('receita') || t.includes('entrada') ? 'INCOME' : 'EXPENSE';
      } else {
        // Use the pre-detected convention (set before the loop)
        type = isCreditCardFormat
          ? (parsed >= 0 ? 'EXPENSE' : 'INCOME')  // credit card: positive = purchase (expense)
          : (parsed >= 0 ? 'INCOME' : 'EXPENSE');  // bank statement: positive = income
      }
    } else continue;

    const title = rawDesc || `Transação ${i}`;

    transactions.push({
      title,
      amount,
      type,
      date,
      suggestedCategoryName: guessCategory(title),
    });
  }

  return transactions;
}

// ─── Main Service ─────────────────────────────────────────────────────────────
@Injectable()
export class ImportService {
  parse(filename: string, buffer: Buffer): ParsedTransaction[] {
    const content = buffer.toString('utf-8');
    const ext = filename.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'ofx' || content.includes('<OFX>') || content.includes('OFXHEADER')) {
        const result = parseOFX(content);
        if (result.length === 0) throw new BadRequestException('Nenhuma transação encontrada no arquivo OFX.');
        return result;
      }

      if (ext === 'csv' || content.includes(',') || content.includes(';')) {
        const result = parseCSV(content);
        if (result.length === 0) throw new BadRequestException('Nenhuma transação reconhecida no CSV. Verifique o formato do arquivo.');
        return result;
      }

      throw new BadRequestException('Formato de arquivo não suportado. Use .csv ou .ofx');
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Erro ao processar o arquivo: ' + (err as Error).message);
    }
  }
}
