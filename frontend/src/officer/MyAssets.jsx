import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./MyAssets.css";
import { MdOutlineInventory } from "react-icons/md";

function MyAssets() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [sortOption, setSortOption] = useState("default");
    const navigate = useNavigate();
    const [filterStatus, setFilterStatus] = useState("active");
    const [previewAsset, setPreviewAsset] = useState(null);

    const fetchAssets = async () => {
        try {
            const token = await getAuth().currentUser.getIdToken();

            const res = await fetch(
                `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/officer/my-assets`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) throw new Error("Failed to fetch assets");


            const data = await res.json();
            setAssets(data);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        fetchAssets();
    }, []);

    if (loading) return <div className="myassets-loading">Loading...</div>;
    if (error) return <div className="myassets-error">{error}</div>;

    const processedAssets = assets
        // 1️⃣ SEARCH FILTER
        .filter(a => {
            const q = search.toLowerCase();
            return (
                a.asset_name?.toLowerCase().includes(q) ||
                a.asset_company?.toLowerCase().includes(q) ||
                a.asset_category?.toLowerCase().includes(q)
            );
        })

        // 2️⃣ STATUS FILTER
        .filter(a => {
            if (filterStatus === "all") return true;

            if (filterStatus === "returned") return !!a.returned_date;

            if (a.returned_date) return false;

            const totalQty = a.quantity || 0;
            const maintenanceQty = a.maintenance_quantity || 0;
            const disposedQty = a.disposed_quantity || 0;
            const activeQty = totalQty - maintenanceQty - disposedQty;

            if (filterStatus === "active") return activeQty > 0;
            if (filterStatus === "maintenance") return maintenanceQty > 0;
            if (filterStatus === "disposed") return disposedQty > 0;

            return true;
        })

        // 3️⃣ SMART DEFAULT GROUPING
        .sort((a, b) => {
            if (!a.returned_date && b.returned_date) return -1;
            if (a.returned_date && !b.returned_date) return 1;

            if (!a.returned_date && !b.returned_date) {
                return new Date(b.assigned_date) - new Date(a.assigned_date);
            }

            return new Date(b.returned_date) - new Date(a.returned_date);
        })

        // 4️⃣ USER SORT OVERRIDE
        .sort((a, b) => {
            switch (sortOption) {
                case "assigned_new":
                    return new Date(b.assigned_date) - new Date(a.assigned_date);

                case "assigned_old":
                    return new Date(a.assigned_date) - new Date(b.assigned_date);

                case "returned_new":
                    return new Date(b.returned_date || 0) - new Date(a.returned_date || 0);

                case "returned_old":
                    return new Date(a.returned_date || 0) - new Date(b.returned_date || 0);

                case "name_az":
                    return a.asset_name.localeCompare(b.asset_name);

                case "name_za":
                    return b.asset_name.localeCompare(a.asset_name);

                case "qty_high":
                    return b.quantity - a.quantity;

                case "qty_low":
                    return a.quantity - b.quantity;

                default:
                    return 0; // keep smart default
            }
        });

    const activeCount = assets
        .filter(a => !a.returned_date)
        .reduce((sum, a) => {
            const activeQty = Math.max(0, (a.quantity || 0) - (a.maintenance_quantity || 0) - (a.disposed_quantity || 0));
            return sum + activeQty;
        }, 0);

    return (
        <div className="myassets-wrapper">
            <div className="myassets-header">
                <button className="back-btnn mobile-back-btn" onClick={() => navigate("/officer/dashboard")}>
                    ← Back
                </button>

                <h1><MdOutlineInventory /> Assigned Assets</h1>

                <div className="header-stat">
                    <span className="stat-label">Active Assets: </span>
                    <span className="stat-number">{activeCount}</span>
                </div>

            </div>
            <div className="myassets-controls">

                <input
                    type="text"
                    placeholder="Search assets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                >
                    <option value="default">Smart Default</option>
                    <option value="assigned_new">Assigned Date (Newest)</option>
                    <option value="assigned_old">Assigned Date (Oldest)</option>
                    <option value="returned_new">Returned Date (Newest)</option>
                    <option value="returned_old">Returned Date (Oldest)</option>
                    <option value="name_az">Asset Name (A–Z)</option>
                    <option value="name_za">Asset Name (Z–A)</option>
                    <option value="qty_high">Quantity (High → Low)</option>
                    <option value="qty_low">Quantity (Low → High)</option>
                </select>

                <select
                    className="filter-dropdown"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="all">All Assets</option>
                    <option value="active">Active Only</option>
                    <option value="returned">Returned Only</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="disposed">Disposed Only</option>
                </select>

                <button className="new-request"
                    onClick={() => navigate("/officer/request", {
                        state: {
                            autoFill: true,
                            request_type: "ISSUE"
                        }
                    })}>
                    Request New Asset
                </button>
            </div>
            {
                processedAssets.length === 0 ? (
                    <p className="myassets-empty">
                        {filterStatus === "active" ? "No active assets assigned." :
                            filterStatus === "returned" ? "No returned assets found." :
                                filterStatus === "maintenance" ? "No assets currently under maintenance." :
                                    filterStatus === "disposed" ? "No disposed assets found." :
                                        "No assets found."}
                    </p>
                ) : (
                    <div className="table-scroll">
                        <table className="myassets-table">
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    <th>Image</th>
                                    <th>Category</th>
                                    <th>Company</th>
                                    <th>Quantity</th>
                                    <th>Condition</th>
                                    <th>Assigned Date</th>
                                    <th>Status</th>
                                    <th>Returned Date</th>
                                </tr>
                            </thead>

                            <tbody>
                                {processedAssets.map((a) => {
                                    const totalQty = a.quantity || 0;
                                    const disposedQty = a.disposed_quantity || 0;
                                    const maintenanceQty = a.maintenance_quantity || 0;

                                    // 🔥 THE FIX: Math.max ensures we never get a negative number here
                                    let activeQty = a.returned_date ? 0 : Math.max(0, totalQty - maintenanceQty - disposedQty);

                                    return (
                                        <tr key={a.assignment_id}>
                                            <td>{a.asset_name}</td>
                                            <td>
                                                {a.asset_photo_url ? (
                                                    <img
                                                        src={a.asset_photo_url}
                                                        alt={a.asset_name}
                                                        onClick={() => setPreviewAsset(a)}
                                                        className="clickable-thumb"
                                                    />
                                                ) : "No Image"}
                                            </td>
                                            <td>{a.asset_category}</td>
                                            <td>{a.asset_company}</td>
                                            <td>
                                                {a.returned_date ? `${totalQty} Returned` :
                                                    [
                                                        activeQty > 0 && `${activeQty} Active`,
                                                        maintenanceQty > 0 && `${maintenanceQty} Maintenance`,
                                                        disposedQty > 0 && `${disposedQty} Disposed`
                                                    ].filter(Boolean).join(" / ")
                                                }
                                            </td>
                                            <td>{a.condition}</td>
                                            <td>
                                                {a.assigned_date ? new Date(a.assigned_date).toLocaleString("en-IN", {
                                                    dateStyle: "medium", timeStyle: "medium"
                                                }) : "-"}
                                            </td>

                                            {/* STATUS COLUMN */}
                                            <td>
                                                {a.returned_date ? (
                                                    <span className="status-badge returned">Returned</span>
                                                ) : (activeQty <= 0 && disposedQty > 0) ? ( // Use <= 0 to be completely safe
                                                    <span className="status-badge disposed">Disposed</span>
                                                ) : maintenanceQty > 0 ? (
                                                    <span className="status-badge maintenance">Under Maintenance</span>
                                                ) : (disposedQty > 0 && activeQty > 0) ? (
                                                    <span className="status-badge mixed">Active + Disposed</span>
                                                ) : (
                                                    <span className="status-badge active">Active</span>
                                                )}
                                            </td>

                                            {/* DATE / ACTION COLUMN */}
                                            <td>
                                                {a.returned_date ? (
                                                    <span style={{ color: "green", fontWeight: 600 }}>
                                                        {new Date(a.returned_date).toLocaleString("en-IN", {
                                                            dateStyle: "medium", timeStyle: "medium"
                                                        })}
                                                    </span>
                                                ) : (activeQty <= 0 && disposedQty > 0) ? (
                                                    <span style={{ color: "#d9534f", fontWeight: 600 }}>
                                                        {a.disposed_date ?
                                                            `Disposed: ${new Date(a.disposed_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}`
                                                            : "Disposed"}
                                                    </span>
                                                ) : activeQty > 0 ? (
                                                    <button
                                                        className="request-btn"
                                                        onClick={() => navigate("/officer/request", {
                                                            state: {
                                                                autoFill: true,
                                                                request_type: "RETURN",
                                                                assignment_ids: [a.assignment_id],
                                                                serial_numbers: a.serial_numbers || [],
                                                                max_qty: activeQty,
                                                                asset_name: a.asset_name,
                                                                asset_id: a.asset_id,
                                                                quantity: activeQty
                                                            },
                                                        })}
                                                    >
                                                        Request Return
                                                    </button>
                                                ) : (
                                                    <span style={{ color: "gray", fontSize: "0.9rem" }}>No active units</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            }
            {previewAsset && (
                <div
                    className="preview-overlay"
                    onClick={() => setPreviewAsset(null)}
                >
                    <div
                        className="preview-box"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="preview-header">
                            <h3>{previewAsset.asset_name}</h3>
                            <button
                                className="preview-close"
                                onClick={() => setPreviewAsset(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="preview-body">
                            <img
                                src={previewAsset.asset_photo_url}
                                alt={previewAsset.asset_name}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

export default MyAssets;
