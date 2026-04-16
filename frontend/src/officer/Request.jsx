import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { FiFileText, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import "./Request.css";

function Request() {
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({
        request_type: "",
        assignment_id: "",
        return_date: "",
        asset_category: "",
        custom_category: "",
        asset_name: "",
        quantity: 1,
        serial_numbers: [],
        disposal_reason: "",
        description: "",
        company: "",
        image_url: "",
    });

    const [previewImage, setPreviewImage] = useState(null);
    const [selectedAssignmentQty, setSelectedAssignmentQty] = useState(0);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [selectedSerials, setSelectedSerials] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [assets, setAssets] = useState([]);
    const [filteredAssets, setFilteredAssets] = useState([]);
    const [procurementMode, setProcurementMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [noSerialQty, setNoSerialQty] = useState(0);

    /* ================= FETCH ASSIGNED ASSETS ================= */
    useEffect(() => {
        const fetchAssignments = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();

            const res = await fetch(
                `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/officer/my-assets`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await res.json();

            const activeAssignments = Array.isArray(data)
                ? data.filter((a) => !a.returned_date)
                : [];

            setAssignments(activeAssignments);
        };

        fetchAssignments();
    }, []);

    /* ================= GROUP ASSIGNMENTS BY ASSET NAME ================= */
    const groupedAssignments = useMemo(() => {
        return Object.values(
            assignments.reduce((acc, a) => {
                if (!acc[a.asset_name]) {
                    acc[a.asset_name] = {
                        ...a,
                        assignment_ids: [a.assignment_id],
                        serial_numbers: [...(a.serial_numbers || [])],
                        quantity: a.quantity || 0,
                    };
                } else {
                    acc[a.asset_name].quantity += a.quantity || 0;
                    acc[a.asset_name].serial_numbers.push(...(a.serial_numbers || []));
                    acc[a.asset_name].assignment_ids.push(a.assignment_id);
                }
                return acc;
            }, {})
        );
    }, [assignments]);

    /* ================= AUTO-FILL FROM MY ASSETS ================= */
    useEffect(() => {
        if (location.state?.autoFill) {

            const { request_type, assignment_ids } = location.state;

            // 🔵 CASE 1: ISSUE
            if (request_type === "ISSUE") {
                setForm(prev => ({
                    ...prev,
                    request_type: "ISSUE"
                }));
                window.history.replaceState({}, document.title);
            }

            // 🟢 CASE 2: RETURN
            else if (request_type === "RETURN" && assignment_ids) {
                if (groupedAssignments.length > 0) {

                    const isValidGroup = groupedAssignments.find(g =>
                        g.assignment_ids.includes(assignment_ids[0])
                    );

                    if (isValidGroup) {
                        setForm(prev => ({
                            ...prev,
                            request_type: "RETURN",
                            assignment_id: JSON.stringify(isValidGroup.assignment_ids),
                            quantity: 1,
                            asset_name: isValidGroup.asset_name
                        }));

                        setSelectedAssignmentQty(isValidGroup.quantity);
                        setSelectedAssignment({ serial_numbers: isValidGroup.serial_numbers });
                        window.history.replaceState({}, document.title);
                    }
                }
            }
        }
    }, [location.state, assignments, groupedAssignments]);

    /* ================= FETCH ASSET MASTER ================= */
    useEffect(() => {
        const fetchAssets = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();

            const res = await fetch(
                `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/assets`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await res.json();
            setAssets(Array.isArray(data) ? data : []);
        };

        fetchAssets();
    }, []);

    /* ================= FILTER ASSETS BY CATEGORY ================= */
    useEffect(() => {
        if (!form.asset_category) {
            setFilteredAssets([]);
            return;
        }

        const filtered = assets.filter(
            (a) => a.asset_category === form.asset_category
        );

        setFilteredAssets(filtered);
    }, [form.asset_category, assets]);

    const selectedAsset = assets.find(
        (a) => a.asset_name === form.asset_name
    );

    /* ================= CLOUDINARY UPLOAD ================= */
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "Asset_Management_System");

            const res = await axios.post(
                "https://api.cloudinary.com/v1_1/dfygr2bme/image/upload",
                formData
            );

            setForm((prev) => ({
                ...prev,
                image_url: res.data.secure_url,
            }));
        } catch (err) {
            alert("Image upload failed");
        }
    };

    /* ================= HANDLE CHANGE ================= */
    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (name === "assignment_id") {
            const parsedIds = JSON.parse(value);

            const selected = assignments.filter(
                (a) => parsedIds.includes(a.assignment_id)
            );

            if (selected.length > 0) {
                const totalQty = selected.reduce(
                    (sum, a) => sum + (a.quantity || a.assigned_quantity || 1),
                    0
                );

                const allSerials = selected.flatMap(a => a.serial_numbers || []);

                setSelectedAssignmentQty(totalQty);

                setSelectedAssignment({
                    serial_numbers: allSerials
                });

                setSelectedSerials([]);

                setForm((prev) => ({
                    ...prev,
                    assignment_id: value,
                    quantity: 1,
                    serial_numbers: [],
                    asset_name: selected[0].asset_name,
                }));
            }
        }
    };

    useEffect(() => {
        if (location.state?.autoFill) return;
        setForm((prev) => ({
            ...prev,
            assignment_id: "",
            asset_category: "",
            asset_name: "",
            disposal_reason: "",
            description: "",
            image_url: "",
            quantity: 1,
            serial_numbers: [],
        }));
        setSelectedAssignmentQty(0);
        setProcurementMode(false);
    }, [form.request_type, location.state?.autoFill]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    /* ================= SUBMIT ================= */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return setError("Not authenticated");

        if (
            ["RETURN", "MAINTENANCE", "DISPOSAL"].includes(form.request_type) &&
            form.quantity > selectedAssignmentQty
        ) {
            setError("Quantity cannot exceed assigned quantity.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const token = await user.getIdToken();

            const finalType =
                procurementMode ? "PROCUREMENT" : form.request_type;


            const totalSelected = selectedSerials.length + noSerialQty;

            if (
                selectedAssignment?.serial_numbers?.length > 0 &&
                totalSelected !== form.quantity
            ) {
                setLoading(false);
                alert(`Total selected (${totalSelected}) must equal quantity (${form.quantity})`);
                return;
            }

            const payload = {
                ...form,
                assignment_id: null,
                assignment_ids: JSON.parse(form.assignment_id),
                request_type: finalType,
                serial_numbers: selectedSerials,
                no_serial_quantity: Number(noSerialQty) || 0,
                asset_category:
                    form.asset_category === "Others"
                        ? form.custom_category
                        : form.asset_category,
            };

            const res = await fetch(
                `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/requests/create`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setSuccess("Request submitted successfully");
            setForm({
                request_type: "",
                assignment_id: "",
                return_date: "",
                asset_category: "",
                custom_category: "",
                asset_name: "",
                quantity: 1,
                disposal_reason: "",
                description: "",
                company: "",
                image_url: "",
            });
            setProcurementMode(false);
            setSelectedAssignmentQty(0);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const categories = [
        ...new Set(
            Array.isArray(assets)
                ? assets.map((a) => a.asset_category)
                : []
        ),
    ];

    return (
        <div className="create-request-container">
            <div className="create-request-header">
                <div className="request-header-left">
                    <button
                        className="request-back-btn"
                        onClick={() => navigate("/officer/dashboard")}
                    >
                        ← Back
                    </button>
                </div>

                <div className="request-header-center">
                    <h1>
                        <FiFileText /> Create New Request
                    </h1>
                </div>

                <div className="request-header-right">
                    <button
                        className="request-status-btn"
                        onClick={() => navigate("/officer/requeststatus")}
                    >
                        Check Status
                    </button>
                </div>
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

            <form onSubmit={handleSubmit} className="create-request-form">

                <div className="request-card">
                    <h3>Request Type<span className="required-star">*</span></h3>

                    <select
                        name="request_type"
                        value={form.request_type}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="RETURN">Return</option>
                        <option value="ISSUE">Asset Issue</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="DISPOSAL">Disposal</option>
                    </select>
                </div>

                {/* ================= RETURN ================= */}
                {form.request_type === "RETURN" && (
                    <div className="request-card">
                        <h3>Return Details<span className="required-star">*</span></h3>

                        <select
                            name="assignment_id"
                            value={form.assignment_id}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Assigned Asset</option>
                            {groupedAssignments.map((a) => (
                                <option
                                    key={a.asset_name}
                                    value={JSON.stringify(a.assignment_ids)}
                                >
                                    {a.asset_name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="number"
                            min="1"
                            max={selectedAssignmentQty || 1}
                            value={form.quantity}
                            onChange={(e) => {
                                const val = Number(e.target.value);

                                setForm(prev => ({
                                    ...prev,
                                    quantity: val
                                }));

                                setSelectedSerials((prev) => prev.slice(0, val));
                                setNoSerialQty(0); // reset when quantity changes
                            }}
                        />

                        < small className="quantity-hint" >
                            Max allowed: {selectedAssignmentQty}
                        </small>

                        {/* NO SERIALS FOUND */}
                        {(!selectedAssignment?.serial_numbers || selectedAssignment.serial_numbers.length === 0) && (
                            <div className="serial-empty-state">
                                <span className="serial-empty-icon">ℹ️</span>
                                <div className="serial-empty-text">
                                    <p className="serial-empty-title">No Serial Numbers</p>
                                    <p className="serial-empty-desc">This asset does not require individual serial tracking.</p>
                                </div>
                            </div>
                        )}

                        {Array.isArray(selectedAssignment?.serial_numbers) &&
                            selectedAssignment.serial_numbers.length > 0 && (
                                <div className="serial-wrapper">
                                    <div className="serial-header">
                                        <h4>Select Serial Numbers</h4>
                                        <span
                                            className={`serial-counter ${(selectedSerials.length + noSerialQty) === 0
                                                    ? "danger"
                                                    : (selectedSerials.length + noSerialQty) === Number(form.quantity)
                                                        ? "success"
                                                        : "warning"
                                                }`}
                                        >
                                            Selected: {selectedSerials.length + noSerialQty} / {form.quantity}
                                        </span>
                                    </div>

                                    <div className="serial-grid">
                                        {selectedAssignment.serial_numbers.map((sn, index) => {
                                            const isChecked = selectedSerials.includes(sn);
                                            const totalSelected = selectedSerials.length + noSerialQty;

                                            const isDisabled =
                                                !isChecked && totalSelected >= form.quantity;

                                            return (
                                                <div
                                                    key={index}
                                                    className={`serial-card ${isChecked ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                                                    onClick={() => {
                                                        if (isDisabled) return;

                                                        if (isChecked) {
                                                            setSelectedSerials(prev => prev.filter(s => s !== sn));
                                                        } else {
                                                            setSelectedSerials(prev => [...prev, sn]);
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        disabled={isDisabled}
                                                        onChange={() => { }} // handled by div click
                                                    />

                                                    <span className="serial-text">{sn}</span>
                                                </div>
                                            );
                                        })}

                                        <div className="no-serial-input">
                                            <label>No Serial Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={form.quantity - selectedSerials.length}
                                                value={noSerialQty}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);

                                                    if (val + selectedSerials.length > form.quantity) return;

                                                    setNoSerialQty(val);
                                                }}
                                            />

                                        </div>
                                    </div>
                                </div>
                            )}

                        <input
                            type="date"
                            name="return_date"
                            value={form.return_date}
                            onChange={handleChange}
                            required
                        />

                        <textarea
                            name="description"
                            placeholder="Optional description about return"
                            value={form.description}
                            onChange={handleChange}
                        />
                    </div>
                )
                }

                {/* ================= ISSUE ================= */}
                {
                    form.request_type === "ISSUE" && !procurementMode && (
                        <div className="request-card">
                            <h3>Asset Issue<span className="required-star">*</span></h3>

                            <select
                                name="asset_category"
                                value={form.asset_category}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map((c, i) => (
                                    <option key={i} value={c}>{c}</option>
                                ))}
                            </select>

                            {/* If category selected but no assets found */}
                            {form.asset_category && filteredAssets.length === 0 && (
                                <p className="no-assets-text">
                                    No assets available in this category.
                                </p>
                            )}

                            {/* If assets exist for selected category */}
                            {filteredAssets.length > 0 && (
                                <select
                                    name="asset_name"
                                    value={form.asset_name}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Asset</option>
                                    {filteredAssets.map((a) => (
                                        <option key={a.asset_id} value={a.asset_name}>
                                            {a.asset_name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {selectedAsset?.asset_photo_url && (
                                <div className="asset-preview">
                                    <img
                                        src={selectedAsset.asset_photo_url}
                                        alt={selectedAsset.asset_name}
                                        className="asset-preview-img clickable"
                                        onClick={() => setPreviewImage(selectedAsset.asset_photo_url)}
                                    />
                                    <p className="asset-preview-name">
                                        {selectedAsset.asset_name}
                                    </p>
                                </div>
                            )}

                            <input
                                type="number"
                                min="1"
                                name="quantity"
                                value={form.quantity}
                                onChange={handleChange}
                                required
                            />

                            <p
                                className="procurement-toggle"
                                onClick={() => setProcurementMode(true)}
                            >
                                Can't find desired asset? Request a new one.
                            </p>
                        </div>
                    )
                }

                {/* ================= MAINTENANCE ================= */}
                {form.request_type === "MAINTENANCE" && (
                    <div className="request-card">
                        <h3>Maintenance Details<span className="required-star">*</span></h3>

                        <select
                            name="assignment_id"
                            value={form.assignment_id}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Assigned Asset</option>
                            {groupedAssignments.map((a) => (
                                <option
                                    key={a.asset_name}
                                    value={JSON.stringify(a.assignment_ids)}
                                >
                                    {a.asset_name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="number"
                            min="1"
                            max={selectedAssignmentQty}
                            value={form.quantity}
                            onChange={(e) => {
                                const val = Number(e.target.value);

                                setForm(prev => ({ ...prev, quantity: val }));
                                setSelectedSerials(prev => prev.slice(0, val));
                                setNoSerialQty(0);
                            }}
                            disabled={!form.assignment_id}
                            required
                        />

                        <small className="quantity-hint">
                            Max allowed: {selectedAssignmentQty}
                        </small>

                        {/* NO SERIALS FOUND */}
                        {(!selectedAssignment?.serial_numbers || selectedAssignment.serial_numbers.length === 0) && (
                            <div className="serial-empty-state">
                                <span className="serial-empty-icon">ℹ️</span>
                                <div className="serial-empty-text">
                                    <p className="serial-empty-title">No Serial Numbers</p>
                                    <p className="serial-empty-desc">This asset does not require individual serial tracking.</p>
                                </div>
                            </div>
                        )}

                        {/* SERIAL UI (same as return) */}
                        {Array.isArray(selectedAssignment?.serial_numbers) &&
                            selectedAssignment.serial_numbers.length > 0 && (
                                <div className="serial-wrapper">

                                    <div className="serial-header">
                                        <h4>Select Serial Numbers</h4>
                                        <span className="serial-counter">
                                            Selected: {selectedSerials.length + noSerialQty} / {form.quantity}
                                        </span>
                                    </div>

                                    <div className="serial-grid">
                                        {selectedAssignment.serial_numbers.map((sn, index) => {
                                            const isChecked = selectedSerials.includes(sn);
                                            const totalSelected = selectedSerials.length + noSerialQty;

                                            const isDisabled =
                                                !isChecked && totalSelected >= form.quantity;

                                            return (
                                                <div
                                                    key={index}
                                                    className={`serial-card ${isChecked ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                                                    onClick={() => {
                                                        if (isDisabled) return;

                                                        if (isChecked) {
                                                            setSelectedSerials(prev => prev.filter(s => s !== sn));
                                                        } else {
                                                            setSelectedSerials(prev => [...prev, sn]);
                                                        }
                                                    }}
                                                >
                                                    <input type="checkbox" checked={isChecked} readOnly />
                                                    <span className="serial-text">{sn}</span>
                                                </div>
                                            );
                                        })}

                                        {/* 🔥 NO SERIAL INPUT */}
                                        <div className="no-serial-input">
                                            <label>No Serial Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={form.quantity - selectedSerials.length}
                                                value={noSerialQty}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val + selectedSerials.length > form.quantity) return;
                                                    setNoSerialQty(val);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        <input type="file" onChange={handleImageUpload} />

                        <textarea
                            name="description"
                            placeholder="Describe the issue"
                            value={form.description}
                            onChange={handleChange}
                            required
                        />
                    </div>
                )}

                {/* ================= DISPOSAL ================= */}
                {form.request_type === "DISPOSAL" && (
                    <div className="request-card">
                        <h3>Disposal Details<span className="required-star">*</span></h3>

                        <select
                            name="assignment_id"
                            value={form.assignment_id}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Assigned Asset</option>
                            {groupedAssignments.map((a) => (
                                <option
                                    key={a.asset_name}
                                    value={JSON.stringify(a.assignment_ids)}
                                >
                                    {a.asset_name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="number"
                            min="1"
                            max={selectedAssignmentQty}
                            value={form.quantity}
                            onChange={(e) => {
                                const val = Number(e.target.value);

                                setForm(prev => ({ ...prev, quantity: val }));
                                setSelectedSerials(prev => prev.slice(0, val));
                                setNoSerialQty(0);
                            }}
                            disabled={!form.assignment_id}
                            required
                        />

                        <small className="quantity-hint">
                            Max allowed: {selectedAssignmentQty}
                        </small>

                        {/* NO SERIALS FOUND */}
                        {(!selectedAssignment?.serial_numbers || selectedAssignment.serial_numbers.length === 0) && (
                            <div className="serial-empty-state">
                                <span className="serial-empty-icon">ℹ️</span>
                                <div className="serial-empty-text">
                                    <p className="serial-empty-title">No Serial Numbers</p>
                                    <p className="serial-empty-desc">This asset does not require individual serial tracking.</p>
                                </div>
                            </div>
                        )}

                        {/* SERIAL UI */}
                        {Array.isArray(selectedAssignment?.serial_numbers) &&
                            selectedAssignment.serial_numbers.length > 0 && (
                                <div className="serial-wrapper">

                                    <div className="serial-header">
                                        <h4>Select Serial Numbers</h4>
                                        <span className="serial-counter">
                                            Selected: {selectedSerials.length + noSerialQty} / {form.quantity}
                                        </span>
                                    </div>

                                    <div className="serial-grid">
                                        {selectedAssignment.serial_numbers.map((sn, index) => {
                                            const isChecked = selectedSerials.includes(sn);
                                            const totalSelected = selectedSerials.length + noSerialQty;

                                            const isDisabled =
                                                !isChecked && totalSelected >= form.quantity;

                                            return (
                                                <div
                                                    key={index}
                                                    className={`serial-card ${isChecked ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                                                    onClick={() => {
                                                        if (isDisabled) return;

                                                        if (isChecked) {
                                                            setSelectedSerials(prev => prev.filter(s => s !== sn));
                                                        } else {
                                                            setSelectedSerials(prev => [...prev, sn]);
                                                        }
                                                    }}
                                                >
                                                    <input type="checkbox" checked={isChecked} readOnly />
                                                    <span className="serial-text">{sn}</span>
                                                </div>
                                            );
                                        })}

                                        {/* 🔥 NO SERIAL INPUT */}
                                        <div className="no-serial-input">
                                            <label>No Serial Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={form.quantity - selectedSerials.length}
                                                value={noSerialQty}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val + selectedSerials.length > form.quantity) return;
                                                    setNoSerialQty(val);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        <select
                            name="disposal_reason"
                            value={form.disposal_reason}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Reason</option>
                            <option value="Damaged">Damaged</option>
                            <option value="Obsolete">Obsolete</option>
                            <option value="Beyond Repair">Beyond Repair</option>
                            <option value="Others">Others</option>
                        </select>

                        {form.disposal_reason === "Others" && (
                            <textarea
                                name="description"
                                placeholder="Enter disposal reason"
                                value={form.description}
                                onChange={handleChange}
                                required
                            />
                        )}

                        <input type="file" onChange={handleImageUpload} />
                    </div>
                )}

                {/* ================= PROCUREMENT ================= */}
                {
                    procurementMode && (
                        <div className="request-card">
                            <h3>New Asset Request<span className="required-star">*</span></h3>

                            <select
                                name="asset_category"
                                value={form.asset_category}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map((c, i) => (
                                    <option key={i} value={c}>{c}</option>
                                ))}
                                <option value="Others">Others</option>
                            </select>

                            {form.asset_category === "Others" && (
                                <input
                                    name="custom_category"
                                    placeholder="Enter Asset Category"
                                    value={form.custom_category || ""}
                                    onChange={handleChange}
                                    required
                                />
                            )}

                            <input
                                name="asset_name"
                                placeholder="Asset Name"
                                value={form.asset_name}
                                onChange={handleChange}
                                required
                            />

                            <input
                                name="company"
                                placeholder="Company"
                                value={form.company}
                                onChange={handleChange}
                            />

                            <input
                                type="number"
                                min="1"
                                name="quantity"
                                value={form.quantity}
                                onChange={handleChange}
                                required
                            />

                            <textarea
                                name="description"
                                placeholder="Detailed description about the asset"
                                value={form.description}
                                onChange={handleChange}
                                required
                            />

                            <input type="file" onChange={handleImageUpload} />

                            <p
                                className="procurement-toggle"
                                onClick={() => setProcurementMode(false)}
                            >
                                Back to existing asset selection
                            </p>
                        </div>
                    )
                }

                <button
                    type="submit"
                    className="request-submit-btn"
                    disabled={loading}
                >
                    {loading ? "Submitting…" : "Submit Request"}
                </button>

            </form >

            {previewImage && (
                <div
                    className="preview-overlay"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="preview-box"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="preview-header">
                            <h3>Asset Preview</h3>
                            <button onClick={() => setPreviewImage(null)}>✕</button>
                        </div>

                        <div className="preview-body">
                            <img src={previewImage} alt="preview" />
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
}

export default Request;