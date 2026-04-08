import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "../components/Modal";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { getAuth } from "firebase/auth";
import "./StoreManagerDisposals.css";

function StoreManagerDisposal() {

  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const [disposals, setDisposals] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({});
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const currentPath = location.pathname;
  
  // ✅ 1. Added loading state to fix "undefined" crash
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchData();
  }, []);

  /* ================= PREFILL FIX ================= */
  useEffect(() => {
    // ✅ 2. Wait for loading to finish so officers array isn't empty
    if (loading || officers.length === 0 || showDisposalModal) return;

    if (prefill) {

      const officerId =
        prefill.requested_by || prefill.officer_id || prefill.assigned_to;

      setForm(prev => ({
        ...prev,
        officer_id: officerId,
        assignment_id: prefill.assignment_id,
        quantity: prefill.quantity || "",
        remarks: prefill.disposal_reason || prefill.description || "",
        request_id: prefill.request_id || "" // ✅ important fix
      }));

      if (officerId) {
        fetchAssignments(officerId);
      }

      setShowDisposalModal(true);

      navigate(currentPath, { replace: true, state: null });
    }
  }, [prefill, currentPath, navigate, loading, officers.length, showDisposalModal]);

  const fetchData = async () => {
    setLoading(true); // Start loading
    try {
      const user = getAuth().currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const d = await fetch(
        `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/disposals`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const o = await fetch(
        `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/officers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (d.ok) setDisposals(await d.json());
      if (o.ok) setOfficers(await o.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false); // End loading
    }
  };

  const fetchAssignments = async (officer_id) => {

    const token = await getAuth().currentUser.getIdToken();

    const res = await fetch(
      `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/assignments/${officer_id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.json();
      alert(err.message);
      return;
    }

    const data = await res.json();
    setAssets(data);
  };

  const handleChange = (e) => {

    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === "officer_id") {
      fetchAssignments(value);
    }
  };

  // ✅ 3. Added Date Formatter to fix Date Edit Crash
  const formatDateForInput = (timestamp) => {
    if (!timestamp) return "";
    let d;
    if (timestamp.seconds || timestamp._seconds) {
      d = new Date((timestamp.seconds || timestamp._seconds) * 1000);
    } else {
      d = new Date(timestamp);
    }
    if (isNaN(d.getTime())) return "";
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {

    if (!form.assignment_id) return alert("Select asset");
    if (!form.disposal_method) return alert("Select disposal method");
    if (!form.quantity || form.quantity <= 0) return alert("Invalid quantity");

    /* ================= HARD VALIDATION FIX ================= */
    const selectedAsset = assets.find(
      a => a.assignment_id === form.assignment_id
    );

    // Calculate true max available (Quantity minus Maintenance)
    const maxAvailable = (selectedAsset?.quantity || 0) - (selectedAsset?.maintenance_quantity || 0);

    if (form.quantity > maxAvailable) {
      return alert(`Quantity exceeds available amount. Max allowed: ${maxAvailable}`);
    }

    const token = await getAuth().currentUser.getIdToken();

    const isEdit = form.disposal_id;

    const url = isEdit
      ? `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/disposals/${form.disposal_id}`
      : `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/disposals`;

    const method = isEdit ? "PATCH" : "POST";

    const payload = {
      ...form,
      disposal_reason: form.remarks
    };

    delete payload.remarks;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.message);
      return;
    }

    /* ================= REQUEST APPROVAL FIX ================= */
    if (form?.request_id) {
      await fetch(
        `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/requests/${form.request_id}/approve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // ✅ Only redirect if it's processing a request
      alert("Request approved and disposal recorded! ✅");
      setShowDisposalModal(false);
      setForm({});
      fetchData();
      navigate("/store-manager/requests");
      
    } else {
      // ✅ Manual entry stays on this page
      alert("Disposal recorded successfully! ✅");
      setShowDisposalModal(false);
      setForm({});
      fetchData();
    }
  };

  const deleteDisposal = async (id) => {

    if (!window.confirm("Are you sure you want to delete this disposal record?"))
      return;

    const token = await getAuth().currentUser.getIdToken();

    await fetch(
      `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/disposals/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    fetchData();
  };

  const selectedAsset = assets.find(
    a => a.assignment_id === form.assignment_id
  );
  
  const maxAvailable = (selectedAsset?.quantity || 0) - (selectedAsset?.maintenance_quantity || 0);

  return (
    <div className="disposal-wrapper">

      <div className="disposal-header">
        <button className="back-btn" onClick={() => navigate("/store-manager/lifecycle")}>
          ← Back
        </button>
        <h1>Disposals</h1>
      </div>

      <div className="disposal-content">

        <div className="table-header">
          <h3>Disposal Records</h3>

          <button
            className="primary-btn"
            onClick={() => {
              setForm({});
              setShowDisposalModal(true);
            }}
          >
            + Add Disposal
          </button>
        </div>

        <div className="table-container">

          <table>

            <thead>
              <tr>
                <th>ID</th>
                <th>Asset</th>
                <th>Officer</th>
                <th>Quantity</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>Value</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {disposals.length === 0 ? (

                <tr>
                  <td colSpan="9" className="empty-row">
                    No disposal records found
                  </td>
                </tr>

              ) : (

                disposals.map(d => {

                  const date = d.disposal_date
                    ? new Date(d.disposal_date).toLocaleDateString("en-IN")
                    : "-";

                  return (
                    <tr key={d.disposal_id}>
                      <td>{d.disposal_id}</td>
                      <td>{d.asset_name}</td>
                      <td>{d.officer_name}</td>
                      <td>{d.quantity}</td>
                      <td>{d.disposal_method}</td>
                      <td>

                        {d.status === "PENDING" && (
                          <span className="status-badge pending">
                            Pending
                          </span>
                        )}

                        {d.status === "SOLD" && (
                          <span className="status-badge completed">
                            Sold
                          </span>
                        )}

                        {d.status === "SCRAPPED" && (
                          <span className="status-badge failed">
                            Scrapped
                          </span>
                        )}

                        {d.status === "TRANSFERRED" && (
                          <span className="status-badge active">
                            Transferred
                          </span>
                        )}

                        {d.status === "WRITTEN_OFF" && (
                          <span className="status-badge returned">
                            Written Off
                          </span>
                        )}

                      </td>

                      <td>{date}</td>

                      <td>{d.disposal_value || "-"}</td>

                      <td className="actions">

                        <FiEdit
                          className="action-icon edit"
                          onClick={() => {

                            const formattedDate = formatDateForInput(d.disposal_date);

                            setForm({
                              disposal_id: d.disposal_id,
                              officer_id: d.officer_id,
                              assignment_id: d.assignment_id,
                              disposal_method: d.disposal_method,
                              disposal_date: formattedDate,
                              disposal_value: d.disposal_value,
                              remarks: d.remarks,
                              status: d.status,
                              quantity: d.quantity
                            });

                            if (d.officer_id) fetchAssignments(d.officer_id);

                            setShowDisposalModal(true);
                          }}
                        />

                        <FiTrash2
                          className="action-icon delete"
                          onClick={() => deleteDisposal(d.disposal_id)}
                        />

                      </td>
                    </tr>
                  );

                })

              )}

            </tbody>

          </table>

        </div>

      </div>

      {showDisposalModal && (

        <Modal
          title={form.disposal_id ? "Edit Disposal Record" : "Add Disposal Record"}
          onClose={() => setShowDisposalModal(false)}
        >

          <div className="modal-formm">

            {form.request_id ? (
              <>
                <input
                  type="text"
                  readOnly
                  className="disabled-input"
                  value={officers.find(o => o.user_id === form.officer_id)?.name || form.officer_id || "Loading Officer..."}
                />
                <input type="hidden" name="officer_id" value={form.officer_id} />
              </>
            ) : (
              <select
                name="officer_id"
                value={form.officer_id || ""}
                onChange={handleChange}
              >
                <option value="">Select Officer</option>

                {officers.map(o => (
                  <option key={o.user_id} value={o.user_id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}

            {form.request_id ? (
              <>
                <input
                  type="text"
                  readOnly
                  className="disabled-input"
                  value={assets.find(a => a.assignment_id === form.assignment_id)?.asset_name || form.assignment_id || "Loading Asset..."}
                />
                <input type="hidden" name="assignment_id" value={form.assignment_id} />
              </>
            ) : (
              <select
                name="assignment_id"
                value={form.assignment_id || ""}
                onChange={handleChange}
              >
                <option value="">Select Asset</option>

                {assets.map(a => (
                  <option key={a.assignment_id} value={a.assignment_id}>
                    {a.asset_name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="number"
              name="quantity"
              placeholder={`Quantity (Max: ${maxAvailable || 1})`}
              max={maxAvailable || 1}
              value={form.quantity || ""}
              onChange={handleChange}
            />

            <select
              name="disposal_method"
              value={form.disposal_method || ""}
              onChange={handleChange}
            >
              <option value="">Select Disposal Method</option>
              <option value="SCRAP">Scrap</option>
              <option value="AUCTION">Auction</option>
              <option value="TRANSFER">Transfer</option>
              <option value="WRITE_OFF">Write Off</option>
            </select>

            <input
              type="date"
              name="disposal_date"
              value={form.disposal_date || ""}
              onChange={handleChange}
            />

            <input
              type="number"
              name="disposal_value"
              placeholder="Disposal Value"
              value={form.disposal_value || ""}
              onChange={handleChange}
            />

            <textarea
              name="remarks"
              placeholder="Remarks"
              rows="3"
              value={form.remarks || ""}
              onChange={handleChange}
            />

            <select
              name="status"
              value={form.status || "PENDING"}
              onChange={handleChange}
            >
              <option value="PENDING">Pending</option>
              <option value="SCRAPPED">Scrapped</option>
              <option value="SOLD">Sold</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="WRITTEN_OFF">Written Off</option>
            </select>

            <button
              className="primary-btn full-width"
              onClick={handleSubmit}
            >
              Submit
            </button>

          </div>

        </Modal>

      )}

    </div>
  );
}

export default StoreManagerDisposal;