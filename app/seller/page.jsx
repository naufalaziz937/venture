'use client';
import Loading from '@/components/Loading';
import React, { useEffect, useState } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, orders: 0, revenue: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [ordersPerPage] = useState(5);
    const [orderStats, setOrderStats] = useState({}); // Initialize as empty object
    const [userGrowth, setUserGrowth] = useState([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                // Initialize default values in case APIs fail
                const defaultOrderStats = {};
                const defaultUserGrowth = [];
                
                // Fetch basic stats
                const [resUsers, resOrders, resRevenue, resRecent, resOrderStats, resUserGrowth] = await Promise.all([
                    fetch('/api/user/get-total-user'),
                    fetch('/api/order/get-total-order'),
                    fetch('/api/order/get-total-revenue'),
                    fetch(`/api/order/get-recent-order?page=${currentPage}&limit=${ordersPerPage}`),
                    fetch('/api/order/get-order-status-breakdown').catch(() => ({ json: () => ({ statusBreakdown: defaultOrderStats }) })),
                    fetch('/api/user/get-user-growth').catch(() => ({ json: () => ({ growthData: defaultUserGrowth }) }))
                ]);

                // Process responses with fallbacks
                const [
                    usersData,
                    ordersData,
                    revenueData,
                    recentOrdersData,
                    orderStatsData,
                    userGrowthData
                ] = await Promise.all([
                    resUsers.ok ? resUsers.json() : { users: 0 },
                    resOrders.ok ? resOrders.json() : { orders: 0 },
                    resRevenue.ok ? resRevenue.json() : { revenue: 0 },
                    resRecent.ok ? resRecent.json() : { recentOrders: [] },
                    resOrderStats.ok ? resOrderStats.json() : { statusBreakdown: defaultOrderStats },
                    resUserGrowth.ok ? resUserGrowth.json() : { growthData: defaultUserGrowth }
                ]);

                setStats({
                    users: usersData.users || 0,
                    orders: ordersData.orders || 0,
                    revenue: revenueData.revenue || 0
                });

                setRecentOrders(recentOrdersData.recentOrders || []);
                setOrderStats(orderStatsData.statusBreakdown || {});
                setUserGrowth(userGrowthData.growthData || []);

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [currentPage, ordersPerPage]);

    const getStatusColor = (status) => {
        if (!status) return 'bg-gray-500';
        const s = status.toLowerCase();
        if (s.includes('selesai')) return 'bg-green-500';
        if (s.includes('batal')) return 'bg-red-500';
        if (s.includes('perjalanan')) return 'bg-blue-500';
        return 'bg-yellow-500';
    };

    // Prepare data for pie chart with null check
    const pieChartData = {
        labels: orderStats ? Object.keys(orderStats) : [],
        datasets: [
            {
                data: orderStats ? Object.values(orderStats) : [],
                backgroundColor: [
                    '#10B981', // green
                    '#3B82F6', // blue
                    '#F59E0B', // yellow
                    '#EF4444', // red
                    '#6B7280'  // gray
                ],
                borderWidth: 1,
            },
        ],
    };

    // Prepare data for bar chart with null check
    const barChartData = {
        labels: userGrowth?.length ? userGrowth.map(item => item.month) : [],
        datasets: [
            {
                label: 'New Users',
                data: userGrowth?.length ? userGrowth.map(item => item.count) : [],
                backgroundColor: '#10B981',
            },
        ],
    };

    // Pagination logic
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) return <Loading />;

    return (
        <div className="flex-1 min-h-screen flex flex-col justify-between">
            <div className="w-full md:p-10 p-4">
                <h1 className="text-2xl font-bold mb-6 text-green-700">Admin Dashboard</h1>

                {/* Stats Cards */}
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

                {/* Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {/* Pie Chart - Order Status Breakdown */}
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                        <h2 className="text-xl font-semibold mb-4 text-green-700">Order Status Distribution</h2>
                        <div className="h-64">
                            {Object.keys(orderStats).length > 0 ? (
                                <Pie 
                                    data={pieChartData} 
                                    options={{ 
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'right',
                                            },
                                        },
                                    }} 
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    No order status data available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bar Chart - User Growth */}
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                        <h2 className="text-xl font-semibold mb-4 text-green-700">User Growth (Last 6 Months)</h2>
                        <div className="h-64">
                            {userGrowth.length > 0 ? (
                                <Bar 
                                    data={barChartData} 
                                    options={{ 
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                ticks: {
                                                    stepSize: 1
                                                }
                                            }
                                        },
                                    }} 
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    No user growth data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Orders Table */}
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-green-700">Recent Orders</h2>
                        <div className="flex space-x-2">
                            <button 
                                onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button 
                                onClick={() => paginate(currentPage + 1)}
                                disabled={recentOrders.length < ordersPerPage}
                                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
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
                                {recentOrders.length > 0 ? (
                                    recentOrders.map(order => (
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
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="py-4 text-center text-gray-500">
                                            No recent orders found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-center text-sm text-gray-500">
                        Page {currentPage}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;