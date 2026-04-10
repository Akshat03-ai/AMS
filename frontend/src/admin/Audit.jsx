import React, { useEffect, useState, useCallback } from "react";
import { getAuth } from "firebase/auth";
import { FiFileText } from "react-icons/fi";
import "./Audit.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";

function Audit() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState("");
    const [action, setAction] = useState("");
    const [loading, setLoading] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const auth = getAuth();
            const user = auth.currentUser;

            const token = await user.getIdToken();

            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (action) params.append("action", action);

            const res = await fetch(
                `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/audit-logs?${params.toString()}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await res.json();
            setLogs(data);
        } catch (err) {
            console.error("Fetch audit logs failed", err);
        } finally {
            setLoading(false);
        }
    }, [search, action]);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchLogs();
            }
        });

        return () => unsubscribe();
    }, [fetchLogs]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const getReferenceLabel = (log) => {
        if (!log.action_type) return "Entity";

        if (log.action_type.includes("DISPOSAL")) return "Disposal";
        if (log.action_type.includes("DISPOSED")) return "Disposal";
        if (log.action_type.includes("DEPARTMENT")) return "Department";
        if (log.action_type.includes("OFFICE")) return "Office";
        if (log.action_type.includes("ASSIGNED")) return "Assignment";
        if (log.action_type.includes("ASSIGNMENT")) return "Assignment";
        if (log.action_type.includes("ASSET")) return "Asset";
        if (log.action_type.includes("USER")) return "User";
        if (log.action_type.includes("INVENTORY")) return "Inventory";
        if (log.action_type.includes("PURCHASE")) return "Purchase";
        if (log.action_type.includes("VENDOR")) return "Vendor";
        if (log.action_type.includes("REQUEST")) return "Request";
        if (log.action_type.includes("MAINTENANCE")) return "Maintenance";
        if (log.action_type.includes("WORKER")) return "Worker";

        return "Entity";
    };

    const formatTime = (t) => {
        if (!t) return "-";

        // Firestore Timestamp (Admin SDK sometimes serializes like this)
        if (typeof t === "object") {
            if (t.seconds) {
                return new Date(t.seconds * 1000).toLocaleString();
            }
            if (t._seconds) {
                return new Date(t._seconds * 1000).toLocaleString();
            }
        }

        // ISO string
        if (typeof t === "string") {
            const d = new Date(t);
            return isNaN(d) ? "-" : d.toLocaleString();
        }

        return "-";
    };

    const exportCSV = () => {
        const headers = ["Log ID", "Timestamp", "Action", "Reference", "Asset ID", "Previous Location", "New Location", "Remarks"];

        const rows = logs.map(l => [
            l.log_id || l.id || "",
            formatTime(l.timestamp), // Now using your helper
            l.action_type || "",
            l.reference_id || "",
            l.asset_id || "",
            l.previous_location || "",
            l.new_location || "",
            l.remarks || "",
        ]);

        const csv = [headers, ...rows]
            .map(r => r.join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `audit_report_${new Date().getTime()}.csv`; // Added unique filename
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportPDF = () => {
        const doc = new jsPDF("landscape");
        doc.text("Audit Log Report", 14, 15);

        const tableData = logs.map(l => [
            l.log_id || l.id || "-",
            formatTime(l.timestamp), // Consistent formatting
            l.action_type || "-",
            l.reference_id || "-",
            l.asset_id || "-",
            l.previous_location || "-",
            l.new_location || "-",
            l.remarks || "-",
        ]);

        autoTable(doc, {
            head: [["Log ID", "Time", "Action", "Reference", "Asset ID", "Prev Location", "New Location", "Remarks"]],
            body: tableData,
            startY: 25,
            styles: { fontSize: 7 }, // Shrank font slightly for better fit in landscape
            headStyles: { fillColor: [30, 58, 138] },
        });

        doc.save("audit_report.pdf");
    };

    return (
        <div className="admin-audit-page">
            <div className="audit-header">
                <button className="back-btn mobile-back-btn" onClick={() => navigate("/admin/dashboard")}>
                    ← Back
                </button>

                <h1><FiFileText /> Audit Logs</h1>
            </div>

            <div className="audit-controls">
                <input
                    placeholder="Search reference or remarks…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                >
                    <option value="">All Actions</option>
                    <option value="USER_CREATED">User Created</option>
                    <option value="USER_UPDATED">User Updated</option>
                    <option value="OFFICE_CREATED">Office Created</option>
                    <option value="OFFICE_UPDATED">Office Updated</option>
                    <option value="DEPARTMENT_CREATED">Department Created</option>
                    <option value="DEPARTMENT_UPDATED">Department Updated</option>
                </select>

                <button
                    className="primary-buttn"
                    onClick={() => setShowReportModal(true)}
                    disabled={logs.length === 0}
                >
                    Generate Report
                </button>

            </div>

            {showReportModal && (
                <div className="modal-backdrop">
                    <div className="modal-card">
                        <button
                            className="modal-close"
                            onClick={() => setShowReportModal(false)}
                        >
                            ✕
                        </button>

                        <div className="modal-title">
                            <h3>Generate Audit Report</h3>
                            <p>Select report format:</p>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="primary-button"
                                onClick={() => {
                                    exportPDF();
                                    setShowReportModal(false);
                                }}
                            >
                                PDF
                            </button>

                            <button
                                className="secondary-button"
                                onClick={() => {
                                    exportCSV();
                                    setShowReportModal(false);
                                }}
                            >
                                CSV
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {loading && <p>Loading audit logs…</p>}

            {
                !loading && logs.length === 0 && (
                    <div className="no-results">No audit logs found</div>
                )
            }

            {
                !loading && logs.length > 0 && (
                    <div className="table-scroll">
                    <table className="audit-table">
                        <thead>
                            <tr>
                                <th>Log ID</th>
                                <th>Timestamp</th>
                                <th>Action</th>
                                <th>Reference</th>
                                <th>Asset ID</th>
                                <th>Previous Location</th>
                                <th>New Location</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((l) => (
                                <tr key={l.log_id}>
                                    <td>{l.log_id || "-"}</td>

                                    <td>{formatTime(l.timestamp)}</td>

                                    <td>
                                        <span className="audit-action">{l.action_type}</span>
                                    </td>

                                    <td>
                                        {l.reference_id
                                            ? `${getReferenceLabel(l)}: ${l.reference_id}`
                                            : "-"}
                                    </td>

                                    <td>{l.asset_id || "-"}</td>
                                    <td>{l.previous_location || "-"}</td>
                                    <td>{l.new_location || "-"}</td>
                                    <td>{l.remarks || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                )
            }
        </div >
    );
}

export default Audit;
