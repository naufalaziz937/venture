'use client';
import React, { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import Loading from "@/components/Loading"; // You can use your existing Loading component

const Report = () => {
    const { user } = useAppContext();

    // Dummy data (replace with actual API calls or data fetching logic)
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState({
        userCount: 0,
        orderCount: 0,
        totalSales: 0,
        orderStats: {}
    });

    useEffect(() => {
        // Simulate fetching data
        setTimeout(() => {
            setReportData({
                userCount: 100,  // Example: total users
                orderCount: 150, // Example: total orders
                totalSales: 500000, // Example: total sales in IDR
                orderStats: {
                    Pending: 30,
                    "Dalam Perjalanan ke Alamat User": 50,
                    "Sampai di User": 20,
                    "Dikembalikan ke Venture": 10,
                    Selesai: 40,
                    Dibatalkan: 5
                }
            });
            setLoading(false);
        }, 1000); // Simulate 1 second loading
    }, []);

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
                        <p>Total Sales: Rp.{reportData.totalSales}</p>

                        {/* Order Status Breakdown */}
                        <div className="space-y-2 mt-3">
                            <p>Order Status Breakdown:</p>
                            <ul>
                                {Object.keys(reportData.orderStats).map((status) => (
                                    <li key={status}>
                                        {status}: {reportData.orderStats[status]} orders
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
