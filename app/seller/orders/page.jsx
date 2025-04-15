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

    const fetchSellerOrders = async () => {
        try {
            const token = await getToken()
            const {data} = await axios.get('/api/order/seller-orders', { headers: { Authorization: `Bearer ${token}` } })
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

    // Fungsi untuk update status
    const updateOrderStatus = async (orderId, paymentStatus, deliveryStatus) => {
        try {
            const token = await getToken();
            const response = await axios.put('/api/order/update-status', {
                orderId, paymentStatus, deliveryStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                toast.success("Status updated successfully");
                fetchSellerOrders(); // Refresh orders after update
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    return (
        <div className="flex-1 h-screen overflow-scroll flex flex-col justify-between text-sm">
            {loading ? <Loading /> : <div className="md:p-10 p-4 space-y-5">
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
                                        {order.items.map((item) => item.product.name + ` x ${item.quantity}`).join(", ")}
                                    </span>
                                    <span>Items : {order.items.length}</span>
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
                            <p className="font-medium my-auto">Rp.{order.amount}</p>
                            <div>
                                <p className="flex flex-col">
                                    <span>Method : COD</span>
                                    <span>Date : {new Date(order.date).toLocaleDateString()}</span>
                                    <div>
                                        <label>Payment Status:</label>
                                        <select 
                                            value={order.paymentStatus}
                                            onChange={(e) => updateOrderStatus(order._id, e.target.value, order.deliveryStatus)}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Selesai">Selesai</option>
                                            <option value="Batal">Batal</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Delivery Status:</label>
                                        <select 
                                            value={order.deliveryStatus}
                                            onChange={(e) => updateOrderStatus(order._id, order.paymentStatus, e.target.value)}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Dalam Perjalanan ke Alamat User">Dalam Perjalanan</option>
                                            <option value="Sampai di User">Sampai di User</option>
                                            <option value="Dikembalikan ke Venture">Dikembalikan</option>
                                            <option value="Selesai">Selesai</option>
                                            <option value="Dibatalkan">Dibatalkan</option>
                                        </select>
                                    </div>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>}
        </div>
    );
};

export default Orders;
