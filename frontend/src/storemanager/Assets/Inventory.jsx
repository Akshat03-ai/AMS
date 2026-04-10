import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Inventory.css";
import { FiBox } from "react-icons/fi";

function Inventory() {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("");
    const [editingItem, setEditingItem] = useState(null);

    const [form, setForm] = useState({
        asset_id: "",
        quantity: "",
        status: "Available",
        condition: "Good",
    });

    /* ===============================
       FETCH DATA
       =============================== */
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const token = await getAuth().currentUser.getIdToken();

                // Asset Master
                const assetRes = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/assets`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const assetData = await assetRes.json();
                setAssets(Array.isArray(assetData) ? assetData : []);

                // Inventory
                const invRes = await fetch(
                    `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/inventory`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                const invData = await invRes.json();
                setInventory(Array.isArray(invData) ? invData : []);
            } catch (err) {
                console.error("Inventory fetch failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getAssetName = (assetId) =>
        assets.find((a) => a.asset_id === assetId)?.asset_name || "-";

    const filteredInventory = inventory
        .filter(i =>
            i.asset_id.toLowerCase().includes(search.toLowerCase()) ||
            getAssetName(i.asset_id).toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === "name") return getAssetName(a.asset_id).localeCompare(getAssetName(b.asset_id));
            if (sortBy === "quantity_desc") return b.quantity - a.quantity;
            if (sortBy === "quantity_asc") return a.quantity - b.quantity;
            if (sortBy === "condition") {
                const priority = { "Good": 1, "Fair": 2, "Poor": 3 };
                const rankA = priority[a.condition] || 99;
                const rankB = priority[b.condition] || 99;
                return rankA - rankB;
            } return 0;
        });

    const fetchInventory = async () => {
        const token = await getAuth().currentUser.getIdToken();

        const res = await fetch(
            `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/inventory`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await res.json();
        setInventory(Array.isArray(data) ? data : []);
    };

    /* ===============================
       HANDLERS
       =============================== */

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleAddInventory = () => {
        setEditingItem(null);
        setForm({
            id: "",
            asset_id: "",
            quantity: "",
            status: "Available",
            condition: "Good",
        });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.asset_id || !form.quantity) {
            alert("Asset and quantity are required");
            return;
        }

        try {
            const token = await getAuth().currentUser.getIdToken();

            const url = editingItem
                ? `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/inventory/${editingItem.id}`
                : `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/inventory`;

            const method = editingItem ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            await fetchInventory();
            setShowModal(false);
            setEditingItem(null);
            setForm({
                id: "",
                asset_id: "",
                quantity: "",
                status: "Available",
                condition: "Good",
            });
        } catch (err) {
            alert(err.message || "Failed to save inventory");
        }
    };

    /* ===============================
       RENDER
       =============================== */

    return (
        <div className="sm-inventory-page">

            {/* HEADER */}
            <div className="sm-assets-header">
                <button className="back-btn mobile-back-btn" onClick={() => navigate("/store-manager/dashboard")}>
                    ← Back
                </button>
                <h1><FiBox />Assets</h1>
            </div>

            {/* TABS */}
            <div className="sm-assets-tabs">
                <button className="active">Inventory</button>
                <button onClick={() => navigate("/store-manager/assets/master")}>
                    Asset Master
                </button>
            </div>

            {/* CONTROLS */}
            <div className="sm-assets-controls">
                <input
                    className="sm-search"
                    placeholder="Search asset name or ID…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select className="sm-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="">Sort By</option>
                    <option value="name">Name (A–Z)</option>
                    <option value="quantity_desc">Quantity ↓</option>
                    <option value="quantity_asc">Quantity ↑</option>
                    <option value="condition">Condition</option>
                </select>

                <button className="primary-btn" onClick={handleAddInventory}>
                    + Add Inventory
                </button>
            </div>

            {/* CONTENT */}
            {loading && <p>Loading inventory…</p>}

            {!loading && inventory.length === 0 && (
                <div className="empty-state">
                    No inventory records yet. Add stock for existing assets.
                </div>
            )}

            {!loading && inventory.length > 0 && (
                <div className="table-scroll">
                <table className="sm-assets-table">
                    <thead>
                        <tr>
                            <th>Inventory ID</th>
                            <th>Asset ID</th>
                            <th>Asset Name</th>
                            <th>Quantity</th>
                            <th>Status</th>
                            <th>Condition</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInventory.map((i) => (
                            <tr key={i.inventory_id || i.id}>
                                <td>{i.inventory_id}</td>
                                <td>{i.asset_id}</td>
                                <td className="highlight">{getAssetName(i.asset_id)}</td>
                                <td>{i.quantity}</td>
                                <td>
                                    <span className={`pill ${i.status?.toLowerCase()}`}>
                                        {i.status}
                                    </span>
                                </td>
                                <td>
                                    <span className={`pill ${i.condition?.toLowerCase()}`}>
                                        {i.condition}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        className="action-btn edit-btn"
                                        onClick={() => {
                                            setEditingItem(i);
                                            setForm({
                                                id: i.id,
                                                asset_id: i.asset_id,
                                                quantity: i.quantity,
                                                status: i.status,
                                                condition: i.condition,
                                            });
                                            setShowModal(true);
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="action-btn delete-btn"
                                        onClick={async () => {
                                            if (!window.confirm('Are you sure you want to delete this inventory item?')) return;
                                            try {
                                                const token = await getAuth().currentUser.getIdToken();
                                                const res = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/inventory/${i.id}`, {
                                                    method: 'DELETE',
                                                    headers: { Authorization: `Bearer ${token}` },
                                                });
                                                if (!res.ok) {
                                                    const text = await res.text();
                                                    console.error('Delete failed', res.status, text);
                                                    throw new Error('Failed to delete inventory');
                                                }
                                                await fetchInventory();
                                            } catch (err) {
                                                alert(err.message || 'Failed to delete inventory');
                                            }
                                        }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}

            {/* MODAL */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-card">
                        <h3>{editingItem ? "Edit Inventory" : "Add Inventory"}</h3>

                        <select
                            name="asset_id"
                            value={form.asset_id}
                            onChange={handleChange}
                            disabled={!!editingItem}
                        >
                            <option value="">Select Asset</option>
                            {assets.map((a) => (
                                <option key={a.asset_id} value={a.asset_id}>
                                    {a.asset_name}
                                </option>
                            ))}
                        </select>

                        <input
                            name="quantity"
                            type="number"
                            placeholder="Quantity"
                            value={form.quantity}
                            onChange={handleChange}
                        />

                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                        >
                            <option value="Available">Available</option>
                            <option value="Unavailable">Unavailable</option>
                        </select>

                        <select
                            name="condition"
                            value={form.condition}
                            onChange={handleChange}
                        >
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Poor">Poor</option>
                        </select>

                        <div className="modal-actions">
                            <button className="secondary-bttn" onClick={() => {
                                setShowModal(false);
                                setEditingItem(null);
                                setForm({
                                    id: "",
                                    asset_id: "",
                                    quantity: "",
                                    status: "Available",
                                    condition: "Good",
                                });
                            }}>
                                Cancel
                            </button>
                            <button className="primary-bttn" onClick={handleSubmit}>
                                Save Inventory
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Inventory;
