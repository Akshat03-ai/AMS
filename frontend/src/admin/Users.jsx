import React, { useMemo, useEffect, useState } from "react";
import { FiUsers, FiEdit, FiSlash } from "react-icons/fi";
import { FaCheck } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./Users.css";
import EditUserModal from "./EditUserModal";

function Users() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingUser, setEditingUser] = useState(null);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("name");
    const [filter, setFilterStatus] = useState("all");
    const [departments, setDepartments] = useState([]);
    const [offices, setOffices] = useState([]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const auth = getAuth();

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchUsers(user);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError("");

            const auth = getAuth();
            const token = await auth.currentUser.getIdToken();

            // Fetch all three endpoints concurrently
            const [usersRes, deptsRes, officesRes] = await Promise.all([
                fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/departments`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/offices`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (!usersRes.ok) throw new Error("Failed to fetch users");

            const usersData = await usersRes.json();
            const deptsData = await deptsRes.json();
            const officesData = await officesRes.json();

            setUsers(usersData);
            setDepartments(deptsData);
            setOffices(officesData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisableUser = async (uid) => {
        if (!window.confirm("Disable this user?")) return;

        try {
            const auth = getAuth();
            const token = await auth.currentUser.getIdToken();

            await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/users/${uid}/disable`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            fetchUsers();
        } catch (err) {
            alert("Failed to disable user");
        }
    };

    const handleEnableUser = async (uid) => {
        if (!window.confirm("Enable this user?")) return;

        try {
            const auth = getAuth();
            const token = await auth.currentUser.getIdToken();

            await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/users/${uid}/enable`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            fetchUsers(); // refresh table
        } catch (err) {
            alert("Failed to enable user");
        }
    };

    const departmentMap = useMemo(() => {
        const map = {};
        departments.forEach(d => {
            if (d.department_id) {
                map[d.department_id] = d;
            }
        });
        return map;
    }, [departments]);

    const officeMap = useMemo(() => {
        const map = {};
        offices.forEach(o => {
            if (o.office_id) {
                map[o.office_id] = o;
            }
        });
        return map;
    }, [offices]);

    const filteredUsers = users
        .filter((u) =>
            (search === "" ||
                u.name?.toLowerCase().includes(search.toLowerCase()) ||
                u.email?.toLowerCase().includes(search.toLowerCase()) ||
                u.role?.toLowerCase().includes(search.toLowerCase()) ||
                u.user_id?.toLowerCase().includes(search.toLowerCase())
            ) &&
            (filter === "all" || (filter === "enabled" && !u.disabled) || (filter === "disabled" && u.disabled))
        )

        .sort((a, b) => {
            if (sortBy === "name") {
                return a.name.localeCompare(b.name);
            }
            if (sortBy === "user_id") {
                return a.user_id.localeCompare(b.user_id);
            }
            if (sortBy === "role") {
                return a.role.localeCompare(b.role);
            }
            if (sortBy === "department") {
                const deptA = departmentMap[a.department_id]?.department_name || departmentMap[a.department_id]?.name || a.department_id || "";
                const deptB = departmentMap[b.department_id]?.department_name || departmentMap[b.department_id]?.name || b.department_id || "";
                return deptA.localeCompare(deptB);
            }
            return 0;
        });

    return (
        <div className="admin-users-page">
            <div className="users-header">
                <button
                    className="back-btn"
                    onClick={() => navigate("/admin/dashboard")}
                >
                    ← Back
                </button>

                <h1><FiUsers /> User Management</h1>
            </div>
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onUpdated={fetchUsers}
                />
            )}

            {/* TABS */}
            <div className="tabs">
                <button className="tab-view">
                    View Users
                </button>

                <button
                    className="tab-create"
                    onClick={() => navigate("/create-user")}
                >
                    Create User
                </button>
            </div>

            <div className="users-controls">
                <input
                    type="text"
                    placeholder="Search by name, email, role, or User ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="name">Sort by Name</option>
                    <option value="user_id">Sort by User ID</option>
                    <option value="role">Sort by Role</option>
                    <option value="department">Sort by Department</option>
                </select>

                <select
                    value={filter}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="all">All Users</option>
                    <option value="enabled">Enabled Users</option>
                    <option value="disabled">Disabled Users</option>
                </select>
            </div>

            {/* VIEW USERS */}
            <div className="users-table-container">
                {loading && <p>Loading users…</p>}
                {error && <p className="error">{error}</p>}

                {!loading && filteredUsers.length === 0 && (
                    <div className="no-results">
                        No users found.
                    </div>
                )}

                {!loading && filteredUsers.length > 0 && (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Contact</th>
                                <th>Role</th>
                                <th>Designation</th>
                                <th>Department</th>
                                <th>Office</th>
                                <th>Room</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredUsers.map((u) => {
                                const deptName = departmentMap[u.department_id]?.department_name || departmentMap[u.department_id]?.name || u.department_id || "-";
                                const officeName = officeMap[u.office_id]?.office_name || officeMap[u.office_id]?.name || u.office_id || "-";

                                return (
                                    <tr key={u.uid} className={u.disabled ? "disabled" : ""}>
                                        <td className="cell-text">{u.user_id}</td>
                                        <td className="cell-text">{u.name}</td>
                                        <td className="cell-text">{u.email}</td>
                                        <td className="cell-text">{u.contact}</td>
                                        <td className="cell-text">{u.role}</td>
                                        <td className="cell-text">{u.designation}</td>
                                        <td className="cell-text">{deptName}</td>
                                        <td className="cell-text">{officeName}</td>
                                        <td className="cell-text">{u.room_id}</td>
                                        <td>
                                            <span className={`status ${u.disabled ? "disabled" : "active"}`}>
                                                {u.disabled ? "Disabled" : "Active"}
                                            </span>
                                        </td>
                                        <td className="actions-buttons">
                                            <button
                                                title="Edit user"
                                                onClick={() => setEditingUser(u)}
                                            >
                                                <FiEdit />
                                            </button>

                                            {!u.disabled && (
                                                <button
                                                    title="Disable user"
                                                    onClick={() => handleDisableUser(u.uid)}
                                                    className="danger"
                                                >
                                                    <FiSlash />
                                                </button>
                                            )}

                                            {u.disabled && (
                                                <button
                                                    title="Enable user"
                                                    onClick={() => handleEnableUser(u.uid)}
                                                    className="success"
                                                >
                                                    <FaCheck />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default Users;
