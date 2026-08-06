import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, ArrowUpRight, ArrowDownRight, X, Loader2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ImportModal } from '../components/ImportModal';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Category { id: string; name: string; color: string; }
interface Transaction {
  id: string; title: string; description?: string; amount: string;
  type: 'INCOME' | 'EXPENSE'; date: string; category: Category;
}

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  amount: z.number({ message: 'Valor inválido' }).min(0.01, 'Valor mínimo R$ 0,01'),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: z.string().min(1, 'Data obrigatória'),
  categoryId: z.string().uuid('Selecione uma categoria'),
});
type FormData = z.infer<typeof schema>;

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'EXPENSE', date: format(new Date(), 'yyyy-MM-dd') },
  });
  const selectedType = watch('type');

  const { data: txData, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions', { search, filterType, filterMonth }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      if (filterMonth) params.set('month', filterMonth);
      return api.get(`/transactions?${params}`).then(r => r.data);
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  });

  const transactions: Transaction[] = txData?.transactions ?? [];
  const summary = txData?.summary ?? { income: 0, expense: 0, balance: 0 };
  const loading = loadingTx;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] }); // atualiza dashboard também
  };

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    reset({
      title: t.title,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      date: format(new Date(t.date), 'yyyy-MM-dd'),
      categoryId: t.category.id,
    });
    setShowModal(true);
  };

  const onSubmit = async (data: FormData) => {
    if (editing) {
      await api.put(`/transactions/${editing.id}`, data);
    } else {
      await api.post('/transactions', data);
    }
    setShowModal(false);
    reset({ type: 'EXPENSE', date: format(new Date(), 'yyyy-MM-dd') });
    invalidate();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover esta transação?')) return;
    await api.delete(`/transactions/${id}`);
    invalidate();
  };


  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transações</h1>
          <p className="page-subtitle">Gerencie suas receitas e despesas</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)} id="btn-import">
            <Upload size={16} /> Importar
          </button>
          <button className="btn btn-primary" onClick={openCreate} id="btn-new-transaction">
            <Plus size={16} /> Nova Transação
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { label: 'Receitas', value: summary.income, color: '#22c55e', bg: 'var(--color-success-bg)' },
          { label: 'Despesas', value: summary.expense, color: '#ef4444', bg: 'var(--color-danger-bg)' },
          { label: 'Saldo', value: summary.balance, color: summary.balance >= 0 ? '#22c55e' : '#ef4444', bg: 'rgba(99,102,241,0.1)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{fmt(value)}</div>
            <div className="text-sm text-muted mt-2">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
            <input
              className="form-input" style={{ paddingLeft: 32 }} placeholder="Buscar..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              id="search-transactions"
            />
          </div>
          <select className="form-select" style={{ width: 160 }} value={filterType} onChange={(e) => setFilterType(e.target.value)} id="filter-type">
            <option value="">Todos os tipos</option>
            <option value="INCOME">Receitas</option>
            <option value="EXPENSE">Despesas</option>
          </select>
          <input type="month" className="form-input" style={{ width: 180 }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} id="filter-month" />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-primary)' }} /></div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <ArrowUpRight size={40} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
            <p>Nenhuma transação encontrada</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Título</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="text-muted text-sm">{format(new Date(t.date), 'dd/MM/yyyy')}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    {t.description && <div className="text-xs text-muted">{t.description}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.category.color, flexShrink: 0 }} />
                      <span className="text-sm">{t.category.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${t.type === 'INCOME' ? 'badge-income' : 'badge-expense'}`}>
                      {t.type === 'INCOME' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {t.type === 'INCOME' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: t.type === 'INCOME' ? '#22c55e' : '#ef4444' }}>
                    {t.type === 'INCOME' ? '+' : '-'}{fmt(Number(t.amount))}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)} title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(t.id)} title="Excluir">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal — always mounted to preserve draft state */}
      <div
        className="modal-overlay"
        onClick={() => setShowModal(false)}
        style={{ display: showModal ? 'flex' : 'none' }}
      >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Editar' : 'Nova'} Transação</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Type selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['EXPENSE', 'INCOME'] as const).map((type) => {
                  const isActive = selectedType === type;
                  const isExpense = type === 'EXPENSE';
                  return (
                    <label key={type} style={{ cursor: 'pointer' }}>
                      <input type="radio" {...register('type')} value={type} style={{ display: 'none' }} />
                      <div style={{
                        padding: '10px', textAlign: 'center', borderRadius: 8, border: '2px solid',
                        borderColor: isActive
                          ? (isExpense ? '#ef4444' : '#22c55e')
                          : 'var(--color-border)',
                        fontSize: '0.875rem', fontWeight: 600,
                        transition: 'all 0.2s',
                        background: isActive
                          ? (isExpense ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)')
                          : 'transparent',
                        color: isActive
                          ? (isExpense ? '#ef4444' : '#22c55e')
                          : 'var(--color-text-muted)',
                      }}>
                        {isExpense ? '↓ Despesa' : '↑ Receita'}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="form-group">
                <label className="form-label">Título</label>
                <input {...register('title')} className="form-input" placeholder="Ex: Salário" id="tx-title" />
                {errors.title && <span className="form-error">{errors.title.message}</span>}
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Valor (R$)</label>
                  <input {...register('amount', { valueAsNumber: true })} type="number" step="0.01" className="form-input" placeholder="0,00" id="tx-amount" />
                  {errors.amount && <span className="form-error">{errors.amount.message}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input {...register('date')} type="date" className="form-input" id="tx-date" />
                  {errors.date && <span className="form-error">{errors.date.message}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select {...register('categoryId')} className="form-select" id="tx-category">
                  <option value="">Selecionar categoria</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.categoryId && <span className="form-error">{errors.categoryId.message}</span>}
                <button
                  type="button"
                  onClick={() => { setShowModal(false); navigate('/categories', { state: { openModal: true } }); }}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'none', border: 'none', padding: '2px 0',
                    color: 'var(--color-primary-light)', fontSize: '0.78rem',
                    fontWeight: 600, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 4, opacity: 0.85,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
                  id="btn-go-create-category"
                >
                  <Plus size={12} /> Criar nova categoria
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição (opcional)</label>
                <input {...register('description')} className="form-input" placeholder="Observações..." id="tx-desc" />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} id="btn-save-tx">
                  {isSubmitting && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
                  {editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {showImport && (
        <ImportModal
          categories={categories}
          onClose={() => setShowImport(false)}
          onImported={() => {
            invalidate();
            setShowImport(false);
          }}
        />
      )}
    </div>
  );
}
