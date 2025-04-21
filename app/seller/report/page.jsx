'use client';
import React, { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import Loading from "@/components/Loading";

const Report = () => {
    const { user } = useAppContext();

    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState({
        userCount: 0,
        orderCount: 0,
        totalSales: 0,
        orderStats: {}
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resUser, resOrder, resRevenue, resStatus] = await Promise.all([
                    fetch('/api/user/get-total-user'),
                    fetch('/api/order/get-total-order'),
                    fetch('/api/order/get-total-revenue'),
                    fetch('/api/order/get-order-status-breakdown')
                ]);

                const userData = await resUser.json();
                const orderData = await resOrder.json();
                const revenueData = await resRevenue.json();
                const statusData = await resStatus.json();

                setReportData({
                    userCount: userData.users || 0,
                    orderCount: orderData.orders || 0,
                    totalSales: revenueData.revenue || 0,
                    orderStats: statusData.statusBreakdown || {}
                });
            } catch (err) {
                console.error("Gagal mengambil data laporan:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getStatusColor = (status) => {
        if (!status) return 'text-gray-500';
        const s = status.toLowerCase();
        if (s.includes('selesai')) return 'text-green-600';
        if (s.includes('batal')) return 'text-red-500';
        if (s.includes('perjalanan')) return 'text-blue-500';
        return 'text-yellow-500';
    };

    return (
        <div className="flex-1 min-h-screen flex flex-col p-6 bg-gray-50">
            <h2 className="text-2xl font-semibold text-green-600 mb-5">Report</h2>

            {loading ? (
                <Loading />
            ) : (
                <div className="space-y-5">
                    {/* User Report */}
                    <div className="bg-white p-5 rounded-md shadow-md">
                        <h3 className="font-medium text-lg">User Report</h3>
                        <p>Total Users: {reportData.userCount}</p>
                    </div>

                    {/* Order Report */}
                    <div className="bg-white p-5 rounded-md shadow-md">
                        <h3 className="font-medium text-lg">Order Report</h3>
                        <p>Total Orders: {reportData.orderCount}</p>
                        <p>Total Sales: Rp. {reportData.totalSales.toLocaleString()}</p>

                        {/* Order Status Breakdown */}
                        <div className="space-y-2 mt-3">
                            <p>Order Status Breakdown:</p>
                            <ul className="space-y-1">
                                {Object.entries(reportData.orderStats).map(([status, count]) => (
                                    <li key={status}>
                                        <span className={`font-medium ${getStatusColor(status)}`}>{status}</span>: {count} orders
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Report;