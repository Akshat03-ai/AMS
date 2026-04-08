import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./Assignments.css";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { FiX, FiEdit2, FiTrash2, FiShuffle } from "react-icons/fi";

function Assignments() {
    const navigate = useNavigate();
    const location = useLocation();
    const prefill = location.state?.prefill;
    const [assignments, setAssignments] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [assets, setAssets] = useState([]);
    const [officers, setOfficers] = useState([]);
    const [search, setSearch] = useState("");
    const [sortOption, setSortOption] = useState(""); // Replaces sortField & sortAsc
    const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "returned"
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
    const [editingId, setEditingId] = useState(null);
    const currentPath = location.pathname;

    const [assignmentForm, setAssignmentForm] = useState({
        inventory_id: "",
        assigned_to: "",
        quantity: "",
        assigned_date: new Date().toISOString().split("T")[0],
        returned_date: "",
        remarks: "",
        request_id: "",
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /* =============================
       FETCH DATA
       ============================= */

    const assetMap = useMemo(() => {
        const map = {};
        assets.forEach(a => {
            map[a.asset_id] = a;
        });
        return map;
    }, [assets]);

    const officersMap = useMemo(() => {
        const m = {};
        officers.forEach(o => {
            // keys: business id, auth id, employee_id
            if (o.user_id) m[o.user_id] = o;
            if (o.employee_id) m[o.employee_id] = o;
            if (o.id) m[o.id] = o;
        });
        return m;
    }, [officers]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const token = await getAuth().currentUser.getIdToken();

            const [assignRes, inventoryRes, assetsRes, usersRes] = await Promise.all([
                fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/assignments`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/inventory`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/assets`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/employees`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            if (!assignRes.ok) throw new Error("Failed to fetch assignments");
            if (!inventoryRes.ok) throw new Error("Failed to fetch inventory");
            if (!assetsRes.ok) throw new Error("Failed to fetch assets");
            if (!usersRes.ok) throw new Error("Failed to fetch users");

            const assignData = await assignRes.json();
            const inventoryData = await inventoryRes.json();
            const assetsData = await assetsRes.json();
            const usersData = await usersRes.json();

            setAssignments(assignData);
            setInventory(inventoryData);
            setAssets(assetsData);

            // Filter only officers
            setOfficers(usersData.filter(u => u.role === "officer"));

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        // Only run if we actually have data and the modal isn't already open
        if (loading || inventory.length === 0 || officers.length === 0 || showModal) return;

        if (prefill) {
            let matchedInventoryId = "";

            if (prefill.asset_id) {
                const availableBatches = inventory.filter(
                    i => i.asset_id === prefill.asset_id && i.status === "Available" && i.quantity > 0
                );

                if (availableBatches.length > 0) {
                    const goodBatch = availableBatches.find(i => i.condition === "Good");
                    const fairBatch = availableBatches.find(i => i.condition === "Fair");
                    const poorBatch = availableBatches.find(i => i.condition === "Poor");

                    const bestBatch = goodBatch || fairBatch || poorBatch || availableBatches[0];
                    matchedInventoryId = bestBatch.inventory_id;
                }
            }

            setAssignmentForm({
                inventory_id: matchedInventoryId,
                assigned_to: prefill.requested_by || "",
                quantity: prefill.quantity || "",
                assigned_date: new Date().toISOString().split("T")[0],
                returned_date: "",
                remarks: prefill.description ? `Approved Request: ${prefill.description}` : "Approved via Request",
                request_id: prefill.request_id || "",
            });

            setShowModal(true);

            // Replace the URL state so it doesn't trigger again
            navigate(currentPath, { replace: true, state: null });
        }
        // 🔥 FIXED DEPENDENCY ARRAY: Remove location.state and use primitive values
    }, [loading, inventory, officers, prefill, currentPath, navigate, showModal]);

    /* =============================
       CREATE ASSIGNMENT
       ============================= */
    const handleSubmit = async () => {
        if (!assignmentForm.inventory_id || !assignmentForm.assigned_to) {
            alert("Select asset and officer");
            return;
        }

        if (!assignmentForm.quantity || assignmentForm.quantity <= 0) {
            alert("Enter valid quantity");
            return;
        }

        const token = await getAuth().currentUser.getIdToken();

        const payload = {
            inventory_id: assignmentForm.inventory_id,
            assigned_to: assignmentForm.assigned_to,
            quantity: Number(assignmentForm.quantity),
            returned_date: assignmentForm.returned_date || null,
            remarks: assignmentForm.remarks || "",
        };

        // 1. Create the Assignment
        const assignRes = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/assignments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const assignData = await assignRes.json();

        // STOP here if the assignment failed (e.g., 409 Conflict)
        if (!assignRes.ok) {
            alert(assignData.message || "Failed to assign asset.");
            return;
        }

        // 2. If we got here, the assignment succeeded! Now approve the request.
        if (assignmentForm?.request_id) {
            try {
                const approveRes = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/requests/${assignmentForm.request_id}/approve`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!approveRes.ok) {
                    console.error("Failed to mark request as approved.");
                }
            } catch (err) {
                console.error("Error approving request:", err);
            }
        }

        alert("Assignment created successfully ✅");

        setShowModal(false);
        setAssignmentForm({
            inventory_id: "",
            assigned_to: "",
            quantity: "",
            assigned_date: new Date().toISOString().split("T")[0],
            returned_date: "",
            remarks: "",
            request_id: "",
        });

        fetchData();
        
        if (assignmentForm.request_id) {
            alert("Request completed successfully ✅");
            navigate("/store-manager/requests");
        }
    };

    /* =============================
       EDIT ASSIGNMENT
       ============================= */
    const openEditModal = (assignment) => {
        setModalMode("edit");
        setEditingId(assignment.id);
        setAssignmentForm({
            inventory_id: assignment.inventory_id || "",
            assigned_to: assignment.assigned_to || assignment.assigned_uid || "",
            quantity: assignment.quantity || "",
            assigned_date: assignment.assigned_iso ? assignment.assigned_iso.split("T")[0] : new Date().toISOString().split("T")[0],
            returned_date: assignment.returned_iso ? assignment.returned_iso.split("T")[0] : "",
            remarks: assignment.remarks || "",
        });
        setShowModal(true);
    };

    const handleEditSubmit = async () => {
        if (!editingId) return;

        const token = await getAuth().currentUser.getIdToken();

        const payload = {
            assigned_date: assignmentForm.assigned_date || null,
            returned_date: assignmentForm.returned_date || null,
            remarks: assignmentForm.remarks || "",
        };

        const res = await fetch(
            `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/assignments/${editingId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            }
        );

        const data = await res.json();
        if (!res.ok) {
            alert(data.message || "Failed to update assignment");
            return;
        }

        setShowModal(false);
        setEditingId(null);
        setModalMode("create");
        fetchData();
    };

    /* =============================
       DELETE ASSIGNMENT
       ============================= */
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this assignment? This action cannot be undone.")) return;

        const token = await getAuth().currentUser.getIdToken();

        const res = await fetch(
            `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/assignments/${id}`,
            {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        const data = await res.json();
        if (!res.ok) {
            alert(data.message || "Failed to delete assignment");
            return;
        }

        fetchData();
    };

    const selectedInventory = inventory.find(
        i => i.inventory_id === assignmentForm.inventory_id
    );

    /* =============================
       RETURN ASSET
       ============================= */

    const handleReturn = async (id) => {
        if (!window.confirm("Return this asset?")) return;

        const token = await getAuth().currentUser.getIdToken();

        await fetch(
            `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/assignments/${id}/return`,
            {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        fetchData();
    };

    /* =============================
       SEARCH + SORT
       ============================= */
    const filteredAssignments = useMemo(() => {
        let data = [...assignments];

        // 1. Status Filter
        if (statusFilter === "active") {
            data = data.filter(a => !a.returned_iso);
        } else if (statusFilter === "returned") {
            data = data.filter(a => a.returned_iso);
        }

        // 2. Search Filter
        if (search) {
            const q = search.toLowerCase();
            data = data.filter((a) => {
                const room = (
                    a.assigned_room ||
                    (officersMap[a.assigned_to] && officersMap[a.assigned_to].room_id) ||
                    (officersMap[a.assigned_uid] && officersMap[a.assigned_uid].room_id) ||
                    ""
                );

                return (
                    String(a.assignment_id || "").toLowerCase().includes(q) ||
                    String(a.employee_name || "").toLowerCase().includes(q) ||
                    String(a.quantity || "").toLowerCase().includes(q) ||
                    String(a.asset_name || "").toLowerCase().includes(q) ||
                    String(room).toLowerCase().includes(q)
                );
            });
        }

        // 3. Sorting
        if (sortOption) {
            data.sort((a, b) => {
                switch (sortOption) {
                    case "assigned_asc":
                        return new Date(a.assigned_iso || 0) - new Date(b.assigned_iso || 0);
                    case "assigned_desc":
                        return new Date(b.assigned_iso || 0) - new Date(a.assigned_iso || 0);
                    case "returned_asc": {
                        // Push nulls (active items) to the bottom when sorting ascending
                        const rA = a.returned_iso ? new Date(a.returned_iso).getTime() : Infinity;
                        const rB = b.returned_iso ? new Date(b.returned_iso).getTime() : Infinity;
                        return rA - rB;
                    }
                    case "returned_desc": {
                        // Treat nulls as 0 so they fall to the bottom when sorting descending
                        const rA = a.returned_iso ? new Date(a.returned_iso).getTime() : 0;
                        const rB = b.returned_iso ? new Date(b.returned_iso).getTime() : 0;
                        return rB - rA;
                    }
                    case "qty_asc":
                        return Number(a.quantity || 0) - Number(b.quantity || 0);
                    case "qty_desc":
                        return Number(b.quantity || 0) - Number(a.quantity || 0);
                    default:
                        return 0;
                }
            });
        }

        return data;
    }, [assignments, search, sortOption, statusFilter, officersMap]);

    /* =============================
       RENDER
       ============================= */

    return (
        <div className="assignment-wrapper">

            <div className="assignment-header">
                <button
                    className="back-btn"
                    onClick={() => navigate("/store-manager/dashboard")}
                >
                    ← Back
                </button>
                <h1>
                    <FiShuffle />
                    Asset Assignments
                </h1>
            </div>

            {loading && (
                <div className="assignment-spinner-container">
                    <div className="assignment-spinner"></div>
                </div>
            )}

            {error && <div className="assignment-error">{error}</div>}

            {!loading && (
                <>
                    <div className="assignment-controls">
                        <input
                            placeholder="Search assignments..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                            <option value="">Sort By...</option>
                            <option value="assigned_desc">Assigned Date (Newest First)</option>
                            <option value="assigned_asc">Assigned Date (Oldest First)</option>
                            <option value="returned_desc">Returned Date (Newest First)</option>
                            <option value="returned_asc">Returned Date (Oldest First)</option>
                            <option value="qty_desc">Quantity (High to Low)</option>
                            <option value="qty_asc">Quantity (Low to High)</option>
                        </select>

                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="returned">Returned Only</option>
                        </select>

                        <button
                            className="assignment-primary-btn"
                            onClick={() => {
                                setModalMode("create");
                                setEditingId(null);
                                setAssignmentForm({
                                    inventory_id: "",
                                    assigned_to: "",
                                    quantity: "",
                                    assigned_date: new Date().toISOString().split("T")[0],
                                    returned_date: "",
                                    remarks: ""
                                });
                                setShowModal(true);
                            }}
                        >
                            + New Assignment
                        </button>
                    </div>

                    {filteredAssignments.length === 0 ? (
                        <div className="assignment-empty">No assignments found</div>
                    ) : (
                        <table className="assignment-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Asset</th>
                                    <th>Officer</th>
                                    <th>Location</th>
                                    <th>Quantity</th>
                                    <th>Condition</th>
                                    <th>Assigned</th>
                                    <th>Returned</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAssignments.map((a) => {
                                    const active = !a.returned_iso;
                                    return (
                                        <tr key={a.assignment_id}>
                                            <td>{a.assignment_id}</td>
                                            <td>{a.asset_name}</td>
                                            <td>{a.employee_name || (officersMap[a.assigned_to]?.name || officersMap[a.assigned_uid]?.name || officersMap[a.assigned_to]?.employee_name || "-")}</td>
                                            <td>{a.assigned_room || officersMap[a.assigned_to]?.room_id || officersMap[a.assigned_uid]?.room_id || "-"}</td>
                                            <td>{a.quantity}</td>
                                            <td>{(inventory.find(i => i.inventory_id === a.inventory_id) || {}).condition || "-"}</td>
                                            <td>
                                                {a.assigned_iso ? new Date(a.assigned_iso).toLocaleString() : "-"}
                                            </td>
                                            <td>
                                                {a.returned_iso ? (
                                                    new Date(a.returned_iso).toLocaleString()
                                                ) : (
                                                    <button
                                                        className="assignment-return-inline"
                                                        onClick={() => handleReturn(a.id)}
                                                        title="Return"
                                                    >
                                                        Return
                                                    </button>
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={
                                                        active
                                                            ? "assignment-status-active"
                                                            : "assignment-status-returned"
                                                    }
                                                >
                                                    {active ? "Active" : "Returned"}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="assignment-icon-btn assignment-edit-btn"
                                                    onClick={() => openEditModal(a)}
                                                    aria-label={`Edit ${a.assignment_id}`}
                                                    title="Edit"
                                                >
                                                    <FiEdit2 size={14} />
                                                </button>

                                                <button
                                                    className="assignment-icon-btn assignment-delete-btn"
                                                    onClick={() => handleDelete(a.id)}
                                                    aria-label={`Delete ${a.assignment_id}`}
                                                    title="Delete"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </>
            )}

            {showModal && (
                <div
                    className="assignment-modal-overlay"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="assignment-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="assignment-modal-header">
                            <h2>{modalMode === "create" ? "New Assignment" : "Edit Assignment"}</h2>
                            <button
                                className="assignment-modal-close"
                                onClick={() => { setShowModal(false); setModalMode("create"); setEditingId(null); }}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="assignment-modal-body">
                            {/* ASSET SELECTION */}
                            <select
                                value={assignmentForm.inventory_id}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        inventory_id: e.target.value,
                                        quantity: "", // Reset qty when asset changes
                                    })
                                }
                                disabled={modalMode === "edit"} // Can't change asset when editing
                            >
                                <option value="">Select Asset</option>
                                {inventory
                                    .filter((i) => i.quantity > 0 && i.status === "Available")
                                    .map((i) => {
                                        const asset = assetMap[i.asset_id];
                                        return (
                                            <option key={i.inventory_id} value={i.inventory_id}>
                                                {asset?.asset_name} ({i.condition})
                                            </option>
                                        );
                                    })}
                            </select>

                            {selectedInventory && (
                                <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                                    Available: <strong>{selectedInventory.quantity}</strong>
                                </div>
                            )}

                            {/* QUANTITY */}
                            <input
                                type="number"
                                placeholder="Quantity"
                                min="1"
                                max={selectedInventory?.quantity || ""}
                                value={assignmentForm.quantity}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        quantity: e.target.value,
                                    })
                                }
                            />

                            {/* OFFICER SELECTION */}
                            {modalMode === "edit" ? (
                                <>
                                    <input
                                        type="text"
                                        value={
                                            officersMap[assignmentForm.assigned_to]?.name ||
                                            officersMap[assignmentForm.assigned_to]?.employee_name ||
                                            assignmentForm.assigned_to ||
                                            ""
                                        }
                                        readOnly
                                        className="disabled-input"
                                    />
                                </>
                            ) : (
                                <select
                                    value={assignmentForm.assigned_to}
                                    onChange={(e) =>
                                        setAssignmentForm({
                                            ...assignmentForm,
                                            assigned_to: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Select Officer</option>
                                    {officers.map((o) => (
                                        <option
                                            key={o.user_id || o.id}
                                            value={o.user_id || o.employee_id || o.id}
                                        >
                                            {o.name || o.employee_name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* DATES & REMARKS */}
                            <input
                                type="date"
                                value={assignmentForm.assigned_date}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        assigned_date: e.target.value,
                                    })
                                }
                            />

                            <input
                                type="date"
                                value={assignmentForm.returned_date}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        returned_date: e.target.value,
                                    })
                                }
                            />

                            <textarea
                                placeholder="Remarks"
                                value={assignmentForm.remarks}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        remarks: e.target.value,
                                    })
                                }
                            />

                            <div className="assignment-modal-actions">
                                <button
                                    className="assignment-secondary-btn"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="assignment-primary-btn"
                                    onClick={modalMode === "create" ? handleSubmit : handleEditSubmit}
                                >
                                    {modalMode === "create" ? "Submit" : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Assignments;