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
    const { getToken, user } = useAppContext();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

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
        if (user) {
            fetchOrders();
        } else {
            console.log("User belum login");
        }
    }, [user]);

    return (
        <>
            <Navbar />
            <div className="flex flex-col justify-between px-6 md:px-16 lg:px-32 py-6 min-h-screen">
                <div className="space-y-5">
                    {/* Display user info */}
                    <div className="flex items-center gap-3">
                        <Image
                            src={user?.imageUrl || assets.defaultAvatar}
                            alt="User Avatar"
                            width={40}
                            height={40}
                            className="rounded-full"
                        />
                        <span className="font-medium">{user?.name || "User"}</span>
                    </div>

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
                                                    {order.items?.map((item) => (
                                                        `${item.product?.name || "Produk"} x ${item.quantity}`
                                                    )).join(", ")}
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
                                        </p>

                                        {/* Info Lain */}
                                        <div>
                                            <p className="flex flex-col">
                                                <span>Method : {order.paymentMethod || "COD"}</span>
                                                <span>Date : {order.date ? new Date(order.date).toLocaleDateString() : "-"}</span>
                                                <span>Payment : {order.paymentStatus || "Pending"}</span>
                                                <span>Delivery: {order.deliveryStatus || "Pending"}</span>
                                            </p>
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
