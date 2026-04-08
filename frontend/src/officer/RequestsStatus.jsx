import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiArrowLeft, FiFilter } from "react-icons/fi";
import "./RequestsStatus.css";

function RequestsStatus() {

    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);
    const [assets, setAssets] = useState({});
    const [filtered, setFiltered] = useState([]);
    const [expanded, setExpanded] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sortOrder, setSortOrder] = useState("DESC");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);

    /* ================= FETCH DATA ================= */

    useEffect(() => {

        const fetchData = async () => {

            try {

                const auth = getAuth();
                const user = auth.currentUser;

                if (!user) return;

                const token = await user.getIdToken();

                /* FETCH REQUESTS */

                const reqRes = await fetch(
                    `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/officer/requests`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                const reqData = await reqRes.json();

                /* FETCH ASSETS */

                const assetRes = await fetch(
                    `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/assets`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                const assetData = await assetRes.json();

                /* BUILD ASSET MAP */

                const assetMap = {};
                assetData.forEach(a => {
                    assetMap[a.asset_id] = a.asset_name;
                });

                setAssets(assetMap);

                const safeReq = Array.isArray(reqData) ? reqData : [];

                setRequests(safeReq);
                setFiltered(safeReq);

            } catch (err) {
                console.error("Failed to load requests", err);
            }

            setLoading(false);

        };

        fetchData();
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    /* ================= FILTER + SEARCH ================= */

    useEffect(() => {

        let data = [...requests];

        if (statusFilter !== "ALL") {
            data = data.filter(r => r.status === statusFilter);
        }

        if (typeFilter !== "ALL") {
            data = data.filter(r => r.request_type === typeFilter);
        }

        if (search) {

            const q = search.toLowerCase();

            data = data.filter(r =>
                (r.request_id || "").toLowerCase().includes(q) ||
                (assets[r.asset_id] || "").toLowerCase().includes(q) ||
                (r.request_type || "").toLowerCase().includes(q)
            );
        }

        data.sort((a, b) => {

            const getTime = (obj) => {
                if (!obj) return 0;

                if (obj._seconds) return obj._seconds * 1000;   // 🔥 Firestore format 1
                if (obj.seconds) return obj.seconds * 1000;     // 🔥 Firestore format 2

                return new Date(obj).getTime() || 0;            // fallback
            };

            const t1 = getTime(a.created_at);
            const t2 = getTime(b.created_at);

            return sortOrder === "DESC" ? t2 - t1 : t1 - t2;

        });

        setFiltered(data);

    }, [search, statusFilter, sortOrder, requests, assets, typeFilter]);

    const formatDate = (ts) => { 
        if (!ts) return "—";

        if (ts._seconds) return new Date(ts._seconds * 1000).toLocaleString();
        if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();

        return new Date(ts).toLocaleString();
    };

    /* ================= STATUS COLOR ================= */

    const getStatusClass = (status) => {

        switch (status) {

            case "APPROVED":
                return "status-approved";

            case "REJECTED":
                return "status-rejected";

            case "PENDING":
            default:
                return "status-pending";
        }
    };

    /* ================= UI ================= */

    return (

        <div className="requests-page">

            <div className="requests-header">

                <button
                    className="back-bttnn"
                    onClick={() => navigate("/officer/dashboard")}
                >
                    <FiArrowLeft /> Back
                </button>

                <h1>Request History</h1>

            </div>

            {/* CONTROLS */}

            <div className="requests-controls">

                <div className="search-box">

                    <FiSearch />

                    <input
                        placeholder="Search by request ID, asset or type..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                </div>

                <div className="filters">

                    <FiFilter />

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="ALL">All Types</option>
                        <option value="RETURN">Return</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="DISPOSAL">Disposal</option>
                        <option value="ISSUE">Issue</option>
                        <option value="PROCUREMENT">Procurement</option>
                    </select>

                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <option value="DESC">Newest</option>
                        <option value="ASC">Oldest</option>
                    </select>

                </div>

            </div>

            {/* TABLE */}

            {loading ? (
                <p className="loading">Loading requests...</p>
            ) : filtered.length === 0 ? (
                <p className="empty">No requests found</p>
            ) : (

                <div className="requests-table">

                    <table>

                        <thead>

                            <tr>
                                <th>Request ID</th>
                                <th>Type</th>
                                <th>Asset</th>
                                <th>Quantity</th>
                                <th>Status</th>
                                <th>Timestamp</th>
                                <th>Details</th>
                            </tr>

                        </thead>

                        <tbody>

                            {filtered.map(req => (
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
                                        </td>

                                    </tr>

                                    {expanded === req.request_id && (
                                        <tr className="details-row">
                                            <td colSpan="7">

                                                <div className="request-details">

                                                    {req.description && (
                                                        <p>
                                                            <strong>Description:</strong> {req.description}
                                                        </p>
                                                    )}

                                                    {req.asset_category && (
                                                        <p>
                                                            <strong>Asset Category:</strong> {req.asset_category}
                                                        </p>
                                                    )}

                                                    {req.company && (
                                                        <p>
                                                            <strong>Company:</strong> {req.company}
                                                        </p>
                                                    )}

                                                    {req.disposal_reason && (
                                                        <p>
                                                            <strong>Disposal Reason:</strong> {req.disposal_reason}
                                                        </p>
                                                    )}

                                                    {req.return_date && (
                                                        <p>
                                                            <strong>Requested Return Date:</strong> {req.return_date}
                                                        </p>
                                                    )}

                                                    {req.image_url && (
                                                        <p>
                                                            <strong>Image Evidence:</strong>{" "}
                                                            <a
                                                                href={req.image_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                View Image
                                                            </a>
                                                        </p>
                                                    )}

                                                    {req.rejection_reason && (
                                                        <p style={{ color: "red" }}>
                                                            <strong>Rejection Reason:</strong> {req.rejection_reason}
                                                        </p>
                                                    )}

                                                </div>

                                            </td>
                                        </tr>
                                    )}

                                </React.Fragment>
                            ))}

                        </tbody>

                    </table>

                </div>
            )}

        </div>
    );
}

export default RequestsStatus;