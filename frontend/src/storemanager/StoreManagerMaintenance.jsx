import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    // Wait for the main data to finish loading
    if (loading || officers.length === 0 || showMaintenanceModal) return;

    if (prefill) {
      const officerId = prefill.requested_by || prefill.officer_id || prefill.assigned_to;

      if (officerId) {
        fetchAssignments(officerId).then(() => {
          setForm({
            officer_id: officerId,
            assignment_id: prefill.assignment_id || "",
            asset_name: prefill.asset_name || "", // 👈 ADD THIS LINE
            maintenance_quantity: prefill.quantity || "",
            description: prefill.description ? `Approved Request: ${prefill.description}` : "",
            status: "UNDER_MAINTENANCE",
            request_id: prefill.request_id || "",
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

    setAssets(await res.json());
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(prev => ({ ...prev, [name]: value }));

    if (name === "officer_id") {
      fetchAssignments(value);
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
      if (!form.assignment_id) {
        alert("Error: Missing Asset Assignment. Please select an asset.");
        return;
      }

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
        body: JSON.stringify(form)
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

                        <FiEdit
                          className="action-icon edit"
                          onClick={async () => {
                            const dateForInput = formatDateForInput(m.maintenance_date);

                            if (m.officer_id) {
                              await fetchAssignments(m.officer_id);
                            }

                            setForm({
                              maintenance_id: m.maintenance_id,
                              officer_id: m.officer_id || "",
                              assignment_id: m.assignment_id || "",
                              maintenance_quantity: m.maintenance_quantity || 1,
                              maintenance_date: dateForInput,
                              description: m.description || "",
                              maintenance_cost: m.maintenance_cost || "",
                              worker_id: m.worker_id || "",
                              status: m.status || ""
                            });

                            setShowMaintenanceModal(true);
                          }}
                        />

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
              // Locked view for Request Approvals
              <>
                <input
                  type="text"
                  readOnly
                  className="disabled-input"
                  // 👈 UPDATE THIS VALUE PROP
                  value={form.asset_name || assets.find(a => a.assignment_id === form.assignment_id)?.asset_name || form.assignment_id || "Loading Asset..."}
                />
                <input type="hidden" name="assignment_id" value={form.assignment_id} />
              </>
            ) : (
              // Standard Dropdown for Manual Entries
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
              name="maintenance_quantity"
              placeholder="Quantity to send for maintenance"
              min="1"
              value={form.maintenance_quantity || ""}
              onChange={handleChange}
            />

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