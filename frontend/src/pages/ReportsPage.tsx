import { useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler, ArcElement, BarElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { FileText, FileSpreadsheet, Download, Loader2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement, BarElement);

interface MonthlyData {
  monthly: Array<{ month: number; monthName: string; income: number; expense: number; balance: number }>;
  totals: { income: number; expense: number; balance: number };
  categories: Array<{ name: string; color: string; income: number; expense: number }>;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ReportsPage() {
  const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: monthly, isLoading: loading } = useQuery<MonthlyData>({
    queryKey: ['reports', 'monthly', year],
    queryFn: () => api.get(`/reports/monthly?year=${year}`).then(r => r.data),
  });



  const exportFile = async (type: 'pdf' | 'excel') => {
    setExporting(type);
    try {
      const endpoint = type === 'pdf' ? '/reports/export/pdf' : '/reports/export/excel';
      const response = await api.get(`${endpoint}?month=${exportMonth}`, { responseType: 'blob' });
      const ext = type === 'pdf' ? 'pdf' : 'xlsx';
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financas-${exportMonth}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  const barData = {
    labels: monthly?.monthly.map(m => m.monthName) ?? [],
    datasets: [
      {
        label: 'Receitas',
        data: monthly?.monthly.map(m => m.income) ?? [],
        backgroundColor: 'rgba(34,197,94,0.7)',
        borderColor: '#22c55e',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Despesas',
        data: monthly?.monthly.map(m => m.expense) ?? [],
        backgroundColor: 'rgba(239,68,68,0.7)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const expCategories = monthly?.categories.filter(c => c.expense > 0) ?? [];
  const doughnutData = {
    labels: expCategories.map(c => c.name),
    datasets: [{
      data: expCategories.map(c => c.expense),
      backgroundColor: expCategories.map(c => c.color + 'CC'),
      borderColor: expCategories.map(c => c.color),
      borderWidth: 2,
    }],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
      tooltip: {
        backgroundColor: '#1a1a24', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
        callbacks: { label: (ctx: any) => ` ${fmt(ctx.raw)}` },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', callback: (v: any) => 'R$' + (v/1000).toFixed(0) + 'k' } },
    },
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Análise detalhada das suas finanças</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: 100 }}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            id="report-year"
          >
            {[2022, 2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Annual Totals */}
      {monthly && (
        <div className="grid-3" style={{ marginBottom: 28 }}>
          {[
            { label: 'Total de Receitas', value: monthly.totals.income, color: '#22c55e', icon: TrendingUp },
            { label: 'Total de Despesas', value: monthly.totals.expense, color: '#ef4444', icon: TrendingDown },
            { label: 'Saldo Anual', value: monthly.totals.balance, color: monthly.totals.balance >= 0 ? '#22c55e' : '#ef4444', icon: Wallet },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="stat-card" style={{ '--accent-color': color } as any}>
              <div className="stat-icon" style={{ background: color + '22' }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div className="stat-value" style={{ color }}>{fmt(value)}</div>
              <div className="stat-label">{label} {year}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-primary)' }} />
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid-2" style={{ marginBottom: 28 }}>
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Receitas vs Despesas — {year}</h3>
              <div style={{ height: 280 }}>
                <Bar data={barData} options={chartOpts as any} />
              </div>
            </div>
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Distribuição por Categoria</h3>
              {expCategories.length > 0 ? (
                <div style={{ height: 280 }}>
                  <Doughnut data={doughnutData} options={{ ...chartOpts, scales: undefined } as any} />
                </div>
              ) : (
                <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)' }}>
                  Sem dados de despesas
                </div>
              )}
            </div>
          </div>

          {/* Monthly breakdown + Export side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
            {/* Monthly breakdown table */}
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Detalhamento Mensal</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Receitas</th>
                      <th>Despesas</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly?.monthly.map((m) => (
                      <tr key={m.month}>
                        <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{m.monthName}</td>
                        <td style={{ color: '#22c55e', fontWeight: 600 }}>{fmt(m.income)}</td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{fmt(m.expense)}</td>
                        <td style={{ color: m.balance >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{fmt(m.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export */}
            <div className="card" style={{ position: 'sticky', top: 32 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Exportar Relatório</h3>
              <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
                Escolha o mês e formato para exportar suas transações
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Mês de referência</label>
                  <input
                    type="month" className="form-input"
                    value={exportMonth} onChange={(e) => setExportMonth(e.target.value)}
                    id="export-month"
                  />
                </div>
                <button
                  className="btn btn-secondary btn-full"
                  onClick={() => exportFile('pdf')}
                  disabled={exporting !== null}
                  id="btn-export-pdf"
                >
                  {exporting === 'pdf'
                    ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                    : <FileText size={16} />}
                  Exportar PDF
                </button>
                <button
                  className="btn btn-success btn-full"
                  onClick={() => exportFile('excel')}
                  disabled={exporting !== null}
                  id="btn-export-excel"
                >
                  {exporting === 'excel'
                    ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                    : <FileSpreadsheet size={16} />}
                  Exportar Excel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
