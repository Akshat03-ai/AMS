# 🏢 Government Asset Management System (AMS)

A full-stack web application designed to digitize and streamline the lifecycle of government assets — from procurement to disposal — with complete transparency, accountability, and auditability.

---

## 🚀 Overview

The Government Asset Management System (AMS) is built to eliminate manual asset tracking inefficiencies by providing a centralized platform for managing inventory, assignments, maintenance, and disposal operations.

It ensures:

* 📊 Real-time visibility of assets
* 🔐 Secure role-based access
* 🧾 Complete audit trails for accountability
* ⚙️ Automated workflows for asset lifecycle management

---

## ✨ Key Features

### 📦 Inventory Management

* Add, update, and manage assets across departments
* Smart merging of inventory based on status and condition
* Real-time quantity tracking

### 🔄 Asset Assignment System

* Assign assets to employees (officers)
* Track active vs returned assets
* Prevent over-allocation conflicts

### 🛠 Maintenance Management

* Create and manage maintenance records
* Assign maintenance workers
* Track assets under maintenance without affecting inventory

### 🗑 Disposal Management

* Dispose assets safely with validation checks
* Prevent disposal of assets under maintenance
* Automatically adjust assignment quantities

### 📄 Request Workflow System

* Officers can request:

  * Asset return
  * Maintenance
  * Disposal
* Store Manager approval/rejection system
* Status tracking (Pending / Approved / Rejected)

### 📊 Dashboard & Analytics

* Real-time stats:

  * Total assets
  * Inventory vs assigned
  * Asset value
* Office-level insights for store managers

### 🔐 Role-Based Access Control

* **Admin**

  * Manage departments, offices, users
* **Store Manager**

  * Manage inventory, assignments, maintenance, disposal
* **Officer**

  * View assigned assets, raise requests

### 🧾 Audit Logging System

* Tracks every critical action:

  * Asset creation/update/deletion
  * Inventory changes
  * Assignments & returns
  * Maintenance & disposal
* Ensures full traceability

---

## 🏗️ System Architecture

```text
Frontend (React)
        ↓
Backend (Node.js + Express)
        ↓
Firebase (Auth + Firestore)
```

---

## ⚙️ Tech Stack

### 🖥 Frontend

* React.js
* CSS3
* HTML5
* Lucide Icons

### 🔧 Backend

* Node.js
* Express.js
* Firebase Admin SDK

### 🗄 Database

* Firebase Firestore

### 🔐 Authentication

* Firebase Authentication

### ☁️ Deployment

* Frontend: Firebase Hosting
* Backend: Render

---

## 🌐 Live Demo

👉 https://asset-management-system-ca288.web.app

---

## 📂 Project Structure

```bash
AMS/
│── frontend/          # React App
│── backend/           # Express API
│── firebase/          # Firebase config
│── README.md
```

---

## ⚡ Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/AMS.git
cd AMS
```

---

### 2️⃣ Setup Frontend

```bash
cd frontend
npm install
```

Create `.env` file:

```env
REACT_APP_API_BASE=your_backend_url
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

Run:

```bash
npm start
```

---

### 3️⃣ Setup Backend

```bash
cd backend
npm install
```

Create `.env`:

```env
PORT=5000
FIREBASE_ADMIN_CREDENTIALS=your_credentials
```

Run:

```bash
node index.js
```

---

## 🔥 Key Design Decisions

* ✔ Inventory is **not reduced during maintenance**
* ✔ Inventory is **reduced only during disposal**
* ✔ Assignment quantity reflects:

  * Active assets
  * Maintenance assets
  * Disposed assets
* ✔ Prevents logical conflicts (over-assignment, invalid disposal)

---

## 🧪 Future Improvements

* 📈 Advanced analytics dashboard
* 📤 Export reports (PDF / Excel)
* 🔔 Notifications system
* 📱 Mobile responsiveness improvements
* 🧠 Predictive maintenance (AI-based)


## 🤝 Contribution

Contributions are welcome! Feel free to fork and submit pull requests.


## 📜 License

This project is for academic and demonstration purposes.


## 👨‍💻 Author

Akshat Dubey

MCA Student | Full Stack Developer
