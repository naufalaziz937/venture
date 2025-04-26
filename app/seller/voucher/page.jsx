'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const VoucherManagement = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newVoucher, setNewVoucher] = useState({
        code: '',
        type: 'percent',
        amount: 0,
        expiresAt: '',
        usageLimit: 0,
    });
    const [creating, setCreating] = useState(false);

    const fetchVouchers = async () => {
        try {
            const { data } = await axios.get('/api/voucher/list');
            if (data.success) {
                setVouchers(data.vouchers);
            } else {
                toast.error('Failed to fetch vouchers');
            }
        } catch (err) {
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
                fetchVouchers();
                setNewVoucher({
                    code: '',
                    type: 'percent',
                    amount: 0,
                    expiresAt: '',
                    usageLimit: 0,
                });
                setIsModalOpen(false);
            } else {
                toast.error('Failed to create voucher');
            }
        } catch (err) {
            toast.error('Error creating voucher');
        } finally {
            setCreating(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Voucher Management</h1>

            {/* Button open modal */}
            <div className="mb-6">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                    + Create New Voucher
                </button>
            </div>

            {/* Voucher List */}
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
                            {vouchers.map((voucher) => (
                                <tr key={voucher._id}>
                                    <td className="px-4 py-2">{voucher.code}</td>
                                    <td className="px-4 py-2">{voucher.type}</td>
                                    <td className="px-4 py-2">
                                        {voucher.type === 'percent' ? `${voucher.amount}%` : `Rp ${voucher.amount}`}
                                    </td>
                                    <td className="px-4 py-2">{voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-4 py-2">{voucher.usageLimit}</td>
                                    <td className="px-4 py-2">
                                        <button className="text-red-600 hover:text-red-800">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Create Voucher</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Voucher Code</label>
                                <input
                                    type="text"
                                    value={newVoucher.code}
                                    onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value })}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium">Type</label>
                                <select
                                    value={newVoucher.type}
                                    onChange={(e) => setNewVoucher({ ...newVoucher, type: e.target.value })}
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
                                    onChange={(e) => setNewVoucher({ ...newVoucher, amount: e.target.value })}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium">Expiry Date</label>
                                <input
                                    type="date"
                                    value={newVoucher.expiresAt}
                                    onChange={(e) => setNewVoucher({ ...newVoucher, expiresAt: e.target.value })}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium">Usage Limit</label>
                                <input
                                    type="number"
                                    value={newVoucher.usageLimit}
                                    onChange={(e) => setNewVoucher({ ...newVoucher, usageLimit: e.target.value })}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>

                            {/* Button Create / Cancel */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createVoucher}
                                    disabled={creating}
                                    className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {creating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoucherManagement;
