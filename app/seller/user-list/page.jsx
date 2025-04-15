'use client';
import React, { useState } from "react";

const UserManagement = () => {
    const [users, setUsers] = useState([
        { id: 1, fullName: "John Doe", email: "john@example.com", role: "Admin", status: "Active" },
        { id: 2, fullName: "Jane Smith", email: "jane@example.com", role: "User", status: "Inactive" },
        { id: 3, fullName: "Bob Brown", email: "bob@example.com", role: "Moderator", status: "Active" }
    ]);
    const [selectedUser, setSelectedUser] = useState(null);

    // Button styles with green theme
    const buttonStyles = (variant) => {
        const base = "rounded-md font-medium py-2 px-4 focus:outline-none focus:ring-2 focus:ring-opacity-50 ";
        const variants = {
            primary: "bg-green-600 text-white hover:bg-green-700",
            secondary: "bg-gray-600 text-white hover:bg-gray-700",
            outline: "border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white",
            destructive: "bg-red-600 text-white hover:bg-red-700",
        };
        return base + variants[variant];
    };

    // Simpan user (edit atau tambah)
    const handleSaveUser = () => {
        if (selectedUser.id) {
            // Edit
            setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u));
        } else {
            // Tambah
            const newUser = {
                ...selectedUser,
                id: users.length + 1
            };
            setUsers([...users, newUser]);
        }
        setSelectedUser(null);
    };

    // Buka modal tambah user baru
    const handleAddUser = () => {
        setSelectedUser({
            id: null,
            fullName: '',
            email: '',
            role: 'User',
            status: 'Active'
        });
    };

    return (
        <div className="flex-1 h-screen overflow-scroll flex flex-col justify-between text-sm bg-gray-50">
            <div className="md:p-10 p-4 space-y-5">
                {/* Header + Add Button */}
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold text-green-600 mb-3">User Management</h2>
                    <button
                        onClick={handleAddUser}
                        className={buttonStyles("outline")}
                    >
                        + Add New User
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg shadow-lg bg-white p-4">
                    <table className="min-w-full table-auto text-left border-collapse">
                        <thead className="bg-green-100">
                            <tr>
                                <th className="py-3 px-6 border-b text-sm font-medium text-gray-700">#</th>
                                <th className="py-3 px-6 border-b text-sm font-medium text-gray-700">Full Name</th>
                                <th className="py-3 px-6 border-b text-sm font-medium text-gray-700">Email</th>
                                <th className="py-3 px-6 border-b text-sm font-medium text-gray-700">Role</th>
                                <th className="py-3 px-6 border-b text-sm font-medium text-gray-700">Status</th>
                                <th className="py-3 px-6 border-b text-sm font-medium text-gray-700">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, index) => (
                                <tr key={user.id} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-6">{index + 1}</td>
                                    <td className="py-3 px-6">{user.fullName}</td>
                                    <td className="py-3 px-6">{user.email}</td>
                                    <td className="py-3 px-6">{user.role}</td>
                                    <td className="py-3 px-6">{user.status}</td>
                                    <td className="py-3 px-6">
                                        <button
                                            className={buttonStyles("primary")}
                                            onClick={() => setSelectedUser(user)}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Modal (Edit / Add) */}
                {selectedUser && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                        <div className="bg-white p-8 rounded-md w-11/12 md:w-1/3 shadow-lg">
                            <h3 className="text-xl font-medium text-green-600 mb-6">
                                {selectedUser.id ? "Edit User" : "Add New User"}
                            </h3>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold">Full Name</label>
                                    <input
                                        type="text"
                                        value={selectedUser.fullName}
                                        onChange={(e) => setSelectedUser({ ...selectedUser, fullName: e.target.value })}
                                        className="border p-3 w-full rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Email</label>
                                    <input
                                        type="email"
                                        value={selectedUser.email}
                                        onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                                        className="border p-3 w-full rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Role</label>
                                    <select
                                        value={selectedUser.role}
                                        onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                                        className="border p-3 w-full rounded-md"
                                    >
                                        <option value="Admin">Admin</option>
                                        <option value="User">User</option>
                                        <option value="Moderator">Moderator</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Status</label>
                                    <select
                                        value={selectedUser.status}
                                        onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })}
                                        className="border p-3 w-full rounded-md"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>

                                <div className="flex gap-5 mt-6 justify-end">
                                    <button
                                        className={buttonStyles("secondary")}
                                        onClick={() => setSelectedUser(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={buttonStyles("primary")}
                                        onClick={handleSaveUser}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
