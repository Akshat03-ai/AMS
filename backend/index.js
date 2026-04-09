require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { admin, db } = require("./firebase");
const authenticate = require("./middlewares/authMiddleware");
const authorizeRole = require("./middlewares/roleMiddleware");
const { sendAccountEmail } = require("./utils/mailer");
const { generateAuditId, generateAssetId } = require("./utils/idGenerator");

const app = express();
app.use(cors());
app.use(express.json());

// =====================
// TEST ROUTE
// =====================
app.get("/", (req, res) => {
  res.send("AMS Backend Running");
});

// =====================
// 🔐 WHO AM I
// =====================
app.get("/api/me", authenticate, async (req, res) => {
  try {
    let departmentName = null;
    let officeName = null;

    // Fetch Department
    if (req.user.department_id) {
      const deptSnap = await db
        .collection("departments")
        .where("department_id", "==", req.user.department_id)
        .limit(1)
        .get();

      if (!deptSnap.empty) {
        departmentName = deptSnap.docs[0].data().department_name;
      }
    }

    // Fetch Office
    if (req.user.office_id) {
      const officeSnap = await db
        .collection("offices")
        .where("office_id", "==", req.user.office_id)
        .limit(1)
        .get();

      if (!officeSnap.empty) {
        officeName = officeSnap.docs[0].data().office_name;
      }
    }

    res.status(200).json({
      ...req.user,
      department_name: departmentName,
      office_name: officeName,
    });

  } catch (err) {
    console.error("ME route error:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});

// =====================
// 📋 META: DEPARTMENTS (Universal Access)
// =====================
app.get(
  "/api/meta/departments",
  authenticate,
  authorizeRole(["admin", "store manager"]), // ✅ Both allowed
  async (req, res) => {
    try {
      const snapshot = await db.collection("departments").get();
      const departments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.json(departments);
    } catch (err) {
      console.error("Dept Fetch Error:", err);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// =====================
// 📋 META: OFFICES (Universal Access)
// =====================
app.get(
  "/api/meta/offices",
  authenticate,
  authorizeRole(["admin", "store manager"]), // ✅ Both allowed
  async (req, res) => {
    try {
      let query = db.collection("offices");

      // 🔹 If Store Manager, only show THEIR office
      if (req.user.role === "store manager") {
        if (!req.user.office_id) return res.json([]);
        query = query.where("office_id", "==", req.user.office_id);
      }

      const snapshot = await query.get();
      const offices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.json(offices);
    } catch (err) {
      console.error("Office Fetch Error:", err);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// =====================
// 👤 CREATE USER
// =====================
app.post(
  "/api/users/create",
  authenticate,
  authorizeRole(["admin", "store manager"]),
  async (req, res) => {
    try {
      const {
        user_id,
        name,
        contact,
        email,
        password,
        designation,
        role,
        department_id,
        office_id,
        room_id,
        remarks,
      } = req.body;

      // -----------------
      // VALIDATION
      // -----------------
      if (
        !user_id ||
        !name ||
        !contact ||
        !email ||
        !password ||
        !designation ||
        !department_id ||
        !office_id ||
        !room_id
      ) {
        return res.status(400).json({
          message: "All required fields must be provided",
        });
      }

      let assignedRole;

      if (req.user.role === "admin") {
        // Admin can choose role
        if (!role || !["officer", "store manager"].includes(role)) {
          return res.status(400).json({
            message: "Invalid role provided",
          });
        }
        assignedRole = role;
      }
      else if (req.user.role === "store manager") {
        // Store Manager is FORCE-LIMITED
        assignedRole = "officer";
      }
      else {
        return res.status(403).json({
          message: "Unauthorized to create users",
        });
      }

      // -----------------
      // UNIQUE BUSINESS ID CHECK
      // -----------------
      const existing = await db
        .collection("Users")
        .where("user_id", "==", user_id)
        .limit(1)
        .get();

      if (!existing.empty) {
        return res.status(409).json({
          message: "User ID already exists",
        });
      }

      // -----------------
      // CREATE AUTH USER
      // -----------------
      const userRecord = await admin.auth().createUser({
        email,
        password,
      });

      const uid = userRecord.uid;
      // -----------------
      // GENERATE RESET LINK
      // -----------------
      const resetLink = await admin
        .auth()
        .generatePasswordResetLink(email);

      // -----------------
      // CREATE USERS DOCUMENT
      // -----------------
      await db.collection("Users").doc(uid).set({
        user_id,
        name,
        contact,
        email,
        designation,
        role: assignedRole,
        department_id,
        office_id,
        room_id,
      });

      // -----------------
      // SEND EMAIL
      // -----------------
      try {
        await sendAccountEmail({
          to: email,
          name,
          tempPassword: password,
          resetLink,
        });
      } catch (mailErr) {
        console.error("EMAIL SEND FAILED:", mailErr);

        // Rollback auth user
        await admin.auth().deleteUser(uid);

        // Rollback Firestore
        await db.collection("Users").doc(uid).delete();

        return res.status(500).json({
          message: "User creation failed while sending email",
        });
      }

      // -----------------
      // AUDIT LOG
      // -----------------
      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "USER_CREATED",
        reference_id: user_id,
        asset_id: null,
        previous_location: null,
        new_location: null,
        timestamp: new Date(),
        remarks:
          remarks?.trim() ||
          `User created by ${req.user.role} ${req.user.name}`,
      });

      res.status(201).json({
        message: "User created successfully",
        uid,
        user_id,
      });

    } catch (err) {
      console.error("CREATE USER ERROR:", err);

      if (err.code === "auth/email-already-exists") {
        return res.status(409).json({ message: "Email already exists" });
      }

      res.status(500).json({
        message: "Failed to create user",
      });
    }
  }
);

// =====================
// 👥 ADMIN: VIEW USERS
// =====================
// GET /api/admin/users
app.get(
  "/api/admin/users",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const snapshot = await db.collection("Users").get();

      const userMap = {};
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.user_id) {
          userMap[data.user_id] = data.name;
        }
      });

      const users = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const uid = docSnap.id;

          let disabled = false;
          try {
            const authUser = await admin.auth().getUser(uid);
            disabled = authUser.disabled;
          } catch (authErr) {
            console.warn(`Unable to fetch auth status for user ${uid}:`, authErr.message);
          }

          return {
            uid,
            ...data,
            disabled,
            officer_name: userMap[data.officer_id] || "Unknown",
          };
        })
      );

      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  }
);

// =====================
// 👥 ADMIN: DISABLE USER
// =====================
app.patch(
  "/api/admin/users/:uid/disable",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    const { uid } = req.params;

    // 🔹 fetch user document to get user_id
    const snap = await db.collection("Users").doc(uid).get();
    if (!snap.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const { user_id } = snap.data();

    await admin.auth().updateUser(uid, { disabled: true });

    await db.collection("audit_logs").add({
      log_id: generateAuditId(),
      action_type: "USER_DISABLED",
      reference_id: user_id,
      asset_id: null,
      previous_location: null,
      new_location: null,
      timestamp: new Date(),
      remarks: `User disabled by ${req.user.role} ${req.user.name}`,
    });

    res.json({ message: "User disabled successfully" });
  }
);

// =====================
// 👥 ADMIN: Enable User
// =====================
app.patch(
  "/api/admin/users/:uid/enable",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    const { uid } = req.params;

    const snap = await db.collection("Users").doc(uid).get();
    if (!snap.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const { user_id } = snap.data();

    await admin.auth().updateUser(uid, { disabled: false });

    await db.collection("audit_logs").add({
      log_id: generateAuditId(),
      action_type: "USER_ENABLED",
      reference_id: user_id,
      asset_id: null,
      previous_location: null,
      new_location: null,
      timestamp: new Date(),
      remarks: `User enabled by ${req.user.role} ${req.user.name}`,
    });

    res.json({ message: "User enabled successfully" });
  }
);

// =====================
// ADMIN: Edit Users 
// =====================
app.patch(
  "/api/admin/users/:uid",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { uid } = req.params;
      const updates = req.body;

      delete updates.user_id;
      delete updates.uid;

      const userRef = db.collection("Users").doc(uid);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        return res.status(404).json({ message: "User not found" });
      }

      const existingUser = userSnap.data();
      const { user_id } = existingUser;

      // 🔍 Detect changes
      const changes = [];

      for (const key of Object.keys(updates)) {
        const oldVal =
          existingUser[key] !== undefined
            ? String(existingUser[key]).trim()
            : "";

        const newVal =
          updates[key] !== undefined
            ? String(updates[key]).trim()
            : "";

        if (oldVal !== newVal) {
          changes.push(
            `${key} changed from "${oldVal}" to "${newVal}"`
          );
        }
      }

      await userRef.update({ ...updates });

      const auditremarks =
        changes.length > 0
          ? changes.join(", ")
          : "User details updated";

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "USER_UPDATED",
        reference_id: user_id,
        asset_id: null,
        previous_location: null,
        new_location: null,
        timestamp: new Date(),
        remarks: `Updated by ${req.user.role} ${req.user.name}: ${auditremarks}`,
      });

      res.status(200).json({ message: "User updated successfully" });
    } catch (err) {
      console.error("UPDATE USER ERROR:", err);
      res.status(500).json({ message: "Failed to update user" });
    }
  }
);

// REMOVE PROFILE PHOTO
app.delete("/api/me/photo", authenticate, async (req, res) => {
  try {
    const uid = req.user.uid;

    await db
      .collection("Users")
      .doc(uid)
      .update({ photoURL: null });

    res.json({ message: "Profile photo removed" });
  } catch (err) {
    console.error("Remove photo error:", err);
    res.status(500).json({ message: "Failed to remove photo" });
  }
});

// UPDATE PROFILE PHOTO
app.put("/api/me/photo", authenticate, async (req, res) => {
  try {
    const { photoURL } = req.body;
    const uid = req.user.uid;

    if (!photoURL) {
      return res.status(400).json({ message: "photoURL required" });
    }

    await db
      .collection("Users")
      .doc(uid)
      .update({ photoURL });

    res.json({ message: "Profile photo updated", photoURL });
  } catch (err) {
    console.error("Photo update error:", err);
    res.status(500).json({ message: "Failed to update profile photo" });
  }
});

// =====================
// 👥 ADMIN: CREATE DEPARTMENT
// =====================
app.post(
  "/api/admin/departments",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { department_id, department_name, department_type } = req.body;

      if (!department_id || !department_name || !department_type) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check duplicate department_id
      const existing = await db
        .collection("departments")
        .where("department_id", "==", department_id)
        .limit(1)
        .get();

      if (!existing.empty) {
        return res.status(409).json({ message: "Department ID already exists" });
      }

      await db.collection("departments").add({
        department_id,
        department_name,
        department_type,
        created_at: new Date(),
      });

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "DEPARTMENT_CREATED",
        reference_id: department_id,
        asset_id: null,
        previous_location: null,
        new_location: null,
        timestamp: new Date(),
        remarks: `Department created by ${req.user.role} ${req.user.name}`,
      });

      res.status(201).json({ message: "Department created successfully" });
    } catch (err) {
      console.error("CREATE DEPARTMENT ERROR:", err);
      res.status(500).json({ message: "Failed to create department" });
    }
  }
);

// =====================
// 👥 ADMIN: VIEW DEPARTMENTS
// =====================
app.get(
  "/api/admin/departments",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { search } = req.query;

      let snapshot = await db.collection("departments").get();

      let departments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (search) {
        const q = search.toLowerCase();
        departments = departments.filter(d =>
          d.department_name.toLowerCase().includes(q) ||
          d.department_type.toLowerCase().includes(q) ||
          d.department_id.toLowerCase().includes(q)
        );
      }

      res.json(departments);
    } catch (err) {
      console.error("GET DEPARTMENTS ERROR:", err);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  }
);

// =====================
// 👥 ADMIN: EDIT DEPARTMENT
// =====================
app.patch(
  "/api/admin/departments/:id",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      delete updates.department_id; // immutable

      const ref = db.collection("departments").doc(id);
      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({ message: "Department not found" });
      }

      const oldData = snap.data();
      const { user_id } = oldData;

      const changes = [];

      for (const key of Object.keys(updates)) {
        const oldVal =
          oldData[key] !== undefined
            ? String(oldData[key]).trim()
            : "";

        const newVal =
          updates[key] !== undefined
            ? String(updates[key]).trim()
            : "";

        if (oldVal !== newVal) {
          changes.push(
            `${key} changed from "${oldVal}" to "${newVal}"`
          );
        }
      }

      await ref.update({ ...updates });

      const auditremarks =
        changes.length > 0
          ? changes.join(", ")
          : "User details updated";

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "DEPARTMENT_UPDATED",
        reference_id: oldData.department_id,
        asset_id: null,
        previous_location: null,
        new_location: null,
        timestamp: new Date(),
        remarks: `Department updated by ${req.user.role} ${req.user.name}: ${auditremarks}`,
      });

      res.json({ message: "Department updated successfully" });
    } catch (err) {
      console.error("UPDATE DEPARTMENT ERROR:", err);
      res.status(500).json({ message: "Failed to update department" });
    }
  }
);

// =====================
// 👥 ADMIN: DELETE DEPARTMENT
// =====================
app.delete(
  "/api/admin/departments/:id",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const ref = db.collection("departments").doc(id);
      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({ message: "Department not found" });
      }

      const { department_id } = snap.data();

      // ❗ Check if offices exist
      const officeSnap = await db
        .collection("offices")
        .where("department_id", "==", department_id)
        .limit(1)
        .get();

      if (!officeSnap.empty) {
        return res.status(400).json({
          message: "Cannot delete department with existing offices",
        });
      }

      await ref.delete();

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "DEPARTMENT_DELETED",
        reference_id: department_id,
        asset_id: null,
        previous_location: null,
        new_location: null,
        timestamp: new Date(),
        remarks: `Department deleted by ${req.user.role} ${req.user.name}`,
      });

      res.json({ message: "Department deleted successfully" });
    } catch (err) {
      console.error("DELETE DEPARTMENT ERROR:", err);
      res.status(500).json({ message: "Failed to delete department" });
    }
  }
);

// =====================
// 👥 ADMIN: Create Office
// =====================
app.post(
  "/api/admin/offices",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const {
        office_id,
        office_name,
        department_id,
        address,
        HOD,
        office_email,
        office_contact,
      } = req.body;

      if (!office_id || !office_name || !department_id) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      // Check duplicate office_id
      const existing = await db
        .collection("offices")
        .where("office_id", "==", office_id)
        .limit(1)
        .get();

      if (!existing.empty) {
        return res.status(409).json({ message: "Office ID already exists" });
      }

      // Check department exists
      const deptSnap = await db
        .collection("departments")
        .where("department_id", "==", department_id)
        .limit(1)
        .get();

      if (deptSnap.empty) {
        return res.status(400).json({ message: "Invalid department" });
      }

      await db.collection("offices").add({
        office_id,
        office_name,
        department_id,
        address: address || "",
        HOD: HOD || "",
        office_email: office_email || "",
        office_contact: office_contact || "",
        created_at: new Date(),
      });

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "OFFICE_CREATED",
        reference_id: office_id,
        asset_id: null,
        previous_location: null,
        new_location: null,
        timestamp: new Date(),
        remarks: `Office created by ${req.user.role} ${req.user.name}`,
      });

      res.status(201).json({ message: "Office created successfully" });
    } catch (err) {
      console.error("CREATE OFFICE ERROR:", err);
      res.status(500).json({ message: "Failed to create office" });
    }
  }
);

// =====================
// 👥 ADMIN: View Offices
// =====================
app.get(
  "/api/admin/offices",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { search, department } = req.query;

      let snapshot = await db.collection("offices").get();

      let offices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔍 Search
      if (search) {
        const q = search.toLowerCase();
        offices = offices.filter(o =>
          o.office_name.toLowerCase().includes(q) ||
          o.office_id.toLowerCase().includes(q)
        );
      }

      // 🏢 Filter by department
      if (department) {
        offices = offices.filter(
          o => o.department_id === department
        );
      }

      res.json(offices);
    } catch (err) {
      console.error("GET OFFICES ERROR:", err);
      res.status(500).json({ message: "Failed to fetch offices" });
    }
  }
);

// =====================
// 👥 ADMIN: Delete Office
// =====================
app.delete(
  "/api/admin/offices/:id",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const officeRef = db.collection("offices").doc(id);
      const snap = await officeRef.get();

      if (!snap.exists) {
        return res.status(404).json({ message: "Office not found" });
      }

      const { office_id } = snap.data();

      // ❗ Check USERS
      const userSnap = await db
        .collection("Users")
        .where("office_id", "==", office_id)
        .limit(1)
        .get();

      if (!userSnap.empty) {
        return res.status(400).json({
          message: "Cannot delete office with assigned users",
        });
      }

      // ❗ Check ASSETS
      const assetSnap = await db
        .collection("assets")
        .where("office_id", "==", office_id)
        .limit(1)
        .get();

      if (!assetSnap.empty) {
        return res.status(400).json({
          message: "Cannot delete office with assigned assets",
        });
      }

      await officeRef.delete();

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "OFFICE_DELETED",
        reference_id: office_id,
        asset_id: null,
        previous_location: null,
        new_location: null,
        timestamp: new Date(),
        remarks: `Office deleted by ${req.user.role} ${req.user.name}`,
      });

      res.json({ message: "Office deleted successfully" });
    } catch (err) {
      console.error("DELETE OFFICE ERROR:", err);
      res.status(500).json({ message: "Failed to delete office" });
    }
  }
);

// =====================
// 👥 ADMIN: Update Office
// =====================
app.patch(
  "/api/admin/offices/:id",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      delete updates.office_id; // immutable

      const officeRef = db.collection("offices").doc(id);
      const snap = await officeRef.get();

      if (!snap.exists) {
        return res.status(404).json({ message: "Office not found" });
      }

      const existingOffice = snap.data();
      const { office_id } = existingOffice;

      // 🔍 CHANGE DIFF
      const changes = [];
      for (const key of Object.keys(updates)) {
        const oldVal =
          existingOffice[key] !== undefined
            ? String(existingOffice[key]).trim()
            : "";

        const newVal =
          updates[key] !== undefined
            ? String(updates[key]).trim()
            : "";

        if (oldVal !== newVal) {
          changes.push(
            `${key} changed from "${oldVal}" to "${newVal}"`
          );
        }
      }

      await officeRef.update({ ...updates });

      const auditRemarks =
        changes.length > 0
          ? changes.join(", ")
          : "Office update requested, no field values changed";

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "OFFICE_UPDATED",
        reference_id: office_id,
        asset_id: null,
        previous_location: null,
        new_location: null,
        timestamp: new Date(),
        remarks: `Office Updated by ${req.user.role} ${req.user.name}: ${auditRemarks}`,
      });

      res.json({ message: "Office updated successfully" });
    } catch (err) {
      console.error("UPDATE OFFICE ERROR:", err);
      res.status(500).json({ message: "Failed to update office" });
    }
  }
);

// =====================
// 👥 ADMIN: Fetch Audit
// =====================
app.get(
  "/api/admin/audit-logs",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { action, search } = req.query;

      let snapshot = await db
        .collection("audit_logs")
        .orderBy("timestamp", "desc")
        .get();

      let logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔍 Filter by action type
      if (action) {
        logs = logs.filter(l => l.action_type === action);
      }

      // 🔎 Search reference or remarks
      if (search) {
        const q = search.toLowerCase();
        logs = logs.filter(l =>
          (l.reference_id || "").toLowerCase().includes(q) ||
          (l.remarks || "").toLowerCase().includes(q)
        );
      }

      res.json(logs);
    } catch (err) {
      console.error("FETCH AUDIT LOGS ERROR:", err);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  }
);

// ================================
// ADMIN DASHBOARD STATS
// ================================
app.get(
  "/api/admin/stats",
  authenticate,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const usersSnap = await db.collection("Users").get();
      const departmentsSnap = await db.collection("departments").get();
      const officesSnap = await db.collection("offices").get();

      res.json({
        totalUsers: usersSnap.size,
        totalDepartments: departmentsSnap.size,
        totalOffices: officesSnap.size,
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to load admin stats" });
    }
  }
);

// ================================
// PUBLIC: Landing Page Stats (no auth)
// ================================
app.get(
  "/api/public/stats",
  async (req, res) => {
    try {
      const departmentsSnap = await db.collection("departments").get();

      // SUM INVENTORY QUANTITIES
      const inventorySnap = await db.collection("inventory").get();
      let inventoryAssets = 0;
      inventorySnap.forEach(doc => {
        inventoryAssets += Number(doc.data().quantity || 0);
      });

      // SUM ASSIGNED (active assignments)
      const assignmentSnap = await db.collection("asset_assignments").where("returned_date", "==", null).get();
      let assignedAssets = 0;
      assignmentSnap.forEach(doc => {
        assignedAssets += Number(doc.data().quantity || 0);
      });

      const totalAssets = inventoryAssets + assignedAssets;

      // SUM PURCHASE VALUE (total purchase_cost across purchases)
      const purchaseSnap = await db.collection("purchases").get();
      let totalValue = 0;
      purchaseSnap.forEach(doc => {
        totalValue += Number(doc.data().purchase_cost || 0);
      });

      res.json({
        totalAssets,
        totalDepartments: departmentsSnap.size,
        totalValue,
      });
    } catch (err) {
      console.error("Public stats error:", err);
      res.status(500).json({ message: "Failed to fetch public stats" });
    }
  }
);

// =====================
// 📊 STORE MANAGER DASHBOARD STATS
// =====================
app.get(
  "/api/store-manager/stats",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const officeId = req.user.office_id;

      // 🔹 INVENTORY (available assets in storage)
      const inventorySnap = await db
        .collection("inventory")
        .where("office_id", "==", officeId)
        .get();

      let inventoryAssets = 0;
      inventorySnap.forEach(doc => {
        inventoryAssets += Number(doc.data().quantity || 0);
      });

      // 🔹 ASSIGNED ASSETS (active assignments not yet returned)
      const assignmentSnap = await db
        .collection("asset_assignments")
        .where("office_id", "==", officeId)
        .where("returned_date", "==", null)
        .get();

      let assignedAssets = 0;
      assignmentSnap.forEach(doc => {
        assignedAssets += Number(doc.data().quantity || 0);
      });

      // 🔹 TOTAL ASSETS = inventory + assigned
      const totalAssets = inventoryAssets + assignedAssets;

      // 🔹 PURCHASES
      const purchaseSnap = await db
        .collection("purchases")
        .where("office_id", "==", officeId)
        .get();

      let totalValue = 0;
      purchaseSnap.forEach(doc => {
        totalValue += Number(doc.data().purchase_cost || 0);
      });

      // 🔹 PENDING REQUESTS (NEW: Counting them on the backend)
      const pendingRequestsSnap = await db
        .collection("Requests")
        .where("office_id", "==", officeId)
        .where("status", "==", "PENDING")
        .get();

      const pendingRequests = pendingRequestsSnap.size;

      // ✅ Send it all back
      res.json({
        totalAssets,
        inventoryAssets,
        assignedAssets,
        totalValue,
        pendingRequests
      });

    } catch (err) {
      console.error("Stats error:", err);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  }
);

//================
//Store Manager Audit Log
//================
app.get(
  "/api/store-manager/audit-logs",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const { search } = req.query;

      const officeId = req.user.office_id;

      /* =========================
         USERS IN THIS OFFICE
         ========================= */

      const usersSnap = await db
        .collection("Users")
        .where("office_id", "==", officeId)
        .get();

      const officeUserIds = usersSnap.docs.map(
        d => d.data().user_id
      );

      /* =========================
         FETCH AUDIT LOGS
         ========================= */

      const logsSnap = await db
        .collection("audit_logs")
        .orderBy("timestamp", "desc")
        .limit(500)
        .get();

      let logs = logsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      /* =========================
         VISIBILITY FILTER
         ========================= */

      logs = logs.filter(log => {
        const ref = log.reference_id;
        const logAction = log.action_type || "";
        const logOffice = log.office_id;

        if (!ref) return false;

        // ✅ User-level logs (office staff activities)
        if (officeUserIds.includes(ref)) return true;

        // ✅ Office-level logs
        if (ref === officeId) return true;

        // ✅ logs for this office
        if (logAction.startsWith("ASSET_") && logOffice === officeId) return true;
        if (logAction.startsWith("INVENTORY_") && logOffice === officeId) return true;
        if (logAction.startsWith("VENDOR_") && logOffice === officeId) return true;
        if (logAction.startsWith("PURCHASE_") && logOffice === officeId) return true;
        if (logAction.startsWith("REQUEST_") && logOffice === officeId) return true;
        if (logAction.startsWith("MAINTENANCE_") && logOffice === officeId) return true;
        if (logAction.startsWith("ASSIGNMENT_") && logOffice === officeId) return true;
        if (logAction.startsWith("WORKER_") && logOffice === officeId) return true;
        if (logAction.startsWith("DISPOSAL_") && logOffice === officeId) return true;


        return false;
      });

      /* =========================
         SEARCH
         ========================= */

      if (search) {
        const q = search.toLowerCase();
        logs = logs.filter(l =>
          l.action_type?.toLowerCase().includes(q) ||
          l.remarks?.toLowerCase().includes(q) ||
          l.reference_id?.toLowerCase().includes(q)
        );
      }

      res.json(logs);

    } catch (err) {
      console.error("Store Manager audit error:", err);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  }
);

// =====================
// 📦 VIEW ASSET MASTER
// =====================
app.get(
  "/api/assets",
  authenticate,
  authorizeRole(["admin", "store manager", "officer"]),
  async (req, res) => {
    try {
      const snapshot = await db.collection("assets").get();

      const assets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json(assets);
    } catch (err) {
      console.error("View assets failed:", err);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  }
);

// =====================
// ➕ CREATE ASSET
// =====================
app.post(
  "/api/assets",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const {
        asset_name,
        asset_category,
        asset_company,
        asset_description,
        asset_photo_url,
      } = req.body;

      if (!asset_name || !asset_category) {
        return res.status(400).json({ message: "Name and Category required" });
      }

      // 🔒 DUPLICATE CHECK (BY NAME + COMPANY, CASE-INSENSITIVE)
      const existingSnap = await db
        .collection("assets")
        .where("asset_name", "==", asset_name.trim())
        .where("asset_company", "==", (asset_company || "").trim())
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        return res.status(409).json({
          message: "Asset with this name and company already exists",
        });
      }

      // 🔑 AUTO GENERATE ASSET ID (SHORTER FORMAT)
      const asset_id = generateAssetId();

      const docRef = await db.collection("assets").add({
        asset_id,
        asset_name,
        asset_category,
        asset_company: asset_company || "",
        asset_description: asset_description || "",
        asset_photo_url: asset_photo_url || "",
        created_at: new Date(),
      });

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "ASSET_CREATED",
        reference_id: asset_id,
        asset_id,
        user_name: req.user.name,
        user_role: req.user.role,
        office_id: req.user.office_id,
        uid: req.user.uid,
        remarks: `Asset created: ${asset_id} (${asset_name}) by ${req.user.name} (${req.user.role})`,
        timestamp: new Date(),
      });

      res.json({
        message: "Asset created successfully",
        asset: {
          id: docRef.id,
          asset_id,
          asset_name,
          asset_category,
          asset_company: asset_company || "",
          asset_description: asset_description || "",
          asset_photo_url: asset_photo_url || "",
          created_at: new Date(),
        }
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to create asset" });
    }
  }
);

// =====================
// ✏️ UPDATE ASSET
// =====================
app.patch(
  "/api/assets/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const ref = db.collection("assets").doc(req.params.id);
      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({ message: "Asset not found" });
      }

      // Exclude 'id' field from update payload (it's the Firestore doc ID, not a field)
      const updateData = { ...req.body };
      delete updateData.id;

      const oldData = snap.data();

      // Compute which fields changed
      const changedKeys = Object.keys(updateData).filter((k) => {
        const oldVal = oldData.hasOwnProperty(k) ? oldData[k] : undefined;
        const newVal = updateData[k];
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
      });

      await ref.update(updateData);

      // Build audit details (only include keys that changed)
      const old_values = {};
      const new_values = {};
      changedKeys.forEach((k) => {
        old_values[k] = oldData.hasOwnProperty(k) ? oldData[k] : null;
        new_values[k] = updateData[k];
      });

      const remarks =
        changedKeys.length === 0
          ? `Asset touched: ${oldData.asset_id} by ${req.user.name} (${req.user.role})`
          : `Asset ${oldData.asset_id} updated: ${changedKeys
            .map((k) => `${k} (${String(old_values[k])} → ${String(new_values[k])})`)
            .join(", ")} by ${req.user.name} (${req.user.role})`;

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "ASSET_UPDATED",
        reference_id: oldData.asset_id,
        asset_id: oldData.asset_id,
        changed_fields: changedKeys,
        old_values,
        new_values,
        user_name: req.user.name,
        user_role: req.user.role,
        office_id: req.user.office_id,
        uid: req.user.uid,
        remarks,
        timestamp: new Date(),
      });

      res.json({ message: "Asset updated successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to update asset" });
    }
  }
);

// =====================
// 🗑️ DELETE ASSET
// =====================
app.delete(
  "/api/assets/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const ref = db.collection("assets").doc(req.params.id);
      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const assetId = snap.data().asset_id;

      // 🔒 CHECK IF INVENTORY EXISTS FOR THIS ASSET
      const inventorySnap = await db
        .collection("inventory")
        .where("asset_id", "==", assetId)
        .limit(1)
        .get();

      if (!inventorySnap.empty) {
        return res.status(409).json({
          message: "Cannot delete asset. Inventory items exist for this asset.",
        });
      }

      await ref.delete();

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "ASSET_DELETED",
        reference_id: assetId,
        asset_id: assetId,
        user_name: req.user.name,
        user_role: req.user.role,
        office_id: req.user.office_id,
        uid: req.user.uid,
        remarks: `Asset deleted: ${assetId} by ${req.user.name} (${req.user.role})`,
        timestamp: new Date(),
      });

      res.json({ message: "Asset deleted successfully" });
    } catch (err) {
      console.error("Delete asset failed:", err);
      res.status(500).json({ message: "Failed to delete asset" });
    }
  }
);

// =====================
// 📦 VIEW INVENTORY
// =====================
app.get(
  "/api/store-manager/inventory",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const snapshot = await db
        .collection("inventory")
        .where("office_id", "==", req.user.office_id)
        .get();

      const inventory = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json(inventory);
    } catch (err) {
      console.error("View inventory failed:", err);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  }
);

// =====================
// ➕ ADD / MERGE INVENTORY (WITH inventory_id)
// =====================
app.post(
  "/api/store-manager/inventory",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const { asset_id, quantity, status, condition } = req.body;

      if (!asset_id || !quantity) {
        return res.status(400).json({ message: "Asset and quantity required" });
      }

      // Generate inventory_id
      const inventory_id = `INV-${req.user.office_id}-${Date.now()}`;

      // Check for same asset + same status + same condition in same office (merge rule)
      const existingSnap = await db
        .collection("inventory")
        .where("asset_id", "==", asset_id)
        .where("office_id", "==", req.user.office_id)
        .where("status", "==", status)
        .where("condition", "==", condition)
        .limit(1)
        .get();

      // MERGE: only when asset + office + status + condition all match
      if (!existingSnap.empty) {
        const doc = existingSnap.docs[0];
        const prevQty = Number(doc.data().quantity) || 0;

        await doc.ref.update({
          quantity: prevQty + Number(quantity),
        });

        await db.collection("audit_logs").add({
          log_id: `AUD-${Date.now()}`,
          action_type: "INVENTORY_MERGED",
          reference_id: doc.data().inventory_id || doc.id,
          asset_id,
          old_quantity: prevQty,
          new_quantity: prevQty + Number(quantity),
          user_name: req.user.name,
          user_role: req.user.role,
          office_id: req.user.office_id,
          uid: req.user.uid,
          remarks: `Inventory merged: ${asset_id} (${status}, ${condition}) qty ${prevQty} + ${quantity} = ${prevQty + Number(quantity)} by ${req.user.name} (${req.user.role})`,
          timestamp: new Date(),
        });

        return res.json({ message: "Inventory merged" });
      }

      // CREATE NEW INVENTORY ROW
      await db.collection("inventory").add({
        inventory_id,
        asset_id,
        quantity: Number(quantity),
        status,
        condition,
        office_id: req.user.office_id,
        department_id: req.user.department_id,
        created_at: new Date(),
      });

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "INVENTORY_ADDED",
        reference_id: inventory_id,
        asset_id,
        quantity,
        status,
        condition,
        user_name: req.user.name,
        user_role: req.user.role,
        office_id: req.user.office_id,
        uid: req.user.uid,
        remarks: `Inventory added: ${asset_id} qty ${quantity} (${status}, ${condition}) by ${req.user.name} (${req.user.role})`,
        timestamp: new Date(),
      });

      res.json({ message: "Inventory added", inventory_id });
    } catch (err) {
      console.error("Add inventory failed:", err);
      res.status(500).json({ message: "Failed to add inventory" });
    }
  }
);

// =====================
// ✏️ UPDATE INVENTORY
// =====================
app.patch(
  "/api/store-manager/inventory/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const ref = db.collection("inventory").doc(req.params.id);
      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({ message: "Inventory not found" });
      }

      // Compute differences between existing document and incoming update
      const oldData = snap.data();
      const incoming = req.body || {};

      // Exclude 'id' field from incoming (it's the Firestore doc ID, not a field)
      delete incoming.id;

      const changedKeys = Object.keys(incoming).filter((k) => {
        // treat undefined and missing as equal
        const oldVal = oldData.hasOwnProperty(k) ? oldData[k] : undefined;
        const newVal = incoming[k];
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
      });

      // Apply update
      await ref.update(incoming);

      // Build audit details (only include keys that changed)
      const old_values = {};
      const new_values = {};
      changedKeys.forEach((k) => {
        old_values[k] = oldData.hasOwnProperty(k) ? oldData[k] : null;
        new_values[k] = incoming[k];
      });

      const remarks =
        changedKeys.length === 0
          ? `Inventory touched by ${req.user.role} ${req.user.name}`
          : `Updated fields: ${changedKeys
            .map((k) => `${k} (${String(old_values[k])} → ${String(new_values[k])})`)
            .join(", ")} by ${req.user.role} ${req.user.name}`;

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "INVENTORY_UPDATED",
        // prefer explicit inventory_id when available
        reference_id: oldData.inventory_id || snap.id,
        asset_id: incoming.asset_id || oldData.asset_id || null,
        remarks,
        changed_fields: changedKeys,
        old_values,
        new_values,
        user_name: req.user.name,
        user_role: req.user.role,
        office_id: req.user.office_id,
        uid: req.user.uid,
        timestamp: new Date(),
      });

      res.json({ message: "Inventory updated" });
    } catch (err) {
      console.error("Update inventory failed:", err);
      res.status(500).json({ message: "Failed to update inventory" });
    }
  }
);

// =====================
// 🗑️ DELETE INVENTORY
// =====================
app.delete(
  "/api/store-manager/inventory/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const ref = db.collection("inventory").doc(req.params.id);
      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({ message: "Inventory not found" });
      }

      await ref.delete();

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "INVENTORY_DELETED",
        reference_id: snap.data().inventory_id,
        asset_id: snap.data().asset_id,
        quantity: snap.data().quantity,
        user_name: req.user.name,
        user_role: req.user.role,
        office_id: req.user.office_id,
        uid: req.user.uid,
        remarks: `Inventory deleted: ${snap.data().asset_id} qty ${snap.data().quantity} by ${req.user.name} (${req.user.role})`,
        timestamp: new Date(),
      });

      res.json({ message: "Inventory deleted" });
    } catch (err) {
      console.error("Delete inventory failed:", err);
      res.status(500).json({ message: "Failed to delete inventory" });
    }
  }
);

// =====================
// 📋 VIEW VENDORS
// =====================
app.get(
  "/api/store-manager/vendors",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const snapshot = await db
        .collection("vendors")
        .where("office_id", "==", req.user.office_id)
        .get();

      const vendors = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      vendors.sort((a, b) => {
        const t1 = a.created_at?.toMillis?.() || 0;
        const t2 = b.created_at?.toMillis?.() || 0;
        return t2 - t1;
      });

      res.json(vendors);
    } catch (err) {
      console.error("Fetch vendors error:", err);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  }
);

// =====================
// ➕ CREATE VENDOR
// =====================
app.post(
  "/api/store-manager/vendors",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const { vendor_name, contact, gst } = req.body;

      if (!vendor_name) {
        return res.status(400).json({ message: "Vendor name required" });
      }

      const vendor_id = `VEN-${Date.now().toString().slice(-6)}`;

      await db.collection("vendors").add({
        vendor_id,
        vendor_name,
        contact: contact || "",
        gst: gst || "",
        office_id: req.user.office_id,
        created_at: new Date(),
      });

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "VENDOR_CREATED",
        reference_id: vendor_id,
        asset_id: null,
        user_name: req.user.name,
        user_role: req.user.role,
        uid: req.user.uid,
        remarks: `Vendor ${vendor_name} created by ${req.user.role} ${req.user.name}`,
        timestamp: new Date(),
      });

      res.json({ message: "Vendor created successfully" });
    } catch (err) {
      console.error("Vendor create error:", err);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  }
);

// =====================
// ✏️ UPDATE VENDOR
// =====================
app.patch(
  "/api/store-manager/vendors/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const ref = db.collection("vendors").doc(req.params.id);
      const snap = await ref.get();

      if (!snap.exists)
        return res.status(404).json({ message: "Vendor not found" });

      const oldData = snap.data();
      const incoming = req.body || {};

      delete incoming.id;

      const changedKeys = Object.keys(incoming).filter(k =>
        JSON.stringify(oldData[k]) !== JSON.stringify(incoming[k])
      );

      await ref.update(incoming);

      const old_values = {};
      const new_values = {};
      changedKeys.forEach(k => {
        old_values[k] = oldData[k] ?? null;
        new_values[k] = incoming[k];
      });

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "VENDOR_UPDATED",
        reference_id: oldData.vendor_id,
        asset_id: null,
        changed_fields: changedKeys,
        old_values,
        new_values,
        user_name: req.user.name,
        user_role: req.user.role,
        uid: req.user.uid,
        remarks:
          changedKeys.length === 0
            ? `Vendor touched`
            : `Vendor updated fields: ${changedKeys.join(", ")} by ${req.user.role} ${req.user.name}`,
        timestamp: new Date(),
      });

      res.json({ message: "Vendor updated successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to update vendor" });
    }
  }
);

// =====================
// 🗑️ DELETE VENDOR
// =====================
app.delete(
  "/api/store-manager/vendors/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const ref = db.collection("vendors").doc(req.params.id);
      const snap = await ref.get();

      if (!snap.exists)
        return res.status(404).json({ message: "Vendor not found" });

      const data = snap.data();

      await ref.delete();

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "VENDOR_DELETED",
        reference_id: data.vendor_id,
        asset_id: null,
        user_name: req.user.name,
        user_role: req.user.role,
        uid: req.user.uid,
        remarks: `Vendor deleted: ${data.vendor_id} by ${req.user.role} ${req.user.name}`,
        timestamp: new Date(),
      });

      res.json({ message: "Vendor deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  }
);

// =====================
// 📋 VIEW PURCHASES
// =====================
app.get(
  "/api/store-manager/purchases",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const snapshot = await db
        .collection("purchases")
        .where("office_id", "==", req.user.office_id)
        .get();

      const purchases = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      purchases.sort((a, b) => {
        const t1 = a.created_at?.toMillis?.() || 0;
        const t2 = b.created_at?.toMillis?.() || 0;
        return t2 - t1;
      });

      res.json(purchases);
    } catch (err) {
      console.error("Fetch purchases error:", err);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  }
);

// =====================
// ➕ CREATE PURCHASE
// =====================
app.post(
  "/api/store-manager/purchases",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const {
        asset_id,
        vendor_id,
        invoice_number,
        purchase_date,
        purchase_cost,
        quantity,
        warranty,
      } = req.body;

      if (!asset_id || !vendor_id || !purchase_cost || !quantity) {
        return res.status(400).json({
          message: "Asset, Vendor, Cost and Quantity required",
        });
      }

      const purchase_id = `PUR-${Date.now().toString().slice(-6)}`;
      const vendorSnap = await db
        .collection("vendors")
        .where("vendor_id", "==", vendor_id)
        .where("office_id", "==", req.user.office_id)
        .limit(1)
        .get();

      if (vendorSnap.empty)
        return res.status(400).json({ message: "Invalid vendor" });

      // CREATE PURCHASE
      await db.collection("purchases").add({
        purchase_id,
        asset_id,
        vendor_id,
        invoice_number: invoice_number || "",
        purchase_date: purchase_date || "",
        purchase_cost: Number(purchase_cost),
        quantity: Number(quantity),
        warranty: warranty || "",
        office_id: req.user.office_id,
        created_at: new Date(),
      });

      /* =============================
         AUTO INVENTORY MERGE / ADD
         ============================= */

      const inventorySnap = await db
        .collection("inventory")
        .where("asset_id", "==", asset_id)
        .where("office_id", "==", req.user.office_id)
        .where("status", "==", "Available")
        .where("condition", "==", "Good")
        .limit(1)
        .get();

      if (!inventorySnap.empty) {
        const doc = inventorySnap.docs[0];
        const prevQty = Number(doc.data().quantity) || 0;

        await doc.ref.update({
          quantity: prevQty + Number(quantity),
        });

        await db.collection("audit_logs").add({
          log_id: `AUD-${Date.now()}`,
          action_type: "INVENTORY_MERGED",
          reference_id: doc.data().inventory_id,
          asset_id,
          old_quantity: prevQty,
          new_quantity: prevQty + Number(quantity),
          office_id: req.user.office_id,
          user_name: req.user.name,
          user_role: req.user.role,
          uid: req.user.uid,
          remarks: `Inventory increased via purchase ${purchase_id} by ${req.user.role} ${req.user.name}`,
          timestamp: new Date(),
        });
      } else {
        const inventory_id = `INV-${req.user.office_id}-${Date.now()}`;

        await db.collection("inventory").add({
          inventory_id,
          asset_id,
          quantity: Number(quantity),
          status: "Available",
          condition: "Good",
          office_id: req.user.office_id,
          department_id: req.user.department_id,
          created_at: new Date(),
        });

        await db.collection("audit_logs").add({
          log_id: `AUD-${Date.now()}`,
          action_type: "INVENTORY_ADDED",
          reference_id: inventory_id,
          asset_id,
          quantity,
          office_id: req.user.office_id,
          user_name: req.user.name,
          user_role: req.user.role,
          uid: req.user.uid,
          remarks: `Inventory added via purchase ${purchase_id} by ${req.user.role} ${req.user.name}`,
          timestamp: new Date(),
        });
      }

      // PURCHASE AUDIT
      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "PURCHASE_CREATED",
        reference_id: purchase_id,
        asset_id,
        office_id: req.user.office_id,
        user_name: req.user.name,
        user_role: req.user.role,
        uid: req.user.uid,
        remarks: `Purchase created (qty ${quantity}) by ${req.user.role} ${req.user.name}`,
        timestamp: new Date(),
      });

      res.json({ message: "Purchase recorded and inventory updated" });
    } catch (err) {
      console.error("Purchase error:", err);
      res.status(500).json({ message: "Failed to create purchase" });
    }
  }
);

// =====================
// ✏️ UPDATE PURCHASE
// =====================
app.patch(
  "/api/store-manager/purchases/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const ref = db.collection("purchases").doc(req.params.id);
      const snap = await ref.get();

      if (!snap.exists)
        return res.status(404).json({ message: "Purchase not found" });

      const oldData = snap.data();
      const incoming = req.body || {};
      delete incoming.id;

      const changedKeys = Object.keys(incoming).filter(k =>
        JSON.stringify(oldData[k]) !== JSON.stringify(incoming[k])
      );

      await ref.update(incoming);

      const old_values = {};
      const new_values = {};
      changedKeys.forEach(k => {
        old_values[k] = oldData[k] ?? null;
        new_values[k] = incoming[k];
      });

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "PURCHASE_UPDATED",
        reference_id: oldData.purchase_id,
        asset_id: oldData.asset_id,
        changed_fields: changedKeys,
        old_values,
        new_values,
        office_id: req.user.office_id,
        user_name: req.user.name,
        user_role: req.user.role,
        uid: req.user.uid,
        remarks:
          changedKeys.length === 0
            ? `Purchase touched`
            : `Purchase updated fields: ${changedKeys.join(", ")} by ${req.user.role} ${req.user.name}`,
        timestamp: new Date(),
      });

      res.json({ message: "Purchase updated successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to update purchase" });
    }
  }
);

// =====================
// 🗑️ DELETE PURCHASE
// =====================
app.delete(
  "/api/store-manager/purchases/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const purchaseRef = db.collection("purchases").doc(req.params.id);
      const snap = await purchaseRef.get();

      if (!snap.exists)
        return res.status(404).json({ message: "Purchase not found" });

      const purchase = snap.data();
      const { asset_id, quantity, purchase_id } = purchase;

      /* =============================
         FIND INVENTORY ROW
         ============================= */

      const inventorySnap = await db
        .collection("inventory")
        .where("asset_id", "==", asset_id)
        .where("office_id", "==", req.user.office_id)
        .where("status", "==", "Available")
        .where("condition", "==", "Good")
        .limit(1)
        .get();

      if (!inventorySnap.empty) {
        const invDoc = inventorySnap.docs[0];
        const invData = invDoc.data();
        const currentQty = Number(invData.quantity) || 0;
        const newQty = currentQty - Number(quantity);

        if (newQty > 0) {
          await invDoc.ref.update({ quantity: newQty });

          await db.collection("audit_logs").add({
            log_id: `AUD-${Date.now()}`,
            action_type: "INVENTORY_DECREMENTED",
            reference_id: invData.inventory_id,
            asset_id,
            old_quantity: currentQty,
            new_quantity: newQty,
            office_id: req.user.office_id,
            user_name: req.user.name,
            user_role: req.user.role,
            uid: req.user.uid,
            remarks: `Inventory reduced due to purchase deletion (${purchase_id}) by ${req.user.role} ${req.user.name}`,
            timestamp: new Date(),
          });

        } else {
          // Quantity becomes 0 → delete inventory row
          await invDoc.ref.delete();

          await db.collection("audit_logs").add({
            log_id: `AUD-${Date.now()}`,
            action_type: "INVENTORY_DELETED",
            reference_id: invData.inventory_id,
            asset_id,
            old_quantity: currentQty,
            new_quantity: 0,
            office_id: req.user.office_id,
            user_name: req.user.name,
            user_role: req.user.role,
            uid: req.user.uid,
            remarks: `Inventory removed due to purchase deletion (${purchase_id}) by ${req.user.role} ${req.user.name}`,
            timestamp: new Date(),
          });
        }
      }

      /* =============================
         DELETE PURCHASE
         ============================= */

      await purchaseRef.delete();

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "PURCHASE_DELETED",
        reference_id: purchase_id,
        asset_id,
        office_id: req.user.office_id,
        user_name: req.user.name,
        user_role: req.user.role,
        uid: req.user.uid,
        remarks: `Purchase deleted and inventory adjusted by ${req.user.role} ${req.user.name}`,
        timestamp: new Date(),
      });

      res.json({ message: "Purchase deleted and inventory adjusted" });

    } catch (err) {
      console.error("Delete purchase error:", err);
      res.status(500).json({ message: "Failed to delete purchase" });
    }
  }
);

// =====================
// 📋 VIEW EMPLOYEES
// =====================
app.get(
  "/api/store-manager/employees",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const usersSnap = await db
        .collection("Users")
        .where("role", "==", "officer")
        .where("office_id", "==", req.user.office_id)
        .get();

      const employees = usersSnap.docs.map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          employee_id: data.user_id,
          employee_name: data.name,
          ...data,
        };
      });

      res.json(employees);
    } catch (err) {
      console.error("Fetch employees failed:", err);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  }
);

// =====================
// 📋 VIEW ASSIGNMENTS
// =====================
app.get(
  "/api/store-manager/assignments",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const assignmentSnap = await db
        .collection("asset_assignments")
        .where("office_id", "==", req.user.office_id)
        .get();

      const assetSnap = await db.collection("assets").get();

      const usersSnap = await db
        .collection("Users")
        .where("role", "==", "officer")
        .where("office_id", "==", req.user.office_id)
        .get();

      // 🔹 Build Asset Map
      const assetsMap = {};
      assetSnap.forEach(doc => {
        const assetData = doc.data();
        assetsMap[assetData.asset_id] = assetData;
      });

      // 🔹 Build Users Map
      const usersMap = {};
      const usersRoom = {};
      usersSnap.forEach(doc => {
        const userData = doc.data();
        // map by business user_id and by auth uid (doc id) for robust lookup
        usersMap[userData.user_id] = userData.name || "Unknown";
        usersMap[doc.id] = userData.name || "Unknown";
        usersRoom[userData.user_id] = userData.room_id || null;
        usersRoom[doc.id] = userData.room_id || null;
      });

      // 🔹 Build Assignment Response (resolve names + normalize dates)
      const assignments = await Promise.all(
        assignmentSnap.docs.map(async (doc) => {
          const assignmentData = doc.data();

          const asset = assetsMap[assignmentData.asset_id] || {};

          // Resolve employee name and room: try maps first, fall back to DB fetch
          let employeeName =
            usersMap[assignmentData.assigned_to] ||
            usersMap[assignmentData.assigned_uid] ||
            "Unknown";

          let employeeRoom =
            usersRoom[assignmentData.assigned_to] ||
            usersRoom[assignmentData.assigned_uid] ||
            null;

          if (employeeName === "Unknown" || employeeRoom === null) {
            try {
              if (assignmentData.assigned_uid) {
                const userDoc = await db
                  .collection("Users")
                  .doc(assignmentData.assigned_uid)
                  .get();
                if (userDoc.exists) {
                  const u = userDoc.data();
                  employeeName = u.name || employeeName;
                  employeeRoom = u.room_id || employeeRoom;
                }
              }

              if ((employeeName === "Unknown" || employeeRoom === null) && assignmentData.assigned_to) {
                // Try by user_id
                let byUserId = await db
                  .collection("Users")
                  .where("user_id", "==", assignmentData.assigned_to)
                  .limit(1)
                  .get();
                if (!byUserId.empty) {
                  const u = byUserId.docs[0].data();
                  employeeName = u.name || employeeName;
                  employeeRoom = u.room_id || employeeRoom;
                } else {
                  // Fallback: try by name (for legacy data where assigned_to is the name)
                  const byName = await db
                    .collection("Users")
                    .where("name", "==", String(assignmentData.assigned_to))
                    .limit(1)
                    .get();
                  if (!byName.empty) {
                    const u = byName.docs[0].data();
                    employeeName = u.name || employeeName;
                    employeeRoom = u.room_id || employeeRoom;
                  }
                }
              }
            } catch (e) {
              console.error("Failed to resolve employee name/room for assignment:", e);
            }
          }

          // Normalize assigned and returned dates to ISO strings where possible
          const toISO = (val) => {
            if (!val) return null;
            try {
              if (val.toDate) return val.toDate().toISOString();
              if (val.seconds) return new Date(val.seconds * 1000).toISOString();
              return new Date(val).toISOString();
            } catch (e) {
              return null;
            }
          };

          const assigned_iso = toISO(assignmentData.created_at || assignmentData.assigned_date);
          const returned_iso = toISO(assignmentData.returned_date);

          return {
            id: doc.id,
            ...assignmentData,
            asset_name: asset.asset_name || "Unknown",
            quantity: assignmentData.quantity,
            asset_company: asset.asset_company || "",
            employee_name: employeeName,
            assigned_room: employeeRoom || null,
            assigned_iso,
            returned_iso,
          };
        })
      );

      res.json(assignments);

    } catch (err) {
      console.error("Fetch assignments failed:", err);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  }
);

// =====================
// ➕ CREATE / MERGE ASSIGNMENT
// =====================
app.post(
  "/api/store-manager/assignments",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const {
        inventory_id,
        assigned_to,
        quantity,
        assigned_date,
        returned_date,
        remarks,
      } = req.body;

      if (!inventory_id || !assigned_to) {
        return res.status(400).json({
          message: "Inventory and Employee required",
        });
      }

      // 🔎 Fetch Inventory
      const inventorySnap = await db
        .collection("inventory")
        .where("inventory_id", "==", inventory_id)
        .where("office_id", "==", req.user.office_id)
        .limit(1)
        .get();

      if (inventorySnap.empty) {
        return res.status(404).json({ message: "Inventory not found" });
      }

      const inventoryDoc = inventorySnap.docs[0];
      const inventoryData = inventoryDoc.data();

      if (!quantity || quantity <= 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      if (Number(quantity) > Number(inventoryData.quantity)) {
        return res.status(409).json({ message: "Insufficient stock" });
      }

      if (inventoryData.status !== "Available") {
        return res.status(409).json({ message: "Asset not available" });
      }

      // ==========================================
      // 1. RESOLVE USER IDENTITY FIRST
      // ==========================================
      let assigned_uid = null;
      let final_assigned_to = assigned_to;
      try {
        let userQuery = await db
          .collection("Users")
          .where("user_id", "==", assigned_to)
          .limit(1)
          .get();

        if (userQuery.empty) {
          const docRef = await db.collection("Users").doc(assigned_to).get();
          if (docRef.exists) {
            const u = docRef.data();
            assigned_uid = docRef.id;
            final_assigned_to = u.user_id || assigned_to;
          }
        } else {
          const udoc = userQuery.docs[0];
          assigned_uid = udoc.id;
          final_assigned_to = udoc.data().user_id || assigned_to;
        }
      } catch (e) {
        console.error("Failed to resolve assigned user:", e);
      }

      // ==========================================
      // 2. CHECK FOR EXISTING ASSIGNMENT TO MERGE
      // ==========================================
      const existingSnap = await db
        .collection("asset_assignments")
        .where("inventory_id", "==", inventory_id)
        .where("assigned_to", "==", final_assigned_to) // 👈 ONLY check this user
        .where("returned_date", "==", null)
        .limit(1)
        .get();

      let assignment_id;
      const finalAssignedDate = assigned_date ? new Date(assigned_date) : new Date();
      const finalReturnedDate = returned_date ? new Date(returned_date) : null;

      if (!existingSnap.empty) {
        // 🔥 MERGE INTO EXISTING
        const existingDoc = existingSnap.docs[0];
        const existingData = existingDoc.data();
        assignment_id = existingData.assignment_id;

        const updatedQty = Number(existingData.quantity) + Number(quantity);
        const addedRemarks = existingData.remarks
          ? `${existingData.remarks} | Added ${quantity} on ${new Date().toLocaleDateString()}`
          : `Added ${quantity} units on ${new Date().toLocaleDateString()}`;

        await existingDoc.ref.update({
          quantity: updatedQty,
          remarks: remarks || addedRemarks,
          // We usually keep the original assigned_date when merging, but update remarks
        });

      } else {
        // 🆕 CREATE NEW
        assignment_id = `ASN-${Date.now()}`;

        await db.collection("asset_assignments").add({
          assignment_id,
          inventory_id,
          asset_id: inventoryData.asset_id,
          quantity: Number(quantity),
          assigned_to: final_assigned_to,
          assigned_uid: assigned_uid,
          assigned_date: finalAssignedDate,
          returned_date: finalReturnedDate,
          office_id: req.user.office_id,
          remarks: remarks || "",
          created_at: new Date(),
        });
      }

      // ==========================================
      // 3. DEDUCT FROM INVENTORY
      // ==========================================
      const newQty = Number(inventoryData.quantity) - Number(quantity);

      await inventoryDoc.ref.update({
        quantity: newQty,
        status: newQty > 0 ? "Available" : "Unavailable",
      });

      // ==========================================
      // 4. AUDIT & LOCATION LOGIC
      // ==========================================
      const assetSnap = await db
        .collection("assets")
        .where("asset_id", "==", inventoryData.asset_id)
        .limit(1)
        .get();

      const assetData = assetSnap.empty ? {} : assetSnap.docs[0].data();

      let previous_location = `Office Store: ${req.user.office_id}`;
      let new_location = String(final_assigned_to);

      try {
        const assignedUserSnap = await db
          .collection("Users")
          .where("user_id", "==", final_assigned_to)
          .limit(1)
          .get();

        if (!assignedUserSnap.empty) {
          const assignedUser = assignedUserSnap.docs[0].data();
          if (assignedUser.room_id) new_location = assignedUser.room_id;
        }
      } catch (e) {
        console.error("Failed to fetch assigned user location:", e);
      }

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: existingSnap.empty ? "ASSET_ASSIGNED" : "ASSIGNMENT_MERGED",
        reference_id: assignment_id,
        asset_id: inventoryData.asset_id,
        inventory_id,
        user_name: req.user.name,
        user_role: req.user.role,
        office_id: req.user.office_id,
        uid: req.user.uid,
        previous_location,
        new_location,
        remarks: existingSnap.empty
          ? `Asset ${inventoryData.asset_id} (${assetData.asset_name || "Unknown"}) assigned to ${final_assigned_to} by ${req.user.role} ${req.user.name}`
          : `Added ${quantity} units to existing assignment ${assignment_id} for ${final_assigned_to} by ${req.user.role} ${req.user.name}`,
        timestamp: new Date(),
      });

      res.json({ message: "Assignment processed successfully" });
    } catch (err) {
      console.error("Assignment failed:", err);
      res.status(500).json({ message: "Failed to process assignment" });
    }
  }
);

// =====================
// 🔄 RETURN ASSET
// =====================
app.patch(
  "/api/store-manager/assignments/:id/return",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const ref = db.collection("asset_assignments").doc(req.params.id)

      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      const data = snap.data();

      if (data.returned_date) {
        return res.status(409).json({ message: "Already returned" });
      }

      if (data.office_id !== req.user.office_id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // 🔄 Update assignment
      await ref.update({
        returned_date: new Date(),
      });

      // 🔄 Restore inventory quantity
      const inventorySnap = await db
        .collection("inventory")
        .where("inventory_id", "==", data.inventory_id)
        .limit(1)
        .get();

      if (!inventorySnap.empty) {
        const inventoryDoc = inventorySnap.docs[0];
        const inventoryData = inventoryDoc.data();

        const newQty =
          Number(inventoryData.quantity || 0) +
          Number(data.quantity || 0);

        await inventoryDoc.ref.update({
          quantity: newQty,
          status: newQty > 0 ? "Available" : "Unavailable",
        });
      }

      // 🔍 Fetch assigned user's room to determine previous_location
      let previous_location = "Unknown";
      try {
        let userDoc;
        if (data.assigned_uid) {
          userDoc = await db.collection("Users").doc(data.assigned_uid).get();
        } else if (data.assigned_to) {
          const snap = await db
            .collection("Users")
            .where("user_id", "==", data.assigned_to)
            .limit(1)
            .get();
          if (!snap.empty) userDoc = snap.docs[0];
        }

        if (userDoc && userDoc.exists) {
          const userData = userDoc.data();
          previous_location = userData.room_id || "Unknown";
        }
      } catch (e) {
        console.error("Failed to fetch assigned user for return audit:", e);
      }

      const new_location = `Office Store: ${data.office_id}`;

      // 🔍 Audit
      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "ASSET_RETURNED",
        reference_id: data.assignment_id,
        asset_id: data.asset_id,
        inventory_id: data.inventory_id,
        quantity: data.quantity,
        user_name: req.user.name,
        user_role: req.user.role,
        office_id: req.user.office_id,
        uid: req.user.uid,
        previous_location,
        new_location,
        remarks: `Returned ${data.quantity} units of ${data.asset_id} by ${req.user.role} ${req.user.name}`,
        timestamp: new Date(),
      });

      res.json({ message: "Asset returned successfully" });
    } catch (err) {
      console.error("Return failed:", err);
      res.status(500).json({ message: "Failed to return asset" });
    }
  }
);

// =====================
// ✏️ EDIT ASSIGNMENT
// =====================
app.patch(
  "/api/store-manager/assignments/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const ref = db.collection("asset_assignments").doc(req.params.id);
      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      const oldData = snap.data();

      // Only allow controlled fields
      const {
        assigned_date,
        returned_date,
        remarks,
      } = req.body;

      const updateData = {};

      if (assigned_date !== undefined) {
        updateData.assigned_date = new Date(assigned_date);
      }

      if (returned_date !== undefined) {
        updateData.returned_date = returned_date
          ? new Date(returned_date)
          : null;
      }

      if (remarks !== undefined) {
        updateData.remarks = remarks;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      await ref.update(updateData);

      // Inventory sync logic
      if (returned_date !== undefined) {
        const inventorySnap = await db
          .collection("inventory")
          .where("inventory_id", "==", oldData.inventory_id)
          .limit(1)
          .get();

        if (!inventorySnap.empty) {
          await inventorySnap.docs[0].ref.update({
            status: returned_date ? "Available" : "Unavailable",
          });
        }
      }

      // Audit
      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "ASSIGNMENT_UPDATED",
        reference_id: oldData.assignment_id,
        asset_id: oldData.asset_id,
        inventory_id: oldData.inventory_id,
        user_name: req.user.name,
        user_role: req.user.role,
        office_id: req.user.office_id,
        uid: req.user.uid,
        remarks: `Assignment ${oldData.assignment_id} updated by ${req.user.role} ${req.user.name}`,
        timestamp: new Date(),
      });

      res.json({ message: "Assignment updated successfully" });
    } catch (err) {
      console.error("Edit assignment failed:", err);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  }
);

// =====================
// 🗑 DELETE ASSIGNMENT
// =====================
app.delete(
  "/api/store-manager/assignments/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const ref = db.collection("asset_assignments").doc(req.params.id);
      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      const data = snap.data();

      if (data.office_id !== req.user.office_id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (!data.returned_date) {
        const inventorySnap = await db
          .collection("inventory")
          .where("inventory_id", "==", data.inventory_id)
          .limit(1)
          .get();

        if (!inventorySnap.empty) {
          const inventoryDoc = inventorySnap.docs[0];
          const inventoryData = inventoryDoc.data();

          const newQty =
            Number(inventoryData.quantity || 0) +
            Number(data.quantity || 0);

          await inventoryDoc.ref.update({
            quantity: newQty,
            status: newQty > 0 ? "Available" : "Unavailable",
          });
        }
      }

      await ref.delete();

      await db.collection("audit_logs").add({
        log_id: `AUD-${Date.now()}`,
        action_type: "ASSIGNMENT_DELETED",
        reference_id: data.assignment_id,
        asset_id: data.asset_id,
        inventory_id: data.inventory_id,
        user_name: req.user.name,
        user_role: req.user.role,
        office_id: req.user.office_id,
        uid: req.user.uid,
        remarks: `Assignment ${data.assignment_id} deleted by ${req.user.role} ${req.user.name}`,
        timestamp: new Date(),
      });

      res.json({ message: "Assignment deleted successfully" });
    } catch (err) {
      console.error("Delete assignment failed:", err);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  }
);

// =====================
// 📋 PROFILE ORG DETAILS
// =====================
app.get(
  "/api/me/org-details",
  authenticate,
  async (req, res) => {
    try {
      const { department_id, office_id } = req.user;

      // 🔹 Fetch Department
      const deptSnap = await db
        .collection("departments")
        .where("department_id", "==", department_id)
        .limit(1)
        .get();

      const department = deptSnap.empty
        ? null
        : deptSnap.docs[0].data();

      // 🔹 Fetch Office
      const officeSnap = await db
        .collection("offices")
        .where("office_id", "==", office_id)
        .limit(1)
        .get();

      const office = officeSnap.empty
        ? null
        : officeSnap.docs[0].data();

      res.json({
        department: department
          ? {
            department_name: department.department_name,
            department_type: department.department_type,
          }
          : null,
        office: office
          ? {
            office_name: office.office_name,
            address: office.address,
            HOD: office.HOD,
            office_email: office.office_email,
            office_contact: office.office_contact,
          }
          : null,
      });

    } catch (err) {
      console.error("Org details fetch error:", err);
      res.status(500).json({ message: "Failed to fetch organization details" });
    }
  }
);

// =====================
// 📋 OFFICER: MY ASSETS
// =====================
app.get("/api/officer/my-assets", authenticate, authorizeRole(["officer"]), async (req, res) => {
  try {
    const userId = req.user.user_id;

    const assignmentSnap = await db
      .collection("asset_assignments")
      .where("assigned_to", "==", userId)
      .get();

    const assetSnap = await db.collection("assets").get();

    const assetsMap = {};
    assetSnap.forEach(doc => {
      const data = doc.data();
      assetsMap[data.asset_id] = data;
    });

    const myAssets = await Promise.all(
      assignmentSnap.docs.map(async (doc) => {
        const data = doc.data();
        const asset = assetsMap[data.asset_id] || {};

        const disposalSnap = await db
          .collection("disposals")
          .where("assignment_id", "==", data.assignment_id)
          .get();

        let disposedQty = 0;
        let latestDisposalDate = null;

        disposalSnap.forEach(d => {
          const disposalData = d.data();
          disposedQty += Number(disposalData.quantity || 0);

          if (disposalData.created_at) {
            const dDate = disposalData.created_at.toDate ? disposalData.created_at.toDate() : new Date(disposalData.created_at);
            if (!latestDisposalDate || dDate > latestDisposalDate) {
              latestDisposalDate = dDate;
            }
          }
        });

        const conditionSnap = await db
          .collection("inventory")
          .where("asset_id", "==", data.asset_id)
          .limit(1)
          .get();
        let condition = "Unknown";
        if (!conditionSnap.empty) {
          condition = conditionSnap.docs[0].data().condition || "Unknown";
        }

        const maintenanceSnap = await db
          .collection("maintenance")
          .where("assignment_id", "==", data.assignment_id)
          .get();

        let maintenanceQty = 0;
        maintenanceSnap.forEach(m => {
          if (m.data().status !== "COMPLETED") {
            maintenanceQty += 1;
          }
        });

        const activeQty =
          Number(data.quantity) - disposedQty - maintenanceQty;

        return {
          id: doc.id,
          assignment_id: data.assignment_id,
          asset_id: data.asset_id,

          asset_name: asset.asset_name || "Unknown",
          asset_photo_url: asset.asset_photo_url || null,
          asset_category: asset.asset_category || "Uncategorized",
          asset_company: asset.asset_company || "",

          condition,

          quantity: data.quantity,
          active_quantity: Math.max(activeQty, 0),
          disposed_quantity: disposedQty,
          maintenance_quantity: maintenanceQty,

          assigned_date: data.assigned_date?.toDate?.() || null,
          returned_date: data.returned_date?.toDate?.() || null,
          disposed_date: latestDisposalDate
        };
      })
    );

    res.json(myAssets);

  } catch (err) {
    console.error("My assets fetch failed:", err);
    res.status(500).json({ message: "Failed to fetch my assets" });
  }
});

// =====================
// 📄 CREATE REQUEST
// =====================
app.post(
  "/api/requests/create",
  authenticate,
  authorizeRole(["officer"]),
  async (req, res) => {
    try {

      const {
        request_type,
        asset_id,
        assignment_id,
        asset_name,
        asset_category,
        quantity,
        return_date,
        disposal_reason,
        description,
        company,
        image_url
      } = req.body;

      const user = req.user;

      if (!request_type)
        return res.status(400).json({ message: "Request type required" });

      if (!quantity || quantity < 1)
        return res.status(400).json({ message: "Invalid quantity" });

      let assignmentDoc = null;
      let assetName = null;

      if (["RETURN", "MAINTENANCE", "DISPOSAL"].includes(request_type)) {

        const assignmentSnap = await db
          .collection("asset_assignments")
          .where("assignment_id", "==", assignment_id)
          .limit(1)
          .get();

        if (assignmentSnap.empty)
          return res.status(404).json({ message: "Assignment not found" });

        assignmentDoc = assignmentSnap.docs[0].data();

        /* FETCH ASSET */

        const assetSnap = await db
          .collection("assets")
          .where("asset_id", "==", assignmentDoc.asset_id)
          .limit(1)
          .get();

        if (!assetSnap.empty) {
          assetName = assetSnap.docs[0].data().asset_name;
        }
      }

      // ==========================
      // VERIFY ASSIGNMENT
      // ==========================
      if (["RETURN", "MAINTENANCE", "DISPOSAL"].includes(request_type)) {

        if (!assignment_id)
          return res.status(400).json({ message: "Assignment required" });

        const assignmentSnap = await db
          .collection("asset_assignments")
          .where("assignment_id", "==", assignment_id)
          .limit(1)
          .get();

        if (assignmentSnap.empty)
          return res.status(404).json({ message: "Assignment not found" });

        assignmentDoc = assignmentSnap.docs[0].data();

        if (assignmentDoc.assigned_to !== user.user_id)
          return res.status(403).json({ message: "Not your assigned asset" });

        if (assignmentDoc.returned_date)
          return res.status(400).json({ message: "Asset already returned" });

        if (quantity > assignmentDoc.quantity)
          return res.status(400).json({
            message: "Quantity exceeds assigned quantity",
          });
      }

      // ==========================
      // PREVENT DUPLICATE REQUEST
      // ==========================
      if (assignment_id) {
        const existing = await db
          .collection("Requests")
          .where("assignment_id", "==", assignment_id)
          .where("status", "==", "PENDING")
          .limit(1)
          .get();

        if (!existing.empty) {
          return res.status(409).json({
            message: "A pending request already exists for this asset",
          });
        }
      }

      // ==========================
      // GENERATE REQUEST ID
      // ==========================
      const request_id = "REQ-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      // ==========================
      // CREATE REQUEST
      // ==========================
      const requestData = {

        request_id,
        request_type,

        assignment_id: assignment_id || null,

        asset_name: asset_name || assetName || null,
        asset_id: asset_id || assignmentDoc?.asset_id || null,

        asset_category:
          asset_category || assignmentDoc?.asset_category || null,

        quantity,

        return_date: return_date || null,

        disposal_reason: disposal_reason || null,

        description: description || null,

        company: company || null,

        image_url: image_url || null,

        requested_by: user.user_id,
        office_id: user.office_id,
        department_id: user.department_id,

        status: "PENDING",

        created_at: new Date(),
      };

      await db.collection("Requests").add(requestData);

      // ==========================
      // AUDIT LOG
      // ==========================
      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "REQUEST_CREATED",
        reference_id: request_id,
        asset_id: assignmentDoc?.asset_id || null,
        office_id: user.office_id,
        previous_location: null,
        new_location: null,
        timestamp: new Date(),
        remarks: `${request_type} request created by ${user.role}: ${user.name}`,
      });

      res.status(201).json({
        message: "Request created successfully",
        request_id,
      });

    } catch (err) {

      console.error("REQUEST CREATE ERROR:", err);

      res.status(500).json({
        message: "Failed to create request",
      });
    }
  }
);

app.get(
  "/api/officer/requests",
  authenticate,
  authorizeRole(["officer"]),
  async (req, res) => {

    const snap = await db
      .collection("Requests")
      .where("requested_by", "==", req.user.user_id)
      .get();

    const requests = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(requests);
  }
);

// ==============================
// 📄 GET STORE MANAGER REQUESTS
// ==============================

app.get(
  "/api/store-manager/requests",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {

      const user = req.user;

      if (!user || !user.office_id) {
        return res.status(400).json({
          message: "User office not found"
        });
      }

      // fetch requests belonging to this office
      const snapshot = await db
        .collection("Requests")
        .where("office_id", "==", user.office_id)
        .get();

      const requests = [];

      snapshot.forEach((doc) => {

        const data = doc.data();

        requests.push({
          ...data,
          id: doc.id
        });

      });

      // sort manually instead of Firestore orderBy
      requests.sort((a, b) => {

        const t1 = a.created_at?._seconds || 0;
        const t2 = b.created_at?._seconds || 0;

        return t2 - t1;

      });

      res.status(200).json(requests);

    } catch (err) {

      console.error("FETCH STORE MANAGER REQUESTS ERROR:", err);

      res.status(500).json({
        message: "Failed to fetch requests"
      });

    }
  }
);

// =====================
// ADD MAINTENANCE WORKER
// =====================
app.post(
  "/api/store-manager/maintenance/workers",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {

      const worker_id =
        "W-" + Math.random().toString(36).substring(2, 6).toUpperCase();

      const { worker_name, contact, specialization } = req.body;

      if (!worker_name)
        return res.status(400).json({ message: "Worker name required" });

      const existing = await db
        .collection("workers")
        .where("worker_id", "==", worker_id)
        .limit(1)
        .get();

      if (!existing.empty)
        return res.status(409).json({ message: "Worker already exists" });

      const workerData = {
        worker_id,
        worker_name,
        contact: contact || null,
        specialization: specialization || null,
        office_id: req.user.office_id,
        created_at: new Date()
      };

      await db.collection("workers").add(workerData);

      // Audit log
      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "WORKER_CREATED",
        reference_id: worker_id,
        office_id: req.user.office_id,
        timestamp: new Date(),
        remarks: `Maintenance worker ${worker_name} added by ${req.user.role}: ${req.user.name}`
      });

      res.status(201).json({ message: "Worker created successfully" });

    } catch (err) {

      console.error("ADD WORKER ERROR:", err);

      res.status(500).json({ message: "Failed to add worker" });

    }
  }
);

// =====================
// GET MAINTENANCE WORKERS
// =====================
app.get(
  "/api/store-manager/maintenance/workers",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {

    const snap = await db
      .collection("workers")
      .where("office_id", "==", req.user.office_id)
      .get();

    const workers = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(workers);
  }
);

// =====================
// UPDATE WORKER
// =====================
app.patch(
  "/api/store-manager/maintenance/workers/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {

    try {

      const { worker_name, contact, specialization } = req.body;

      const snap = await db
        .collection("workers")
        .where("worker_id", "==", req.params.id)
        .limit(1)
        .get();

      if (snap.empty)
        return res.status(404).json({ message: "Worker not found" });

      const ref = snap.docs[0].ref;

      await ref.update({
        worker_name,
        contact,
        specialization
      });

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "WORKER_UPDATED",
        reference_id: req.params.id,
        office_id: req.user.office_id,
        timestamp: new Date(),
        remarks: `Worker ${req.params.id} updated by ${req.user.role}: ${req.user.name}`
      });

      res.json({ message: "Worker updated successfully" });

    } catch (err) {

      console.error("Worker update error:", err);

      res.status(500).json({ message: "Failed to update worker" });

    }

  }
);

// =====================
// CREATE MAINTENANCE RECORD
// =====================
app.post(
  "/api/store-manager/maintenance",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {

    try {

      const {
        assignment_id,
        maintenance_date,
        description,
        maintenance_cost,
        maintenance_quantity,
        status,
        worker_id
      } = req.body;

      if (!assignment_id)
        return res.status(400).json({ message: "Assignment required" });

      // ==========================
      // FETCH ASSIGNMENT
      // ==========================
      const assignmentSnap = await db
        .collection("asset_assignments")
        .where("assignment_id", "==", assignment_id)
        .limit(1)
        .get();

      if (assignmentSnap.empty)
        return res.status(404).json({ message: "Assignment not found" });

      const assignmentDoc = assignmentSnap.docs[0];
      const assignment = assignmentDoc.data();

      const assignmentDocRef = assignmentSnap.docs[0].ref;

      // ==========================
      // UPDATE MAINTENANCE COUNT
      // ==========================
      const assignedQty = Number(assignment.quantity || 0);

      const currentMaintenance =
        Number(assignment.maintenance_quantity || 0);

      await assignmentDocRef.update({
        assignment_status: "UNDER_MAINTENANCE",
        maintenance_quantity: currentMaintenance + Number(maintenance_quantity || 1)
      });

      // ==========================
      // FETCH ASSET NAME
      // ==========================
      const assetSnap = await db
        .collection("assets")
        .where("asset_id", "==", assignment.asset_id)
        .limit(1)
        .get();

      let asset_name = null;

      if (!assetSnap.empty) {
        asset_name = assetSnap.docs[0].data().asset_name;
      }

      // ==========================
      // FETCH WORKER NAME
      // ==========================
      let worker_name = null;

      if (worker_id) {

        const workerSnap = await db
          .collection("workers")
          .where("worker_id", "==", worker_id)
          .limit(1)
          .get();

        if (!workerSnap.empty) {
          worker_name = workerSnap.docs[0].data().worker_name;
        }

      }

      // ==========================
      // GENERATE MAINTENANCE ID
      // ==========================
      const maintenance_id =
        "MNT-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      // ==========================
      // CREATE RECORD
      // ==========================
      const maintenanceData = {

        maintenance_id,

        assignment_id,

        officer_id: assignment.assigned_to,

        asset_name,

        worker_name,

        maintenance_date: maintenance_date
          ? new Date(maintenance_date)
          : new Date(),

        description: description || null,

        maintenance_cost: maintenance_cost || 0,

        status: status || "pending",

        office_id: req.user.office_id,

        created_by: req.user.user_id,

        created_at: new Date()
      };

      await db.collection("maintenance").add(maintenanceData);

      // ==========================
      // AUDIT LOG
      // ==========================
      await db.collection("audit_logs").add({

        log_id: generateAuditId(),

        action_type: "MAINTENANCE_CREATED",

        asset_id: assignment.asset_id || null,

        reference_id: maintenance_id,

        office_id: req.user.office_id,

        timestamp: new Date(),

        remarks:
          `Maintenance ${maintenance_id} created for ${asset_name} (qty ${maintenance_quantity || 1}) by ${req.user.role}: ${req.user.name}`
      });

      res.status(201).json({
        message: "Maintenance record created",
        maintenance_id
      });

    } catch (err) {

      console.error("MAINTENANCE CREATE ERROR:", err);

      res.status(500).json({
        message: "Failed to create maintenance record"
      });

    }
  }
);

// =====================
// GET MAINTENANCE RECORDS
// =====================
app.get(
  "/api/store-manager/maintenance",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {

      const snap = await db
        .collection("maintenance")
        .where("office_id", "==", req.user.office_id)
        .orderBy("created_at", "desc")
        .get();

      const usersSnap = await db
        .collection("Users")
        .where("office_id", "==", req.user.office_id)
        .get();

      const userMap = {};

      usersSnap.forEach(doc => {
        const data = doc.data();
        userMap[data.user_id] = data.name;
      });

      const records = snap.docs.map(doc => {

        const data = doc.data();

        return {
          id: doc.id,
          ...data,
          officer_name: userMap[data.officer_id] || "Unknown"
        };

      });

      res.json(records);

    } catch (err) {

      console.error("Fetch maintenance error:", err);

      res.status(500).json({
        message: "Failed to fetch maintenance records"
      });

    }
  }
);

// =====================
// UPDATE MAINTENANCE
// =====================
app.patch(
  "/api/store-manager/maintenance/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {

    try {

      const { status, maintenance_cost, description, worker_id, maintenance_date } = req.body;

      const snap = await db
        .collection("maintenance")
        .where("maintenance_id", "==", req.params.id)
        .limit(1)
        .get();

      if (snap.empty)
        return res.status(404).json({ message: "Maintenance not found" });

      const ref = snap.docs[0].ref;
      const oldData = snap.docs[0].data();

      let worker_name = oldData.worker_name;

      if (worker_id) {

        const workerSnap = await db
          .collection("workers")
          .where("worker_id", "==", worker_id)
          .limit(1)
          .get();

        if (!workerSnap.empty) {
          worker_name = workerSnap.docs[0].data().worker_name;
        }

      }

      const updateData = {
        status,
        maintenance_cost: maintenance_cost ? Number(maintenance_cost) : 0,
        description,
        worker_id,
        worker_name
      };

      if (maintenance_date) {
        updateData.maintenance_date = new Date(maintenance_date);
      }

      await ref.update(updateData);

      // =========================
      // UPDATE ASSIGNMENT COUNTER
      // =========================

      if (oldData.status !== "COMPLETED" && status === "COMPLETED") {

        const assignmentSnap = await db
          .collection("asset_assignments")
          .where("assignment_id", "==", oldData.assignment_id)
          .limit(1)
          .get();

        if (!assignmentSnap.empty) {

          const assignmentDoc = assignmentSnap.docs[0];
          const assignment = assignmentDoc.data();

          const currentMaintenance =
            Number(assignment.maintenance_quantity || 0);

          await assignmentDoc.ref.update({
            maintenance_quantity: Math.max(currentMaintenance - 1, 0)
          });

        }

      }

      // =========================
      // AUDIT LOG
      // =========================

      await db.collection("audit_logs").add({

        log_id: generateAuditId(),

        action_type: "MAINTENANCE_UPDATED",

        reference_id: oldData.maintenance_id,

        asset_id: oldData.asset_id || null,

        office_id: req.user.office_id,

        timestamp: new Date(),

        remarks:
          `Maintenance ${oldData.maintenance_id} updated to ${status} by ${req.user.role}: ${req.user.name}`

      });

      res.json({ message: "Maintenance updated successfully" });

    } catch (err) {

      console.error("Maintenance update error:", err);

      res.status(500).json({
        message: "Failed to update maintenance"
      });

    }
  }
);

// =====================
// GET OFFICERS FOR MAINTENANCE
// =====================
app.get(
  "/api/store-manager/officers",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {

    try {

      const snap = await db
        .collection("Users")
        .where("role", "==", "officer")
        .where("office_id", "==", req.user.office_id)
        .get();

      const officers = snap.docs.map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          user_id: data.user_id,
          name: data.name
        };
      });

      res.json(officers);

    } catch (err) {

      console.error("Fetch officers error:", err);

      res.status(500).json({
        message: "Failed to fetch officers"
      });

    }

  }
);

// =====================
// GET ASSIGNMENTS BY OFFICER
// =====================
app.get(
  "/api/store-manager/assignments/:officerId",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {

    try {

      const officerId = req.params.officerId;

      const snap = await db
        .collection("asset_assignments")
        .where("assigned_to", "==", officerId)
        .where("returned_date", "==", null)
        .get();

      const assetSnap = await db.collection("assets").get();

      const assetMap = {};
      assetSnap.forEach(doc => {
        const data = doc.data();
        assetMap[data.asset_id] = data;
      });

      const assignments = snap.docs.map(doc => {

        const data = doc.data();
        const asset = assetMap[data.asset_id] || {};

        return {
          assignment_id: data.assignment_id,
          asset_name: asset.asset_name || "Unknown",
          maintenance_quantity: data.maintenance_quantity || 0,
          quantity: data.quantity,
          asset_id: data.asset_id
        };

      });

      res.json(assignments);

    } catch (err) {

      console.error("Fetch assignments by officer error:", err);

      res.status(500).json({
        message: "Failed to fetch assignments"
      });

    }

  }
);

// ============================
// DELETE MAINTENANCE RECORD
// ============================

app.delete(
  "/api/store-manager/maintenance/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {

    try {

      const maintenanceId = req.params.id;

      const snap = await db
        .collection("maintenance")
        .where("maintenance_id", "==", maintenanceId)
        .limit(1)
        .get();

      if (snap.empty)
        return res.status(404).json({ message: "Maintenance record not found" });

      const doc = snap.docs[0];
      const data = doc.data();

      await doc.ref.delete();

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "MAINTENANCE_DELETED",
        asset_id: data.asset_id || null,
        reference_id: maintenanceId,
        office_id: req.user.office_id,
        timestamp: new Date(),
        remarks: `Maintenance ${maintenanceId} deleted by ${req.user.role}: ${req.user.name}`
      });

      res.json({ message: "Maintenance deleted successfully" });

    } catch (err) {

      console.error("Delete maintenance error:", err);

      res.status(500).json({ message: "Failed to delete maintenance record" });

    }

  }
);

// ============================
// DELETE MAINTENANCE WORKER
// ============================

app.delete(
  "/api/store-manager/maintenance/workers/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {

    try {

      const workerId = req.params.id;

      const snap = await db
        .collection("workers")
        .where("worker_id", "==", workerId)
        .limit(1)
        .get();

      if (snap.empty)
        return res.status(404).json({ message: "Worker not found" });

      await snap.docs[0].ref.delete();

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "WORKER_DELETED",
        reference_id: workerId,
        office_id: req.user.office_id,
        timestamp: new Date(),
        remarks: `Worker ${workerId} deleted by ${req.user.role}: ${req.user.name}`
      });

      res.json({ message: "Worker deleted successfully" });

    } catch (err) {

      console.error("Delete worker error:", err);

      res.status(500).json({ message: "Failed to delete worker" });

    }

  }
);

// =====================
// CREATE DISPOSAL RECORD
// =====================
app.post(
  "/api/store-manager/disposals",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {

      const {
        assignment_id,
        disposal_method,
        disposal_date,
        disposal_reason,
        quantity
      } = req.body;

      if (!assignment_id)
        return res.status(400).json({ message: "Assignment required" });

      if (!disposal_method)
        return res.status(400).json({ message: "Disposal method required" });

      const disposalQty = Number(quantity || 1);

      if (!quantity || quantity <= 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      // ==========================
      // FETCH ASSIGNMENT & VALIDATE
      // ==========================
      const assignmentSnap = await db
        .collection("asset_assignments")
        .where("assignment_id", "==", assignment_id)
        .limit(1)
        .get();

      if (assignmentSnap.empty)
        return res.status(404).json({ message: "Assignment not found" });

      const assignmentDoc = assignmentSnap.docs[0];
      const assignment = assignmentDoc.data();

      if (assignment.office_id !== req.user.office_id)
        return res.status(403).json({ message: "Unauthorized office asset" });

      if (assignment.returned_date)
        return res.status(400).json({ message: "Asset already returned" });

      // 🔥 FIXED LOGIC: Calculate exactly how many are safely available to dispose
      const currentQty = Number(assignment.quantity || 0);
      const maintenanceQty = Number(assignment.maintenance_quantity || 0);
      const availableToDispose = currentQty - maintenanceQty;

      if (disposalQty > availableToDispose) {
        return res.status(400).json({
          message: `Cannot dispose ${disposalQty}. You have ${currentQty} active, but ${maintenanceQty} are under maintenance. Max available: ${availableToDispose}.`
        });
      }

      // ==========================
      // FETCH ASSET NAME
      // ==========================
      const assetSnap = await db
        .collection("assets")
        .where("asset_id", "==", assignment.asset_id)
        .limit(1)
        .get();

      let asset_name = "Unknown";

      if (!assetSnap.empty) {
        asset_name = assetSnap.docs[0].data().asset_name;
      }

      // ==========================
      // GENERATE DISPOSAL ID
      // ==========================
      const disposal_id =
        "DSP-" + Math.random().toString(36).substring(2, 7).toUpperCase();


      const { status, disposal_value } = req.body;

      // ==========================
      // CREATE DISPOSAL RECORD
      // ==========================
      const disposalData = {

        disposal_id,

        assignment_id,

        asset_id: assignment.asset_id,

        asset_name,

        quantity: disposalQty,

        disposal_method,

        disposal_value: disposal_value ? Number(disposal_value) : 0,

        disposal_reason: disposal_reason || null,

        officer_id: assignment.assigned_to,

        office_id: req.user.office_id,

        created_by: req.user.user_id,

        status: status || "PENDING",

        created_at: new Date(),
        disposal_date: disposal_date ? new Date(disposal_date) : null
      };

      await db.collection("disposals").add(disposalData);

      // ==========================
      // 🔥 UPDATE ASSIGNMENT
      // ==========================
      const newQty = Number(assignment.quantity) - disposalQty;
      const prevDisposed = Number(assignment.disposed_quantity || 0);

      await assignmentDoc.ref.update({
        quantity: newQty,
        disposed_quantity: prevDisposed + disposalQty
      });

      // ==========================
      // 🔥 UPDATE INVENTORY (CRITICAL FIX)
      // ==========================
      const inventorySnap = await db
        .collection("inventory")
        .where("inventory_id", "==", assignment.inventory_id)
        .limit(1)
        .get();

      if (!inventorySnap.empty) {
        const invDoc = inventorySnap.docs[0];
        const invData = invDoc.data();

        const updatedQty =
          Number(invData.quantity || 0) - disposalQty;

        if (updatedQty > 0) {
          await invDoc.ref.update({
            quantity: updatedQty,
            status: "Available"
          });
        } else {
          // remove row if zero
          await invDoc.ref.update({
            quantity: 0,
            status: "Unavailable"
          });
        }
      }

      // ==========================
      // PREVIOUS LOCATION
      // ==========================
      let previous_location = "Unknown";

      try {

        const userSnap = await db
          .collection("Users")
          .where("user_id", "==", assignment.assigned_to)
          .limit(1)
          .get();

        if (!userSnap.empty) {
          const user = userSnap.docs[0].data();
          previous_location = user.room_id || assignment.assigned_to;
        }

      } catch (err) {
        console.error("Location lookup failed:", err);
      }

      // ==========================
      // AUDIT LOG
      // ==========================
      await db.collection("audit_logs").add({

        log_id: generateAuditId(),

        action_type: "ASSET_DISPOSED",

        reference_id: disposal_id,

        asset_id: assignment.asset_id,

        office_id: req.user.office_id,

        previous_location,

        new_location: "DISPOSED",

        timestamp: new Date(),

        remarks:
          `${disposalQty} unit(s) of ${asset_name} disposed via ${disposal_method} by ${req.user.role}: ${req.user.name}`

      });

      res.status(201).json({
        message: "Asset disposed successfully",
        disposal_id
      });

    } catch (err) {

      console.error("DISPOSAL CREATE ERROR:", err);

      res.status(500).json({
        message: "Failed to create disposal record"
      });

    }
  }
);

// =====================
// GET DISPOSAL RECORDS
// =====================
app.get(
  "/api/store-manager/disposals",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {

      const snap = await db
        .collection("disposals")
        .where("office_id", "==", req.user.office_id)
        .orderBy("created_at", "desc")
        .get();

      // ==========================
      // FETCH USERS
      // ==========================
      const usersSnap = await db
        .collection("Users")
        .where("office_id", "==", req.user.office_id)
        .get();

      const userMap = {};

      usersSnap.forEach(doc => {
        const data = doc.data();
        userMap[data.user_id] = data.name;
      });

      // ==========================
      // BUILD RESPONSE
      // ==========================
      const records = snap.docs.map(doc => {

        const data = doc.data();

        return {

          id: doc.id,

          ...data,

          officer_name:
            userMap[data.officer_id] || "Unknown",

          disposal_date: data.disposal_date?.toDate
            ? data.disposal_date.toDate()
            : data.disposal_date || null

        };

      });

      res.json(records);

    } catch (err) {

      console.error("Fetch disposal records error:", err);

      res.status(500).json({
        message: "Failed to fetch disposal records"
      });

    }
  }
);

// =====================
// UPDATE DISPOSAL
// =====================
app.patch(
  "/api/store-manager/disposals/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const { disposal_method, disposal_reason, disposal_date, quantity, status, disposal_value } = req.body;

      const snap = await db.collection("disposals").where("disposal_id", "==", req.params.id).limit(1).get();
      if (snap.empty) return res.status(404).json({ message: "Disposal not found" });

      const doc = snap.docs[0];
      const data = doc.data();

      const oldQty = Number(data.quantity);
      const newQty = quantity ? Number(quantity) : oldQty;

      const assignmentSnap = await db.collection("asset_assignments").where("assignment_id", "==", data.assignment_id).limit(1).get();
      if (assignmentSnap.empty) return res.status(404).json({ message: "Assignment not found" });

      const assignmentDoc = assignmentSnap.docs[0];
      const assignment = assignmentDoc.data();

      // ==========================
      // ADJUST ASSIGNMENT QUANTITY
      // ==========================
      const diff = newQty - oldQty;
      const prevDisposed = Number(assignment.disposed_quantity || 0);
      const updatedQty = Number(assignment.quantity) - diff; // Define updatedQty correctly!

      if (diff !== 0) {
        if (updatedQty < 0) {
          return res.status(400).json({ message: "Insufficient assignment quantity" });
        }

        await assignmentDoc.ref.update({
          quantity: updatedQty,
          disposed_quantity: prevDisposed + diff
        });
      }

      // ==========================
      // UPDATE DISPOSAL RECORD
      // ==========================
      await doc.ref.update({
        disposal_method: disposal_method || data.disposal_method,
        disposal_reason: disposal_reason || data.disposal_reason,
        disposal_date: disposal_date
          ? new Date(disposal_date)
          : data.disposal_date || null,
        quantity: newQty,
        disposal_value: disposal_value ? Number(disposal_value) : data.disposal_value,
        status: status || data.status
      });

      // ==========================
      // AUDIT LOG
      // ==========================
      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "DISPOSAL_UPDATED",
        reference_id: data.disposal_id,
        asset_id: data.asset_id,
        office_id: req.user.office_id,
        timestamp: new Date(),
        remarks: `Disposal ${data.disposal_id} updated by ${req.user.role}: ${req.user.name}`
      });

      res.json({ message: "Disposal updated successfully" });
    } catch (err) {
      console.error("Update disposal error:", err);
      res.status(500).json({ message: "Failed to update disposal" });
    }
  }
);

// =====================
// DELETE DISPOSAL
// =====================
app.delete(
  "/api/store-manager/disposals/:id",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const snap = await db.collection("disposals").where("disposal_id", "==", req.params.id).limit(1).get();
      if (snap.empty) return res.status(404).json({ message: "Disposal not found" });

      const doc = snap.docs[0];
      const data = doc.data();

      // ==========================
      // RESTORE ASSIGNMENT QTY
      // ==========================
      const assignmentSnap = await db.collection("asset_assignments").where("assignment_id", "==", data.assignment_id).limit(1).get();

      if (!assignmentSnap.empty) {
        const assignmentDoc = assignmentSnap.docs[0];
        const assignment = assignmentDoc.data();

        const restoredQty = Number(assignment.quantity) + Number(data.quantity);
        const prevDisposed = Number(assignment.disposed_quantity || 0);

        await assignmentDoc.ref.update({
          quantity: restoredQty,
          disposed_quantity: Math.max(prevDisposed - Number(data.quantity), 0) // FIXED SYNTAX ERROR HERE
        });
      }

      await doc.ref.delete();

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "DISPOSAL_DELETED",
        reference_id: data.disposal_id,
        asset_id: data.asset_id,
        office_id: req.user.office_id,
        previous_location: "DISPOSED",
        new_location: "RESTORED_ASSIGNMENT",
        timestamp: new Date(),
        remarks: `Disposal ${data.disposal_id} deleted by ${req.user.role}: ${req.user.name}`
      });

      res.json({ message: "Disposal deleted successfully" });
    } catch (err) {
      console.error("Delete disposal error:", err);
      res.status(500).json({ message: "Failed to delete disposal" });
    }
  }
);

// ====================
// ✅ APPROVE REQUEST 
// ====================
app.patch(
  "/api/store-manager/requests/:id/approve",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {
      const requestId = req.params.id;

      // 🔍 Fetch request
      const snap = await db
        .collection("Requests")
        .where("request_id", "==", requestId)
        .limit(1)
        .get();

      if (snap.empty)
        return res.status(404).json({ message: "Request not found" });

      const doc = snap.docs[0];
      const request = doc.data();

      if (request.status !== "PENDING")
        return res.status(400).json({ message: "Already processed" });

      if (request.office_id !== req.user.office_id)
        return res.status(403).json({ message: "Unauthorized" });

      /* =========================================
          🔁 HANDLE BY TYPE
       ========================================= */

      switch (request.request_type) {

        /* ================= RETURN ================= */
        case "RETURN": {
          const assignmentSnap = await db
            .collection("asset_assignments")
            .where("assignment_id", "==", request.assignment_id)
            .limit(1)
            .get();

          if (assignmentSnap.empty)
            return res.status(404).json({ message: "Assignment not found" });

          const assignmentDoc = assignmentSnap.docs[0];
          const assignment = assignmentDoc.data();

          const returnQty = Number(request.quantity || 0);

          if (returnQty <= 0)
            return res.status(400).json({ message: "Invalid return quantity" });

          // 🔥 Check disposal (prevent returning disposed items)
          const disposalSnap = await db
            .collection("disposals")
            .where("assignment_id", "==", assignment.assignment_id)
            .get();

          let disposedQty = 0;
          disposalSnap.forEach(d => {
            disposedQty += Number(d.data().quantity || 0);
          });

          const activeQty = Number(assignment.quantity) - disposedQty;

          if (returnQty > activeQty)
            return res.status(400).json({
              message: "Cannot return disposed assets"
            });

          // 🔄 Inventory fetch
          const inventorySnap = await db
            .collection("inventory")
            .where("inventory_id", "==", assignment.inventory_id)
            .limit(1)
            .get();

          if (inventorySnap.empty)
            return res.status(404).json({ message: "Inventory not found" });

          const invDoc = inventorySnap.docs[0];
          const invData = invDoc.data();

          const newAssignmentQty =
            Number(assignment.quantity) - returnQty;

          const newInventoryQty =
            Number(invData.quantity || 0) + returnQty;

          // 🔒 TRANSACTION
          await db.runTransaction(async (t) => {
            t.update(assignmentDoc.ref, {
              quantity: newAssignmentQty,
              returned_date:
                newAssignmentQty === 0 ? new Date() : null
            });

            t.update(invDoc.ref, {
              quantity: newInventoryQty,
              status: newInventoryQty > 0 ? "Available" : "Unavailable"
            });
          });

          break;
        }

        /* ================= REDIRECT TYPES ================= */
        case "ISSUE":
        case "MAINTENANCE":
        case "DISPOSAL":
        case "PROCUREMENT":
          break;

        default:
          return res.status(400).json({ message: "Invalid request type" });
      }

      /* =========================================
         ✅ FINAL UPDATE
      ========================================= */

      await doc.ref.update({
        status: "APPROVED",
        approved_at: new Date(),
        approved_by: req.user.user_id
      });

      /* =========================================
         🧾 AUDIT
      ========================================= */

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "REQUEST_APPROVED",
        reference_id: request.request_id,
        asset_id: request.asset_id || null,
        office_id: req.user.office_id,
        timestamp: new Date(),
        remarks: `${request.request_type} approved by ${req.user.role}: ${req.user.name}`
      });

      res.json({ message: "Request approved successfully" });

    } catch (err) {
      console.error("APPROVE REQUEST ERROR:", err);
      res.status(500).json({ message: "Failed to approve request" });
    }
  }
);

// ==============================
// ❌ REJECT REQUEST
// ==============================
app.patch(
  "/api/store-manager/requests/:id/reject",
  authenticate,
  authorizeRole(["store manager"]),
  async (req, res) => {
    try {

      const requestId = req.params.id;

      const snap = await db
        .collection("Requests")
        .where("request_id", "==", requestId)
        .limit(1)
        .get();

      if (snap.empty) {
        return res.status(404).json({ message: "Request not found" });
      }

      const doc = snap.docs[0];
      const request = doc.data();

      if (request.status !== "PENDING") {
        return res.status(400).json({ message: "Already processed" });
      }

      if (request.office_id !== req.user.office_id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await doc.ref.update({
        rejection_reason: req.body.rejection_reason || "",
        status: "REJECTED",
        rejected_at: new Date(),
        rejected_by: req.user.user_id
      });

      await db.collection("audit_logs").add({
        log_id: generateAuditId(),
        action_type: "REQUEST_REJECTED",
        reference_id: request.request_id,
        asset_id: request.asset_id || null,
        office_id: req.user.office_id,
        timestamp: new Date(),
        remarks: `${request.request_type} request rejected by ${req.user.role}: ${req.user.name}`
      });

      res.json({ message: "Request rejected successfully" });

    } catch (err) {
      console.error("REJECT REQUEST ERROR:", err);
      res.status(500).json({ message: "Failed to reject request" });
    }
  }
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});