import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BookX,
  Camera,
  CheckCircle,
  ChevronRight,
  Clock,
  RefreshCw,
  Shield,
  Smartphone,
  X,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import { useAdminLanguage, type AdminLanguage } from "@/context/AdminLanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  approveDeviceResetRequest,
  fetchDeviceResetRequests,
  fetchSecurityEvent,
  fetchSecurityEvents,
  fetchSecurityMetrics,
  rejectDeviceResetRequest,
  reviewSecurityEvent,
  type DeviceResetRequest,
  type SecurityEvent,
  type SecurityEventType,
  type SecurityMetrics,
  type SecuritySeverity,
} from "@/lib/apiSync";

function formatDateTime(iso: string, language: AdminLanguage): string {
  const d = new Date(iso);
  const locale = language === "ar" ? "ar-EG" : "en-GB";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
    + " " + d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string, language: AdminLanguage): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (language === "ar") {
    if (m < 1) return "الآن";
    if (m < 60) return `منذ ${m}د`;
    const h = Math.floor(m / 60);
    if (h < 24) return `منذ ${h}س`;
    return `منذ ${Math.floor(h / 24)}ي`;
  }
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getSeverityColor(severity: SecuritySeverity): string {
  return {
    low: "bg-slate-100 text-slate-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  }[severity];
}

function getEventTypeColor(type: SecurityEventType): string {
  const critical: SecurityEventType[] = ["device_blocked", "screenshot_attempt", "suspicious_activity"];
  const high: SecurityEventType[] = ["reader_access_denied", "license_check_failed", "two_factor_failed", "phone_verification_failed"];
  const medium: SecurityEventType[] = [
    "device_reset_requested",
    "device_reset_rejected",
    "two_factor_challenge_sent",
    "phone_changed",
    "phone_verification_code_sent",
  ];
  if (critical.includes(type)) return "bg-red-50 text-red-700 border-red-200";
  if (high.includes(type)) return "bg-orange-50 text-orange-700 border-orange-200";
  if (medium.includes(type)) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

const SEVERITY_DOT: Record<SecuritySeverity, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const RESET_STATUS_STYLE: Record<DeviceResetRequest["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const ALL_TYPES: SecurityEventType[] = [
  "device_blocked",
  "device_registered",
  "device_verified",
  "device_reset_requested",
  "device_reset_approved",
  "device_reset_rejected",
  "reader_opened",
  "reader_access_denied",
  "license_check_failed",
  "screenshot_attempt",
  "suspicious_activity",
  "phone_changed",
  "phone_verification_code_sent",
  "phone_verified",
  "phone_verification_failed",
  "two_factor_enabled",
  "two_factor_disabled",
  "two_factor_challenge_sent",
  "two_factor_success",
  "two_factor_failed",
];

const ALL_SEVERITIES: SecuritySeverity[] = ["critical", "high", "medium", "low"];
const RESET_STATUSES: DeviceResetRequest["status"][] = ["pending", "approved", "rejected"];

function EventDetailModal({
  event,
  loading,
  error,
  reviewing,
  onClose,
  onReview,
}: {
  event: SecurityEvent | null;
  loading: boolean;
  error: string | null;
  reviewing: boolean;
  onClose: () => void;
  onReview: () => void;
}) {
  const { t, language } = useAdminLanguage();

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b">
          <div>
            {event ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getEventTypeColor(event.type)}`}>
                    {t.security.eventTypes[event.type]}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSeverityColor(event.severity)}`}>
                    {t.security.severities[event.severity]}
                  </span>
                  {event.reviewed && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {t.security.reviewed}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{event.id}</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-foreground">{t.security.securityEvents}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading && (
            <div className="py-10 text-center text-sm text-muted-foreground">{t.security.loading}</div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {event && !loading && !error && (
            <>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t.security.detailsStudent}</p>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="font-medium text-sm">{event.userName}</p>
                  <p className="text-xs text-muted-foreground">{event.userEmail}</p>
                  {event.userId && <p className="text-xs text-muted-foreground font-mono mt-1">ID: {event.userId}</p>}
                </div>
              </div>

              {event.bookTitle && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t.security.detailsBook}</p>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="font-medium text-sm">{event.bookTitle}</p>
                    {event.bookId && <p className="text-xs text-muted-foreground font-mono">ID: {event.bookId}</p>}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t.security.detailsDevice}</p>
                <div className="bg-muted/40 rounded-lg p-3 font-mono text-sm">{event.deviceIdMasked ?? "—"}</div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t.security.detailsMessage}</p>
                <p className="text-sm text-foreground leading-relaxed">{event.message}</p>
              </div>

              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t.security.detailsMetadata}</p>
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                    {Object.entries(event.metadata).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 text-xs">
                        <span className="text-muted-foreground font-mono">{k}</span>
                        <span className="font-medium text-end break-words">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={12} />
                <span>{formatDateTime(event.createdAt, language)}</span>
              </div>

              {(event.severity === "critical" || event.severity === "high") && (
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-orange-700 mb-1">{t.security.recommendedAction}</p>
                  <p className="text-xs text-orange-700">{t.security.recommendedDefault}</p>
                </div>
              )}

              {!event.reviewed && (
                <button
                  type="button"
                  onClick={onReview}
                  disabled={reviewing}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {reviewing ? t.security.loading : t.security.markReviewed}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetRequestRow({
  req,
  busy,
  onApprove,
  onReject,
}: {
  req: DeviceResetRequest;
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { t, language } = useAdminLanguage();
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
              {t.common[req.status]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{req.userEmail}</p>
        </div>
        <div className="text-xs font-mono text-muted-foreground hidden md:block">{req.currentDeviceId}</div>
        <div className="text-xs text-muted-foreground hidden lg:block">{timeAgo(req.requestedAt, language)}</div>
        <ChevronRight size={14} className={`text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </div>

      {expanded && (
        <div className="px-6 pb-4 space-y-3">
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">{t.security.reason}</p>
            <p className="text-sm">{req.reason}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>{t.security.submitted}: {formatDateTime(req.requestedAt, language)}</span>
            {req.resolvedAt && (
              <>
                <span>·</span>
                <span>{t.security.resolved}: {formatDateTime(req.resolvedAt, language)}</span>
                {req.resolvedByAdminId && <span>by {req.resolvedByAdminId}</span>}
              </>
            )}
          </div>
          {req.status === "pending" && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={(e) => { e.stopPropagation(); onApprove(req.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                <CheckCircle size={13} /> {t.security.approve}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => { e.stopPropagation(); onReject(req.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors disabled:opacity-60"
              >
                <XCircle size={13} /> {t.security.reject}
              </button>
              <p className="text-xs text-muted-foreground ml-1">{t.security.approveHint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SecurityPage() {
  const { user } = useAuth();
  const { t, language } = useAdminLanguage();
  const { toast } = useToast();

  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [requests, setRequests] = useState<DeviceResetRequest[]>([]);
  const [requestTotal, setRequestTotal] = useState(0);

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventDetailLoading, setEventDetailLoading] = useState(false);
  const [eventDetailError, setEventDetailError] = useState<string | null>(null);
  const [reviewingEvent, setReviewingEvent] = useState(false);

  const [filterType, setFilterType] = useState<SecurityEventType | "all">("all");
  const [filterSeverity, setFilterSeverity] = useState<SecuritySeverity | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatus, setRequestStatus] = useState<DeviceResetRequest["status"] | "all">("all");
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      setMetrics(await fetchSecurityMetrics(user));
    } catch (error) {
      setMetricsError(error instanceof Error ? error.message : t.security.loadError);
    } finally {
      setMetricsLoading(false);
    }
  }, [t.security.loadError, user]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const data = await fetchSecurityEvents({
        user,
        search: searchQuery,
        severity: filterSeverity,
        type: filterType,
        dateFrom,
        dateTo,
        limit: 100,
      });
      setEvents(data.events);
      setEventTotal(data.total);
    } catch (error) {
      setEventsError(error instanceof Error ? error.message : t.security.loadError);
      setEvents([]);
      setEventTotal(0);
    } finally {
      setEventsLoading(false);
    }
  }, [dateFrom, dateTo, filterSeverity, filterType, searchQuery, t.security.loadError, user]);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const data = await fetchDeviceResetRequests({
        user,
        status: requestStatus,
        search: requestSearch,
        limit: 100,
      });
      setRequests(data.requests);
      setRequestTotal(data.total);
    } catch (error) {
      setRequestsError(error instanceof Error ? error.message : t.security.loadError);
      setRequests([]);
      setRequestTotal(0);
    } finally {
      setRequestsLoading(false);
    }
  }, [requestSearch, requestStatus, t.security.loadError, user]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadMetrics(), loadRequests(), loadEvents()]);
  }, [loadEvents, loadMetrics, loadRequests]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadEvents();
    }, 250);
    return () => window.clearTimeout(id);
  }, [loadEvents]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadRequests();
    }, 250);
    return () => window.clearTimeout(id);
  }, [loadRequests]);

  const openEventDetail = async (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedEvent(null);
    setEventDetailError(null);
    setEventDetailLoading(true);

    try {
      setSelectedEvent(await fetchSecurityEvent(user, eventId));
    } catch (error) {
      setEventDetailError(error instanceof Error ? error.message : t.security.loadError);
    } finally {
      setEventDetailLoading(false);
    }
  };

  const handleReviewEvent = async () => {
    if (!selectedEventId) return;
    setReviewingEvent(true);
    try {
      const event = await reviewSecurityEvent(user, selectedEventId);
      setSelectedEvent(event);
      toast({ title: t.security.reviewSuccess });
      await loadEvents();
      await loadMetrics();
    } catch (error) {
      toast({
        title: t.security.actionError,
        description: error instanceof Error ? error.message : t.security.loadError,
        variant: "destructive",
      });
    } finally {
      setReviewingEvent(false);
    }
  };

  const handleApprove = async (id: string) => {
    setBusyRequestId(id);
    try {
      await approveDeviceResetRequest(user, id);
      toast({ title: t.security.approveSuccess });
      await refreshAll();
    } catch (error) {
      toast({
        title: t.security.actionError,
        description: error instanceof Error ? error.message : t.security.loadError,
        variant: "destructive",
      });
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleReject = async (id: string) => {
    setBusyRequestId(id);
    try {
      await rejectDeviceResetRequest(user, id);
      toast({ title: t.security.rejectSuccess });
      await refreshAll();
    } catch (error) {
      toast({
        title: t.security.actionError,
        description: error instanceof Error ? error.message : t.security.loadError,
        variant: "destructive",
      });
    } finally {
      setBusyRequestId(null);
    }
  };

  const metricValue = (value: number | undefined) => metricsLoading ? "..." : value ?? 0;
  const trendValue = (key: keyof SecurityMetrics["monthOverMonth"]) => metrics?.monthOverMonth[key] ?? undefined;
  const metricSubtitle = (key: keyof SecurityMetrics["monthOverMonth"]) =>
    metricsLoading
      ? t.security.loading
      : metrics?.monthOverMonth[key] === null
      ? t.security.noComparisonData
      : undefined;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={t.security.title} subtitle={t.security.subtitle} />

      {metricsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {metricsError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title={t.security.totalEvents} value={metricValue(metrics?.totalEvents)} subtitle={metricSubtitle("totalEvents")} icon={Shield} trend={trendValue("totalEvents")} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title={t.security.deviceBlocked} value={metricValue(metrics?.deviceBlocked)} subtitle={metricSubtitle("deviceBlocked")} icon={Smartphone} trend={trendValue("deviceBlocked")} iconColor="text-red-600" iconBg="bg-red-50" />
        <StatCard title={t.security.accessDenied} value={metricValue(metrics?.accessDenied)} subtitle={metricSubtitle("accessDenied")} icon={BookX} trend={trendValue("accessDenied")} iconColor="text-orange-600" iconBg="bg-orange-50" />
        <StatCard title={t.security.screenshots} value={metricValue(metrics?.screenshots)} subtitle={metricSubtitle("screenshots")} icon={Camera} trend={trendValue("screenshots")} iconColor="text-red-600" iconBg="bg-red-50" />
        <StatCard title={t.security.pendingResets} value={metricValue(metrics?.pendingResets)} subtitle={metricSubtitle("pendingResets")} icon={RefreshCw} trend={trendValue("pendingResets")} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard title={t.security.criticalEvents} value={metricValue(metrics?.criticalEvents)} subtitle={metricSubtitle("criticalEvents")} icon={AlertTriangle} trend={trendValue("criticalEvents")} iconColor="text-red-700" iconBg="bg-red-50" />
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="flex flex-col gap-3 px-6 py-4 border-b lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-base">{t.security.resetRequests}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t.security.resetRequestsDesc}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder={t.security.searchRequests}
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-xs w-44 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={requestStatus}
              onChange={(e) => setRequestStatus(e.target.value as DeviceResetRequest["status"] | "all")}
              className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">{t.security.allStatuses}</option>
              {RESET_STATUSES.map((status) => (
                <option key={status} value={status}>{t.common[status]}</option>
              ))}
            </select>
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {metrics?.pendingResets ?? requests.filter((r) => r.status === "pending").length} {t.common.pending}
            </span>
          </div>
        </div>
        {requestsLoading ? (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">{t.security.loading}</div>
        ) : requestsError ? (
          <div className="px-6 py-12 text-center text-red-600 text-sm">{requestsError}</div>
        ) : requests.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">{t.security.noResetRequests}</div>
        ) : (
          <>
            {requests.map((req) => (
              <ResetRequestRow
                key={req.id}
                req={req}
                busy={busyRequestId === req.id}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
            <div className="border-t px-6 py-3 text-xs text-muted-foreground">
              {requests.length} / {requestTotal}
            </div>
          </>
        )}
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 border-b">
          <div className="flex-1">
            <h2 className="font-semibold text-base">{t.security.securityEvents}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{events.length} / {eventTotal}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder={t.security.searchEvents}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as SecuritySeverity | "all")}
              className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">{t.security.allSeverity}</option>
              {ALL_SEVERITIES.map((s) => (
                <option key={s} value={s}>{t.security.severities[s]}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as SecurityEventType | "all")}
              className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">{t.security.allTypes}</option>
              {ALL_TYPES.map((type) => (
                <option key={type} value={type}>{t.security.eventTypes[type]}</option>
              ))}
            </select>
            <input
              type="date"
              aria-label={t.security.dateFrom}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="date"
              aria-label={t.security.dateTo}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-start px-6 py-3 text-xs font-semibold text-muted-foreground">{t.security.event}</th>
                <th className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground">{t.security.severity}</th>
                <th className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground">{t.common.student}</th>
                <th className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">{t.common.book}</th>
                <th className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">{t.security.device}</th>
                <th className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">{t.security.time}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {eventsLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">{t.security.loading}</td>
                </tr>
              ) : eventsError ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-red-600 text-sm">{eventsError}</td>
                </tr>
              ) : events.length > 0 ? (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => void openEventDetail(event.id)}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[event.severity]}`} />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getEventTypeColor(event.type)}`}>
                          {t.security.eventTypes[event.type]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSeverityColor(event.severity)}`}>
                        {t.security.severities[event.severity]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-xs leading-tight">{event.userName}</p>
                      <p className="text-muted-foreground text-xs">{event.userEmail}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground max-w-[160px] truncate">{event.bookTitle ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{event.deviceIdMasked ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden xl:table-cell">
                      <span className="text-xs text-muted-foreground">{timeAgo(event.createdAt, language)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">{t.security.noEvents}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-dashed border-amber-300 bg-amber-50 rounded-xl p-4 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">{t.security.mvpTitle}</p>
        <p>{t.security.mvpLine1}</p>
        <p>{t.security.mvpLine2}</p>
      </div>

      {selectedEventId && (
        <EventDetailModal
          event={selectedEvent}
          loading={eventDetailLoading}
          error={eventDetailError}
          reviewing={reviewingEvent}
          onClose={() => {
            setSelectedEventId(null);
            setSelectedEvent(null);
            setEventDetailError(null);
          }}
          onReview={handleReviewEvent}
        />
      )}
    </div>
  );
}
