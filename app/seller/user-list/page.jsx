'use client';
import React, { useState, useEffect } from "react";

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/user/get-user', { cache: 'no-store' });

                if (!res.ok) {
                    console.error('Fetch error:', res.status, await res.text());
                    return;
                }

                const contentType = res.headers.get('content-type') || '';
                const text = await res.text();
                if (!contentType.includes('application/json')) {
                    console.error('Bukan JSON:', contentType, text);
                    return;
                }

                const data = JSON.parse(text);
                if (!data.success || !Array.isArray(data.users)) {
                    console.error('Response JSON unexpected:', data);
                    return;
                }

                const usersWithDefaults = data.users.map(user => ({
                    id: user._id,
                    fullName: user.name,
                    email: user.email,
                }));
                setUsers(usersWithDefaults);

            } catch (err) {
                console.error('Unexpected error:', err);
            }
        };

        fetchUsers();
    }, []);

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

    const handleSaveUser = () => {
        if (selectedUser.id) {
            setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u));
        } else {
            setUsers([...users, { ...selectedUser, id: users.length + 1 }]);
        }
        setSelectedUser(null);
    };

    const handleAddUser = () => {
        setSelectedUser({ id: null, fullName: '', email: '' });
    };

    return (
        <div className="flex-1 h-screen overflow-scroll flex flex-col justify-between text-sm bg-gray-50">
            <div className="md:p-10 p-4 space-y-5">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold text-green-600 mb-3">User Management</h2>
                    <button onClick={handleAddUser} className={buttonStyles("outline")}>
                        + Add New User
                    </button>
                </div>

                <div className="overflow-x-auto rounded-lg shadow-lg bg-white p-4">
                    <table className="min-w-full table-auto text-left border-collapse">
                        <thead className="bg-green-100">
                            <tr>
                                <th className="py-3 px-6 border-b">#</th>
                                <th className="py-3 px-6 border-b">Full Name</th>
                                <th className="py-3 px-6 border-b">Email</th>
                                <th className="py-3 px-6 border-b">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, idx) => (
                                <tr key={user.id} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-6">{idx + 1}</td>
                                    <td className="py-3 px-6">{user.fullName}</td>
                                    <td className="py-3 px-6">{user.email}</td>
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
                                        onChange={e => setSelectedUser({ ...selectedUser, fullName: e.target.value })}
                                        className="border p-3 w-full rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Email</label>
                                    <input
                                        type="email"
                                        value={selectedUser.email}
                                        onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })}
                                        className="border p-3 w-full rounded-md"
                                    />
                                </div>

                                <div className="flex gap-5 mt-6 justify-end">
                                    <button className={buttonStyles("secondary")} onClick={() => setSelectedUser(null)}>
                                        Cancel
                                    </button>
                                    <button className={buttonStyles("primary")} onClick={handleSaveUser}>
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
