import React, { useState, useEffect, useMemo } from "react";
import "./StoreManagerMaintenance.css";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "../components/Modal";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { getAuth } from "firebase/auth";

function StoreManagerMaintenance() {

  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const [activeTab, setActiveTab] = useState("maintenance");
  const [maintenance, setMaintenance] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({});
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
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

  const fetchData = async () => {
    setLoading(true); // 👈 1. Start loading

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.warn("User not authenticated yet");
        return;
      }

      const token = await user.getIdToken();

      const m = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/maintenance`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const w = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/maintenance/workers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const o = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/officers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMaintenance(await m.json());
      setWorkers(await w.json());
      if (o.ok) {
        setOfficers(await o.json());
      } else {
        console.error("Failed officers fetch");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false); // 👈 2. STOP LOADING (This was missing!)
    }
  };

  /* ================= PREFILL FIX (MAINTENANCE) ================= */
  useEffect(() => {
    if (loading || officers.length === 0 || showMaintenanceModal) return;

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

          setForm({
            officer_id: officerId,
            assignment_id: assignmentIdVal,
            asset_name: prefill.asset_name || "",
            maintenance_quantity: prefill.quantity || "",
            description: prefill.description ? `Approved Request: ${prefill.description}` : "",
            status: "UNDER_MAINTENANCE",
            request_id: prefill.request_id || "",
            serial_numbers: prefill.serial_numbers || [],
            no_serial_quantity: prefill.no_serial_quantity || 0
          });

          setShowMaintenanceModal(true);
          navigate(currentPath, { replace: true, state: null });
        });
      }
    }
  }, [prefill, currentPath, navigate, loading, officers.length, showMaintenanceModal]);

  const fetchAssignments = async (officer_id) => {

    const token = await getAuth().currentUser.getIdToken();

    const res = await fetch(
      `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/assignments/${officer_id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

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

  const handleSubmit = async (mode) => {
    const token = await getAuth().currentUser.getIdToken();

    // ================================
    // WORKER MODE
    // ================================
    if (mode === "worker") {
      if (!form.worker_name) {
        alert("Worker name is required");
        return;
      }

      const isEdit = form.worker_id;
      const url = isEdit
        ? `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/maintenance/workers/${form.worker_id}`
        : `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/maintenance/workers`;

      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.message || "Failed to save worker record.");
        return;
      }

      alert("Worker saved successfully ✅");
      setForm({});
      setShowWorkerModal(false);
      fetchData();
      return;
    }

    // ================================
    // MAINTENANCE MODE
    // ================================
    if (mode === "maintenance") {
      if (!form.assignment_id) return alert("Error: Missing Asset Assignment.");

      const qty = Number(form.maintenance_quantity || 0);
      const finalSerials = form.request_id ? (form.serial_numbers || []) : selectedSerials;
      const finalNoSerialQty = form.request_id ? (form.no_serial_quantity || 0) : Number(noSerialQty);
      const totalSelected = finalSerials.length + finalNoSerialQty;

      // Validate manual serial selection
      if (!form.request_id && selectedAssignment?.serial_numbers?.length > 0 && totalSelected !== qty) {
        return alert(`Total selected (${totalSelected}) must equal quantity (${qty})`);
      }

      let parsedAssignmentId = null;
      let parsedAssignmentIds = [];
      try {
        parsedAssignmentIds = JSON.parse(form.assignment_id);
        parsedAssignmentId = parsedAssignmentIds[0];
      } catch (e) {
        parsedAssignmentId = form.assignment_id;
        parsedAssignmentIds = [form.assignment_id];
      }

      // 🚨 Use THIS payload in your fetch request!
      const payload = {
        ...form,
        assignment_id: parsedAssignmentId,
        assignment_ids: parsedAssignmentIds,
        serial_numbers: finalSerials,
        no_serial_quantity: finalNoSerialQty
      };

      const isEdit = form.maintenance_id;
      const url = isEdit
        ? `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/maintenance/${form.maintenance_id}`
        : `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/maintenance`;

      const method = isEdit ? "PATCH" : "POST";

      const mainRes = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!mainRes.ok) {
        const errData = await mainRes.json();
        alert(errData.message || "Failed to save maintenance record.");
        return;
      }

      if (form?.request_id) {
        const reqRes = await fetch(
          `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/requests/${form.request_id}/approve`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (!reqRes.ok) {
          console.error("Failed to mark request as approved.");
        }
      }

      alert("Maintenance record processed successfully ✅");
      setForm({});
      setShowMaintenanceModal(false);
      fetchData();

      if (form?.request_id) {
        navigate("/store-manager/requests");
      }
    }
  };

  const deleteMaintenance = async (id) => {

    if (!window.confirm("Are you sure you want to delete this maintenance record?"))
      return;

    const token = await getAuth().currentUser.getIdToken();

    await fetch(
      `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/maintenance/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    fetchData();
  };

  const deleteWorker = async (id) => {

    if (!window.confirm("Are you sure you want to delete this worker?"))
      return;

    const token = await getAuth().currentUser.getIdToken();

    await fetch(
      `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/maintenance/workers/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    fetchData();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";

    let date;

    // 1. Check for Firestore Timestamp (both _seconds and seconds)
    if (timestamp.seconds || timestamp._seconds) {
      const s = timestamp.seconds || timestamp._seconds;
      date = new Date(s * 1000);
    }
    // 2. Handle standard Date strings or JS Date objects
    else {
      date = new Date(timestamp);
    }

    // Check if date is valid to avoid "Invalid Date" text
    if (isNaN(date.getTime())) return "—";

    // 3. Use Indian locale with specific date format (DD/MM/YYYY)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateForInput = (timestamp) => {
    if (!timestamp) return "";

    let d;
    if (timestamp.seconds || timestamp._seconds) {
      d = new Date((timestamp.seconds || timestamp._seconds) * 1000);
    } else {
      d = new Date(timestamp);
    }

    if (isNaN(d.getTime())) return "";

    // Manual formatting to YYYY-MM-DD to avoid Timezone shifting 1 day back
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (

    <div className="maintenance-wrapper">

      <div className="maintenance-header">
        <button className="back-btn" onClick={() => navigate("/store-manager/lifecycle")}>
          ← Back
        </button>
        <h1>Maintenance</h1>
      </div>

      <div className="maintenance-tabs">

        <button
          className={activeTab === "maintenance" ? "active" : ""}
          onClick={() => setActiveTab("maintenance")}
        >
          Maintenance
        </button>

        <button
          className={activeTab === "workers" ? "active" : ""}
          onClick={() => setActiveTab("workers")}
        >
          Workers
        </button>

      </div>

      {activeTab === "maintenance" && (

        <div className="maintenance-content">

          <div className="table-header">
            <h3>Maintenance Records</h3>

            <button
              className="primary-btn"
              onClick={() => { setForm({}); setShowMaintenanceModal(true); }}
            >
              + Add Maintenance
            </button>
          </div>

          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Asset</th>
                  <th>Officer</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Worker</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {maintenance.length === 0 ? (

                  <tr>
                    <td colSpan="9" className="empty-row">
                      No maintenance records found
                    </td>
                  </tr>

                ) : (

                  maintenance.map(m => (
                    <tr key={m.maintenance_id}>

                      <td>{m.maintenance_id}</td>
                      <td>{m.asset_name}</td>
                      <td>{m.officer_name}</td>
                      <td>{formatDate(m.maintenance_date)}</td>
                      <td>{m.description}</td>
                      <td>{m.worker_name}</td>
                      <td>{m.maintenance_cost}</td>
                      <td>
                        {m.status === "UNDER_MAINTENANCE" && (
                          <span className="status-badge maintenance">Under Maintenance</span>
                        )}

                        {m.status === "COMPLETED" && (
                          <span className="status-badge completed">Completed</span>
                        )}

                        {m.status === "FAILED" && (
                          <span className="status-badge failed">Failed</span>
                        )}
                      </td>

                      <td className="actions">

                        <FiEdit className="action-icon edit" onClick={async () => {
                          const dateForInput = formatDateForInput(m.maintenance_date);
                          let assignmentIdVal = m.assignment_id || "";

                          if (m.officer_id) {
                            const fetchedAssets = await fetchAssignments(m.officer_id);
                            const matchedAsset = fetchedAssets.find(a => a.assignment_id === assignmentIdVal);
                            if (matchedAsset) {
                              const groupIds = fetchedAssets.filter(a => a.asset_name === matchedAsset.asset_name).map(a => a.assignment_id);
                              assignmentIdVal = JSON.stringify(groupIds);
                              const allGroupSerials = fetchedAssets.filter(a => a.asset_name === matchedAsset.asset_name).flatMap(a => a.serial_numbers || []);
                              setSelectedAssignment({ serial_numbers: allGroupSerials });
                            }
                          }

                          setForm({
                            maintenance_id: m.maintenance_id,
                            officer_id: m.officer_id || "",
                            assignment_id: assignmentIdVal,
                            asset_name: m.asset_name || "", // 👈 Ensures dropdown shows name
                            maintenance_quantity: m.maintenance_quantity || 1,
                            maintenance_date: dateForInput,
                            description: m.description || "",
                            maintenance_cost: m.maintenance_cost || "",
                            worker_id: m.worker_id || "",
                            status: m.status || ""
                          });
                          setShowMaintenanceModal(true);
                        }} />

                        <FiTrash2
                          className="action-icon delete"
                          onClick={() => deleteMaintenance(m.maintenance_id)}
                        />

                      </td>

                    </tr>
                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>
      )}

      {activeTab === "workers" && (

        <div className="maintenance-content">

          <div className="table-header">
            <h3>Workers</h3>

            <button
              className="primary-btn"
              onClick={() => { setForm({}); setShowWorkerModal(true); }}
            >
              + Add Worker
            </button>

          </div>

          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Specialization</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {workers.length === 0 ? (

                  <tr>
                    <td colSpan="5" className="empty-row">
                      No workers found
                    </td>
                  </tr>

                ) : (
                  workers.map(w => (
                    <tr key={w.worker_id}>
                      <td>{w.worker_id}</td>
                      <td>{w.worker_name}</td>
                      <td>{w.contact}</td>
                      <td>{w.specialization}</td>
                      <td className="actions">

                        <FiEdit
                          className="action-icon edit"
                          onClick={() => {
                            setForm({
                              worker_id: w.worker_id,
                              worker_name: w.worker_name,
                              contact: w.contact,
                              specialization: w.specialization
                            });

                            setShowWorkerModal(true);
                          }}
                        />

                        <FiTrash2
                          className="action-icon delete"
                          onClick={() => deleteWorker(w.worker_id)}
                        />

                      </td>
                    </tr>
                  ))
                )}

              </tbody>

            </table>

          </div>

        </div>
      )}

      {showMaintenanceModal && (

        <Modal title={form.maintenance_id ? "Edit Maintenance Record" : "Add Maintenance Record"} onClose={() => setShowMaintenanceModal(false)}>

          <div className="modal-form">

            {/* OFFICER SELECTION */}
            {form.request_id ? (
              // Locked view for Request Approvals
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
              // Standard Dropdown for Manual Entries
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
              <select
                name="asset_name"
                value={form.asset_name || ""}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  const group = groupedAssignments.find(g => g.asset_name === selectedName);
                  if (group) {
                    setSelectedAssignment({ serial_numbers: group.serial_numbers });
                    setSelectedSerials([]);
                    setNoSerialQty(0);
                    setForm(prev => ({
                      ...prev,
                      asset_name: selectedName,
                      assignment_id: JSON.stringify(group.assignment_ids)
                    }));
                  } else {
                    setForm(prev => ({ ...prev, asset_name: "", assignment_id: "" }));
                    setSelectedAssignment(null);
                  }
                }}
              >
                <option value="">Select Asset</option>
                {groupedAssignments.map(a => (
                  <option key={a.asset_name} value={a.asset_name}>
                    {a.asset_name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="number"
              name="maintenance_quantity"
              placeholder="Quantity to send for maintenance"
              min="1"
              value={form.maintenance_quantity || ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                setForm(prev => ({ ...prev, maintenance_quantity: val }));
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
                      <span className={`serial-counter ${(selectedSerials.length + noSerialQty) === 0 ? "danger" : (selectedSerials.length + noSerialQty) === Number(form.maintenance_quantity) ? "success" : "warning"}`}>
                        Selected: {selectedSerials.length + noSerialQty} / {form.maintenance_quantity || 0}
                      </span>
                    </div>
                    <div className="serial-grid">
                      {selectedAssignment.serial_numbers.map((sn, index) => {
                        const isChecked = selectedSerials.includes(sn);
                        const totalSelected = selectedSerials.length + noSerialQty;
                        const isDisabled = !isChecked && totalSelected >= Number(form.maintenance_quantity);

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
                          max={Number(form.maintenance_quantity) - selectedSerials.length}
                          value={noSerialQty}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val + selectedSerials.length > Number(form.maintenance_quantity)) return;
                            setNoSerialQty(val);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <input name="maintenance_date" type="date" value={form.maintenance_date || ""} onChange={handleChange} />

            <textarea name="description" placeholder="Description" value={form.description || ""} onChange={handleChange} />

            <select
              name="worker_id"
              value={form.worker_id || ""}
              onChange={handleChange}
            >
              <option value="">Select Worker</option>
              {workers.map(w => (
                <option key={w.worker_id} value={w.worker_id}>
                  {w.worker_name} {w.specialization ? `(${w.specialization})` : ""}
                </option>
              ))}
            </select>

            <input name="maintenance_cost" type="number" placeholder="Cost" value={form.maintenance_cost || ""} onChange={handleChange} />

            <select name="status" value={form.status || ""} onChange={handleChange}>
              <option value="">Select Status</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>

            <button className="primary-btn full-width" onClick={() => handleSubmit("maintenance")}>
              Submit
            </button>

          </div>

        </Modal>
      )}

      {showWorkerModal && (

        <Modal title={form.worker_id ? "Edit Worker" : "Add Worker"} onClose={() => setShowWorkerModal(false)}>

          <div className="modal-form">

            <input name="worker_name" placeholder="Worker Name" value={form.worker_name || ""} onChange={handleChange} />
            <input name="contact" placeholder="Contact Number" value={form.contact || ""} onChange={handleChange} />
            <input name="specialization" placeholder="Specialization" value={form.specialization || ""} onChange={handleChange} />

            <button className="primary-btn full-width" onClick={() => handleSubmit("worker")}>
              Submit
            </button>

          </div>

        </Modal>

      )}

    </div>
  );
}

export default StoreManagerMaintenance;