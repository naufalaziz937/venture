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

    // Handle changing the user status
    const handleChangeUserStatus = (userId, newStatus) => {
        setUsers(users.map(user => 
            user.id === userId ? { ...user, status: newStatus } : user
        ));
    };

    return (
        <div className="flex-1 h-screen overflow-scroll flex flex-col justify-between text-sm bg-gray-50">
            <div className="md:p-10 p-4 space-y-5">
                <h2 className="text-2xl font-semibold text-green-600 mb-5">User Management</h2>
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

                {/* Edit User Modal */}
                {selectedUser && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white p-8 rounded-md w-1/3 shadow-lg">
                            <h3 className="text-xl font-medium text-green-600 mb-6">Edit User</h3>
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
                                        <option value="admin">Admin</option>
                                        <option value="user">User</option>
                                        <option value="moderator">Moderator</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Status</label>
                                    <select
                                        value={selectedUser.status}
                                        onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })}
                                        className="border p-3 w-full rounded-md"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="flex gap-5 mt-6">
                                    <button
                                        className={buttonStyles("secondary")}
                                        onClick={() => setSelectedUser(null)}
                                    >
                                        Close
                                    </button>
                                    <button
                                        className={buttonStyles("primary")}
                                        onClick={() => {
                                            // Save changes
                                            setSelectedUser(null);
                                        }}
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
