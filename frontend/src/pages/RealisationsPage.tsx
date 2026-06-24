// Page legacy - utiliser /fabrication pour la gestion complete
import { useEffect, useState } from 'react';
import { Download, Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, apiError } from '../api/client';

interface OF {
  id: string;
  numeroOF: string;
  numeroLot: string;
  workflowStatus: string;
  receptionOF?: string;
  finValiditeOF?: string;
  produit: { codePF: string; designation: string; donneurOrdre: { nom: string } };
}

export function RealisationsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OF[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search) params.set('search', search);
    api.get(`/ordres?${params.toString()}`)
      .then((r) => { setRows(r.data.data); setTotal(r.data.pagination.total); })
      .catch((e) => setError(apiError(e)));
  }, [page, search]);

  async function handleExport() {
    try {
      const res = await api.get('/realisations/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ldmfab-of-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(apiError(e)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Realisations (vue legacy)</h1>
          <p className="text-sm text-slate-500">
            Utilisez <button onClick={() => navigate('/fabrication')} className="text-blue-600 underline">Fabrication (OF)</button> pour la gestion complete.
          </p>
        </div>
        <button className="btn-secondary text-sm flex items-center gap-2" onClick={handleExport}>
          <Download size={16} /> Exporter Excel
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Search size={16} className="text-slate-400" />
        <input className="input w-64" placeholder="Rechercher..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <span className="text-sm text-slate-500 ml-auto">{total} OF</span>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left text-xs">
              <th className="px-3 py-2 font-medium">N° OF</th>
              <th className="px-3 py-2 font-medium">N° Lot</th>
              <th className="px-3 py-2 font-medium">Produit</th>
              <th className="px-3 py-2 font-medium">Donneur</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Fin validite</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{r.numeroOF}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.numeroLot}</td>
                <td className="px-3 py-2 text-xs">
                  <div className="font-medium">{r.produit.codePF}</div>
                  <div className="text-slate-500">{r.produit.designation}</div>
                </td>
                <td className="px-3 py-2 text-xs">{r.produit.donneurOrdre.nom}</td>
                <td className="px-3 py-2">
                  <span className="badge badge-slate text-xs">{r.workflowStatus}</span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.finValiditeOF ? new Date(r.finValiditeOF).toLocaleDateString('fr-FR') : '--'}
                </td>
                <td className="px-3 py-2">
                  <button className="btn-secondary text-xs flex items-center gap-1"
                    onClick={() => navigate(`/fabrication/${r.id}`)}>
                    <Eye size={12} /> Detail
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Aucune realisation</td></tr>
            )}
          </tbody>
        </table>
        {total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <button className="btn-secondary text-xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>Precedent</button>
            <span className="text-sm text-slate-500">Page {page} / {Math.ceil(total / 25)}</span>
            <button className="btn-secondary text-xs" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(page + 1)}>Suivant</button>
          </div>
        )}
      </div>
    </div>
  );
}
