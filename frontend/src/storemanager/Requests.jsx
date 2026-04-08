import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiArrowLeft, FiClipboard } from "react-icons/fi";
import "./Requests.css";

function Requests() {

    const navigate = useNavigate();
    const [rejectModal, setRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [requests, setRequests] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [expanded, setExpanded] = useState(null);
    const [search, setSearch] = useState("");
    const [sortOrder, setSortOrder] = useState("DESC");
    const [activeTab, setActiveTab] = useState(null);
    const [loading, setLoading] = useState(true);

    /* ================= FETCH REQUESTS ================= */

    const fetchRequests = async () => {
        try {

            const auth = getAuth();
            const user = auth.currentUser;

            if (!user) return;

            const token = await user.getIdToken();

            const res = await fetch(
                `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/requests`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = await res.json();

            const safe = Array.isArray(data) ? data : [];

            setRequests(safe);
            setFiltered(safe);

        } catch (err) {
            console.error("Failed to load requests", err);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    /* ================= RESET EXPANDED WHEN TAB CHANGES ================= */

    useEffect(() => {
        setExpanded(null);
    }, [activeTab]);

    /* ================= FILTER + SEARCH ================= */

    useEffect(() => {

        let data = [...requests];

        if (search) {

            const q = search.toLowerCase();

            data = data.filter(r =>
                (r.request_id || "").toLowerCase().includes(q) ||
                (r.asset_name || "").toLowerCase().includes(q) ||
                (r.request_type || "").toLowerCase().includes(q)
            );
        }

        data.sort((a, b) => {

            const t1 = a.created_at?._seconds
                ? new Date(a.created_at._seconds * 1000)
                : new Date(a.created_at);

            const t2 = b.created_at?._seconds
                ? new Date(b.created_at._seconds * 1000)
                : new Date(b.created_at);

            return sortOrder === "DESC" ? t2 - t1 : t1 - t2;

        });

        setFiltered(data);

    }, [search, sortOrder, requests]);

    const pending = filtered.filter(r => r.status === "PENDING");
    const processed = filtered.filter(r => r.status !== "PENDING");

    /* ================= STATUS CLASS ================= */

    const getStatusClass = (status) => {

        switch (status) {

            case "APPROVED":
                return "status-approved";

            case "REJECTED":
                return "status-rejected";

            default:
                return "status-pending";
        }
    };

    /* ================= DATE FORMAT ================= */

    const formatDate = (timestamp) => {

        if (!timestamp) return "—";

        if (timestamp._seconds) {
            return new Date(timestamp._seconds * 1000).toLocaleString();
        }

        return new Date(timestamp).toLocaleString();
    };

    /* ================= APPROVE ================= */

    const approveRequest = async (req) => {

        // 🔁 Redirect-based requests FIRST
        if (["MAINTENANCE", "DISPOSAL", "PROCUREMENT", "ISSUE"].includes(req.request_type)) {

            if (req.request_type === "MAINTENANCE") {
                return navigate("/store-manager/lifecycle/maintenance", { state: { prefill: req } });
            }

            if (req.request_type === "DISPOSAL") {
                return navigate("/store-manager/lifecycle/disposals", { state: { prefill: req } });
            }

            if (req.request_type === "PROCUREMENT") {
                return navigate("/store-manager/assets/master", { state: { prefill: req } });
            }

            if (req.request_type === "ISSUE") {
                return navigate("/store-manager/assignments", { state: { prefill: req } });
            }
        }

        // ✅ Only RETURN gets auto-approved directly
        if (req.request_type === "RETURN") {

            const confirm = window.confirm("Approve and return asset?");
            if (!confirm) return;

            try {
                const token = await getAuth().currentUser.getIdToken();

                const res = await fetch(
                    `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/requests/${req.request_id}/approve`,
                    {
                        method: "PATCH",
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                if (!res.ok) throw new Error();

                await fetchRequests();

            } catch (err) {
                alert("Failed to approve return");
            }
        }
    };

    /* ================= REJECT ================= */

    const handleRejectSubmit = async () => {
        if (!rejectReason.trim()) {
            alert("Please enter rejection reason");
            return;
        }

        try {
            const token = await getAuth().currentUser.getIdToken();

            const res = await fetch(
                `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/requests/${selectedRequestId}/reject`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ rejection_reason: rejectReason }),
                }
            );

            if (!res.ok) throw new Error();

            setRejectModal(false);
            setRejectReason("");
            setSelectedRequestId(null);

            fetchRequests();

        } catch (err) {
            alert("Failed to reject request");
        }
    };

    /* ================= TABLE RENDER ================= */

    const renderRows = (data, showActions) => (

        data.map(req => (

            <React.Fragment key={req.request_id}>

                <tr>

                    <td>{req.request_id}</td>
                    <td>
                        <span className={`req-type ${req.request_type.toLowerCase()}`}>
                            {req.request_type}
                        </span>
                    </td>
                    <td>{req.asset_name || "—"}</td>
                    <td>{req.quantity}</td>

                    <td>
                        <span className={`status ${getStatusClass(req.status)}`}>
                            {req.status}
                        </span>
                    </td>

                    <td>{formatDate(req.created_at)}</td>

                    <td>
                        <button
                            className="details-btn"
                            onClick={() =>
                                setExpanded(expanded === req.request_id ? null : req.request_id)
                            }
                        >
                            View
                        </button>

                        {showActions && (
                            <>
                                <button
                                    className="approve-btn"
                                    onClick={() => approveRequest(req)}
                                >
                                    Approve
                                </button>

                                <button
                                    className="reject-btn"
                                    onClick={() => {
                                        setSelectedRequestId(req.request_id);
                                        setRejectModal(true);
                                    }}                                >
                                    Reject
                                </button>
                            </>
                        )}

                    </td>

                </tr>

                {expanded === req.request_id && (

                    <tr className="details-row">

                        <td colSpan="7">

                            <div className="request-details">

                                {req.description &&
                                    <p><strong>Description:</strong> {req.description}</p>
                                }

                                {req.disposal_reason &&
                                    <p><strong>Disposal Reason:</strong> {req.disposal_reason}</p>
                                }

                                {req.company &&
                                    <p><strong>Company:</strong> {req.company}</p>
                                }

                                {req.asset_category &&
                                    <p><strong>Category:</strong> {req.asset_category}</p>
                                }

                                {req.return_date &&
                                    <p><strong>Return Date:</strong> {req.return_date}</p>
                                }

                                {req.rejection_reason && (
                                    <p style={{ color: "red", fontWeight: "600" }}>
                                        <strong>Rejection Reason:</strong> {req.rejection_reason}
                                    </p>
                                )}

                                {req.image_url &&
                                    <p>
                                        <strong>Image:</strong>{" "}
                                        <a href={req.image_url} target="_blank" rel="noreferrer">
                                            View Image
                                        </a>
                                    </p>
                                }

                            </div>

                        </td>

                    </tr>

                )}

            </React.Fragment>

        ))

    );

    /* ================= LOADING ================= */

    if (loading) {
        return (
            <div className="requests-page">
                <p className="loading">Loading requests...</p>
            </div>
        );
    }

    /* ================= MAIN UI ================= */

    return (

        <div className="requests-page">

            <div className="requests-header">

                <button
                    className="back-bttnn"
                    onClick={() =>
                        activeTab
                            ? setActiveTab(null)
                            : navigate("/store-manager/dashboard")
                    }
                >
                    <FiArrowLeft /> {activeTab ? "Back to Categories" : "Back"}
                </button>

                <h1>
                    <FiClipboard />
                    {activeTab ? `${activeTab} Requests` : "Request Management"}
                </h1>

            </div>

            {!activeTab ? (

                <div className="selection-screen">

                    <div
                        className="selection-card pending"
                        onClick={() => setActiveTab("Pending")}
                    >
                        <div className="card-icon">🕒</div>
                        <h2>Pending</h2>
                        <span className="count-badge">{pending.length} Items</span>
                        <p>Action required on new incoming asset requests.</p>
                        <button className="enter-btn">Open Pending</button>
                    </div>

                    <div
                        className="selection-card processed"
                        onClick={() => setActiveTab("Processed")}
                    >
                        <div className="card-icon">✅</div>
                        <h2>Processed</h2>
                        <span className="count-badge">{processed.length} Items</span>
                        <p>View history of approved and rejected requests.</p>
                        <button className="enter-btn">Open History</button>
                    </div>

                </div>

            ) : (

                <div className="table-view-container">

                    <div className="requests-controls">

                        <div className="search-box">

                            <FiSearch />

                            <input
                                placeholder="Search by ID, Asset, or Type..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />

                        </div>

                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="DESC">Newest First</option>
                            <option value="ASC">Oldest First</option>
                        </select>

                    </div>

                    <div className="requests-table">

                        <table>

                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Type</th>
                                    <th>Asset</th>
                                    <th>Qty</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>{activeTab === "Pending" ? "Actions" : "Details"}</th>
                                </tr>
                            </thead>

                            <tbody>

                                {activeTab === "Pending"
                                    ? (
                                        pending.length > 0
                                            ? renderRows(pending, true)
                                            : <tr><td colSpan="7">No pending requests 🎉</td></tr>
                                    )
                                    : (
                                        processed.length > 0
                                            ? renderRows(processed, false)
                                            : <tr><td colSpan="7">No processed history</td></tr>
                                    )
                                }

                            </tbody>

                        </table>

                    </div>

                </div>

            )}

            {rejectModal && (
                <div className="modal-backdrop">
                    <div className="modal-card">
                        <h3>Reject Request</h3>

                        <textarea
                            placeholder="Enter rejection reason..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />

                        <div className="modal-actions">
                            <button onClick={() => setRejectModal(false)}>
                                Cancel
                            </button>

                            <button
                                className="danger-btn"
                                onClick={() => handleRejectSubmit()}
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Requests;