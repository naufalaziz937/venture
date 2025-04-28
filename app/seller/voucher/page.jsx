'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const VoucherManagement = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal create
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newVoucher, setNewVoucher] = useState({
        code: '',
        type: 'percent',
        amount: 0,
        expiresAt: '',
        usageLimit: 0,
    });

    // Modal delete (berisi ID voucher)
    const [voucherToDelete, setVoucherToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchVouchers = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/voucher/list');
            if (data.success) setVouchers(data.vouchers);
            else toast.error(data.message || 'Failed to fetch vouchers');
        } catch {
            toast.error('Error fetching vouchers');
        } finally {
            setLoading(false);
        }
    };

    const createVoucher = async () => {
        setCreating(true);
        try {
            const { data } = await axios.post('/api/voucher/create', newVoucher);
            if (data.success) {
                toast.success('Voucher created successfully');
                setIsModalOpen(false);
                setNewVoucher({ code: '', type: 'percent', amount: 0, expiresAt: '', usageLimit: 0 });
                fetchVouchers();
            } else {
                toast.error(data.message || 'Failed to create voucher');
            }
        } catch {
            toast.error('Error creating voucher');
        } finally {
            setCreating(false);
        }
    };

    const confirmDelete = (id) => {
        setVoucherToDelete(id);
    };

    const cancelDelete = () => {
        setVoucherToDelete(null);
    };

    const deleteVoucher = async () => {
        if (!voucherToDelete) return;
        setDeleting(true);
        try {
            const { data } = await axios.delete(`/api/voucher/delete/${voucherToDelete}`);
            if (data.success) {
                toast.success(data.message);
                fetchVouchers();
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            toast.error(`Error deleting: ${msg}`);
        } finally {
            setDeleting(false);
            setVoucherToDelete(null);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Voucher Management</h1>

            {/* Create New */}
            <div className="mb-6">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                    + Create New Voucher
                </button>
            </div>

            {/* List */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-medium mb-4">Voucher List</h2>
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="text-sm text-left bg-gray-100">
                                <th className="px-4 py-2">Code</th>
                                <th className="px-4 py-2">Type</th>
                                <th className="px-4 py-2">Amount</th>
                                <th className="px-4 py-2">Expiry Date</th>
                                <th className="px-4 py-2">Usage Limit</th>
                                <th className="px-4 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vouchers.map((v) => (
                                <tr key={v._id} className="odd:bg-gray-50">
                                    <td className="px-4 py-2">{v.code}</td>
                                    <td className="px-4 py-2">{v.type}</td>
                                    <td className="px-4 py-2">
                                        {v.type === 'percent'
                                            ? `${v.amount}%`
                                            : `Rp ${v.amount.toLocaleString('id-ID')}`}
                                    </td>
                                    <td className="px-4 py-2">
                                        {v.expiresAt
                                            ? new Date(v.expiresAt).toLocaleDateString('id-ID')
                                            : 'N/A'}
                                    </td>
                                    <td className="px-4 py-2">{v.usageLimit ?? '∞'}</td>
                                    <td className="px-4 py-2">
                                        <button
                                            onClick={() => confirmDelete(v._id)}
                                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {vouchers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-2 text-center text-gray-500">
                                        No vouchers found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Create Voucher</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Code</label>
                                <input
                                    type="text"
                                    value={newVoucher.code}
                                    onChange={e => setNewVoucher({ ...newVoucher, code: e.target.value })}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Type</label>
                                <select
                                    value={newVoucher.type}
                                    onChange={e => setNewVoucher({ ...newVoucher, type: e.target.value })}
                                    className="w-full p-2 border rounded-md"
                                >
                                    <option value="percent">Percentage</option>
                                    <option value="fixed">Fixed Amount</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Amount</label>
                                <input
                                    type="number"
                                    value={newVoucher.amount}
                                    onChange={e => setNewVoucher({ ...newVoucher, amount: +e.target.value })}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Expiry Date</label>
                                <input
                                    type="date"
                                    value={newVoucher.expiresAt}
                                    onChange={e => setNewVoucher({ ...newVoucher, expiresAt: e.target.value })}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Usage Limit</label>
                                <input
                                    type="number"
                                    value={newVoucher.usageLimit}
                                    onChange={e => setNewVoucher({ ...newVoucher, usageLimit: +e.target.value })}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createVoucher}
                                    disabled={creating}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                    {creating ? 'Creating…' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {voucherToDelete && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-sm">
                        <h3 className="text-lg font-medium mb-4">
                            Hapus Voucher?
                        </h3>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                            >
                                Batal
                            </button>
                            <button
                                onClick={deleteVoucher}
                                disabled={deleting}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? 'Deleting…' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoucherManagement;