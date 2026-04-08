import React, { useState, useEffect } from "react";
import { IoCloseOutline } from "react-icons/io5";
import { getAuth } from "firebase/auth";
import "./EditUserModal.css";

function EditUserModal({ user, onClose, onUpdated }) {
  const [form, setForm] = useState({ ...user });
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [offices, setOffices] = useState([]);
  const contactRegex = /^[6-9]\d{9}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    const fetchMeta = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const [deptRes, officeRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/offices`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setDepartments(await deptRes.json());
      setOffices(await officeRes.json());
    };

    fetchMeta();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      if (!contactRegex.test(form.contact)) {
        alert("Please enter a valid 10-digit contact number");
        setLoading(false);
        return;
      }

      if (!emailRegex.test(form.email)) {
        alert("Please enter a valid email address.");
        setLoading(false);
        return;
      }

      const payload = {
        name: form.name,
        contact: form.contact,
        designation: form.designation,
        role: form.role,
        department_id: form.department_id,
        office_id: form.office_id,
        room_id: form.room_id,
      };

      const res = await fetch(
        `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/users/${user.uid}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Update failed");
      }

      const data = await res.json();
      alert(data.message);

      onUpdated();
      onClose();

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Edit User</h3>
          <button className="close-button" onClick={onClose}><IoCloseOutline size={20} /></button>
        </div>

        <div className="modal-body">
          <input name="name" value={form.name} onChange={handleChange} />
          <input name="contact" value={form.contact} onChange={handleChange} />
          <input name="designation" value={form.designation} onChange={handleChange} />

          <select name="role" value={form.role} onChange={handleChange}>
            <option value="officer">Officer</option>
            <option value="store manager">Store Manager</option>
          </select>

          <div>
            <select
              name="department_id"
              value={form.department_id}
              onChange={(e) =>
                setForm({ ...form, department_id: e.target.value, office_id: "" })
              }
              required
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.department_id}>
                  {d.department_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              name="office_id"
              value={form.office_id}
              onChange={handleChange}
              required
              disabled={!form.department_id}
            >
              <option value="">Select Office</option>
              {offices
                .filter((o) => o.department_id === form.department_id)
                .map((o) => (
                  <option key={o.id} value={o.office_id}>
                    {o.office_name}
                  </option>
                ))}
            </select>
          </div>

          <input name="room_id" value={form.room_id} onChange={handleChange} />
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditUserModal;