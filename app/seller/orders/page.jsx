'use client';
import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Loading from "@/components/Loading";
import axios from "axios";
import toast from "react-hot-toast";

const Orders = () => {
    const { currency, getToken, user } = useAppContext();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [status, setStatus] = useState('Order Placed');
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchSellerOrders = async () => {
        try {
            const token = await getToken();
            const { data } = await axios.get('/api/order/seller-orders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setOrders(data.orders || []);
            } else {
                toast.error(data.message || "Gagal memuat pesanan");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Terjadi kesalahan saat memuat pesanan");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchSellerOrders();
        }
    }, [user]);

    const openModal = (order) => {
        setSelectedOrder(order);
        setStatus(order.status || 'Order Placed');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const updateOrderStatus = async () => {
        if (!selectedOrder) return;

        setIsUpdating(true);
        try {
            const token = await getToken();
            const { data } = await axios.put(
                `/api/order/update-order/${selectedOrder._id}`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (data.success) {
                toast.success("Status pesanan berhasil diperbarui");
                setOrders(orders.map(order =>
                    order._id === selectedOrder._id ? {
                        ...order,
                        status
                    } : order
                ));
                closeModal();
            } else {
                toast.error(data.message || "Gagal memperbarui status");
            }
        } catch (error) {
            console.error("Error updating order status:", error);
            toast.error(error.response?.data?.message || "Terjadi kesalahan saat memperbarui status");
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusColor = (status) => {
        if (!status) return 'bg-gray-500';
        if (typeof status !== 'string') return 'bg-gray-500';

        const statusStr = status.toString().toLowerCase();
        if (statusStr.includes('selesai')) return 'bg-green-500';
        if (statusStr.includes('batal')) return 'bg-red-500';
        if (statusStr.includes('perjalanan')) return 'bg-blue-500';
        return 'bg-yellow-500';
    };

    return (
        <div className="flex-1 h-screen overflow-scroll flex flex-col justify-between text-sm">
            {loading ? <Loading /> : (
                <div className="md:p-10 p-4 space-y-5">
                    <h2 className="text-lg font-medium">Daftar Pesanan</h2>
                    <div className="max-w-4xl rounded-md">
                        {orders.length === 0 ? (
                            <p className="text-center py-10">Belum ada pesanan</p>
                        ) : (
                            orders.map((order) => (
                                <div key={order._id} className="flex flex-col md:flex-row gap-5 justify-between p-5 border-t border-gray-300">
                                    {/* Order items */}
                                    <div className="flex-1 flex gap-5 max-w-80">
                                        <Image
                                            className="max-w-16 max-h-16 object-cover"
                                            src={assets.box_icon}
                                            alt="box_icon"
                                            width={64}
                                            height={64}
                                        />
                                        <p className="flex flex-col gap-3">
                                            <span className="font-medium">
                                                {order.items?.map(item => `${item.product?.name || 'Produk'} x ${item.quantity || 0}`).join(", ") || 'Tidak ada item'}
                                            </span>
                                            <span>Jumlah Item: {order.items?.length || 0}</span>
                                        </p>
                                    </div>

                                    {/* Address info */}
                                    <div>
                                        <p>
                                            <span className="font-medium">{order.address?.fullName || '-'}</span>
                                            <br />
                                            <span>{order.address?.area || '-'}</span>
                                            <br />
                                            <span>{`${order.address?.city || ''}, ${order.address?.state || ''}`}</span>
                                            <br />
                                            <span>{order.address?.phoneNumber || '-'}</span>
                                        </p>
                                    </div>

                                    {/* Amount */}
                                    <p className="font-medium my-auto">
                                        {new Intl.NumberFormat("id-ID", {
                                            style: "currency",
                                            currency: "IDR"
                                        }).format(order.amount || 0)}
                                    </p>

                                    {/* Status & Button */}
                                    <div className="flex flex-col justify-center items-end gap-2 min-w-[140px]">
                                        <div className="text-sm text-gray-700">
                                            <p><strong>Metode:</strong> {order.paymentMethod || "COD"}</p>
                                            <p><strong>Tanggal:</strong> {order.date ? new Date(order.date).toLocaleDateString('id-ID') : "-"}</p>
                                            <p className="flex items-center">
                                                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${getStatusColor(order.status)}`}></span>
                                                <strong>Status:</strong> {order.status || '-'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => openModal(order)}
                                            className="w-32 text-center bg-green-500 hover:bg-green-600 text-white font-medium py-1 px-3 rounded-md shadow-sm transition-all duration-200"
                                        >
                                            Ubah Status
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full">
                        <h3 className="text-xl font-medium mb-4">Ubah Status Pesanan</h3>

                        <div className="mb-6">
                            <label className="block font-medium mb-1">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="border border-gray-300 p-2 rounded-md w-full"
                            >
                                <option value="Order Placed">Order Placed</option>
                                <option value="Pending">Pending</option>
                                <option value="Dalam Perjalanan ke Alamat User">Dalam Perjalanan</option>
                                <option value="Sampai di User">Sampai di User</option>
                                <option value="Dikembalikan ke Venture">Dikembalikan</option>
                                <option value="Selesai">Selesai</option>
                                <option value="Dibatalkan">Dibatalkan</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={updateOrderStatus}
                                disabled={isUpdating}
                                className={`bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors ${
                                    isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;