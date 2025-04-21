'use client';
import Loading from '@/components/Loading';
import React, { useEffect, useState } from 'react';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, orders: 0, revenue: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch total users
                const resUsers = await fetch('/api/user/get-total-user');
                if (resUsers.ok) {
                    const { users } = await resUsers.json();
                    setStats(prev => ({ ...prev, users }));
                }

                // Fetch total orders
                const resOrders = await fetch('/api/order/get-total-order');
                if (resOrders.ok) {
                    const { orders } = await resOrders.json();
                    setStats(prev => ({ ...prev, orders }));
                }

                // Fetch total revenue
                const resRevenue = await fetch('/api/order/get-total-revenue');
                if (resRevenue.ok) {
                    const { revenue } = await resRevenue.json();
                    setStats(prev => ({ ...prev, revenue }));
                }

                // Fetch recent orders
                const resRecent = await fetch('/api/order/get-recent-order');
                if (resRecent.ok) {
                    const { recentOrders } = await resRecent.json();
                    setRecentOrders(recentOrders);
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    // Determine badge color based on status
    const getStatusColor = (status) => {
        if (!status) return 'bg-gray-500';
        const s = status.toLowerCase();
        if (s.includes('selesai')) return 'bg-green-500';
        if (s.includes('batal')) return 'bg-red-500';
        if (s.includes('perjalanan')) return 'bg-blue-500';
        return 'bg-yellow-500';
    };

    if (loading) return <Loading />;

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

            {/* Recent Orders Table */}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <h2 className="text-xl font-semibold mb-4 text-green-700">Recent Orders</h2>
                <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="bg-green-100 text-green-700 uppercase text-sm">
                                <th className="py-3 px-6 text-left">Order ID</th>
                                <th className="py-3 px-6 text-left">Customer</th>
                                <th className="py-3 px-6 text-left">Amount</th>
                                <th className="py-3 px-6 text-left">Date</th>
                                <th className="py-3 px-6 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 text-sm">
                            {recentOrders.map(order => (
                                <tr key={order.id} className="border-b hover:bg-green-50">
                                    <td className="py-3 px-6">{order.id}</td>
                                    <td className="py-3 px-6">{order.name}</td>
                                    <td className="py-3 px-6">Rp. {order.amount.toLocaleString()}</td>
                                    <td className="py-3 px-6">{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="py-3 px-6">
                                        <span className={`inline-block w-2 h-2 rounded-full mr-1 ${getStatusColor(order.status)}`}></span>
                                        {order.status}
                                    </td>
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
