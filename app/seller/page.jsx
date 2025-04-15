'use client';
import React, { useEffect, useState } from 'react';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        users: 0,
        orders: 0,
        revenue: 0,
    });

    const [loading, setLoading] = useState(true);

    const [orders, setOrders] = useState([]);

    useEffect(() => {
        // Simulasi fetch data
        setTimeout(() => {
            setStats({
                users: 120,
                orders: 75,
                revenue: 1500000,
            });
            setOrders([
                { id: 1, customer: 'Brr Brr Patapim', amount: 250000, status: 'Pending' },
                { id: 2, customer: 'Bombrito Bandito', amount: 500000, status: 'Completed' },
                { id: 3, customer: 'Frigo Camello', amount: 750000, status: 'Pending' },
                { id: 4, customer: 'Lirili Larila', amount: 100000, status: 'Pending' },
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-6">
            <h1 className="text-2xl font-bold mb-6 text-green-700">Admin Dashboard</h1>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h2 className="text-gray-500 text-sm">Total Users</h2>
                    <p className="text-2xl font-semibold text-green-600">{stats.users}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h2 className="text-gray-500 text-sm">Total Orders</h2>
                    <p className="text-2xl font-semibold text-green-600">{stats.orders}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h2 className="text-gray-500 text-sm">Total Revenue</h2>
                    <p className="text-2xl font-semibold text-green-600">Rp. {stats.revenue.toLocaleString()}</p>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <h2 className="text-xl font-semibold mb-4 text-green-700">Recent Orders</h2>
                <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="bg-green-100 text-green-700 uppercase text-sm leading-normal">
                                <th className="py-3 px-6 text-left">Order ID</th>
                                <th className="py-3 px-6 text-left">Customer</th>
                                <th className="py-3 px-6 text-left">Amount</th>
                                <th className="py-3 px-6 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 text-sm">
                            {orders.map((order) => (
                                <tr key={order.id} className="border-b border-gray-200 hover:bg-green-50">
                                    <td className="py-3 px-6">{order.id}</td>
                                    <td className="py-3 px-6">{order.customer}</td>
                                    <td className="py-3 px-6">Rp. {order.amount.toLocaleString()}</td>
                                    <td className="py-3 px-6">{order.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default AdminDashboard;
