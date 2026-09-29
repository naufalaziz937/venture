'use client';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAppContext } from '@/context/AppContext';

export default function InventoryPage() {
    const { user, getToken } = useAppContext();
    const today = new Date().toISOString().slice(0, 10);
    const [range, setRange] = useState({ start: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), end: today });
    const [form, setForm] = useState({ unitId: '', start: today, end: today, reason: '' });
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [tab, setTab] = useState('analytics');
    const load = useCallback(async () => {
        try { const token = await getToken(); const response = await axios.get('/api/inventory', { params: range, headers: { Authorization: `Bearer ${token}` } }); setData(response.data); setError(''); }
        catch (e) { setError(e.response?.data?.message || 'Unable to load inventory'); }
    }, [getToken, range]);
    useEffect(() => { if (user) load(); }, [user, load]);
    const mutate = async payload => {
        setBusy(true); setError('');
        try { const token = await getToken(); await axios.post('/api/inventory', payload, { headers: { Authorization: `Bearer ${token}` } }); await load(); }
        catch (e) { setError(e.response?.data?.message || 'Unable to save maintenance'); }
        finally { setBusy(false); }
    };
    const blocks = data?.products.flatMap(product => (product.reservations || []).filter(r => r.kind === 'maintenance').map(r => ({ ...r, productName: product.name }))) || [];
    const movements = data?.products.flatMap(product => (product.movements || []).map(event => ({ ...event, productName: product.name }))).filter(event => String(event.at).slice(0, 10) >= range.start && String(event.at).slice(0, 10) <= range.end).sort((a, b) => new Date(b.at) - new Date(a.at)) || [];
    return <main className="p-6 w-full min-w-0"><h1 className="text-2xl font-semibold">Inventory and maintenance</h1>
        <div className="flex flex-wrap gap-3 my-5">{['analytics', 'maintenance', 'movements'].map(value => <button key={value} onClick={() => setTab(value)} className={`px-4 py-2 rounded ${tab === value ? 'bg-green-700 text-white' : 'bg-gray-100'}`}>{value}</button>)}</div>
        {error && <p role="alert" className="p-3 bg-red-50 text-red-700">{error} <button onClick={load} className="underline">Retry</button></p>}
        {!data && !error && <p>Loading inventory…</p>}
        {tab !== 'maintenance' && <div className="flex gap-3 mb-4"><label>From <input type="date" value={range.start} onChange={e => setRange({ ...range, start: e.target.value })} className="border rounded p-2" /></label><label>To <input type="date" value={range.end} onChange={e => setRange({ ...range, end: e.target.value })} className="border rounded p-2" /></label></div>}
        {data && tab === 'analytics' && <><p className="text-sm text-gray-600 mb-4">Booked utilization = rental unit-days ÷ (current stock × days − scheduled maintenance days). This estimates historical capacity using current stock. Damage rates use inspections in the selected range. Unit condition counts reflect today.</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Product', 'Rental days', 'Maintenance days', 'Idle days', 'Utilization', 'Tracked', 'Damaged now', 'Lost now', 'Damage rate'].map(v => <th key={v} className="text-left p-3 border-b">{v}</th>)}</tr></thead><tbody>{data.analytics.map(row => <tr key={row.product}>{[row.name, row.rentalUnitDays, row.maintenanceDays, row.idleUnitDays, `${row.utilization}%`, row.tracked, row.damaged, row.lost, `${row.damageRate}%`].map((v, i) => <td key={i} className="p-3 border-b">{v}</td>)}</tr>)}</tbody></table>{!data.analytics.length && <p className="p-5">No products to report.</p>}</div></>}
        {data && tab === 'maintenance' && <><form onSubmit={e => { e.preventDefault(); mutate(form); }} className="grid md:grid-cols-2 gap-3 border rounded p-4 mb-5"><label>Equipment unit<select required value={form.unitId} onChange={e => setForm({ ...form, unitId: e.target.value })} className="block border p-2 w-full"><option value="">Choose unit</option>{data.units.filter(unit => !unit.currentOrder && !unit.maintenanceReference && !['lost', 'retired'].includes(unit.status)).map(unit => <option key={unit._id} value={unit._id}>{unit.serialNumber}</option>)}</select></label><label>Reason<input required maxLength={500} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="block border p-2 w-full" /></label>{['start', 'end'].map(field => <label key={field}>{field}<input required type="date" min={today} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} className="block border p-2 w-full" /></label>)}<p className="text-sm text-gray-600">Scheduled units cannot be dispatched until maintenance is closed. Close a record only after checking the equipment: this marks the unit available and a damaged condition as good.</p><button disabled={busy} className="bg-green-700 text-white rounded p-2 disabled:opacity-50">Schedule maintenance</button></form>{blocks.map(block => <div key={block.orderId} className="border rounded p-4 mb-3"><p>{block.productName} · {data.units.find(unit => unit._id === block.unitId)?.serialNumber}</p><p>{block.rentalStartDate.slice(0, 10)} — {block.rentalEndDate.slice(0, 10)} · {block.reason}</p><button disabled={busy} onClick={() => mutate({ action: 'complete', unitId: block.unitId, reference: block.orderId })} className="underline text-green-800 mt-2">Repair complete / release capacity</button></div>)}{!blocks.length && <p>No open maintenance periods.</p>}</>}
        {data && tab === 'movements' && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Time', 'Product', 'Movement', 'Reference', 'Actor'].map(v => <th key={v} className="text-left p-3">{v}</th>)}</tr></thead><tbody>{movements.map((event, i) => <tr key={i}>{[new Date(event.at).toLocaleString(), event.productName, event.action, event.reference, event.actorId].map((v, j) => <td key={j} className="p-3 border-t break-all">{v}</td>)}</tr>)}</tbody></table>{!movements.length && <p>No recorded movements in this range.</p>}</div>}
    </main>;
}
