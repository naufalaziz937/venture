'use client';
import React, { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import Loading from "@/components/Loading";
import Image from "next/image";
import { assets } from "@/assets/assets";

const Report = () => {
    const { user } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState({
        userCount: 0,
        orderCount: 0,
        totalSales: 0,
        orderStats: {},
        userName: 'Administrator'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resUser, resOrder, resRevenue, resStatus, resUserDetails] = await Promise.all([
                    fetch('/api/user/get-total-user'),
                    fetch('/api/order/get-total-order'),
                    fetch('/api/order/get-total-revenue'),
                    fetch('/api/order/get-order-status-breakdown'),
                    fetch('/api/user/get-user-details', {
                        headers: {
                            'x-user-id': user?.id || ''
                        }
                    })
                ]);

                const [userData, orderData, revenueData, statusData, userDetails] = await Promise.all([
                    resUser.json(),
                    resOrder.json(),
                    resRevenue.json(),
                    resStatus.json(),
                    resUserDetails.json()
                ]);

                setReportData({
                    userCount: userData.users || 0,
                    orderCount: orderData.orders || 0,
                    totalSales: revenueData.revenue || 0,
                    orderStats: statusData.statusBreakdown || {},
                    userName: userDetails.name || 'Administrator'
                });
            } catch (err) {
                console.error("Gagal mengambil data laporan:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

    const formatDate = () => {
        return new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Laporan Statistik - Venture</title>
                <style>
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 11pt;
                        line-height: 1.4;
                        color: #000;
                    }
                    .report-container {
                        width: 100%;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .company-header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    .company-logo {
                        width: 80px;
                        height: 80px;
                        margin-right: 20px;
                    }
                    .company-info {
                        flex-grow: 1;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 15px;
                    }
                    th, td {
                        padding: 8px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    th {
                        font-weight: bold;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .text-center {
                        text-align: center;
                    }
                    .border-b {
                        border-bottom: 1px solid #000;
                    }
                    .font-bold {
                        font-weight: bold;
                    }
                    .underline {
                        text-decoration: underline;
                    }
                    .signature-area {
                        margin-top: 50px;
                        float: right;
                    }
                    .footer {
                        margin-top: 30px;
                        padding-top: 10px;
                        border-top: 1px solid #ddd;
                        font-size: 9pt;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="report-container">
                    ${document.querySelector('.printable-area').innerHTML}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 200);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) return <Loading />;

    return (
        <div className="p-6">
            {/* Header untuk tampilan web */}
            <div className="flex justify-between items-center mb-6 no-print">
                <h1 className="text-2xl font-bold text-gray-800">Laporan Statistik</h1>
                <button 
                    onClick={handlePrint}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Cetak Laporan
                </button>
            </div>

            {/* Konten Laporan yang akan dicetak */}
            <div className="bg-white rounded-lg shadow p-8 max-w-4xl mx-auto printable-area">
                {/* Kop Surat dengan Logo */}
                <div className="company-header border-b pb-6">
                    <div className="company-logo">
                        <Image
                            src={assets.logo2} // Update with your actual logo path
                            alt="Venture Logo"
                            width={80}
                            height={80}
                            className="object-contain mb-5"
                        />
                    </div>
                    <div className="company-info">
                        <p className="text-sm text-gray-600">
                            Jl. Kolonel Masturi No.300, RT.04/RW.14, Jambudipa, 
                            Kec. Cisarua, Kabupaten Bandung Barat, Jawa Barat 40551
                        </p>
                        <p className="text-sm text-gray-600">
                            Telp: (022) 1234567 | Email: info@venture.com
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            Pemilik: Nazwan Naufal Aziz
                        </p>
                    </div>
                </div>

                {/* Judul Laporan */}
                <div className="text-center mb-8 mt-4">
                    <h2 className="text-lg font-bold underline">LAPORAN STATISTIK</h2>
                    <p className="text-sm text-gray-600 mt-2">Periode: {formatDate()}</p>
                </div>

                {/* Informasi Umum */}
                <div className="mb-8">
                    <h3 className="text-md font-bold mb-4 border-b pb-1">INFORMASI UMUM</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium">Tanggal Dicetak:</p>
                            <p className="text-sm">{formatDate()}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Dicetak Oleh:</p>
                            <p className="text-sm">{reportData.userName}</p>
                        </div>
                    </div>
                </div>

                {/* Statistik Pengguna */}
                <div className="mb-8">
                    <h3 className="text-md font-bold mb-4 border-b pb-1">STATISTIK PENGGUNA</h3>
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td className="py-1 text-sm">Total Pengguna Terdaftar</td>
                                <td className="py-1 text-sm text-right">{reportData.userCount}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Statistik Pesanan */}
                <div className="mb-8">
                    <h3 className="text-md font-bold mb-4 border-b pb-1">STATISTIK PESANAN</h3>
                    <table className="w-full mb-4">
                        <tbody>
                            <tr>
                                <td className="py-1 text-sm">Total Pesanan</td>
                                <td className="py-1 text-sm text-right">{reportData.orderCount}</td>
                            </tr>
                            <tr>
                                <td className="py-1 text-sm">Total Pendapatan</td>
                                <td className="py-1 text-sm text-right">{formatCurrency(reportData.totalSales)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <h4 className="font-bold text-sm mb-3">DISTRIBUSI STATUS PESANAN</h4>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-t border-gray-300">
                                <th className="py-2 text-left text-sm font-medium">Status</th>
                                <th className="py-2 text-right text-sm font-medium">Jumlah</th>
                                <th className="py-2 text-right text-sm font-medium">Persentase</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(reportData.orderStats).map(([status, count]) => (
                                <tr key={status} className="border-b border-gray-200">
                                    <td className="py-2 text-sm">{status}</td>
                                    <td className="py-2 text-sm text-right">{count}</td>
                                    <td className="py-2 text-sm text-right">
                                        {((count / reportData.orderCount) * 100).toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                            <tr className="border-t-2 border-gray-400 font-semibold">
                                <td className="py-2 text-sm">TOTAL</td>
                                <td className="py-2 text-sm text-right">{reportData.orderCount}</td>
                                <td className="py-2 text-sm text-right">100%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Tanda Tangan */}
                <div className="mt-12 text-right">
                    <div className="inline-block text-center">
                        <p className="text-sm mb-10">Bandung Barat, {formatDate()}</p>
                        <div className="border-t border-black pt-8 w-32 mx-auto">
                            <p className="text-sm font-bold">(Nazwan Naufal Aziz)</p>
                            <p className="text-xs mt-1">Direktur Utama</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                    <p>Dokumen ini dicetak secara otomatis dari Sistem Manajemen PT. Venture</p>
                    <p className="mt-1">Halaman 1 dari 1</p>
                </div>
            </div>

            {/* CSS untuk menyembunyikan elemen saat cetak */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .printable-area, .printable-area * {
                        visibility: visible;
                    }
                    .printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Report;