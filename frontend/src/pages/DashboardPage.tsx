import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler, ArcElement, BarElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Wallet, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement, BarElement);

interface MonthlyData {
  monthly: Array<{ month: number; monthName: string; income: number; expense: number; balance: number }>;
  totals: { income: number; expense: number; balance: number };
  categories: Array<{ name: string; color: string; expense: number }>;
}

interface Transaction {
  id: string; title: string; amount: string; type: 'INCOME' | 'EXPENSE';
  date: string; category: { name: string; color: string };
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function DashboardPage() {
  const { user } = useAuthStore();
  const year = new Date().getFullYear();
  const currentMonth = format(new Date(), 'yyyy-MM');

  const { data: monthly, isLoading: loadingMonthly } = useQuery<MonthlyData>({
    queryKey: ['reports', 'monthly', year],
    queryFn: () => api.get(`/reports/monthly?year=${year}`).then(r => r.data),
  });

  const { data: recentData, isLoading: loadingRecent } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ['transactions', currentMonth],
    queryFn: () => api.get(`/transactions?month=${currentMonth}`).then(r => r.data),
  });

  const loading = loadingMonthly || loadingRecent;
  const recent = recentData?.transactions.slice(0, 5) ?? [];


  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p className="text-muted">Carregando dados...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const curMonth = monthly?.monthly[new Date().getMonth()];
  const lineData = {
    labels: monthly?.monthly.map(m => m.monthName) ?? [],
    datasets: [
      {
        label: 'Receitas',
        data: monthly?.monthly.map(m => m.income) ?? [],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#22c55e',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Despesas',
        data: monthly?.monthly.map(m => m.expense) ?? [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#ef4444',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const expenseCategories = monthly?.categories.filter(c => c.expense > 0) ?? [];
  const doughnutData = {
    labels: expenseCategories.map(c => c.name),
    datasets: [{
      data: expenseCategories.map(c => c.expense),
      backgroundColor: expenseCategories.map(c => c.color + 'CC'),
      borderColor: expenseCategories.map(c => c.color),
      borderWidth: 2,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
      tooltip: {
        backgroundColor: '#1a1a24',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        callbacks: { label: (ctx: any) => ` ${fmt(ctx.raw)}` },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', callback: (v: any) => 'R$ ' + (v/1000).toFixed(0) + 'k' } },
    },
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Olá, {user?.name.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Receitas do Mês', value: curMonth?.income ?? 0, color: '#22c55e', icon: TrendingUp, iconBg: 'var(--color-success-bg)' },
          { label: 'Despesas do Mês', value: curMonth?.expense ?? 0, color: '#ef4444', icon: TrendingDown, iconBg: 'var(--color-danger-bg)' },
          { label: 'Saldo do Mês', value: curMonth?.balance ?? 0, color: (curMonth?.balance ?? 0) >= 0 ? '#22c55e' : '#ef4444', icon: Wallet, iconBg: 'rgba(99,102,241,0.12)' },
          { label: 'Total Anual', value: monthly?.totals.balance ?? 0, color: '#6366f1', icon: Target, iconBg: 'rgba(99,102,241,0.12)' },
        ].map(({ label, value, color, icon: Icon, iconBg }) => (
          <div key={label} className="stat-card" style={{ '--accent-color': color } as any}>
            <div className="stat-icon" style={{ background: iconBg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div className="stat-value" style={{ color }}>{fmt(value)}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: '1rem' }}>Evolução Anual</h3>
          <div style={{ height: 260 }}>
            <Line data={lineData} options={chartOptions as any} />
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: '1rem' }}>Despesas por Categoria</h3>
          {expenseCategories.length > 0 ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Doughnut data={doughnutData} options={{ ...chartOptions, scales: undefined, maintainAspectRatio: false } as any} />
            </div>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)' }}>
              Sem despesas no período
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Transações Recentes</h3>
          <Link to="/transactions" style={{ color: 'var(--color-primary-light)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
            Ver todas →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-muted text-sm text-center" style={{ padding: '20px 0' }}>Nenhuma transação neste mês</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recent.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: t.category.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {t.type === 'INCOME'
                      ? <ArrowUpRight size={16} style={{ color: '#22c55e' }} />
                      : <ArrowDownRight size={16} style={{ color: '#ef4444' }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.title}</div>
                    <div className="text-xs text-muted">{t.category.name} · {format(new Date(t.date), 'dd/MM/yyyy')}</div>
                  </div>
                </div>
                <span style={{ fontWeight: 700, color: t.type === 'INCOME' ? '#22c55e' : '#ef4444', fontSize: '0.875rem' }}>
                  {t.type === 'INCOME' ? '+' : '-'}{fmt(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
