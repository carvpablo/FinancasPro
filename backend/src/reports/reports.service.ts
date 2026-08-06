import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyData(userId: string, year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(year, i).toLocaleString('pt-BR', { month: 'short' }),
      income: 0,
      expense: 0,
      balance: 0,
    }));

    for (const t of transactions) {
      const month = t.date.getMonth();
      if (t.type === 'INCOME') {
        monthly[month].income += Number(t.amount);
      } else {
        monthly[month].expense += Number(t.amount);
      }
      monthly[month].balance = monthly[month].income - monthly[month].expense;
    }

    // Category breakdown
    const categoryMap: Record<string, { name: string; color: string; income: number; expense: number }> = {};
    for (const t of transactions) {
      const key = t.categoryId;
      if (!categoryMap[key]) {
        categoryMap[key] = { name: t.category.name, color: t.category.color, income: 0, expense: 0 };
      }
      if (t.type === 'INCOME') categoryMap[key].income += Number(t.amount);
      else categoryMap[key].expense += Number(t.amount);
    }

    const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((a, t) => a + Number(t.amount), 0);
    const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((a, t) => a + Number(t.amount), 0);

    return {
      year,
      monthly,
      categories: Object.values(categoryMap),
      totals: { income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense },
    };
  }

  async exportExcel(userId: string, month: string): Promise<Buffer> {
    const [year, m] = month.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FinançasPro';

    const sheet = workbook.addWorksheet('Transações');
    sheet.columns = [
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Título', key: 'title', width: 30 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Valor (R$)', key: 'amount', width: 15 },
    ];

    // Header style
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };

    transactions.forEach((t) => {
      const row = sheet.addRow({
        date: t.date.toLocaleDateString('pt-BR'),
        title: t.title,
        type: t.type === 'INCOME' ? 'Receita' : 'Despesa',
        category: t.category.name,
        amount: Number(t.amount),
      });
      row.getCell('amount').numFmt = '#,##0.00';
      row.getCell('type').font = {
        color: { argb: t.type === 'INCOME' ? 'FF22C55E' : 'FFEF4444' },
        bold: true,
      };
    });

    const income = transactions.filter((t) => t.type === 'INCOME').reduce((a, t) => a + Number(t.amount), 0);
    const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((a, t) => a + Number(t.amount), 0);

    sheet.addRow([]);
    const summaryRow = sheet.addRow(['', 'Total Receitas:', '', '', income]);
    summaryRow.getCell(5).numFmt = '#,##0.00';
    summaryRow.font = { bold: true };

    const expRow = sheet.addRow(['', 'Total Despesas:', '', '', expense]);
    expRow.getCell(5).numFmt = '#,##0.00';
    expRow.font = { bold: true };

    const balRow = sheet.addRow(['', 'Saldo:', '', '', income - expense]);
    balRow.getCell(5).numFmt = '#,##0.00';
    balRow.font = { bold: true, color: { argb: income - expense >= 0 ? 'FF22C55E' : 'FFEF4444' } };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportPdf(userId: string, month: string): Promise<Buffer> {
    const [year, m] = month.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);
    const monthName = new Date(year, m - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header
      doc.rect(0, 0, doc.page.width, 80).fill('#6366F1');
      doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('FinançasPro', 50, 25);
      doc.fontSize(12).font('Helvetica').text(`Relatório: ${monthName}`, 50, 52);
      doc.fillColor('black').moveDown(3);

      // User info
      doc.fontSize(10).text(`Gerado para: ${user?.name}`, { align: 'right' });
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'right' });
      doc.moveDown();

      // Summary
      const income = transactions.filter((t) => t.type === 'INCOME').reduce((a, t) => a + Number(t.amount), 0);
      const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((a, t) => a + Number(t.amount), 0);

      doc.fontSize(14).font('Helvetica-Bold').text('Resumo do Período');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E5E7EB');
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica');
      doc.fillColor('#22C55E').text(`Receitas: R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      doc.fillColor('#EF4444').text(`Despesas: R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      doc.fillColor(income - expense >= 0 ? '#22C55E' : '#EF4444').font('Helvetica-Bold')
        .text(`Saldo: R$ ${(income - expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      doc.fillColor('black').moveDown();

      // Table
      doc.fontSize(14).font('Helvetica-Bold').text('Transações');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E5E7EB');
      doc.moveDown(0.5);

      // Table header
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#6B7280');
      doc.text('DATA', 50, doc.y, { width: 70 });
      doc.text('DESCRIÇÃO', 120, doc.y - doc.currentLineHeight(), { width: 180 });
      doc.text('CATEGORIA', 300, doc.y - doc.currentLineHeight(), { width: 100 });
      doc.text('TIPO', 400, doc.y - doc.currentLineHeight(), { width: 60 });
      doc.text('VALOR', 460, doc.y - doc.currentLineHeight(), { width: 85, align: 'right' });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E5E7EB');
      doc.moveDown(0.3);

      transactions.forEach((t) => {
        if (doc.y > 700) doc.addPage();
        const y = doc.y;
        doc.fontSize(9).font('Helvetica').fillColor('#111827');
        doc.text(t.date.toLocaleDateString('pt-BR'), 50, y, { width: 70 });
        doc.text(t.title, 120, y, { width: 180 });
        doc.text(t.category.name, 300, y, { width: 100 });
        doc.fillColor(t.type === 'INCOME' ? '#22C55E' : '#EF4444')
          .text(t.type === 'INCOME' ? 'Receita' : 'Despesa', 400, y, { width: 60 });
        doc.fillColor(t.type === 'INCOME' ? '#22C55E' : '#EF4444')
          .text(`R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 460, y, { width: 85, align: 'right' });
        doc.moveDown(0.8);
      });

      doc.end();
    });
  }
}
