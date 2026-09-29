'use client';
import Loading from '@/components/Loading';
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function ReturnConsolePage() {
    const { getToken, user } = useAppContext();
    const [orders, setOrders] = useState(null);
    const [selected, setSelected] = useState(null);
    const [items, setItems] = useState([]);
    const [saving, setSaving] = useState(false);
    const load = async () => { const token = await getToken(); const { data } = await axios.get('/api/order/operations', { headers: { Authorization: `Bearer ${token}` } }); setOrders(data.orders.filter(order => order.returnInspectionStatus !== 'completed')); };
    useEffect(() => { if (user) load().catch(() => toast.error('Failed to load returns')); }, [user]);
    const open = order => { setSelected(order); setItems(order.items.map(item => ({ product: item.product._id, name: item.product.name, quantity: item.quantity, units: item.equipmentUnits || [], condition: 'normal', charge: 0, notes: '' }))); };
    const submit = async () => {
        setSaving(true);
        try {
            const payload = new FormData(); payload.append('receivedAt', new Date().toISOString().slice(0, 10)); payload.append('notes', 'Processed in return console'); payload.append('items', JSON.stringify(items.map(({ product, condition, charge, notes }) => ({ product, condition, charge: Number(charge), notes }))));
            const token = await getToken(); const { data } = await axios.post(`/api/order/${selected._id}/inspection`, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`${data.message}; charges Rp.${data.charges.totalAdditionalCharge.toLocaleString('id-ID')}`); setSelected(null); await load();
        } catch (error) { toast.error(error.response?.data?.message || 'Inspection failed'); } finally { setSaving(false); }
    };
    if (!orders) return <Loading />;
    return <div className="p-6 w-full"><h1 className="text-2xl font-semibold mb-6">Return inspection console</h1><div className="grid lg:grid-cols-2 gap-4">
        {orders.map(order => <div key={order._id} className="border rounded-lg p-4 bg-white"><p className="font-semibold">Order {order._id.slice(-8)}</p><p className="text-sm text-gray-600">Due {new Date(order.rentalEndDate).toLocaleDateString()} · {order.overdueDays} overdue days</p><button onClick={() => open(order)} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded">Inspect return</button></div>)}
        {!orders.length && <p className="text-gray-500">No returns awaiting inspection.</p>}
    </div>{selected && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"><h2 className="text-xl font-semibold mb-4">Inspect order {selected._id.slice(-8)}</h2>{items.map((item, index) => <div key={item.product} className="border rounded p-3 mb-3"><p className="font-medium">{item.name} × {item.quantity}</p><p className="text-xs text-gray-500">Units: {item.units.map(unit => unit.serialNumber || unit).join(', ') || 'unserialized'}</p><div className="grid grid-cols-2 gap-2 mt-2"><select value={item.condition} onChange={e => setItems(current => current.map((v, i) => i === index ? { ...v, condition: e.target.value, charge: e.target.value === 'normal' ? 0 : v.charge } : v))} className="border p-2 rounded"><option value="normal">Normal</option><option value="damaged">Damaged</option><option value="lost">Lost</option></select><input type="number" min="0" disabled={item.condition === 'normal'} value={item.charge} onChange={e => setItems(current => current.map((v, i) => i === index ? { ...v, charge: e.target.value } : v))} className="border p-2 rounded disabled:bg-gray-100" placeholder="Charge" /></div><textarea value={item.notes} onChange={e => setItems(current => current.map((v, i) => i === index ? { ...v, notes: e.target.value } : v))} className="border p-2 rounded w-full mt-2" placeholder="Condition notes" /></div>)}<div className="flex justify-end gap-2"><button onClick={() => setSelected(null)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button><button disabled={saving} onClick={submit} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">{saving ? 'Saving...' : 'Complete inspection'}</button></div></div></div>}</div>;
}
