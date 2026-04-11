import React, { useMemo, useEffect, useState, useCallback } from "react";
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import { getAuth } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import "./Offices.css";
import { HiOutlineOfficeBuilding } from "react-icons/hi";

function Offices() {
  const navigate = useNavigate();
  const location = useLocation();
  const [offices, setOffices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const contactRegex = /^\+?[\d\s-]{10}$/;

  const [form, setForm] = useState({
    office_id: "",
    office_name: "",
    department_id: "",
    address: "",
    office_email: "",
    office_contact: "",
    HOD: "",
  });

  const fetchOffices = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuth().currentUser.getIdToken();

      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (deptFilter) params.append("department", deptFilter);

      const res = await fetch(
        `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/offices?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      setOffices(data);
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter]);

  const fetchDepartments = async () => {
    const token = await getAuth().currentUser.getIdToken();
    const res = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/departments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setDepartments(data);
  };

  useEffect(() => {
    fetchDepartments();
    fetchOffices();
  }, [fetchOffices]);

  const openCreate = () => {
    setEditingOffice(null);
    setForm({
      office_id: "",
      office_name: "",
      department_id: "",
      address: "",
      office_email: "",
      office_contact: "",
      HOD: "",
    });
    setShowForm(true);
  };

  const openEdit = (office) => {
    setEditingOffice(office);
    setForm({ ...office });
    setShowForm(true);
  };

  const departmentMap = useMemo(() => {
    const map = {};
    departments.forEach(d => {
      if (d.department_id) {
        map[d.department_id] = d;
      }
    });
    return map;
  }, [departments]);

  const handleSubmit = async () => {
    try {

      if (!emailRegex.test(form.office_email)) {
        alert("Please enter a valid office email address");
        return;
      }

      if (!contactRegex.test(form.office_contact)) {
        alert("Please enter a valid 10-digit office contact number");
        return;
      }

      if (!form.department_id) {
        alert("Please select a department");
        return;
      }

      const token = await getAuth().currentUser.getIdToken();

      const url = editingOffice
        ? `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/offices/${editingOffice.id}`
        : `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/offices`;

      const method = editingOffice ? "PATCH" : "POST";

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      setShowForm(false);
      fetchOffices();
    } catch (err) {
      alert(err.message);
    }
  }

  const handleDelete = async (office) => {
    if (!window.confirm(`Delete office ${office.office_name}?`)) return;

    const token = await getAuth().currentUser.getIdToken();
    await fetch(
      `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/offices/${office.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    fetchOffices();
  };

  return (
    <div className="admin-offices-page">

      <div className="offices-header">
        <button className="back-btn mobile-back-btn" onClick={() => navigate("/admin/dashboard")}>
          ← Back
        </button>

        <h1 className="office-title"><HiOutlineOfficeBuilding /> Offices</h1>
      </div>

      <div className="admin-tabs">
        <button
          className={location.pathname.includes("departments") ? "active" : ""}
          onClick={() => navigate("/admin/departments")}
        >
          Departments
        </button>
        <button
          className={location.pathname.includes("offices") ? "active" : ""}
        >
          Offices
        </button>
      </div>

      {/* Controls */}
      <div className="office-controls">
        <input
          placeholder="Search offices…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.department_id}>
              {d.department_name}
            </option>
          ))}
        </select>

        <button className="primary-btn" onClick={openCreate}>
          <FiPlus /> Add Office
        </button>
      </div>

      {!loading && offices.length === 0 && (
        <div className="no-results">No offices found</div>
      )}

      {!loading && offices.length > 0 && (
        <div className="table-scroll">
          <table className="office-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Address</th>
                <th>Department</th>
                <th>HOD</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offices.map((o) => {
                const deptName = departmentMap[o.department_id]?.department_name || departmentMap[o.department_id]?.name || o.department_id || "-";

                return (
                  <tr key={o.id}>
                    <td>{o.office_id}</td>
                    <td>{o.office_name}</td>
                    <td>{o.address}</td>
                    <td>{deptName}</td>
                    <td>{o.HOD}</td>
                    <td>{o.office_email}</td>
                    <td>{o.office_contact}</td>
                    <td className="actions">
                      <button onClick={() => openEdit(o)}><FiEdit /></button>
                      <button className="danger" onClick={() => handleDelete(o)}>
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{editingOffice ? "Edit Office" : "Create Office"}</h3>

            <input
              placeholder="Office ID"
              value={form.office_id}
              disabled={!!editingOffice}
              onChange={(e) => setForm({ ...form, office_id: e.target.value })}
            />

            <input
              placeholder="Office Name"
              value={form.office_name}
              onChange={(e) => setForm({ ...form, office_name: e.target.value })}
            />

            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.department_id}>
                  {d.department_name}
                </option>
              ))}
            </select>

            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />

            <input
              placeholder="HOD"
              value={form.HOD}
              onChange={(e) => setForm({ ...form, HOD: e.target.value })}
            />

            <input
              type="email"
              placeholder="Office Email"
              value={form.office_email}
              onChange={(e) => setForm({ ...form, office_email: e.target.value })}
            />

            <input
              type="tel"
              placeholder="Office Contact"
              value={form.office_contact}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 10) {
                  setForm({ ...form, office_contact: e.target.value })
                }
              }}
            />

            < div className="modal-actions" >
              <button className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleSubmit}>Save</button>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}

export default Offices;
