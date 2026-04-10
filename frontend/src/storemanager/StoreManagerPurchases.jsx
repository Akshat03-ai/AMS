import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./StoreManagerPurchases.css";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { FiEdit, FiTrash2, FiX } from "react-icons/fi";

function StoreManagerPurchases() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const [activeTab, setActiveTab] = useState("purchases");
  const [assets, setAssets] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const currentPath = location.pathname;
  const [requestPrefill, setRequestPrefill] = useState(null);

  const [purchaseForm, setPurchaseForm] = useState({
    asset_id: "",
    vendor_id: "",
    invoice_number: "",
    purchase_date: "",
    purchase_cost: "",
    quantity: "",
    warranty: "",
  });

  useEffect(() => {
    if (prefill) {
      setRequestPrefill(prefill);
      setPurchaseForm(prev => ({
        ...prev,
        quantity: prefill.quantity || "",
        asset_id: prefill.asset_id || "",
      }));

      setShowPurchaseModal(true);

      navigate(currentPath, { replace: true });
    }
  }, [prefill, currentPath, navigate]);


  const [vendorForm, setVendorForm] = useState({
    vendor_name: "",
    contact: "",
    gst: "",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (editingPurchase) {
      setPurchaseForm({
        asset_id: editingPurchase.asset_id || "",
        vendor_id: editingPurchase.vendor_id || "",
        invoice_number: editingPurchase.invoice_number || "",
        purchase_date: editingPurchase.purchase_date || "",
        purchase_cost: editingPurchase.purchase_cost || "",
        quantity: editingPurchase.quantity || "",
        warranty: editingPurchase.warranty || "",
      });
    }
  }, [editingPurchase]);

  useEffect(() => {
    if (editingVendor) {
      setVendorForm({
        vendor_name: editingVendor.vendor_name || "",
        contact: editingVendor.contact || "",
        gst: editingVendor.gst || "",
      });
    }
  }, [editingVendor]);

  /* =============================
   CREATE / UPDATE PURCHASE
   ============================= */

  const handleSubmitPurchase = async () => {
    try {
      // Validation for new purchases
      if (!editingPurchase) {
        if (!purchaseForm.asset_id) {
          alert("Please select an asset");
          return;
        }
        if (!purchaseForm.vendor_id) {
          alert("Please select a vendor");
          return;
        }
        if (!purchaseForm.purchase_cost) {
          alert("Please enter purchase cost");
          return;
        }
        if (!purchaseForm.quantity) {
          alert("Please enter quantity");
          return;
        }
      }

      const token = await getAuth().currentUser.getIdToken();

      const isEditing = !!editingPurchase;

      const url = isEditing
        ? `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/purchases/${editingPurchase.id}`
        : `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/purchases`;

      const method = isEditing ? "PATCH" : "POST";

      const payload = purchaseForm;

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

      setShowPurchaseModal(false);
      setEditingPurchase(null);

      setPurchaseForm({
        asset_id: "",
        vendor_id: "",
        invoice_number: "",
        purchase_date: "",
        purchase_cost: "",
        quantity: "",
        warranty: "",
      });

      fetchData();

      if (requestPrefill?.request_id) {
        const goToAssignment = window.confirm(
          "Purchase created successfully ✅\n\nDo you want to continue to Assignment?"
        );

        if (goToAssignment) {
          navigate("/store-manager/assignments", {
            state: {
              prefill: {
                asset_id: payload.asset_id,
                quantity: payload.quantity,
                request_id: requestPrefill.request_id,
                requested_by: requestPrefill.requested_by,
              },
            },
          });
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };


  /* =============================
     CREATE / UPDATE VENDOR
     ============================= */

  const handleSubmitVendor = async () => {
    try {
      // Validation for new vendors
      if (!editingVendor) {
        if (!vendorForm.vendor_name) {
          alert("Please enter vendor name");
          return;
        }
      }

      const token = await getAuth().currentUser.getIdToken();

      const isEditing = !!editingVendor;

      const url = isEditing
        ? `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/vendors/${editingVendor.id}`
        : `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/vendors`;

      const method = isEditing ? "PATCH" : "POST";

      const payload = vendorForm;

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

      setShowVendorModal(false);
      setEditingVendor(null);

      setVendorForm({
        vendor_name: "",
        contact: "",
        gst: "",
      });

      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  /* =============================
     FETCH DATA
     ============================= */

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = await getAuth().currentUser.getIdToken();

      const [purchaseRes, vendorRes, assetsRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/purchases`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/vendors`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/assets`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!purchaseRes.ok) {
        throw new Error("Failed to fetch purchases");
      }
      if (!vendorRes.ok) {
        throw new Error("Failed to fetch vendors");
      }
      if (!assetsRes.ok) {
        throw new Error("Failed to fetch assets");
      }

      const purchaseData = await purchaseRes.json();
      const vendorData = await vendorRes.json();
      const assetsData = await assetsRes.json();

      setPurchases(purchaseData);
      setVendors(vendorData);
      setAssets(assetsData);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* =============================
     SEARCH + SORT
     ============================= */

  const filteredPurchases = useMemo(() => {
    let data = [...purchases];

    if (purchaseSearch) {
      const q = purchaseSearch.toLowerCase();
      data = data.filter(
        (p) =>
          assets.find(a => a.asset_id === p.asset_id)?.asset_name?.toLowerCase().includes(q) ||
          vendors.find(v => v.vendor_id === p.vendor_id)?.vendor_name?.toLowerCase().includes(q) ||
          p.invoice_number?.toLowerCase().includes(q)
      );
    }

    if (sortField) {
      data.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        // If numbers
        if (!isNaN(valA) && !isNaN(valB)) {
          return sortAsc ? valA - valB : valB - valA;
        }

        // If dates
        if (sortField === "purchase_date") {
          return sortAsc
            ? new Date(valA) - new Date(valB)
            : new Date(valB) - new Date(valA);
        }

        // Default string
        return sortAsc
          ? String(valA || "").localeCompare(String(valB || ""))
          : String(valB || "").localeCompare(String(valA || ""));
      });
    }

    return data;
  }, [purchases, purchaseSearch, sortField, sortAsc, assets, vendors]);

  const filteredVendors = useMemo(() => {
    let data = [...vendors];

    if (vendorSearch) {
      const q = vendorSearch.toLowerCase();
      data = data.filter(
        (v) =>
          v.vendor_name?.toLowerCase().includes(q) ||
          v.vendor_id?.toLowerCase().includes(q) ||
          v.contact?.toLowerCase().includes(q) ||
          v.gst?.toLowerCase().includes(q)
      );
    }

    return data;
  }, [vendors, vendorSearch]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  /* =============================
     DELETE
     ============================= */

  const handleDeletePurchase = async (id) => {
    if (!window.confirm("Delete this purchase?")) return;

    const token = await getAuth().currentUser.getIdToken();

    await fetch(
      `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/purchases/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    fetchData();
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm("Delete this vendor?")) return;

    const token = await getAuth().currentUser.getIdToken();

    await fetch(
      `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/vendors/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    fetchData();
  };

  /* =============================
     RENDER
     ============================= */

  return (
    <div className="purchase-wrapper">

      <div className="purchase-header">
        <button className="back-btn" onClick={() => navigate("/store-manager/lifecycle")}>
          ← Back
        </button>
        <h1>Purchases</h1>
      </div>

      <div className="purchase-tabs">
        <button
          className={activeTab === "purchases" ? "active" : ""}
          onClick={() => setActiveTab("purchases")}
        >
          Purchases
        </button>
        <button
          className={activeTab === "vendors" ? "active" : ""}
          onClick={() => setActiveTab("vendors")}
        >
          Vendors
        </button>
      </div>

      {loading && (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      )}

      {error && <div className="no-results">{error}</div>}

      {/* PURCHASE TAB */}
      {activeTab === "purchases" && !loading && (
        <>
          <div className="table-header">
            <h3>Purchase Records</h3>
          </div>

          {/* SEARCH */}
          <div className="purchase-controls">
            <input
              placeholder="Search..."
              value={purchaseSearch}
              onChange={(e) => setPurchaseSearch(e.target.value)}
            />

            <select
              value={sortField}
              onChange={(e) => handleSort(e.target.value)}
            >
              <option value="">Sort By</option>
              <option value="purchase_id">Purchase ID</option>
              <option value="purchase_date">Date</option>
              <option value="purchase_cost">Cost</option>
              <option value="quantity">Quantity</option>
            </select>

            <button onClick={() => setSortAsc(!sortAsc)}>
              {sortAsc ? "↑ Asc" : "↓ Desc"}
            </button>

            <button
              className="primary-btn"
              onClick={() => {
                setEditingPurchase(null);
                setPurchaseForm({
                  asset_id: "",
                  vendor_id: "",
                  invoice_number: "",
                  purchase_date: "",
                  purchase_cost: "",
                  quantity: "",
                  warranty: "",
                });
                setShowPurchaseModal(true);
              }}
            >
              + Add Purchase
            </button>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="no-results">No purchase records found</div>
          ) : (
            <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort("purchase_id")}>ID</th>
                  <th className="sortable" onClick={() => handleSort("asset_id")}>Asset</th>
                  <th>Vendor</th>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Quantity</th>
                  <th>Warranty</th>
                  <th>Total Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p) => (
                  <tr key={p.id}>
                    <td>{p.purchase_id}</td>
                    <td>
                      {assets.find(a => a.asset_id === p.asset_id)?.asset_name || p.asset_id}
                    </td>

                    <td>
                      {vendors.find(v => v.vendor_id === p.vendor_id)?.vendor_name || p.vendor_id}
                    </td>
                    <td>{p.invoice_number}</td>
                    <td>{p.purchase_date}</td>
                    <td>{p.quantity}</td>
                    <td>{p.warranty} Months</td>
                    <td>₹{p.purchase_cost}</td>
                    <td className="actions">
                      <button onClick={() => setEditingPurchase(p)}>
                        <FiEdit />
                      </button>
                      <button
                        className="danger"
                        onClick={() => handleDeletePurchase(p.id)}
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
        </>
      )}

      {/* VENDOR TAB */}
      {activeTab === "vendors" && !loading && (
        <>
          <h3 className="purchase-header">Vendors</h3>

          <div className="purchase-controls">
            <input
              placeholder="Search vendors..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
            />

            <button
              className="primary-btn"
              onClick={() => {
                setVendorForm({
                  vendor_name: "",
                  contact: "",
                  gst: "",
                });
                setShowVendorModal(true);
              }}
            >
              + Add Vendor
            </button>
          </div>

          {filteredVendors.length === 0 ? (
            <div className="no-results">No vendors found</div>
          ) : (
            <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>GST</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((v) => (
                  <tr key={v.id}>
                    <td>{v.vendor_id}</td>
                    <td>{v.vendor_name}</td>
                    <td>{v.contact}</td>
                    <td>{v.gst}</td>
                    <td className="actions">
                      <button onClick={() => setEditingVendor(v)}>
                        <FiEdit />
                      </button>
                      <button
                        className="danger"
                        onClick={() => handleDeleteVendor(v.id)}
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
        </>
      )}

      {(showPurchaseModal || editingPurchase) && (
        <div className="purchase-modal-overlay" onClick={() => {
          setShowPurchaseModal(false);
          setEditingPurchase(null);
        }}>
          <div className="purchase-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="purchase-modal-header">
              <h2 className="purchase-modal-title">
                {editingPurchase ? "Edit Purchase" : "Add Purchase"}
              </h2>
              <button
                className="purchase-modal-close"
                onClick={() => {
                  setShowPurchaseModal(false);
                  setEditingPurchase(null);
                }}
              >
                <FiX />
              </button>
            </div>

            <div className="purchase-modal-body">
              {/* Asset Dropdown */}
              <select
                value={purchaseForm.asset_id}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, asset_id: e.target.value })
                }
              >
                <option value="">Select Asset</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.asset_id}>
                    {a.asset_name}
                  </option>
                ))}
              </select>

              {/* Vendor Dropdown */}
              <select
                value={purchaseForm.vendor_id}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, vendor_id: e.target.value })
                }
              >
                <option value="">Select Vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.vendor_id}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>

              <input
                placeholder="Invoice Number"
                value={purchaseForm.invoice_number}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })
                }
              />

              <input
                type="date"
                value={purchaseForm.purchase_date}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Quantity"
                value={purchaseForm.quantity}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, quantity: e.target.value })
                }
              />

              <input
                placeholder="Warranty (in months)"
                value={purchaseForm.warranty}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, warranty: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Total Cost"
                value={purchaseForm.purchase_cost}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, purchase_cost: e.target.value })
                }
              />

              <div className="purchase-modal-actions">
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setEditingPurchase(null);
                  }}
                >
                  Close
                </button>

                <button className="primary-btn" onClick={handleSubmitPurchase}>
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showVendorModal || editingVendor) && (
        <div className="purchase-modal-overlay" onClick={() => {
          setShowVendorModal(false);
          setEditingVendor(null);
        }}>
          <div className="purchase-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="purchase-modal-header">
              <h2 className="purchase-modal-title">
                {editingVendor ? "Edit Vendor" : "Add Vendor"}
              </h2>
              <button
                className="purchase-modal-close"
                onClick={() => {
                  setShowVendorModal(false);
                  setEditingVendor(null);
                }}
              >
                <FiX />
              </button>
            </div>

            <div className="purchase-modal-body">
              <input
                placeholder="Vendor Name"
                value={vendorForm.vendor_name}
                onChange={(e) =>
                  setVendorForm({ ...vendorForm, vendor_name: e.target.value })
                }
              />

              <input
                placeholder="Contact Number"
                value={vendorForm.contact}
                onChange={(e) =>
                  setVendorForm({ ...vendorForm, contact: e.target.value })
                }
              />

              <input
                placeholder="GST Number"
                value={vendorForm.gst}
                onChange={(e) =>
                  setVendorForm({ ...vendorForm, gst: e.target.value })
                }
              />

              <div className="purchase-modal-actions">
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setShowVendorModal(false);
                    setEditingVendor(null);
                  }}
                >
                  Close
                </button>

                <button className="primary-btn" onClick={handleSubmitVendor}>
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default StoreManagerPurchases;
