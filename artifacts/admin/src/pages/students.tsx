import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  CalendarDays,
  Clock,
  GraduationCap,
  Hash,
  Info,
  KeyRound,
  Laptop,
  Mail,
  Phone,
  Search,
  Shield,
  ShieldAlert,
  Smartphone,
  TicketPercent,
  UserRound,
  WalletCards,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import {
  LENDING_RECORDS,
  ORDERS,
  type LendingRecord,
  type Order,
  type Student,
} from "@/data/mockData";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { readStoredStudents, saveStoredStudents } from "@/lib/studentStorage";
import { fetchSyncedOrders, fetchSyncedStudents, syncStudentStatus } from "@/lib/apiSync";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function statusVariant(s: Student["status"]) {
  return s === "active" ? ("success" as const) : ("danger" as const);
}

function historyStatusVariant(status: string) {
  if (status === "completed" || status === "returned" || status === "active") return "success" as const;
  if (status === "pending" || status === "overdue") return "warning" as const;
  return "danger" as const;
}

function deviceStatusVariant(status: string) {
  if (status === "active") return "success" as const;
  if (status === "pending_reset") return "warning" as const;
  return "danger" as const;
}

function severityVariant(severity: string) {
  if (severity === "low") return "success" as const;
  if (severity === "medium") return "warning" as const;
  return "danger" as const;
}

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="max-w-[60%] text-end text-sm font-medium text-foreground break-words">
        {value}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SectionEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function RecordCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-sm">
      {children}
    </div>
  );
}

export default function StudentsPage() {
  const { t, isRTL, language, formatCurrency, formatDate } = useAdminLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>(readStoredStudents);
  const [syncedOrders, setSyncedOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [statusActionTarget, setStatusActionTarget] = useState<Student | null>(null);
  // Tracks status changes the admin just applied locally but that the backend may
  // not have processed yet. The 5s poll must not overwrite these with stale data.
  const pendingStatusChanges = useRef(new Map<string, Student["status"]>());

  const filtered = students.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.grade.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalSpent = students.reduce((s, st) => s + st.totalSpent, 0);
  const locale = language === "ar" ? "ar-EG" : "en-US";
  const isAdmin = user?.role === "admin";
  const statusActionIsSuspend = statusActionTarget?.status === "active";

  useEffect(() => {
    let active = true;

    const loadSyncedData = async () => {
      const [nextStudents, nextOrders] = await Promise.all([
        fetchSyncedStudents(),
        fetchSyncedOrders(),
      ]);

      if (!active) return;

      if (nextStudents.length > 0) {
        // Preserve any status change the admin just applied locally until the backend
        // response actually reflects it; otherwise a poll that lands mid-PATCH would
        // revert the change in both state and localStorage.
        const reconciledStudents = nextStudents.map((student) => {
          const pendingStatus = pendingStatusChanges.current.get(student.id);
          if (pendingStatus === undefined) return student;
          if (student.status === pendingStatus) {
            pendingStatusChanges.current.delete(student.id);
            return student;
          }
          return { ...student, status: pendingStatus };
        });

        setStudents(reconciledStudents);
        saveStoredStudents(reconciledStudents);
        setSelectedStudent((selected) => {
          if (!selected) return selected;
          return reconciledStudents.find((student) => student.id === selected.id) ?? selected;
        });
      }
      setSyncedOrders(nextOrders);
    };

    void loadSyncedData();
    const interval = window.setInterval(loadSyncedData, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const selectedOrders = useMemo(() => {
    if (!selectedStudent) return [];
    const syncedOrderIds = new Set(syncedOrders.map((order) => order.id));
    return [
      ...syncedOrders,
      ...ORDERS.filter((order) => !syncedOrderIds.has(order.id)),
    ].filter((order) => order.studentId === selectedStudent.id);
  }, [selectedStudent, syncedOrders]);

  const selectedLendingRecords = useMemo(() => {
    if (!isAdmin || !selectedStudent) return [];
    return LENDING_RECORDS.filter(
      (record) => record.ownerId === selectedStudent.id || record.borrowerId === selectedStudent.id,
    );
  }, [isAdmin, selectedStudent]);
  const selectedDeviceHistory = selectedStudent?.deviceHistory ?? [];
  const selectedDeviceChangeRequests = selectedStudent?.deviceChangeRequests ?? [];
  const selectedSecurityEvents = selectedStudent?.securityEvents ?? [];
  const selectedUsedCoupons = selectedStudent?.coupons?.used ?? [];
  const selectedUnusedCoupons = selectedStudent?.coupons?.unused ?? [];
  const selectedAuth = selectedStudent?.auth;

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatOptionalDateTime = (iso?: string) => (iso ? formatDateTime(iso) : t.students.never);

  const openStatusDialog = (student: Student) => {
    const latestStudent = students.find((item) => item.id === student.id) ?? student;
    setStatusActionTarget(latestStudent);
  };

  const applyStatusAction = () => {
    if (!statusActionTarget) return;

    const currentStudent = students.find((student) => student.id === statusActionTarget.id) ?? statusActionTarget;
    const nextStatus: Student["status"] = currentStudent.status === "active" ? "suspended" : "active";

    const nextStudents = students.map((student) =>
      student.id === currentStudent.id ? { ...student, status: nextStatus } : student,
    );
    const updatedStudent = nextStudents.find((student) => student.id === currentStudent.id);

    // Record the optimistic change so the polling loop does not overwrite it with a
    // stale GET /students response before the backend has applied this PATCH.
    pendingStatusChanges.current.set(currentStudent.id, nextStatus);

    saveStoredStudents(nextStudents);
    syncStudentStatus(currentStudent.id, nextStatus);
    setStudents(nextStudents);
    if (updatedStudent) {
      setSelectedStudent((selected) => (selected?.id === currentStudent.id ? updatedStudent : selected));
    }

    toast({
      title:
        nextStatus === "suspended"
          ? t.students.suspendSuccess(currentStudent.name)
          : t.students.restoreSuccess(currentStudent.name),
    });
    setStatusActionTarget(null);
  };

  return (
    <>
      <div className="p-6">
        <PageHeader
          title={t.students.title}
          subtitle={t.students.subtitle(students.filter((s) => s.status === "active").length, formatCurrency(totalSpent))}
          actions={
            <div className="flex items-center gap-2">
              {(["all", "active", "suspended"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  statusFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                  {t.common[f]}
                </button>
              ))}
            </div>
          }
        />

        <div className="relative mb-5">
          <Search size={15} className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <input
            type="search"
            placeholder={t.students.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full max-w-sm py-2.5 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
              isRTL ? "pr-9 pl-4" : "pl-9 pr-4",
            )}
          />
        </div>

        <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-start px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.common.student}</th>
                <th className="text-start px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">{t.students.grade}</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">{t.common.books}</th>
                {isAdmin && (
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">{t.students.borrowed}</th>
                )}
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden xl:table-cell">{t.students.devices}</th>
                <th className="text-end px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.students.spent}</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.common.status}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((student) => (
                <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{student.grade}</td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <BookOpen size={13} />
                      <span>{student.booksOwned}</span>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <ArrowLeftRight size={13} />
                        <span>{student.booksBorrowed}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-center text-muted-foreground hidden xl:table-cell">
                    {student.devices}
                  </td>
                  <td className="px-4 py-3 text-end font-semibold text-foreground tabular-nums">
                    {formatCurrency(student.totalSpent)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={statusVariant(student.status)}>{t.common[student.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(student)}
                        className="text-xs text-primary hover:underline"
                      >
                        {t.common.view}
                      </button>
                      <button
                        type="button"
                        onClick={() => openStatusDialog(student)}
                        className={cn(
                          "text-xs hover:underline ms-1",
                          student.status === "active" ? "text-destructive" : "text-emerald-600",
                        )}
                      >
                        {student.status === "active" ? t.common.suspend : t.common.restore}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-muted-foreground text-sm">
              {t.students.noStudents}
            </div>
          )}
        </div>
      </div>

      <Sheet open={Boolean(selectedStudent)} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <SheetContent
          side={isRTL ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-2xl"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {selectedStudent && (
            <div className="space-y-6">
              <SheetHeader className={isRTL ? "text-right" : "text-left"}>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.students.detailsTitle}
                    </p>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-2xl">{selectedStudent.name}</SheetTitle>
                      <Badge variant={statusVariant(selectedStudent.status)}>{t.common[selectedStudent.status]}</Badge>
                    </div>
                    <SheetDescription>
                      {isAdmin ? t.students.detailsDescription : t.students.publisherDetailsDescription}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  icon={<BookOpen size={17} />}
                  label={t.students.booksOwned}
                  value={selectedStudent.booksOwned}
                />
                {isAdmin && (
                  <MetricCard
                    icon={<ArrowLeftRight size={17} />}
                    label={t.students.borrowedBooks}
                    value={selectedStudent.booksBorrowed}
                  />
                )}
                <MetricCard
                  icon={<Smartphone size={17} />}
                  label={t.students.linkedDevices}
                  value={selectedStudent.devices}
                />
                <MetricCard
                  icon={<WalletCards size={17} />}
                  label={t.students.totalSpent}
                  value={formatCurrency(selectedStudent.totalSpent)}
                />
              </div>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t.students.accountDetails}</h3>
                <div className="rounded-xl border border-border bg-card px-4">
                  <DetailRow icon={<Hash size={15} />} label={t.students.studentId} value={selectedStudent.id} />
                  <DetailRow icon={<UserRound size={15} />} label={t.common.name} value={selectedStudent.name} />
                  <DetailRow icon={<Mail size={15} />} label={t.common.email} value={selectedStudent.email} />
                  {selectedStudent.phone && (
                    <DetailRow icon={<Phone size={15} />} label={t.students.phone} value={selectedStudent.phone} />
                  )}
                  <DetailRow
                    icon={<CalendarDays size={15} />}
                    label={t.students.joinedAt}
                    value={formatDate(selectedStudent.joinedAt, { month: "short", day: "numeric", year: "numeric" })}
                  />
                  <DetailRow
                    icon={<Shield size={15} />}
                    label={t.common.status}
                    value={<Badge variant={statusVariant(selectedStudent.status)}>{t.common[selectedStudent.status]}</Badge>}
                  />
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t.students.learningProfile}</h3>
                <div className="rounded-xl border border-border bg-card px-4">
                  <DetailRow icon={<GraduationCap size={15} />} label={t.students.grade} value={selectedStudent.grade} />
                  <DetailRow icon={<BookOpen size={15} />} label={t.students.booksOwned} value={selectedStudent.booksOwned} />
                  {isAdmin && (
                    <DetailRow icon={<ArrowLeftRight size={15} />} label={t.students.borrowedBooks} value={selectedStudent.booksBorrowed} />
                  )}
                  <DetailRow icon={<Smartphone size={15} />} label={t.students.linkedDevices} value={selectedStudent.devices} />
                  <DetailRow icon={<WalletCards size={15} />} label={t.students.totalSpent} value={formatCurrency(selectedStudent.totalSpent)} />
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t.students.passwordSecurity}</h3>
                <div className="rounded-xl border border-border bg-card px-4">
                  <DetailRow icon={<KeyRound size={15} />} label={t.students.authProvider} value={selectedAuth?.authProvider ?? "email_password_demo"} />
                  <DetailRow icon={<Shield size={15} />} label={t.students.passwordValue} value={t.students.hiddenByDesign} />
                  <DetailRow
                    icon={<KeyRound size={15} />}
                    label={t.students.passwordSet}
                    value={selectedAuth?.passwordSet ? t.students.yes : t.students.no}
                  />
                  <DetailRow
                    icon={<ShieldAlert size={15} />}
                    label={t.students.passwordStorage}
                    value={selectedAuth?.passwordHashStored ? t.students.passwordHashStored : t.students.hiddenByDesign}
                  />
                  <DetailRow
                    icon={<CalendarDays size={15} />}
                    label={t.students.passwordLastChanged}
                    value={formatOptionalDateTime(selectedAuth?.passwordLastChangedAt)}
                  />
                  <DetailRow
                    icon={<Clock size={15} />}
                    label={t.students.lastLogin}
                    value={formatOptionalDateTime(selectedAuth?.lastLoginAt)}
                  />
                  <DetailRow
                    icon={<ShieldAlert size={15} />}
                    label={t.students.failedLoginAttempts}
                    value={selectedAuth?.failedLoginAttempts ?? 0}
                  />
                  {selectedAuth?.note && (
                    <div className="flex gap-2 border-t border-border py-3 text-xs text-muted-foreground">
                      <Info size={15} className="mt-0.5 shrink-0" />
                      <p>{selectedAuth.note}</p>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t.students.deviceSecurity}</h3>
                <div className="space-y-3">
                  {selectedStudent.currentDevice ? (
                    <div className="rounded-xl border border-border bg-card px-4">
                      <DetailRow icon={<Smartphone size={15} />} label={t.students.currentDevice} value={selectedStudent.currentDevice.deviceName ?? selectedStudent.currentDevice.platform} />
                      <DetailRow icon={<Hash size={15} />} label={t.students.deviceId} value={selectedStudent.currentDevice.deviceId} />
                      <DetailRow icon={<Hash size={15} />} label={t.students.maskedDeviceId} value={selectedStudent.currentDevice.maskedDeviceId} />
                      <DetailRow icon={<Laptop size={15} />} label={t.students.platform} value={selectedStudent.currentDevice.platform} />
                      {selectedStudent.currentDevice.osVersion && (
                        <DetailRow icon={<Laptop size={15} />} label={t.students.osVersion} value={selectedStudent.currentDevice.osVersion} />
                      )}
                      {selectedStudent.currentDevice.appVersion && (
                        <DetailRow icon={<Info size={15} />} label={t.students.appVersion} value={selectedStudent.currentDevice.appVersion} />
                      )}
                      <DetailRow
                        icon={<CalendarDays size={15} />}
                        label={t.students.registeredAt}
                        value={formatDateTime(selectedStudent.currentDevice.registeredAt)}
                      />
                      <DetailRow
                        icon={<Clock size={15} />}
                        label={t.students.lastVerifiedAt}
                        value={formatDateTime(selectedStudent.currentDevice.lastVerifiedAt)}
                      />
                      <DetailRow
                        icon={<Shield size={15} />}
                        label={t.students.deviceStatus}
                        value={
                          <Badge variant={deviceStatusVariant(selectedStudent.currentDevice.status)}>
                            {labelize(selectedStudent.currentDevice.status)}
                          </Badge>
                        }
                      />
                    </div>
                  ) : (
                    <SectionEmpty>{t.students.noDeviceData}</SectionEmpty>
                  )}

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.students.deviceHistory}
                      </h4>
                      <Badge variant="neutral">{selectedDeviceHistory.length}</Badge>
                    </div>
                    {selectedDeviceHistory.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDeviceHistory.map((device) => (
                          <RecordCard key={`${device.deviceId}-${device.registeredAt}`}>
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground">{device.maskedDeviceId}</p>
                                <p className="text-xs text-muted-foreground">{device.platform} · {device.deviceName ?? t.students.currentDevice}</p>
                              </div>
                              <Badge variant={deviceStatusVariant(device.status)}>{labelize(device.status)}</Badge>
                            </div>
                            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                              <span>{t.students.deviceId}: <strong className="text-foreground">{device.deviceId}</strong></span>
                              <span>{t.students.registeredAt}: <strong className="text-foreground">{formatDateTime(device.registeredAt)}</strong></span>
                              <span>{t.students.lastVerifiedAt}: <strong className="text-foreground">{formatDateTime(device.lastVerifiedAt)}</strong></span>
                              {device.appVersion && <span>{t.students.appVersion}: <strong className="text-foreground">{device.appVersion}</strong></span>}
                            </div>
                          </RecordCard>
                        ))}
                      </div>
                    ) : (
                      <SectionEmpty>{t.students.noDeviceData}</SectionEmpty>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.students.changeRequests}
                      </h4>
                      <Badge variant="neutral">{selectedDeviceChangeRequests.length}</Badge>
                    </div>
                    {selectedDeviceChangeRequests.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDeviceChangeRequests.map((request) => (
                          <RecordCard key={request.id}>
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground">{request.reason}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTime(request.createdAt)}</p>
                              </div>
                              <Badge variant={historyStatusVariant(request.status)}>{t.common[request.status]}</Badge>
                            </div>
                            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                              <span>{t.students.deviceId}: <strong className="text-foreground">{request.deviceId}</strong></span>
                              <span>{t.common.status}: <strong className="text-foreground">{t.common[request.status]}</strong></span>
                              <span>{t.common.date}: <strong className="text-foreground">{formatDateTime(request.createdAt)}</strong></span>
                              <span>{t.students.returnedAt}: <strong className="text-foreground">{formatOptionalDateTime(request.resolvedAt)}</strong></span>
                            </div>
                          </RecordCard>
                        ))}
                      </div>
                    ) : (
                      <SectionEmpty>{t.students.noChangeRequests}</SectionEmpty>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.students.securityEvents}
                      </h4>
                      <Badge variant="neutral">{selectedSecurityEvents.length}</Badge>
                    </div>
                    {selectedSecurityEvents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedSecurityEvents.slice(0, 12).map((event) => (
                          <RecordCard key={event.id}>
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground">{labelize(event.type)}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                              </div>
                              <Badge variant={severityVariant(event.severity)}>{event.severity}</Badge>
                            </div>
                            <p className="mb-2 text-xs text-muted-foreground">{event.message}</p>
                            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                              <span>{t.students.deviceId}: <strong className="text-foreground">{event.deviceId}</strong></span>
                              {event.metadata &&
                                Object.entries(event.metadata).map(([key, value]) => (
                                  <span key={key}>{key}: <strong className="text-foreground">{value}</strong></span>
                                ))}
                            </div>
                          </RecordCard>
                        ))}
                      </div>
                    ) : (
                      <SectionEmpty>{t.students.noSecurityEvents}</SectionEmpty>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t.students.couponsTitle}</h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.students.usedCoupons}
                      </h4>
                      <Badge variant="neutral">{selectedUsedCoupons.length}</Badge>
                    </div>
                    {selectedUsedCoupons.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUsedCoupons.map((coupon) => (
                          <RecordCard key={`${coupon.code}-${coupon.usedAt ?? coupon.bookId}`}>
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="font-semibold text-foreground">{coupon.code}</p>
                              <Badge variant="success">{t.common.completed}</Badge>
                            </div>
                            <div className="grid gap-2 text-xs text-muted-foreground">
                              {coupon.bookTitle && <span>{t.common.book}: <strong className="text-foreground">{coupon.bookTitle}</strong></span>}
                              <span>{t.students.usedAt}: <strong className="text-foreground">{formatOptionalDateTime(coupon.usedAt)}</strong></span>
                            </div>
                          </RecordCard>
                        ))}
                      </div>
                    ) : (
                      <SectionEmpty>{t.students.noUsedCoupons}</SectionEmpty>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.students.unusedCoupons}
                      </h4>
                      <Badge variant="neutral">{selectedUnusedCoupons.length}</Badge>
                    </div>
                    {selectedUnusedCoupons.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUnusedCoupons.map((coupon) => (
                          <RecordCard key={`${coupon.code}-${coupon.bookId}`}>
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <TicketPercent size={15} className="text-primary" />
                                <p className="font-semibold text-foreground">{coupon.code}</p>
                              </div>
                              <Badge variant="warning">{t.common.pending}</Badge>
                            </div>
                            <div className="grid gap-2 text-xs text-muted-foreground">
                              {coupon.bookTitle && <span>{t.common.book}: <strong className="text-foreground">{coupon.bookTitle}</strong></span>}
                              {typeof coupon.discountPct === "number" && (
                                <span>{t.students.discount}: <strong className="text-foreground">{coupon.discountPct}%</strong></span>
                              )}
                              {coupon.discountResponsibility && (
                                <span>{t.books.discountResponsibility}: <strong className="text-foreground">{labelize(coupon.discountResponsibility)}</strong></span>
                              )}
                            </div>
                          </RecordCard>
                        ))}
                      </div>
                    ) : (
                      <SectionEmpty>{t.students.noUnusedCoupons}</SectionEmpty>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">{t.students.ordersHistory}</h3>
                  <Badge variant="neutral">{selectedOrders.length}</Badge>
                </div>
                <div className="space-y-3">
                  {selectedOrders.length > 0 ? (
                    selectedOrders.map((order) => (
                      <div key={order.id} className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{order.bookTitle}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                          </div>
                          <Badge variant={historyStatusVariant(order.status)}>{t.common[order.status]}</Badge>
                        </div>
                        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                          <span>{t.students.orderId}: <strong className="text-foreground">{order.id}</strong></span>
                          <span>{t.common.student}: <strong className="text-foreground">{order.studentName}</strong></span>
                          <span>{t.students.studentId}: <strong className="text-foreground">{order.studentId}</strong></span>
                          <span>{t.students.bookId}: <strong className="text-foreground">{order.bookId}</strong></span>
                          <span>{t.common.publisher}: <strong className="text-foreground">{order.publisher}</strong></span>
                          <span>{t.students.publisherId}: <strong className="text-foreground">{order.publisherId}</strong></span>
                          <span>{t.common.amount}: <strong className="text-foreground">{formatCurrency(order.amount)}</strong></span>
                          {order.couponCode && (
                            <span>{t.students.couponCode}: <strong className="text-foreground">{order.couponCode}</strong></span>
                          )}
                          {typeof order.discountAmount === "number" && (
                            <span>{t.students.discount}: <strong className="text-foreground">{formatCurrency(order.discountAmount)}</strong></span>
                          )}
                          <span>{t.common.status}: <strong className="text-foreground">{t.common[order.status]}</strong></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                      {t.students.noOrders}
                    </div>
                  )}
                </div>
              </section>

              {isAdmin && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">{t.students.lendingHistory}</h3>
                    <Badge variant="neutral">{selectedLendingRecords.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {selectedLendingRecords.length > 0 ? (
                      selectedLendingRecords.map((record) => {
                        const studentRole = record.ownerId === selectedStudent.id ? t.students.owner : t.students.borrower;

                        return (
                          <div key={record.id} className="rounded-xl border border-border bg-card p-4">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground">{record.bookTitle}</p>
                                <p className="text-xs text-muted-foreground">{studentRole}</p>
                              </div>
                              <Badge variant={historyStatusVariant(record.status)}>{t.common[record.status]}</Badge>
                            </div>
                            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                              <span>{t.students.lendingId}: <strong className="text-foreground">{record.id}</strong></span>
                              <span>{t.students.bookId}: <strong className="text-foreground">{record.bookId}</strong></span>
                              <span>{t.students.owner}: <strong className="text-foreground">{record.ownerName}</strong></span>
                              <span>{t.students.ownerId}: <strong className="text-foreground">{record.ownerId}</strong></span>
                              <span>{t.students.borrower}: <strong className="text-foreground">{record.borrowerName}</strong></span>
                              <span>{t.students.borrowerId}: <strong className="text-foreground">{record.borrowerId}</strong></span>
                              <span>{t.students.lentAt}: <strong className="text-foreground">{formatDateTime(record.lentAt)}</strong></span>
                              <span>{t.students.dueAt}: <strong className="text-foreground">{formatDateTime(record.dueAt)}</strong></span>
                              <span>
                                {t.students.returnedAt}:{" "}
                                <strong className="text-foreground">
                                  {record.returnedAt ? formatDateTime(record.returnedAt) : t.students.notReturnedYet}
                                </strong>
                              </span>
                              <span>{t.common.status}: <strong className="text-foreground">{t.common[record.status]}</strong></span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                        {t.students.noLending}
                      </div>
                    )}
                  </div>
                </section>
              )}

              <div className="sticky bottom-0 -mx-6 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
                <button
                  type="button"
                  onClick={() => openStatusDialog(selectedStudent)}
                  className={cn(
                    "inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors",
                    selectedStudent.status === "active"
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "bg-emerald-600 text-white hover:bg-emerald-700",
                  )}
                >
                  {selectedStudent.status === "active" ? t.common.suspend : t.common.restore}
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(statusActionTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusActionTarget(null);
        }}
      >
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader className={isRTL ? "text-right" : "text-left"}>
            <AlertDialogTitle>
              {statusActionIsSuspend ? t.students.suspendTitle : t.students.restoreTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusActionTarget
                ? statusActionIsSuspend
                  ? t.students.suspendMessage(statusActionTarget.name)
                  : t.students.restoreMessage(statusActionTarget.name)
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>{t.books.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={applyStatusAction}
              className={cn(
                statusActionIsSuspend
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
            >
              {statusActionIsSuspend ? t.students.confirmSuspend : t.students.confirmRestore}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
