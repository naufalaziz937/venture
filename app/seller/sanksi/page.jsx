'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const SanctionManagement = () => {
    const [sanctions, setSanctions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newSanction, setNewSanction] = useState({ userId: '', reason: '', expiresAt: '' });

    // Edit modal
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editSanction, setEditSanction] = useState({ _id: '', userId: '', reason: '', expiresAt: '' });

    // Delete confirmation modal
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const fetchSanctions = async () => {
        try {
            const { data } = await axios.get('/api/sanction/list');
            if (data.success) setSanctions(data.sanctions);
            else toast.error('Failed to fetch');
        } catch {
            toast.error('Error fetching');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSanctions(); }, []);

    const createSanction = async () => {
        if (!newSanction.userId || !newSanction.reason) {
            toast.error('User ID & Reason required');
            return;
        }
        setCreating(true);
        try {
            const payload = { ...newSanction };
            if (!payload.expiresAt) delete payload.expiresAt;
            const { data } = await axios.post('/api/sanction/create', payload);
            if (data.success) {
                toast.success('Created');
                fetchSanctions();
                setIsCreateOpen(false);
                setNewSanction({ userId: '', reason: '', expiresAt: '' });
            } else toast.error(data.message);
        } catch {
            toast.error('Error creating');
        } finally {
            setCreating(false);
        }
    };

    const openEdit = (s) => {
        setEditSanction({
            _id: s._id,
            userId: s.userId,
            reason: s.reason,
            expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString().substr(0, 10) : ''
        });
        setIsEditOpen(true);
    };
    const updateSanction = async () => {
        setEditing(true);
        try {
            const { _id, userId, reason, expiresAt } = editSanction;
            const payload = { userId, reason };
            if (expiresAt) payload.expiresAt = new Date(expiresAt);
            else payload.expiresAt = null;
            const { data } = await axios.put(`/api/sanction/update/${_id}`, payload);
            if (data.success) {
                toast.success('Updated');
                fetchSanctions();
                setIsEditOpen(false);
            } else toast.error(data.message);
        } catch {
            toast.error('Error updating');
        } finally {
            setEditing(false);
        }
    };

    const confirmDelete = (id) => {
        setDeleteId(id);
        setIsDeleteOpen(true);
    };
    const deleteSanction = async () => {
        setDeleting(true);
        try {
            const { data } = await axios.delete(`/api/sanction/delete/${deleteId}`);
            if (data.success) {
                toast.success('Deleted');
                fetchSanctions();
            } else {
                toast.error('Failed to delete');
            }
        } catch {
            toast.error('Error deleting');
        } finally {
            setDeleting(false);
            setIsDeleteOpen(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Sanction Management</h1>
            <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mb-6"
                onClick={() => setIsCreateOpen(true)}
            >
                + Create New Sanction
            </button>

            <div className="bg-white p-6 rounded shadow">
                {loading ? (
                    <p>Loading…</p>
                ) : (
                    <table className="w-full table-auto">
                        <thead className="bg-gray-100 text-left text-sm">
                            <tr>
                                <th className="px-4 py-2">User ID</th>
                                <th className="px-4 py-2">Reason</th>
                                <th className="px-4 py-2">Created At</th>
                                <th className="px-4 py-2">Expires At</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sanctions.map((s) => (
                                <tr key={s._id}>
                                    <td className="px-4 py-2">{s.userId}</td>
                                    <td className="px-4 py-2">{s.reason}</td>
                                    <td className="px-4 py-2">{new Date(s.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-4 py-2">{s.status}</td>
                                    <td className="px-4 py-2 flex gap-2">
                                        <button
                                            className="text-blue-600 hover:text-blue-800 text-sm"
                                            onClick={() => openEdit(s)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="text-red-600 hover:text-red-800 text-sm"
                                            onClick={() => confirmDelete(s._id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Create Sanction</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm">User ID</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={newSanction.userId}
                                    onChange={e => setNewSanction(prev => ({ ...prev, userId: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm">Reason</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={newSanction.reason}
                                    onChange={e => setNewSanction(prev => ({ ...prev, reason: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm">Expires At (optional)</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border rounded"
                                    value={newSanction.expiresAt}
                                    onChange={e => setNewSanction(prev => ({ ...prev, expiresAt: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                onClick={() => setIsCreateOpen(false)}
                                disabled={creating}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                onClick={createSanction}
                                disabled={creating}
                            >
                                {creating ? 'Creating…' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Edit Sanction</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm">User ID</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={editSanction.userId}
                                    onChange={e => setEditSanction(prev => ({ ...prev, userId: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm">Reason</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={editSanction.reason}
                                    onChange={e => setEditSanction(prev => ({ ...prev, reason: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm">Expires At</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border rounded"
                                    value={editSanction.expiresAt}
                                    onChange={e => setEditSanction(prev => ({ ...prev, expiresAt: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                onClick={() => setIsEditOpen(false)}
                                disabled={editing}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                onClick={updateSanction}
                                disabled={editing}
                            >
                                {editing ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded w-full max-w-sm">
                        <h2 className="text-lg font-semibold mb-4">Confirm Deletion</h2>
                        <p>Are you sure you want to delete this sanction?</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                onClick={() => setIsDeleteOpen(false)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                onClick={deleteSanction}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SanctionManagement;
