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
    const [orderStatus, setOrderStatus] = useState('placed');
    const [rentalStatus, setRentalStatus] = useState('reserved');
    const [deliveryStatus, setDeliveryStatus] = useState('pending');
    const [outstandingResolution, setOutstandingResolution] = useState('');
    const [isUpdating, setIsUpdating] = useState(false); const [beforeImage, setBeforeImage] = useState(null);
    const [afterImage, setAfterImage] = useState(null);
    const [beforePreview, setBeforePreview] = useState(null);
    const [afterPreview, setAfterPreview] = useState(null);
    const [inspectionOrder, setInspectionOrder] = useState(null);
    const [inspectionItems, setInspectionItems] = useState([]);
    const [inspectionNotes, setInspectionNotes] = useState('');
    const [inspectionFiles, setInspectionFiles] = useState([]);
    const [inspecting, setInspecting] = useState(false);
    const currentDate = new Date();
    const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const [receivedAt, setReceivedAt] = useState(today);
    const [financeOrder, setFinanceOrder] = useState(null);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [depositWithheldAmount, setDepositWithheldAmount] = useState('0');
    const [processingFinance, setProcessingFinance] = useState(false);

    const mergeFinancialOrder = (updatedOrder) => {
        setOrders(current => current.map(order => order._id === updatedOrder._id
            ? { ...order, ...updatedOrder, items: order.items, address: order.address }
            : order));
        setFinanceOrder(current => current?._id === updatedOrder._id ? { ...current, ...updatedOrder, items: current.items, address: current.address } : current);
    };

    const collectDeposit = async () => {
        setProcessingFinance(true);
        try {
            const token = await getToken();
            const { data } = await axios.post(`/api/order/${financeOrder._id}/deposit`, { action: 'collect' }, { headers: { Authorization: `Bearer ${token}` } });
            mergeFinancialOrder(data.order);
            toast.success(data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to collect deposit');
        } finally { setProcessingFinance(false); }
    };

    const settleDeposit = async () => {
        setProcessingFinance(true);
        try {
            const token = await getToken();
            const { data } = await axios.post(`/api/order/${financeOrder._id}/deposit`, {
                action: 'settle', withheldAmount: Number(depositWithheldAmount),
            }, { headers: { Authorization: `Bearer ${token}` } });
            mergeFinancialOrder(data.order);
            toast.success(data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to settle deposit');
        } finally { setProcessingFinance(false); }
    };

    const processRefund = async () => {
        setProcessingFinance(true);
        try {
            const token = await getToken();
            const key = crypto.randomUUID().replaceAll('-', '_');
            const { data } = await axios.post(`/api/order/${financeOrder._id}/refund`, {
                amount: Number(refundAmount), reason: refundReason,
            }, { headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': key } });
            mergeFinancialOrder(data.order);
            setRefundAmount('');
            setRefundReason('');
            toast.success(data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to process refund');
        } finally { setProcessingFinance(false); }
    };

    const overdueDays = (order) => {
        if (!order.rentalEndDate || !['active', 'return_pending'].includes(order.rentalStatus)) return 0;
        const due = new Date(order.rentalEndDate);
        const now = new Date();
        return Math.max(0, Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
            - Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate())) / 86400000));
    };

    const openInspection = (order) => {
        setInspectionOrder(order);
        setInspectionItems(order.items.map(item => ({
            product: item.product?._id || item.product,
            name: item.product?.name || 'Product',
            quantity: item.quantity,
            condition: 'normal',
            notes: '',
            charge: 0,
        })));
        setInspectionNotes('');
        setInspectionFiles([]);
        setReceivedAt(today);
    };

    const submitInspection = async () => {
        if (!inspectionOrder) return;
        setInspecting(true);
        try {
            const formData = new FormData();
            formData.append('receivedAt', receivedAt);
            formData.append('notes', inspectionNotes);
            formData.append('items', JSON.stringify(inspectionItems.map(({ product, condition, notes, charge }) => ({ product, condition, notes, charge: Number(charge) }))));
            inspectionFiles.forEach(file => formData.append('evidenceImages', file));
            const token = await getToken();
            const { data } = await axios.post(`/api/order/${inspectionOrder._id}/inspection`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders(current => current.map(order => order._id === inspectionOrder._id ? data.order : order));
            setInspectionOrder(null);
            toast.success(`${data.message}. Additional charges: Rp.${data.charges.totalAdditionalCharge.toLocaleString('id-ID')}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to complete inspection');
        } finally {
            setInspecting(false);
        }
    };


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
        setOrderStatus(order.orderStatus || 'placed');
        setRentalStatus(order.rentalStatus || 'reserved');
        setDeliveryStatus(order.deliveryStatus || 'pending');
        setOutstandingResolution('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    useEffect(() => {
        if (beforeImage) setBeforePreview(URL.createObjectURL(beforeImage));
    }, [beforeImage]);

    useEffect(() => {
        if (afterImage) setAfterPreview(URL.createObjectURL(afterImage));
    }, [afterImage]);


    const updateOrderStatus = async () => {
        if (!selectedOrder) return;
        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append('orderStatus', orderStatus);
            formData.append('rentalStatus', rentalStatus);
            formData.append('deliveryStatus', deliveryStatus);
            if (outstandingResolution) formData.append('outstandingResolution', outstandingResolution);
            if (beforeImage) formData.append("beforeImage", beforeImage);
            if (afterImage) formData.append("afterImage", afterImage);

            const token = await getToken();
            const { data } = await axios.put(
                `/api/order/update-order/${selectedOrder._id}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (data.success) {
                toast.success("Status pesanan berhasil diperbarui");
                setOrders((prev) =>
                    prev.map((order) =>
                        order._id === selectedOrder._id ? data.order : order
                    )
                );
                closeModal();
            } else {
                toast.error(data.message || "Gagal memperbarui status");
            }
        } catch (err) {
            toast.error("Terjadi kesalahan saat memperbarui status");
            console.error(err);
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
                                            <p><strong>Method:</strong> {order.paymentType || "COD"}</p>
                                            <p><strong>Date:</strong> {order.date ? new Date(order.date).toLocaleDateString() : "-"}</p>
                                            <p><strong>Rental:</strong> {order.rentalStartDate && order.rentalEndDate
                                                ? `${new Date(order.rentalStartDate).toLocaleDateString()} – ${new Date(order.rentalEndDate).toLocaleDateString()}`
                                                : '-'}</p>
                                            {overdueDays(order) > 0 && <p className="font-medium text-red-600">Overdue: {overdueDays(order)} days</p>}
                                            <p><strong>Order:</strong> {order.orderStatus || 'placed'}</p>
                                            <p><strong>Rental:</strong> {order.rentalStatus || 'reserved'}</p>
                                            <p className="flex items-center justify-end">
                                                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${getStatusColor(order.status)}`}></span>
                                                <strong>Delivery:</strong> {order.deliveryStatus || 'pending'}
                                            </p>
                                            <p><strong>Payment:</strong> {order.paymentStatus || (order.isPaid ? 'selesai' : 'pending')}</p>
                                            {order.outstandingAmount > 0 && <p><strong>Outstanding:</strong> Rp.{order.outstandingAmount.toLocaleString('id-ID')}</p>}
                                            {order.returnInspectionStatus === 'completed' && (
                                                <div className="mt-2 text-xs">
                                                    <p><strong>Late:</strong> {order.returnInspection?.lateDays || 0} days / Rp.{(order.returnInspection?.lateFee || 0).toLocaleString('id-ID')}</p>
                                                    {order.returnInspection?.items?.map(item => (
                                                        <p key={item.product}><strong>{item.condition}:</strong> {item.quantity} unit(s), Rp.{(item.charge || 0).toLocaleString('id-ID')}</p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => openModal(order)}
                                            className="w-32 text-center bg-green-500 hover:bg-green-600 text-white font-medium py-1 px-3 rounded-md shadow-sm transition-all duration-200"
                                        >
                                            Ubah Status
                                        </button>
                                        {['active', 'return_pending'].includes(order.rentalStatus) && order.returnInspectionStatus !== 'completed' && (
                                            <button onClick={() => openInspection(order)} className="w-32 text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-md">
                                                Inspect Return
                                            </button>
                                        )}
                                        {(order.depositAmount > 0 || (order.paymentType === 'Stripe' && order.isPaid)) && (
                                            <button onClick={() => setFinanceOrder(order)} className="w-32 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1 px-3 rounded-md">
                                                Payments
                                            </button>
                                        )}
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

                        <div className="grid grid-cols-1 gap-4 mb-6">
                            <label className="block font-medium">Order status
                            <select
                                value={orderStatus}
                                onChange={(e) => setOrderStatus(e.target.value)}
                                className="mt-1 border border-gray-300 p-2 rounded-md w-full"
                            >
                                <option value="placed">Placed</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            </label>
                            <label className="block font-medium">Rental status
                                <select value={rentalStatus} onChange={(e) => setRentalStatus(e.target.value)} className="mt-1 border border-gray-300 p-2 rounded-md w-full">
                                    <option value="reserved">Reserved</option>
                                    <option value="active">Active</option>
                                    <option value="return_pending">Return pending</option>
                                    <option value="returned">Returned</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </label>
                            <label className="block font-medium">Delivery status
                                <select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value)} className="mt-1 border border-gray-300 p-2 rounded-md w-full">
                                    <option value="pending">Pending</option>
                                    <option value="outbound">Outbound</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="pickup_ready">Pickup ready</option>
                                    <option value="picked_up">Picked up</option>
                                    <option value="return_in_transit">Return in transit</option>
                                    <option value="returned">Returned</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </label>
                            {selectedOrder?.outstandingAmount > 0 && (
                                <label className="block font-medium">Outstanding balance
                                    <select value={outstandingResolution} onChange={(e) => setOutstandingResolution(e.target.value)} className="mt-1 border border-gray-300 p-2 rounded-md w-full">
                                        <option value="">Unresolved — Rp.{selectedOrder.outstandingAmount.toLocaleString('id-ID')}</option>
                                        <option value="paid">Mark paid</option>
                                        <option value="waived">Waive charge</option>
                                    </select>
                                </label>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {/* Sebelum */}
                            <div className="flex flex-col items-center">
                                <p className="font-medium mb-1">Foto Sebelum</p>
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setBeforeImage(file);
                                            setBeforePreview(file ? URL.createObjectURL(file) : null);
                                        }}
                                    />
                                    <div className="w-24 h-24 bg-gray-50 rounded overflow-hidden border border-dashed border-gray-300 flex items-center justify-center">
                                        {beforePreview ? (
                                            <Image src={beforePreview} alt="preview_before" width={96} height={96} className="object-cover" />
                                        ) : selectedOrder?.beforeRentalImage ? (
                                            <Image src={selectedOrder.beforeRentalImage} alt="uploaded_before" width={96} height={96} className="object-cover" />
                                        ) : (
                                            <div className="text-gray-400 text-xs text-center">Belum diupload</div>
                                        )}
                                    </div>
                                </label>
                                {/* Tombol View Full */}
                                {(beforePreview || selectedOrder?.beforeRentalImage) && (
                                    <button
                                        onClick={() => window.open(beforePreview || selectedOrder.beforeRentalImage, "_blank")}
                                        className="text-blue-600 text-xs mt-2 hover:underline"
                                    >
                                        View Full Image
                                    </button>
                                )}
                            </div>

                            {/* Sesudah */}
                            <div className="flex flex-col items-center">
                                <p className="font-medium mb-1">Foto Sesudah</p>
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setAfterImage(file);
                                            setAfterPreview(file ? URL.createObjectURL(file) : null);
                                        }}
                                    />
                                    <div className="w-24 h-24 bg-gray-50 rounded overflow-hidden border border-dashed border-gray-300 flex items-center justify-center">
                                        {afterPreview ? (
                                            <Image src={afterPreview} alt="preview_after" width={96} height={96} className="object-cover" />
                                        ) : selectedOrder?.afterRentalImage ? (
                                            <Image src={selectedOrder.afterRentalImage} alt="uploaded_after" width={96} height={96} className="object-cover" />
                                        ) : (
                                            <div className="text-gray-400 text-xs text-center">Belum diupload</div>
                                        )}
                                    </div>
                                </label>
                                {/* Tombol View Full */}
                                {(afterPreview || selectedOrder?.afterRentalImage) && (
                                    <button
                                        onClick={() => window.open(afterPreview || selectedOrder.afterRentalImage, "_blank")}
                                        className="text-blue-600 text-xs mt-2 hover:underline"
                                    >
                                        View Full Image
                                    </button>
                                )}
                            </div>
                        </div>


                        {/* Button Aksi */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => updateOrderStatus(beforeImage, afterImage)}
                                disabled={isUpdating}
                                className={`bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                            >
                                {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {inspectionOrder && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-medium mb-4">Return inspection</h3>
                        <label className="block font-medium mb-4">Received date
                            <input type="date" max={today} value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className="mt-1 block border rounded p-2" />
                        </label>
                        <div className="space-y-4">
                            {inspectionItems.map((item, index) => (
                                <div key={item.product} className="border rounded p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <p className="font-medium md:col-span-2">{item.name} × {item.quantity}</p>
                                    <label>Condition
                                        <select
                                            value={item.condition}
                                            onChange={(e) => setInspectionItems(current => current.map((value, itemIndex) => itemIndex === index ? { ...value, condition: e.target.value, charge: e.target.value === 'normal' ? 0 : value.charge } : value))}
                                            className="mt-1 block w-full border rounded p-2"
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="damaged">Damaged</option>
                                            <option value="lost">Lost</option>
                                        </select>
                                    </label>
                                    <label>Additional charge
                                        <input
                                            type="number"
                                            min="0"
                                            disabled={item.condition === 'normal'}
                                            value={item.charge}
                                            onChange={(e) => setInspectionItems(current => current.map((value, itemIndex) => itemIndex === index ? { ...value, charge: e.target.value } : value))}
                                            className="mt-1 block w-full border rounded p-2 disabled:bg-gray-100"
                                        />
                                    </label>
                                    <label className="md:col-span-2">Item notes
                                        <textarea value={item.notes} maxLength={1000} onChange={(e) => setInspectionItems(current => current.map((value, itemIndex) => itemIndex === index ? { ...value, notes: e.target.value } : value))} className="mt-1 block w-full border rounded p-2" />
                                    </label>
                                </div>
                            ))}
                        </div>
                        <label className="block mt-4">Inspection notes
                            <textarea value={inspectionNotes} maxLength={2000} onChange={(e) => setInspectionNotes(e.target.value)} className="mt-1 block w-full border rounded p-2" />
                        </label>
                        <label className="block mt-4">Evidence images (up to 4)
                            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setInspectionFiles(Array.from(e.target.files || []).slice(0, 4))} className="mt-1 block w-full" />
                        </label>
                        <p className="mt-3 text-sm text-gray-500">Late fees are calculated automatically at Rp.{(inspectionOrder.lateFeePerDay || 0).toLocaleString('id-ID')} per overdue day.</p>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setInspectionOrder(null)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            <button disabled={inspecting} onClick={submitInspection} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
                                {inspecting ? 'Processing...' : 'Complete inspection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {financeOrder && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-medium mb-4">Payments and deposit</h3>
                        <div className="space-y-1 text-sm">
                            <p>Total charged: Rp.{(financeOrder.amount || 0).toLocaleString('id-ID')}</p>
                            <p>Rental: Rp.{(financeOrder.rentalAmount || Math.max(0, financeOrder.amount - (financeOrder.depositAmount || 0))).toLocaleString('id-ID')}</p>
                            <p>Deposit: Rp.{(financeOrder.depositAmount || 0).toLocaleString('id-ID')} ({financeOrder.depositStatus})</p>
                            <p>Refunded: Rp.{(financeOrder.refundedAmount || 0).toLocaleString('id-ID')}</p>
                            <p>Outstanding charges: Rp.{(financeOrder.outstandingAmount || 0).toLocaleString('id-ID')}</p>
                        </div>
                        {financeOrder.paymentType === 'COD' && financeOrder.depositStatus === 'pending' && (
                            <button disabled={processingFinance} onClick={collectDeposit} className="mt-4 w-full py-2 bg-blue-600 text-white rounded disabled:opacity-50">Mark deposit collected</button>
                        )}
                        {financeOrder.depositStatus === 'held' && financeOrder.returnInspectionStatus === 'completed' && (
                            <div className="mt-5 border-t pt-4">
                                <h4 className="font-medium">Settle security deposit</h4>
                                <label className="block mt-2 text-sm">Amount withheld for charges
                                    <input type="number" min="0" max={Math.min(financeOrder.depositAmount, financeOrder.outstandingAmount)} value={depositWithheldAmount} onChange={(e) => setDepositWithheldAmount(e.target.value)} className="mt-1 w-full border rounded p-2" />
                                </label>
                                <button disabled={processingFinance} onClick={settleDeposit} className="mt-3 w-full py-2 bg-green-600 text-white rounded disabled:opacity-50">Release deposit</button>
                            </div>
                        )}
                        {financeOrder.paymentType === 'Stripe' && financeOrder.isPaid && ((financeOrder.rentalAmount || Math.max(0, financeOrder.amount - (financeOrder.depositAmount || 0))) - (financeOrder.rentalRefundedAmount || 0) - (financeOrder.refundReservedAmount || 0)) > 0 && (
                            <div className="mt-5 border-t pt-4">
                                <h4 className="font-medium">Issue refund</h4>
                                <p className="text-xs text-gray-500">Available rental refund: Rp.{((financeOrder.rentalAmount || Math.max(0, financeOrder.amount - (financeOrder.depositAmount || 0))) - (financeOrder.rentalRefundedAmount || 0) - (financeOrder.refundReservedAmount || 0)).toLocaleString('id-ID')}</p>
                                <input type="number" min="1" max={(financeOrder.rentalAmount || Math.max(0, financeOrder.amount - (financeOrder.depositAmount || 0))) - (financeOrder.rentalRefundedAmount || 0) - (financeOrder.refundReservedAmount || 0)} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="Refund amount" className="mt-2 w-full border rounded p-2" />
                                <textarea value={refundReason} maxLength={500} onChange={(e) => setRefundReason(e.target.value)} placeholder="Refund reason" className="mt-2 w-full border rounded p-2" />
                                <button disabled={processingFinance || !refundAmount || !refundReason.trim()} onClick={processRefund} className="mt-3 w-full py-2 bg-red-600 text-white rounded disabled:opacity-50">Issue Stripe refund</button>
                            </div>
                        )}
                        <button onClick={() => setFinanceOrder(null)} className="mt-5 w-full py-2 bg-gray-200 rounded">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
