import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Loader2, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';
import { api } from '../lib/api';

interface Category { id: string; name: string; color: string; }

interface ParsedRow {
  title: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  suggestedCategoryName: string | null;
  // Added by frontend after parse
  categoryId: string;
  selected: boolean;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  categories: Category[];
  onClose: () => void;
  onImported: () => void;
}

export function ImportModal({ categories, onClose, onImported }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [importResult, setImportResult] = useState<{ saved: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Map suggested category name to category id
  const matchCategory = useCallback((name: string | null): string => {
    if (!name) return '';
    const lower = name.toLowerCase();
    const match = categories.find((c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()));
    return match?.id ?? '';
  }, [categories]);

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<ParsedRow[]>('/transactions/import/parse', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const enriched: ParsedRow[] = data.map((row) => ({
        ...row,
        categoryId: matchCategory(row.suggestedCategoryName),
        selected: true,
      }));
      setRows(enriched);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao processar o arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const toggleRow = (i: number) => setRows((r) => r.map((x, j) => j === i ? { ...x, selected: !x.selected } : x));
  const toggleAll = () => {
    const allSelected = rows.every((r) => r.selected);
    setRows((r) => r.map((x) => ({ ...x, selected: !allSelected })));
  };
  const setCategoryForRow = (i: number, categoryId: string) =>
    setRows((r) => r.map((x, j) => j === i ? { ...x, categoryId } : x));
  const setAllCategories = (categoryId: string) =>
    setRows((r) => r.map((x) => ({ ...x, categoryId })));

  const handleConfirm = async () => {
    const selected = rows.filter((r) => r.selected && r.categoryId);
    if (selected.length === 0) {
      setError('Selecione ao menos uma transação com categoria definida.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post('/transactions/import/confirm', { transactions: selected });
      setImportResult(data);
      setStep('done');
      onImported();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar transações.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = rows.filter((r) => r.selected).length;
  const withoutCategory = rows.filter((r) => r.selected && !r.categoryId).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: step === 'preview' ? 800 : 480, width: '100%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Importar Extrato</h2>
            {step === 'preview' && (
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                {rows.length} transações detectadas · {selectedCount} selecionadas
              </p>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? 'rgba(99,102,241,0.05)' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.ofx"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
              {loading ? (
                <Loader2 size={36} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-primary)', margin: '0 auto 12px', display: 'block' }} />
              ) : (
                <Upload size={36} style={{ opacity: 0.4, margin: '0 auto 16px', display: 'block', color: dragging ? 'var(--color-primary)' : 'inherit' }} />
              )}
              <p style={{ fontWeight: 600, marginBottom: 6 }}>
                {loading ? 'Processando arquivo...' : 'Arraste seu arquivo aqui'}
              </p>
              <p className="text-sm text-muted">ou clique para selecionar</p>
              <p className="text-xs text-subtle" style={{ marginTop: 10 }}>
                Suportado: <strong>.CSV</strong> e <strong>.OFX</strong> · Tamanho máx: 5MB
              </p>
            </div>

            <div style={{
              background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
              padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-text-muted)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>Bancos suportados:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Inter', 'BB', 'Caixa', 'XP', 'C6 Bank'].map((b) => (
                  <span key={b} style={{
                    background: 'var(--color-surface-3)', padding: '2px 8px',
                    borderRadius: 999, fontSize: '0.75rem',
                  }}>{b}</span>
                ))}
              </div>
            </div>

            {error && (
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                color: 'var(--color-danger)', fontSize: '0.85rem',
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Preview table ── */}
        {step === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Bulk category selector */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="text-sm text-muted">Categoria para todas:</span>
              <select
                className="form-select"
                style={{ width: 200, fontSize: '0.8rem' }}
                onChange={(e) => setAllCategories(e.target.value)}
                defaultValue=""
                id="import-bulk-category"
              >
                <option value="">Manter individual</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {withoutCategory > 0 && (
              <div style={{
                display: 'flex', gap: 8, alignItems: 'center',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 'var(--radius-md)', padding: '8px 12px',
                color: 'var(--color-warning)', fontSize: '0.8rem',
              }}>
                <AlertTriangle size={14} />
                {withoutCategory} transação(ões) selecionada(s) sem categoria — serão ignoradas ao confirmar.
              </div>
            )}

            {/* Table */}
            <div style={{ overflowY: 'auto', maxHeight: 420, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: 36 }}>
                      <input
                        type="checkbox"
                        checked={rows.every((r) => r.selected)}
                        onChange={toggleAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Data</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Descrição</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Tipo</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Valor</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Categoria</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderTop: '1px solid var(--color-border)',
                        opacity: row.selected ? 1 : 0.4,
                        background: row.selected ? 'transparent' : 'var(--color-surface-2)',
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input type="checkbox" checked={row.selected} onChange={() => toggleRow(i)} style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '8px', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                        {row.date.split('-').reverse().join('/')}
                      </td>
                      <td style={{ padding: '8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.title}>
                        {row.title}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                          background: row.type === 'INCOME' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                          color: row.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)',
                        }}>
                          {row.type === 'INCOME' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {row.type === 'INCOME' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: row.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)', whiteSpace: 'nowrap' }}>
                        {row.type === 'INCOME' ? '+' : '-'}{fmt(row.amount)}
                      </td>
                      <td style={{ padding: '8px', minWidth: 140 }}>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.78rem', padding: '4px 28px 4px 8px' }}
                          value={row.categoryId}
                          onChange={(e) => setCategoryForRow(i, e.target.value)}
                          disabled={!row.selected}
                        >
                          <option value="">Sem categoria</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && (
              <div style={{
                display: 'flex', gap: 8, background: 'var(--color-danger-bg)',
                border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)',
                padding: '10px 14px', color: 'var(--color-danger)', fontSize: '0.85rem',
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />{error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setStep('upload'); setRows([]); setError(null); }}>
                ← Voltar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={saving || selectedCount === 0}
                id="btn-confirm-import"
              >
                {saving && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
                Importar {selectedCount} transação(ões)
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 'done' && importResult && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle2 size={56} style={{ color: '#22c55e', margin: '0 auto 16px', display: 'block' }} />
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Importação concluída!</h3>
            <p className="text-muted" style={{ marginBottom: 4 }}>
              <strong style={{ color: '#22c55e' }}>{importResult.saved}</strong> transações importadas com sucesso
            </p>
            {importResult.failed > 0 && (
              <p className="text-sm" style={{ color: 'var(--color-warning)' }}>
                {importResult.failed} transação(ões) não puderam ser salvas
              </p>
            )}
            <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={onClose}>
              Concluir
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
