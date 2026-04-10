import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import "./Departments.css";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import React, { useEffect, useState, useCallback } from "react";

function Departments() {
    const navigate = useNavigate();
    const location = useLocation();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingDept, setEditingDept] = useState(null);

    const [form, setForm] = useState({
        department_id: "",
        department_name: "",
        department_type: "",
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const fetchDepartments = useCallback(async () => {
        try {
            setLoading(true);
            const auth = getAuth();
            const token = await auth.currentUser.getIdToken();

            const res = await fetch(
                `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/departments?search=${search}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) throw new Error("Failed to fetch departments");

            const data = await res.json();
            setDepartments(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const openCreate = () => {
        setEditingDept(null);
        setForm({
            department_id: "",
            department_name: "",
            department_type: "",
        });
        setShowForm(true);
    };

    const openEdit = (dept) => {
        setEditingDept(dept);
        setForm({
            department_id: dept.department_id,
            department_name: dept.department_name,
            department_type: dept.department_type,
        });
        setShowForm(true);
    };

    const handleSubmit = async () => {
        try {
            const auth = getAuth();
            const token = await auth.currentUser.getIdToken();

            const url = editingDept
                ? `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/departments/${editingDept.id}`
                : `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/departments`;

            const method = editingDept ? "PATCH" : "POST";

            const payload = editingDept
                ? {
                    department_name: form.department_name,
                    department_type: form.department_type,
                }
                : form;

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            alert(data.message);
            setShowForm(false);
            fetchDepartments();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDelete = async (dept) => {
        if (!window.confirm(`Delete department ${dept.department_name}?`)) return;

        try {
            const auth = getAuth();
            const token = await auth.currentUser.getIdToken();

            const res = await fetch(
                `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/departments/${dept.id}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            alert(data.message);
            fetchDepartments();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="admin-departments-page">

            <div className="admin-tabs">
                <button
                    className={location.pathname.includes("departments") ? "active" : ""}
                    onClick={() => navigate("/admin/departments")}
                >
                    Departments
                </button>

                <button
                    className={location.pathname.includes("offices") ? "active" : ""}
                    onClick={() => navigate("/admin/offices")}
                >
                    Offices
                </button>
            </div>

            <div className="dept-header">
                <button className="back-btn mobile-back-btn" onClick={() => navigate("/admin/dashboard")}>
                    ← Back
                </button>
                <h1 className="dept-title"><HiOutlineBuildingOffice2 /> Departments</h1>
            </div>

            <div className="dept-controls">
                <input
                    placeholder="Search departments..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button className="primary-btn" onClick={openCreate}>
                    <FiPlus /> Add Department
                </button>
            </div>

            {loading && <p>Loading departments…</p>}
            {error && <p className="error">{error}</p>}

            {!loading && departments.length === 0 && (
                <div className="no-results">No departments found</div>
            )}

            {!loading && departments.length > 0 && (
                <div className="table-scroll">
                <table className="dept-table">
                    <thead>
                        <tr>
                            <th>Department ID</th>
                            <th>Department Name</th>
                            <th>Department Type</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departments.map((d) => (
                            <tr key={d.id}>
                                <td>{d.department_id}</td>
                                <td>{d.department_name}</td>
                                <td>{d.department_type}</td>
                                <td className="actions">
                                    <button onClick={() => openEdit(d)}>
                                        <FiEdit />
                                    </button>
                                    <button
                                        className="danger"
                                        onClick={() => handleDelete(d)}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}

            {showForm && (
                <div className="modal-backdrop">
                    <div className="modal-card">
                        <h3>{editingDept ? "Edit Department" : "Create Department"}</h3>

                        <input
                            name="department_id"
                            placeholder="Department ID"
                            value={form.department_id}
                            onChange={handleChange}
                            disabled={!!editingDept}
                        />
                        <input
                            name="department_name"
                            placeholder="Department Name"
                            value={form.department_name}
                            onChange={handleChange}
                        />
                        <input
                            name="department_type"
                            placeholder="Department Type"
                            value={form.department_type}
                            onChange={handleChange}
                        />

                        <div className="modal-actions">
                            <button className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button>
                            <button className="primary-btn" onClick={handleSubmit}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Departments;
