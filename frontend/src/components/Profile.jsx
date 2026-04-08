import React, { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../firebase";
import {
  FiShield,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase,
  FiHome,
  FiAlertCircle
} from "react-icons/fi";
import "./Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orgDetails, setOrgDetails] = useState(null);
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional safety check
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "Asset_Management_System");

      // ⬆️ Upload to Cloudinary
      const cloudRes = await axios.post(
        "https://api.cloudinary.com/v1_1/dfygr2bme/image/upload",
        formData
      );

      const imageUrl = cloudRes.data.secure_url;

      // 🔐 Save URL to your backend / Firestore
      const currentUser = auth.currentUser;
      const token = await currentUser.getIdToken();

      await axios.put(
        `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/me/photo`,
        { photoURL: imageUrl },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // ♻️ Update UI instantly
      setUser((prev) => ({ ...prev, photoURL: imageUrl }));
      window.dispatchEvent(
        new CustomEvent("profilePhotoUpdated", {
          detail: imageUrl,
        })
      );
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      alert("Failed to upload image");
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const currentUser = auth.currentUser;
      const token = await currentUser.getIdToken();

      await axios.delete(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/me/photo`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      window.dispatchEvent(
        new CustomEvent("profilePhotoUpdated", {
          detail: null,
        })
      );
      // Update UI instantly
      setUser((prev) => ({ ...prev, photoURL: null }));
    } catch (err) {
      console.error("Failed to remove photo:", err);
      alert("Failed to remove photo");
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }

        const token = await currentUser.getIdToken();

        const res = await axios.get(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(res.data);

        const orgRes = await axios.get(
          `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/me/org-details`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setOrgDetails(orgRes.data);
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /* =====================
     STATES
     ===================== */

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading profile…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-error">
        <FiAlertCircle size={48} />
        <p>{error}</p>
      </div>
    );
  }

  /* =====================
     MAIN PROFILE
     ===================== */

  return (
    <div className="profile-container">

      {/* Header */}
      <header className="profile-header">

        {/* LEFT: Avatar */}
        <div className="avatar-wrapper">
          <div className="avatar-circle">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" />
            ) : (
              user.name?.charAt(0).toUpperCase()
            )}
          </div>

          <label className="avatar-upload">
            Change photo
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handlePhotoUpload}
            />
          </label>
          {user.photoURL && (
            <button
              className="avatar-remove"
              onClick={handleRemovePhoto}
            >
              Remove photo
            </button>
          )}
        </div>

        {/* CENTER: Name + Role */}
        <div className="profile-title">
          <h1>{user.name}</h1>
          <span className="role-chip">{user.role}</span>
        </div>
      </header>

      {/* Personal Details */}
      <section>
        <h3 className="section-label">Personal Details</h3>

        <div className="info-grid personal-grid">

          <div className="info-card">
            <FiBriefcase />
            <div>
              <label>User ID</label>
              <p>{user.user_id}</p>
            </div>
          </div>

          <div className="info-card">
            <FiShield />
            <div>
              <label>Designation</label>
              <p>{user.designation}</p>
            </div>
          </div>

          <div className="info-card">
            <FiMail />
            <div>
              <label>Email</label>
              <p>{user.email}</p>
            </div>
          </div>

          <div className="info-card">
            <FiPhone />
            <div>
              <label>Contact</label>
              <p>{user.contact || "—"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Organizational Details */}
      <section>
        <h3 className="section-label">Department Details</h3>

        <div className="info-grid org-grid">

          <div className="info-card">
            <FiBriefcase />
            <div>
              <label>Department ID</label>
              <p>{user.department_id || "—"}</p>
            </div>
          </div>

          <div className="info-card">
            <FiBriefcase />
            <div>
              <label>Department Name</label>
              <p>
                {orgDetails?.department
                  ? orgDetails.department.department_name
                  : "—"}
              </p>
            </div>
          </div>

          <div className="info-card">
            <FiShield />
            <div>
              <label>Department Type</label>
              <p>
                {orgDetails?.department
                  ? orgDetails.department.department_type
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <h3 className="section-label">Office Details</h3>
        <div className="info-grid office-grid">

          <div className="info-card">
            <FiBriefcase />
            <div>
              <label>Office ID</label>
              <p>{user.office_id || "—"}</p>
            </div>
          </div>

          <div className="info-card">
            <FiHome />
            <div>
              <label>Office Name</label>
              <p>
                {orgDetails?.office
                  ? orgDetails.office.office_name
                  : "—"}
              </p>
            </div>
          </div>

          <div className="info-card">
            <FiShield />
            <div>
              <label>HOD</label>
              <p>{orgDetails.office.HOD || "—"}</p>
            </div>
          </div>

          {user.room_id && (
            <div className="info-card">
              <FiMapPin />
              <div>
                <label>Room</label>
                <p>{user.room_id}</p>
              </div>
            </div>
          )}

        {orgDetails?.office && (
          <>
            <div className="info-card">
              <FiMapPin />
              <div>
                <label>Office Address</label>
                <p>{orgDetails.office.address || "—"}</p>
              </div>
            </div>

            <div className="info-card office-email-card">
              <FiMail />
              <div>
                <label>Office Email</label>
                <p>{orgDetails.office.office_email || "—"}</p>
              </div>
            </div>

            <div className="info-card">
              <FiPhone />
              <div>
                <label>Office Contact</label>
                <p>{orgDetails.office.office_contact || "—"}</p>
              </div>
            </div>
          </>
        )}
    </div>
      </section >

    {/* Role-specific section */ }
  {
    user.role === "store manager" && (
      <section>
        <h3 className="section-label">Manager Privileges</h3>
        <p className="role-note">
          You can create users, manage assets, approve requests, and control lifecycle operations.
        </p>
      </section>
    )
  }

  {
    user.role === "admin" && (
      <section>
        <h3 className="section-label">Administrator Access</h3>
        <p className="role-note">
          You have full system access, including configuration and audits.
        </p>
      </section>
    )
  }

  {
    user.role !== "admin" && (
      <p className="edit-note">
        To Request changes to your personal details, please contanct the admin at {" "}
        <a href="mailto:akshatd200317@gmail.com">akshatd200317@gmail.com</a>.
      </p>
    )
  }

  {
    user.role === "admin" && (
      <p className="edit-note">
        To change your personal details, please visit User Management page by clicking {" "}
        <a href="./admin/users" >Here</a>.
      </p>
    )
  }
    </div >
  );
}

export default Profile;