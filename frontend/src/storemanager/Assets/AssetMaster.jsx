import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./AssetMaster.css";
import { FiBox } from "react-icons/fi";

function AssetMaster() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const location = useLocation();
  const prefill = location.state?.prefill;
  const [editingAsset, setEditingAsset] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [previewAsset, setPreviewAsset] = useState(null);
  const [requestPrefill, setRequestPrefill] = useState(null);

  const [form, setForm] = useState({
    id: "",
    asset_name: "",
    asset_category: "",
    asset_company: "",
    asset_description: "",
    asset_photo_url: "",
  });

  /* ===============================
     FETCH ASSET MASTER
     =============================== */
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const token = await getAuth().currentUser.getIdToken();

        const res = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/assets`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setAssets(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch asset master", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  const filteredAssets = assets
    .filter(a =>
      a && a.asset_name && a.asset_id &&
      (a.asset_name.toLowerCase().includes(search.toLowerCase()) ||
        a.asset_id.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.asset_name.localeCompare(b.asset_name);
      if (sortBy === "category") return a.asset_category.localeCompare(b.asset_category);
      return 0;
    });

  /* ===============================
     HANDLERS
     =============================== */

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }

    try {
      setUploading(true);
      setSelectedFileName(file.name);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "Asset_Management_System");

      const cloudRes = await axios.post(
        "https://api.cloudinary.com/v1_1/dfygr2bme/image/upload",
        formData
      );

      const imageUrl = cloudRes.data.secure_url;
      setForm({ ...form, asset_photo_url: imageUrl });
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      alert("Failed to upload image");
      setSelectedFileName("");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleAddAsset = () => {
    setEditingAsset(null);
    setForm({
      id: "",
      asset_id: "",
      asset_name: "",
      asset_category: "",
      asset_company: "",
      asset_description: "",
      asset_photo_url: "",
    });
    setShowModal(true);
  };

  useEffect(() => {
    if (prefill) {
      setRequestPrefill(prefill);
      setForm({
        asset_name: prefill.asset_name || "",
        asset_category: prefill.asset_category || "",
        asset_company: prefill.company || "",
      });

      setShowModal(true);

      // remove state so it doesn't repeat on refresh
      navigate("/store-manager/assets/master", { replace: true });
    }
  }, [prefill, navigate]);

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setForm(asset);
    setShowModal(true);
  };

  const handleDeleteAsset = async (assetId, assetDocId) => {
    if (!window.confirm("Are you sure you want to delete this asset?")) {
      return;
    }

    try {
      const token = await getAuth().currentUser.getIdToken();

      const res = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/assets/${assetDocId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete asset");
      }

      setAssets((prev) => prev.filter((a) => a.asset_id !== assetId));
    } catch (err) {
      alert(err.message || "Failed to delete asset");
    }
  };

  let generatedAssetId = "";

  const handleSubmit = async () => {
    if (!form.asset_name || !form.asset_category) {
      alert("Asset Name and Category are required");
      return;
    }

    if (!editingAsset) {
      const duplicate = assets.find(
        (a) =>
          a.asset_name.trim().toLowerCase() ===
          form.asset_name.trim().toLowerCase() &&
          (a.asset_company || "").trim().toLowerCase() ===
          (form.asset_company || "").trim().toLowerCase()
      );

      if (duplicate) {
        alert("Asset with this name and company already exists.");
        return;
      }
    }

    try {
      const token = await getAuth().currentUser.getIdToken();

      if (editingAsset) {
        // Update existing asset
        const res = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/assets/${editingAsset.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Response status:", res.status, "Body:", text);
          throw new Error(`Failed to update asset (${res.status})`);
        }

        setAssets((prev) =>
          prev.map((a) =>
            a.id === editingAsset.id
              ? { ...a, ...form }
              : a
          )
        );
      } else {
        // Create new asset
        const res = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/assets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Response status:", res.status, "Body:", text);
          throw new Error(`Failed to create asset (${res.status})`);
        }

        const data = await res.json();

        generatedAssetId =
          data?.asset?.asset_id ||
          data?.asset_id ||
          data?.asset?.id ||
          "";

        if (!generatedAssetId) {
          alert("Asset created but ID missing from backend");
          return;
        }

        setAssets((prev) => [...prev, data.asset]);
      }

      // AFTER asset created successfully

      if (requestPrefill?.request_id) {

        const goToPurchase = window.confirm(
          "Asset created successfully ✅\n\nDo you want to continue to Purchase entry?"
        );

        if (goToPurchase) {
          navigate("/store-manager/lifecycle/purchases", {
            state: {
              prefill: {
                asset_id: generatedAssetId,
                quantity: requestPrefill.quantity,
                request_id: requestPrefill.request_id,
                requested_by: requestPrefill.requested_by,
              },
            },
          });
        }
      }

      setShowModal(false);
      setEditingAsset(null);
      setForm({
        id: "",
        asset_id: "",
        asset_name: "",
        asset_category: "",
        asset_company: "",
        asset_description: "",
        asset_photo_url: "",
      });
    } catch (err) {
      alert(err.message || "Failed to save asset");
    }
  };

  /* ===============================
     RENDER
     =============================== */

  return (
    <div className="sm-asset-master-page">

      {/* HEADER */}
      <div className="sm-assets-header">
        <button className="back-btn" onClick={() => navigate("/store-manager/dashboard")}>
          ← Back
        </button>
        <h1><FiBox />Assets</h1>
      </div>

      {/* TABS */}
      <div className="sm-assets-tabs">
        <button onClick={() => navigate("/store-manager/assets")}>
          Inventory
        </button>
        <button className="active">Asset Master</button>
      </div>

      {/* CONTROLS */}
      <div className="sm-assets-controls">

        <input
          className="sm-search"
          placeholder="Search by Asset ID or Name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="sm-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="">Sort By</option>
          <option value="name">Name (A–Z)</option>
          <option value="category">Category</option>
        </select>

        <button className="primary-btn" onClick={handleAddAsset}>
          + Add Asset
        </button>

      </div>

      {/* CONTENT */}
      {loading && <p>Loading assets…</p>}

      {!loading && assets.length === 0 && (
        <div className="empty-state">
          No assets defined yet. Add your first asset.
        </div>
      )}

      {!loading && assets.length > 0 && (
        <table className="sm-assets-table">
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Name</th>
              <th>Photo</th>
              <th>Category</th>
              <th>Company</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map((a) => (
              <tr key={a.asset_id}>
                <td>{a.asset_id}</td>
                <td className="highlight">{a.asset_name}</td>
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
                <td>{a.asset_company || "-"}</td>
                <td>{a.asset_description || "-"}</td>
                <td>
                  <button
                    className="action-btn edit-btn"
                    onClick={() => handleEditAsset(a)}
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteAsset(a.asset_id, a.id)}
                    title="Delete"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{editingAsset ? "Edit Asset" : "Add Asset"}</h3>

            <input
              name="asset_name"
              placeholder="Asset Name"
              value={form.asset_name}
              onChange={handleChange}
            />

            <div className="image-upload-section">
              {!form.asset_photo_url ? (
                <label className="image-upload-label">
                  {uploading ? "Uploading..." : "Upload Asset Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              ) : (
                <div className="image-selected">
                  <span>✓ {selectedFileName}</span>
                  <div className="image-actions">
                    <label className="change-image-btn">
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => {
                        setForm({ ...form, asset_photo_url: "" });
                        setSelectedFileName("");
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <input
              name="asset_category"
              placeholder="Category"
              value={form.asset_category}
              onChange={handleChange}
            />

            <input
              name="asset_company"
              placeholder="Company"
              value={form.asset_company}
              onChange={handleChange}
            />

            <textarea
              name="asset_description"
              placeholder="Description"
              rows={3}
              value={form.asset_description}
              onChange={handleChange}
            />

            <div className="modal-actions">
              <button
                className="secondary-bttn"
                onClick={() => {
                  setShowModal(false);
                  setEditingAsset(null);
                }}
              >
                Cancel
              </button>
              <button className="primary-bttn" onClick={handleSubmit}>
                {editingAsset ? "Update Asset" : "Save Asset"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    </div>
  );
}

export default AssetMaster;