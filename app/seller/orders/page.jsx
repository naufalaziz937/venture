'use client';
import React, { useEffect, useState } from "react";
import { assets, orderDummyData } from "@/assets/assets";
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
    const [paymentStatus, setPaymentStatus] = useState('');
    const [deliveryStatus, setDeliveryStatus] = useState('');

    const fetchSellerOrders = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/order/seller-orders', { headers: { Authorization: `Bearer ${token}` } })
            if (data.success) {
                setOrders(data.orders)
                setLoading(false)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSellerOrders();

        }
    }, [user]);

    // Open the modal with the order details
    const openModal = (order) => {
        setSelectedOrder(order);
        setPaymentStatus(order.paymentStatus);
        setDeliveryStatus(order.deliveryStatus);
        setIsModalOpen(true);
    };

    // Close the modal
    const closeModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="flex-1 h-screen overflow-scroll flex flex-col justify-between text-sm">
            {loading ? <Loading /> : (
                <div className="md:p-10 p-4 space-y-5">
                    <h2 className="text-lg font-medium">Orders</h2>
                    <div className="max-w-4xl rounded-md">
                        {orders.map((order, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-5 justify-between p-5 border-t border-gray-300">
                                <div className="flex-1 flex gap-5 max-w-80">
                                    <Image
                                        className="max-w-16 max-h-16 object-cover"
                                        src={assets.box_icon}
                                        alt="box_icon"
                                    />
                                    <p className="flex flex-col gap-3">
                                        <span className="font-medium">
                                            {order.items.map(item => `${item.product.name} x ${item.quantity}`).join(", ")}
                                        </span>
                                        <span>Items: {order.items.length}</span>
                                    </p>
                                </div>
                                <div>
                                    <p>
                                        <span className="font-medium">{order.address.fullName}</span>
                                        <br />
                                        <span>{order.address.area}</span>
                                        <br />
                                        <span>{`${order.address.city}, ${order.address.state}`}</span>
                                        <br />
                                        <span>{order.address.phoneNumber}</span>
                                    </p>
                                </div>
                                <p className="font-medium my-auto">
                                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(order.amount)}
                                </p>

                                {/* Status & Button Section */}
                                <div className="flex flex-col justify-center items-end gap-2 min-w-[140px]">
                                    <div className="text-sm text-gray-700">
                                        <p><strong>Method:</strong> {order.paymentMethod || "COD"}</p>
                                        <span><strong>Date: </strong>{order.date ? new Date(order.date).toLocaleDateString() : "-"}</span>
                                        <p><strong>Payment:</strong> {order.paymentStatus}</p>
                                        <p><strong>Delivery:</strong> {order.deliveryStatus}</p>
                                    </div>
                                    <button
                                        onClick={() => openModal(order)}
                                        className="w-32 text-center bg-green-500 hover:bg-green-600 text-white font-medium py-1 px-3 rounded-md shadow-sm transition-all duration-200"
                                    >
                                        Edit Status
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal for editing order status */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full">
                        <h3 className="text-xl font-medium mb-4">Edit Order Status</h3>

                        {/* Payment Status Dropdown */}
                        <div className="mb-4">
                            <label className="block font-medium">Payment Status</label>
                            <select
                                value={paymentStatus}
                                onChange={(e) => setPaymentStatus(e.target.value)}
                                className="border border-gray-300 p-2 rounded-md w-full"
                            >
                                <option value="Pending">Pending</option>
                                <option value="Selesai">Selesai</option>
                                <option value="Batal">Batal</option>
                            </select>
                        </div>

                        {/* Delivery Status Dropdown */}
                        <div className="mb-4">
                            <label className="block font-medium">Delivery Status</label>
                            <select
                                value={deliveryStatus}
                                onChange={(e) => setDeliveryStatus(e.target.value)}
                                className="border border-gray-300 p-2 rounded-md w-full"
                            >
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
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md">
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await updateOrderStatus();
                                    closeModal();
                                }}
                                className="bg-orange-600 text-white px-4 py-2 rounded-md">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );



};

export default Orders;