import { useState } from "react";
import {
  Shield,
  Smartphone,
  BookX,
  Camera,
  AlertTriangle,
  Clock,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import {
  SECURITY_EVENTS,
  DEVICE_RESET_REQUESTS,
  getSecurityStats,
  getEventLabel,
  getSeverityColor,
  getEventTypeColor,
  approveDeviceReset,
  rejectDeviceReset,
  type SecurityEvent,
  type DeviceResetRequest,
  type SecuritySeverity,
  type SecurityEventType,
} from "@/data/mockSecurityData";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SEVERITY_DOT: Record<SecuritySeverity, string> = {
  low:      "bg-slate-400",
  medium:   "bg-amber-500",
  high:     "bg-orange-500",
  critical: "bg-red-500",
};

const RESET_STATUS_STYLE: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

// ── Event detail modal ────────────────────────────────────────────────────────

function EventDetailModal({
  event,
  onClose,
}: {
  event: SecurityEvent;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getEventTypeColor(event.type)}`}>
                {getEventLabel(event.type)}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSeverityColor(event.severity)}`}>
                {event.severity.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{event.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* User */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Student</p>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="font-medium text-sm">{event.userName}</p>
              <p className="text-xs text-muted-foreground">{event.userEmail}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">ID: {event.userId}</p>
            </div>
          </div>

          {/* Book */}
          {event.bookTitle && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Book</p>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="font-medium text-sm">{event.bookTitle}</p>
                {event.bookId && <p className="text-xs text-muted-foreground font-mono">ID: {event.bookId}</p>}
              </div>
            </div>
          )}

          {/* Device */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Device</p>
            <div className="bg-muted/40 rounded-lg p-3 font-mono text-sm">{event.deviceId}</div>
          </div>

          {/* Message */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Message</p>
            <p className="text-sm text-foreground leading-relaxed">{event.message}</p>
          </div>

          {/* Metadata */}
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Metadata</p>
              <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                {Object.entries(event.metadata).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-mono">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>{formatDate(event.createdAt)}</span>
          </div>

          {/* Recommended action */}
          {(event.severity === "critical" || event.severity === "high") && (
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-orange-700 mb-1">Recommended Action</p>
              <p className="text-xs text-orange-700">
                {event.type === "device_blocked" || event.type === "suspicious_activity"
                  ? "Review student account and consider temporary suspension if activity continues."
                  : event.type === "screenshot_attempt"
                  ? "Log confirmed. Screenshot protection was active. Monitor for repeat attempts."
                  : event.type === "reader_access_denied" || event.type === "license_check_failed"
                  ? "Verify student's purchase history. Consider reaching out if access issues persist."
                  : "Review this event and take appropriate action."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reset request row ─────────────────────────────────────────────────────────

function ResetRequestRow({
  req,
  onApprove,
  onReject,
}: {
  req: DeviceResetRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b last:border-0">
      <div
        className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm">{req.userName}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RESET_STATUS_STYLE[req.status]}`}>
              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{req.userEmail}</p>
        </div>
        <div className="text-xs font-mono text-muted-foreground hidden md:block">{req.deviceId}</div>
        <div className="text-xs text-muted-foreground hidden lg:block">{timeAgo(req.createdAt)}</div>
        <ChevronRight size={14} className={`text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </div>

      {expanded && (
        <div className="px-6 pb-4 space-y-3">
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Reason</p>
            <p className="text-sm">{req.reason}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>Submitted: {formatDate(req.createdAt)}</span>
            {req.resolvedAt && (
              <>
                <span>·</span>
                <span>Resolved: {formatDate(req.resolvedAt)}</span>
                {req.resolvedBy && <span>by {req.resolvedBy}</span>}
              </>
            )}
          </div>
          {req.status === "pending" && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(req.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
              >
                <CheckCircle size={13} /> Approve
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReject(req.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
              >
                <XCircle size={13} /> Reject
              </button>
              <p className="text-xs text-muted-foreground ml-1">
                Approving allows the student to register a new device on next login.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ALL_TYPES: SecurityEventType[] = [
  "device_blocked", "device_registered", "device_verified",
  "device_reset_requested", "device_reset_approved", "device_reset_rejected",
  "reader_opened", "reader_access_denied", "license_check_failed",
  "screenshot_attempt", "suspicious_activity",
];

const ALL_SEVERITIES: SecuritySeverity[] = ["critical", "high", "medium", "low"];

export default function SecurityPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState(SECURITY_EVENTS);
  const [requests, setRequests] = useState(DEVICE_RESET_REQUESTS);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [filterType, setFilterType] = useState<SecurityEventType | "all">("all");
  const [filterSeverity, setFilterSeverity] = useState<SecuritySeverity | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [, forceRerender] = useState(0);

  const stats = getSecurityStats();

  const filteredEvents = events.filter((e) => {
    if (filterType !== "all" && e.type !== filterType) return false;
    if (filterSeverity !== "all" && e.severity !== filterSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.userName.toLowerCase().includes(q) ||
        e.userEmail.toLowerCase().includes(q) ||
        (e.bookTitle ?? "").toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApprove = (id: string) => {
    approveDeviceReset(id, user?.email ?? "admin@warqless.com");
    setRequests([...DEVICE_RESET_REQUESTS]);
    setEvents([...SECURITY_EVENTS]);
    forceRerender((n) => n + 1);
  };

  const handleReject = (id: string) => {
    rejectDeviceReset(id, user?.email ?? "admin@warqless.com");
    setRequests([...DEVICE_RESET_REQUESTS]);
    setEvents([...SECURITY_EVENTS]);
    forceRerender((n) => n + 1);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Security & Monitoring"
        subtitle="Track security events, device activity, and content protection across the platform."
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total Events"        value={stats.totalEvents}        icon={Shield}        trend={+5} iconColor="text-blue-600"   iconBg="bg-blue-50" />
        <StatCard title="Device Blocked"      value={stats.deviceBlocked}      icon={Smartphone}    trend={+2} iconColor="text-red-600"    iconBg="bg-red-50" />
        <StatCard title="Access Denied"       value={stats.accessDenied}       icon={BookX}         trend={-1} iconColor="text-orange-600" iconBg="bg-orange-50" />
        <StatCard title="Screenshots"         value={stats.screenshotAttempts} icon={Camera}        trend={+1} iconColor="text-red-600"    iconBg="bg-red-50" />
        <StatCard title="Pending Resets"      value={stats.pendingResets}      icon={RefreshCw}     trend={0}  iconColor="text-amber-600"  iconBg="bg-amber-50" />
        <StatCard title="Critical Events"     value={stats.criticalEvents}     icon={AlertTriangle} trend={+3} iconColor="text-red-700"    iconBg="bg-red-50" />
      </div>

      {/* Device Reset Requests */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-semibold text-base">Device Reset Requests</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Students requesting to link a new physical device to their account
            </p>
          </div>
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {requests.filter((r) => r.status === "pending").length} pending
          </span>
        </div>
        {requests.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">No device reset requests.</div>
        ) : (
          requests.map((req) => (
            <ResetRequestRow
              key={req.id}
              req={req}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </div>

      {/* Security Events */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 border-b">
          <div className="flex-1">
            <h2 className="font-semibold text-base">Security Events</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{filteredEvents.length} of {events.length} events</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as SecuritySeverity | "all")}
              className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Severity</option>
              {ALL_SEVERITIES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as SecurityEventType | "all")}
              className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Types</option>
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>{getEventLabel(t)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">Event</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Book</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Device</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEvents.map((event) => (
                <tr
                  key={event.id}
                  className="hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => setSelectedEvent(event)}
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[event.severity]}`} />
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getEventTypeColor(event.type)}`}>
                        {getEventLabel(event.type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-xs leading-tight">{event.userName}</p>
                    <p className="text-muted-foreground text-xs">{event.userEmail}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <p className="text-xs text-muted-foreground max-w-[160px] truncate">
                      {event.bookTitle ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">{event.deviceId}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden xl:table-cell">
                    <span className="text-xs text-muted-foreground">{timeAgo(event.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    No events match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MVP notice */}
      <div className="border border-dashed border-amber-300 bg-amber-50 rounded-xl p-4 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">MVP / Demo Mode</p>
        <p>
          Security events shown here are pre-populated mock data. In production, all events must be logged
          server-side in real time (tamper-proof). Device binding, license verification, and admin approvals
          must be enforced by the backend — not the client.
        </p>
        <p>
          Student app also logs events locally in AsyncStorage (separate from this dashboard).
          Production requires a shared backend event log visible to all admin users in real time.
        </p>
      </div>

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
