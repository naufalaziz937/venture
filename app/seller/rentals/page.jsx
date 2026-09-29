'use client';
import Loading from '@/components/Loading';
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function ActiveRentalsPage() {
    const { getToken, user } = useAppContext();
    const [data, setData] = useState(null);
    useEffect(() => {
        if (!user) return;
        getToken().then(token => axios.get('/api/order/operations', { headers: { Authorization: `Bearer ${token}` } }))
            .then(response => setData(response.data)).catch(error => toast.error(error.response?.data?.message || 'Failed to load rentals'));
    }, [getToken, user]);
    if (!data) return <Loading />;
    return <div className="p-6 w-full">
        <h1 className="text-2xl font-semibold">Active and overdue rentals</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-6">
            {[['Active', data.summary.active], ['Return pending', data.summary.returnPending], ['Overdue', data.summary.overdue], ['Outstanding', `Rp.${data.summary.outstandingAmount.toLocaleString('id-ID')}`]].map(([label, value]) => <div key={label} className="border rounded-lg p-4 bg-white"><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-semibold">{value}</p></div>)}
        </div>
        <div className="overflow-x-auto border rounded-lg bg-white"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Order</th><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Due</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Units</th></tr></thead><tbody>
            {data.orders.map(order => <tr key={order._id} className={order.overdueDays ? 'bg-red-50 border-t' : 'border-t'}><td className="p-3 font-mono">{order._id.slice(-8)}</td><td className="p-3">{order.address?.fullName || order.userId}</td><td className="p-3">{new Date(order.rentalEndDate).toLocaleDateString()} {order.overdueDays > 0 && <span className="text-red-700 font-medium">({order.overdueDays}d overdue)</span>}</td><td className="p-3">{order.rentalStatus}</td><td className="p-3">{order.items.flatMap(item => item.equipmentUnits || []).map(unit => unit.serialNumber || unit).join(', ') || 'Not assigned'}</td></tr>)}
            {!data.orders.length && <tr><td colSpan="5" className="p-8 text-center text-gray-500">No active rentals.</td></tr>}
        </tbody></table></div>
    </div>;
}
