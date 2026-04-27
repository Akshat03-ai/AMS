import React, { useState, useEffect, useMemo } from "react";
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
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedSerials, setSelectedSerials] = useState([]);
  const [noSerialQty, setNoSerialQty] = useState(0);

  // --- GROUP ASSIGNMENTS ---
  const groupedAssignments = useMemo(() => {
    return Object.values(
      assets.reduce((acc, a) => {
        const serials = Array.isArray(a.serial_numbers) ? a.serial_numbers : [];
        if (!acc[a.asset_name]) {
          acc[a.asset_name] = {
            ...a,
            assignment_ids: [a.assignment_id],
            serial_numbers: [...serials],
            quantity: a.quantity || 0,
            maintenance_quantity: a.maintenance_quantity || 0
          };
        } else {
          acc[a.asset_name].quantity += a.quantity || 0;
          acc[a.asset_name].maintenance_quantity += a.maintenance_quantity || 0;
          acc[a.asset_name].serial_numbers.push(...serials);
          acc[a.asset_name].assignment_ids.push(a.assignment_id);
        }
        return acc;
      }, {})
    );
  }, [assets]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchData();
  }, []);

  /* ================= PREFILL FIX (DISPOSAL) ================= */
  useEffect(() => {
    if (loading || officers.length === 0 || showDisposalModal) return;

    if (prefill) {
      const officerId = prefill.requested_by || prefill.officer_id || prefill.assigned_to;

      if (officerId) {
        fetchAssignments(officerId).then((fetchedAssets) => {
          let assignmentIdVal = prefill.assignment_id || "";
          let allGroupSerials = [];

          if (assignmentIdVal) {
            const matchedAsset = fetchedAssets.find(a => a.assignment_id === assignmentIdVal);
            if (matchedAsset) {
              const groupIds = fetchedAssets.filter(a => a.asset_name === matchedAsset.asset_name).map(a => a.assignment_id);
              assignmentIdVal = JSON.stringify(groupIds);
              allGroupSerials = fetchedAssets.filter(a => a.asset_name === matchedAsset.asset_name).flatMap(a => a.serial_numbers || []);
            }
          } else if (prefill.assignment_ids) {
            assignmentIdVal = JSON.stringify(prefill.assignment_ids);
            const matchedAsset = fetchedAssets.find(a => prefill.assignment_ids.includes(a.assignment_id));
            if (matchedAsset) {
              allGroupSerials = fetchedAssets.filter(a => a.asset_name === matchedAsset.asset_name).flatMap(a => a.serial_numbers || []);
            }
          }

          // 👈 Crucial: Tell the UI about the serials!
          setSelectedAssignment({ serial_numbers: allGroupSerials });

          setForm(prev => ({
            ...prev,
            officer_id: officerId,
            assignment_id: assignmentIdVal,
            asset_name: prefill.asset_name || "",
            quantity: prefill.quantity || "",
            remarks: prefill.disposal_reason || prefill.description || "",
            request_id: prefill.request_id || "",
            serial_numbers: prefill.serial_numbers || [],
            no_serial_quantity: prefill.no_serial_quantity || 0
          }));

          setShowDisposalModal(true);
          navigate(currentPath, { replace: true, state: null });
        });
      }
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
    return data;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if (name === "officer_id") {
      fetchAssignments(value);
      setSelectedAssignment(null);
      setSelectedSerials([]);
      setNoSerialQty(0);
      setForm(prev => ({ ...prev, assignment_id: "", quantity: "", maintenance_quantity: "", asset_name: "" }));
    }

    if (name === "assignment_id") {
      if (!value) {
        setSelectedAssignment(null);
        setSelectedSerials([]);
        setNoSerialQty(0);
        setForm(prev => ({ ...prev, assignment_id: "", asset_name: "" }));
        return;
      }
      try {
        const parsedIds = JSON.parse(value);
        const group = groupedAssignments.find(g => parsedIds.includes(g.assignment_ids[0]));
        if (group) {
          setSelectedAssignment({ serial_numbers: group.serial_numbers || [] });
          setSelectedSerials([]);
          setNoSerialQty(0);
          setForm(prev => ({ ...prev, assignment_id: value, asset_name: group.asset_name }));
        }
      } catch (err) {
        console.error("Parse error on assignment_id");
      }
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

    const qty = Number(form.quantity || 0);
    if (!qty || qty <= 0) return alert("Invalid quantity");

    let currentMaxAvailable = 1;
    try {
      if (form.assignment_id && !form.request_id) {
        const parsedIds = JSON.parse(form.assignment_id);
        const group = groupedAssignments.find(g => parsedIds.includes(g.assignment_ids[0]));
        if (group) {
          currentMaxAvailable = (group.quantity || 0) - (group.maintenance_quantity || 0);
        }
      } else if (form.request_id) {
        currentMaxAvailable = form.quantity;
      }
    } catch (e) { }

    if (!form.request_id && qty > currentMaxAvailable) {
      return alert(`Quantity exceeds available amount. Max allowed: ${currentMaxAvailable}`);
    }

    // Serial Validation
    const finalSerials = form.request_id ? (form.serial_numbers || []) : selectedSerials;
    const finalNoSerialQty = form.request_id ? (form.no_serial_quantity || 0) : Number(noSerialQty);
    const totalSelected = finalSerials.length + finalNoSerialQty;

    if (!form.request_id && selectedAssignment?.serial_numbers?.length > 0 && totalSelected !== qty) {
      return alert(`Total selected (${totalSelected}) must equal quantity (${qty})`);
    }

    const token = await getAuth().currentUser.getIdToken();
    const isEdit = form.disposal_id;
    const url = isEdit
      ? `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/disposals/${form.disposal_id}`
      : `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/disposals`;

    const method = isEdit ? "PATCH" : "POST";

    let parsedAssignmentId = null;
    let parsedAssignmentIds = [];
    try {
      parsedAssignmentIds = JSON.parse(form.assignment_id);
      parsedAssignmentId = parsedAssignmentIds[0];
    } catch (e) {
      parsedAssignmentId = form.assignment_id;
      parsedAssignmentIds = [form.assignment_id];
    }

    const payload = {
      ...form,
      assignment_id: parsedAssignmentId,
      assignment_ids: parsedAssignmentIds,
      serial_numbers: finalSerials,
      no_serial_quantity: finalNoSerialQty,
      disposal_reason: form.remarks
    };

    delete payload.remarks;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      return alert(err.message);
    }

    /* ================= REQUEST APPROVAL FIX ================= */
    if (form?.request_id) {
      await fetch(
        `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/requests/${form.request_id}/approve`,
        { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Request approved and disposal recorded! ✅");
      setShowDisposalModal(false);
      setForm({});
      fetchData();
      navigate("/store-manager/requests");
    } else {
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

  let maxAvailable = 1;
  try {
    if (form.assignment_id && !form.request_id) {
      const parsedIds = JSON.parse(form.assignment_id);
      const group = groupedAssignments.find(g => parsedIds.includes(g.assignment_ids[0]));
      if (group) {
        maxAvailable = (group.quantity || 0) - (group.maintenance_quantity || 0);
      }
    } else if (form.request_id) {
      maxAvailable = form.quantity;
    }
  } catch (e) { }

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

                        <FiEdit className="action-icon edit" onClick={async () => {
                          const formattedDate = formatDateForInput(d.disposal_date);
                          let assignmentIdVal = d.assignment_id || "";

                          if (d.officer_id) {
                            const fetchedAssets = await fetchAssignments(d.officer_id);
                            const matchedAsset = fetchedAssets.find(a => a.assignment_id === assignmentIdVal);
                            if (matchedAsset) {
                              const groupIds = fetchedAssets.filter(a => a.asset_name === matchedAsset.asset_name).map(a => a.assignment_id);
                              assignmentIdVal = JSON.stringify(groupIds);

                              // Load the serials into the UI
                              const allGroupSerials = fetchedAssets.filter(a => a.asset_name === matchedAsset.asset_name).flatMap(a => a.serial_numbers || []);
                              setSelectedAssignment({ serial_numbers: allGroupSerials });
                            }
                          }
                          setForm({
                            disposal_id: d.disposal_id,
                            officer_id: d.officer_id,
                            assignment_id: assignmentIdVal,
                            asset_name: d.asset_name || "", // 👈 Crucial for dropdown
                            disposal_method: d.disposal_method,
                            disposal_date: formattedDate,
                            disposal_value: d.disposal_value,
                            remarks: d.remarks,
                            status: d.status,
                            quantity: d.quantity
                          });
                          setShowDisposalModal(true);
                        }} />

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

            {/* ASSET SELECTION */}
            {form.request_id ? (
              <>
                <input type="text" readOnly className="disabled-input" value={form.asset_name || "Loading Asset..."} />
                <input type="hidden" name="assignment_id" value={form.assignment_id} />
              </>
            ) : (
              <select name="assignment_id" value={form.assignment_id || ""} onChange={handleChange}>
                <option value="">Select Asset</option>
                {groupedAssignments.map(a => <option key={a.asset_name} value={JSON.stringify(a.assignment_ids)}>{a.asset_name}</option>)}
              </select>
            )}

            <input
              type="number"
              name="quantity"
              placeholder={`Quantity (Max: ${form.request_id ? form.quantity : maxAvailable})`}
              min="1"
              max={form.request_id ? form.quantity : maxAvailable}
              value={form.quantity || ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                setForm(prev => ({ ...prev, quantity: val }));
                setSelectedSerials(prev => prev.slice(0, val));
                setNoSerialQty(0);
              }}
              disabled={!form.assignment_id || form.request_id}
            />

            {/* SERIAL NUMBER UI */}
            {form.request_id ? (
              <div className="serial-empty-state">
                <span className="serial-empty-icon">🔒</span>
                <div className="serial-empty-text">
                  <p className="serial-empty-title">Pre-selected by Request</p>
                  <p className="serial-empty-desc">
                    Serials: {form.serial_numbers?.length ? form.serial_numbers.join(", ") : "None"} <br />
                    Bulk Qty: {form.no_serial_quantity || 0}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {(!selectedAssignment?.serial_numbers || selectedAssignment.serial_numbers.length === 0) && form.assignment_id && (
                  <div className="serial-empty-state">
                    <span className="serial-empty-icon">ℹ️</span>
                    <div className="serial-empty-text">
                      <p className="serial-empty-title">No Serial Numbers</p>
                      <p className="serial-empty-desc">This asset does not require individual serial tracking.</p>
                    </div>
                  </div>
                )}

                {Array.isArray(selectedAssignment?.serial_numbers) && selectedAssignment.serial_numbers.length > 0 && (
                  <div className="serial-wrapper">
                    <div className="serial-header">
                      <h4>Select Serial Numbers</h4>
                      <span className={`serial-counter ${(selectedSerials.length + noSerialQty) === 0 ? "danger" : (selectedSerials.length + noSerialQty) === Number(form.quantity) ? "success" : "warning"}`}>
                        Selected: {selectedSerials.length + noSerialQty} / {form.quantity || 0}
                      </span>
                    </div>
                    <div className="serial-grid">
                      {selectedAssignment.serial_numbers.map((sn, index) => {
                        const isChecked = selectedSerials.includes(sn);
                        const totalSelected = selectedSerials.length + noSerialQty;
                        const isDisabled = !isChecked && totalSelected >= Number(form.quantity);

                        return (
                          <div key={index} className={`serial-card ${isChecked ? "selected" : ""} ${isDisabled ? "disabled" : ""}`} onClick={() => {
                            if (isDisabled) return;
                            if (isChecked) {
                              setSelectedSerials(prev => prev.filter(s => s !== sn));
                            } else {
                              setSelectedSerials(prev => [...prev, sn]);
                            }
                          }}>
                            <input type="checkbox" checked={isChecked} readOnly />
                            <span className="serial-text">{sn}</span>
                          </div>
                        );
                      })}
                      <div className="no-serial-input">
                        <label>No Serial Quantity</label>
                        <input
                          type="number"
                          min="0"
                          max={Number(form.quantity) - selectedSerials.length}
                          value={noSerialQty}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val + selectedSerials.length > Number(form.quantity)) return;
                            setNoSerialQty(val);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

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