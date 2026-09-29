'use client';
import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Loading from "@/components/Loading";
import axios from "axios";
import toast from "react-hot-toast";

const MyOrders = () => {
    const { getToken, user, isAuthLoaded } = useAppContext();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [extensionOrderId, setExtensionOrderId] = useState(null);
    const [extensionEndDate, setExtensionEndDate] = useState('');
    const [extending, setExtending] = useState(false);
    const [returnOrderId, setReturnOrderId] = useState(null);
    const [returnNotes, setReturnNotes] = useState('');
    const [requestingReturn, setRequestingReturn] = useState(false);

    const overdueDays = (order) => {
        if (!order.rentalEndDate || !['active', 'return_pending'].includes(order.rentalStatus)) return 0;
        const due = new Date(order.rentalEndDate);
        const now = new Date();
        const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
        const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        return Math.max(0, Math.floor((nowDay - dueDay) / 86400000));
    };

    const requestReturn = async (order) => {
        setRequestingReturn(true);
        try {
            const token = await getToken();
            const { data } = await axios.post(`/api/order/${order._id}/return`, { notes: returnNotes }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders(current => current.map(item => item._id === order._id ? data.order : item));
            setReturnOrderId(null);
            setReturnNotes('');
            toast.success(data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to request return');
        } finally {
            setRequestingReturn(false);
        }
    };

    const extensionMinimumDate = (endDate) => {
        const date = new Date(endDate);
        date.setUTCDate(date.getUTCDate() + 1);
        return date.toISOString().slice(0, 10);
    };

    const extendRental = async (order) => {
        if (!extensionEndDate) return;
        setExtending(true);
        try {
            const token = await getToken();
            const { data } = await axios.post(`/api/order/${order._id}/extension`, {
                rentalEndDate: extensionEndDate,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setOrders(current => current.map(item => item._id === order._id ? {
                ...item,
                rentalEndDate: data.rentalEndDate,
                outstandingAmount: data.outstandingAmount,
            } : item));
            toast.success(`${data.message}. Additional charge: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(data.additionalAmount)}`);
            setExtensionOrderId(null);
            setExtensionEndDate('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to extend rental');
        } finally {
            setExtending(false);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            if (!token) {
                toast.error("Token tidak ditemukan!");
                setLoading(false);
                return;
            }

            const { data } = await axios.get('/api/order/list', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success) {
                setOrders(data.orders.reverse());
            } else {
                toast.error(data.message || "Gagal mengambil data order.");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan.";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthLoaded && user) {
            fetchOrders();
        } else if (isAuthLoaded && !user) {
            setLoading(false);
        }
    }, [user, isAuthLoaded]);

    const getStatusColor = (status) => {
        if (!status) return 'bg-gray-500';
        const lower = status.toLowerCase();
        if (lower.includes('selesai')) return 'bg-green-500';
        if (lower.includes('batal')) return 'bg-red-500';
        if (lower.includes('perjalanan')) return 'bg-blue-500';
        return 'bg-yellow-500';
    };

    return (
        <>
            <Navbar />
            <div className="flex flex-col justify-between px-6 md:px-16 lg:px-32 py-6 min-h-screen">
                <div className="space-y-5">
                    <h2 className="text-lg font-medium mt-6">My Orders</h2>

                    {loading ? (
                        <Loading />
                    ) : (
                        <div className="max-w-5xl border-t border-gray-300 text-sm">
                            {orders.length > 0 ? (
                                orders.map((order) => (
                                    <div
                                        key={order._id}
                                        className="flex flex-col md:flex-row gap-5 justify-between p-5 border-b border-gray-300"
                                    >
                                        {/* Produk */}
                                        <div className="flex-1 flex gap-5 max-w-80">
                                            <Image
                                                className="max-w-16 max-h-16 object-cover"
                                                src={assets.box_icon}
                                                alt="box_icon"
                                            />
                                            <p className="flex flex-col gap-3">
                                                <span className="font-medium text-base">
                                                    {order.items?.map((item) =>
                                                        `${item.product?.name || "Produk"} x ${item.quantity}`
                                                    ).join(", ")}
                                                </span>
                                                <span>Items : {order.items?.length || 0}</span>
                                            </p>
                                        </div>

                                        {/* Alamat */}
                                        <div>
                                            <p className="flex flex-col">
                                                <span className="font-medium">{order.address?.fullName || "Nama tidak ada"}</span>
                                                <span>{order.address?.area || "-"}</span>
                                                <span>{order.address ? `${order.address.city}, ${order.address.state}` : "-"}</span>
                                                <span>{order.address?.phoneNumber || "-"}</span>
                                            </p>
                                        </div>

                                        {/* Harga */}
                                        <p className="font-medium my-auto">
                                            {new Intl.NumberFormat("id-ID", {
                                                style: "currency",
                                                currency: "IDR",
                                            }).format(order.amount || 0)}
                                            {order.outstandingAmount > 0 && (
                                                <span className="block mt-1 text-xs text-orange-600">
                                                    Outstanding: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(order.outstandingAmount)}
                                                </span>
                                            )}
                                        </p>

                                        {/* Status Info */}
                                        <div className="flex flex-col justify-center items-end gap-2 min-w-[140px] text-right">
                                            <p><strong>Method:</strong> {order.paymentType || "COD"}</p>
                                            <p><strong>Date:</strong> {order.date ? new Date(order.date).toLocaleDateString() : "-"}</p>
                                            <p><strong>Rental:</strong> {order.rentalStartDate && order.rentalEndDate
                                                ? `${new Date(order.rentalStartDate).toLocaleDateString()} – ${new Date(order.rentalEndDate).toLocaleDateString()}`
                                                : '-'}</p>
                                            {overdueDays(order) > 0 && (
                                                <p className="font-medium text-red-600">Overdue by {overdueDays(order)} day{overdueDays(order) === 1 ? '' : 's'}</p>
                                            )}
                                            <p><strong>Order:</strong> {order.orderStatus || 'placed'}</p>
                                            <p><strong>Rental:</strong> {order.rentalStatus || 'reserved'}</p>
                                            <p className="flex items-center justify-end">
                                                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${getStatusColor(order.status)}`}></span>
                                                <strong>Delivery:</strong> {order.deliveryStatus || 'pending'}
                                            </p>
                                            <p><strong>Payment:</strong> {order.paymentStatus || (order.isPaid ? 'selesai' : 'pending')}</p>
                                            {order.depositAmount > 0 && <p><strong>Deposit:</strong> Rp.{order.depositAmount.toLocaleString('id-ID')} · {order.depositStatus}</p>}
                                            {order.refundedAmount > 0 && <p><strong>Refunded:</strong> Rp.{order.refundedAmount.toLocaleString('id-ID')}</p>}
                                            {order.reservationStatus === 'confirmed' && ['reserved', 'active'].includes(order.rentalStatus || 'reserved') && (
                                                extensionOrderId === order._id ? (
                                                    <div className="mt-2 w-full space-y-2">
                                                        <input
                                                            type="date"
                                                            min={extensionMinimumDate(order.rentalEndDate)}
                                                            value={extensionEndDate}
                                                            onChange={(e) => setExtensionEndDate(e.target.value)}
                                                            className="w-full border rounded p-2 text-sm"
                                                        />
                                                        <div className="flex gap-2 justify-end">
                                                            <button onClick={() => setExtensionOrderId(null)} className="px-3 py-1 border rounded">Cancel</button>
                                                            <button disabled={extending || !extensionEndDate} onClick={() => extendRental(order)} className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50">
                                                                {extending ? 'Checking...' : 'Extend'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setExtensionOrderId(order._id);
                                                            setExtensionEndDate(extensionMinimumDate(order.rentalEndDate));
                                                        }}
                                                        className="mt-2 px-3 py-1 border border-green-600 text-green-700 rounded"
                                                    >
                                                        Extend rental
                                                    </button>
                                                )
                                            )}
                                            {order.rentalStatus === 'active' && ['delivered', 'picked_up'].includes(order.deliveryStatus) && (
                                                returnOrderId === order._id ? (
                                                    <div className="mt-2 w-full space-y-2">
                                                        <textarea
                                                            value={returnNotes}
                                                            onChange={(e) => setReturnNotes(e.target.value)}
                                                            maxLength={1000}
                                                            placeholder="Return notes (optional)"
                                                            className="w-full border rounded p-2 text-sm"
                                                        />
                                                        <div className="flex gap-2 justify-end">
                                                            <button onClick={() => setReturnOrderId(null)} className="px-3 py-1 border rounded">Cancel</button>
                                                            <button disabled={requestingReturn} onClick={() => requestReturn(order)} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">
                                                                {requestingReturn ? 'Submitting...' : 'Confirm return'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setReturnOrderId(order._id)} className="mt-2 px-3 py-1 border border-blue-600 text-blue-700 rounded">
                                                        Request return
                                                    </button>
                                                )
                                            )}
                                            {order.rentalStatus === 'return_pending' && (
                                                <p className="mt-2 text-xs text-blue-600">Return requested; awaiting inspection.</p>
                                            )}
                                            {order.returnInspectionStatus === 'completed' && (
                                                <div className="mt-2 text-xs text-left">
                                                    <p>Late fee: Rp.{(order.returnInspection?.lateFee || 0).toLocaleString('id-ID')}</p>
                                                    <p>Damage/loss: Rp.{(order.returnInspection?.conditionCharges || 0).toLocaleString('id-ID')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-10 text-gray-500">Belum ada order.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
};

export default MyOrders;
