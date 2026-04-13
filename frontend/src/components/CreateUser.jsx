import React, { useState, useEffect } from "react";
import { FiUserPlus, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import "./CreateUser.css";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function CreateUser() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const [form, setForm] = useState({
        user_id: "",
        name: "",
        email: "",
        password: "",
        role: "officer",
        department_id: "",
        office_id: "",
        contact: "",
        designation: "",
        room_id: "",
        remarks: ""
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [currentRole, setCurrentRole] = useState(null);
    const navigate = useNavigate();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const contactRegex = /^[6-9]\d{9}$/;
    const [departments, setDepartments] = useState([]);
    const [offices, setOffices] = useState([]);

    useEffect(() => {
        const fetchRole = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();

            const res = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) return;

            const data = await res.json();
            setCurrentRole(data.role);

            if (data.role === "store manager") {
                setForm(prev => ({
                    ...prev,
                    role: "officer",
                    department_id: data.department_id,
                    office_id: data.office_id
                }));
            }
        };

        fetchRole();
    }, []);

    useEffect(() => {
        const fetchMeta = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();

            const [deptRes, officeRes] = await Promise.all([
                fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/meta/departments`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/meta/offices`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const deptData = await deptRes.json();
            const officeData = await officeRes.json();

            setDepartments(Array.isArray(deptData) ? deptData : deptData.departments || []);
            setOffices(Array.isArray(officeData) ? officeData : officeData.offices || []);
        };

        fetchMeta();
    }, []);

    useEffect(() => {
        if (currentRole === "store manager") {
            setForm((prev) => ({ ...prev, role: "officer" }));
        }
    }, [currentRole]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
            setError("Not authenticated");
            return;
        }

        if (!emailRegex.test(form.email)) {
            setError("Please enter a valid email address.");
            scrollToTop();
            return;
        }

        if (!contactRegex.test(form.contact)) {
            setError("Please enter a valid contact number (10 digits).");
            scrollToTop();
            return;
        }

        const token = await currentUser.getIdToken();

        try {
            setLoading(true);

            const res = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/users/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "User creation failed");
            }

            setSuccess(data.message || "User created successfully");
            scrollToTop();
            setForm({
                user_id: "",
                name: "",
                email: "",
                password: "",
                role: "officer",
                department_id: "",
                office_id: "",
                contact: "",
                designation: "",
                room_id: "",
                remarks: ""
            });
        } catch (err) {
            setError(err.message);
            scrollToTop();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-user-container">
            <div className="create-user-header">

                {/* LEFT SIDE */}
                <div className="header-left">

                    {/* Back button – dynamic redirect */}
                    <button
                        type="button"
                        className="create-back-btn"
                        onClick={() =>
                            navigate(
                                currentRole === "admin"
                                    ? "/admin/dashboard"
                                    : "/store-manager/dashboard"
                            )
                        }
                    >
                        ← Back
                    </button>

                    {/* Only show for admin */}
                    {currentRole === "admin" && (
                        <button
                            type="button"
                            className="admin-nav-btn"
                            onClick={() => navigate("/admin/users")}
                        >
                            View Users
                        </button>
                    )}

                </div>

                {/* CENTER */}
                <div className="header-center">
                    <h1>
                        <FiUserPlus /> Create New User
                    </h1>
                </div>

                {/* RIGHT (Empty spacer for balance) */}
                <div className="header-right"></div>

            </div>

            {error && (
                <div className="alert error">
                    <FiAlertCircle /> {error}
                </div>
            )}

            {success && (
                <div className="alert success">
                    <FiCheckCircle /> {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="create-user-form">

                {/* PERSONAL DETAILS */}
                <div className="form-card">
                    <h3>Personal Details</h3>

                    <div className="form-grid">
                        <div>
                            <label>User ID</label>
                            <input
                                name="user_id" value={form.user_id} onChange={handleChange} required
                            />
                        </div>
                        <div>
                            <label>Name</label>
                            <input name="name" value={form.name} onChange={handleChange} required />
                        </div>
                        <div>
                            <label>Contact</label>
                            <input
                                name="contact"
                                value={form.contact}
                                onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, "");
                                    if (v.length <= 10) setForm({ ...form, contact: v });
                                }}
                                required
                            />
                        </div>
                        <div>
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label>Designation</label>
                            <input
                                name="designation"
                                value={form.designation}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* OFFICIAL DETAILS */}
                <div className="form-card">
                    <h3>Official Assignment</h3>

                    <div className="form-grid">
                        <div>
                            <label>Role</label>
                            <select
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                                disabled={currentRole === "store manager"}
                                required
                            >
                                <option value="officer">Officer</option>

                                {currentRole === "admin" && (
                                    <option value="store manager">Store Manager</option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label>Department</label>
                            <select
                                name="department_id"
                                value={form.department_id}
                                onChange={(e) =>
                                    setForm({ ...form, department_id: e.target.value, office_id: "" })
                                }
                                required
                                disabled={currentRole === "store manager"}
                            >
                                <option value="">Select Department</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.department_id}>
                                        {d.department_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label>Office</label>
                            <select
                                name="office_id"
                                value={form.office_id}
                                onChange={handleChange}
                                required
                                disabled={
                                    currentRole === "store manager" || !form.department_id
                                }
                            >
                                <option value="">Select Office</option>
                                {offices
                                    .filter((o) => o.department_id === form.department_id)
                                    .map((o) => (
                                        <option key={o.id} value={o.office_id}>
                                            {o.office_name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label>Room ID</label>
                            <input
                                name="room_id"
                                value={form.room_id}
                                onChange={handleChange}
                                required
                                disabled={!form.department_id || !form.office_id}
                                style={{
                                    cursor: (!form.department_id || !form.office_id) ? 'not-allowed' : 'text',
                                    opacity: (!form.department_id || !form.office_id) ? 0.6 : 1
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* ACCOUNT CREDENTIALS */}
                <div className="form-card">
                    <h3>Account Credentials</h3>

                    <div className="form-grid single">
                        <div>
                            <label>Initial Password</label>
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                            <small className="hint">
                                Password will be shared securely with the user
                            </small>
                        </div>
                    </div>
                </div>

                {/* AUDIT INFO */}
                <div className="form-card audit">
                    <h3>Audit Log (Optional)</h3>

                    <div className="form-grid single">
                        <div>
                            <label>Remarks</label>
                            <textarea
                                name="remarks"
                                value={form.remarks}
                                onChange={handleChange}
                                placeholder="Optional note for audit log"
                                rows={3}
                            />
                            <small className="hint">
                                If left empty, system will auto-generate remarks
                            </small>
                        </div>
                    </div>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Creating User…" : "Create User"}
                </button>
            </form>
        </div>
    );
}

export default CreateUser; 