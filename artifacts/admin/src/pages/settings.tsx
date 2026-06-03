import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useAdminLanguage, type AdminLanguage } from "@/context/AdminLanguageContext";
import {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle,
  Eye,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  Phone,
  Save,
  Shield,
  Smartphone,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  confirmAdminTwoFactorChange,
  disableAdminTwoFactorWithPassword,
  fetchAdminSettings,
  forceLogoutAllAdminSessions,
  requestAdminPhoneVerification,
  requestAdminTwoFactorChange,
  saveAdminSettings,
  verifyAdminPhone,
  type PlatformSettings,
} from "@/lib/apiSync";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  badge?: string;
}

function Toggle({ checked, onChange, label, description, disabled = false, badge }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm font-medium text-foreground", disabled && "text-muted-foreground")}>{label}</p>
          {badge && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        dir="ltr"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

interface NumberSettingProps {
  value: number;
  onChange: (v: number) => void;
  label: string;
  description?: string;
  min?: number;
  max?: number;
  suffix?: string;
  badge?: string;
}

function NumberSetting({
  value,
  onChange,
  label,
  description,
  min = 0,
  max = 3650,
  suffix,
  badge,
}: NumberSettingProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {badge && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (!Number.isFinite(parsed)) return;
            onChange(Math.min(Math.max(Math.trunc(parsed), min), max));
          }}
          className="h-9 w-24 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {suffix && <span className="min-w-14 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function isValidEgyptPhone(value: string) {
  let compact = value.trim().replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (/^(010|011|012|015)\d{8}$/.test(compact)) compact = `+2${compact}`;
  if (/^20(10|11|12|15)\d{8}$/.test(compact)) compact = `+${compact}`;
  return /^\+20(10|11|12|15)\d{8}$/.test(compact);
}

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  enableBookLending: true,
  autoSuspendOverdueBorrowers: false,
  studentArabicInterface: false,
  overdueLendingAlerts: true,
  accountSecurity: {
    requirePhoneVerificationForNewAccounts: true,
    requireTwoFactorForAdmins: false,
    requireTwoFactorForPublishers: false,
    allowStudentOptionalTwoFactor: true,
    maxFailedLoginAttempts: 5,
    accountLockDurationMinutes: 15,
    sessionTimeoutMinutes: 60,
    forceLogoutVersion: 0,
  },
  deviceProtection: {
    oneDeviceOnlyForStudents: true,
    requireAdminApprovalForDeviceReset: true,
    deviceResetCooldownDays: 7,
    maxDeviceResetRequestsPerMonth: 2,
    blockLoginFromUnregisteredDevices: true,
    logEveryBlockedDeviceAttempt: true,
  },
  readerProtection: {
    requireInternetToOpenBooks: true,
    blockUnpurchasedReaderAccess: true,
    visibleWatermark: true,
    watermarkStudentEmail: true,
    watermarkDeviceId: true,
    watermarkTimestamp: true,
    screenshotProtectionEnabled: true,
    logScreenshotAttempts: true,
  },
  monitoring: {
    enableSecurityEventLogging: true,
    autoMarkLowRiskEventsAfterDays: 30,
    keepSecurityLogsForDays: 365,
    notifyAdminOnCriticalEvents: true,
    notifyAdminOnRepeatedDeviceBlockedAttempts: true,
    notifyAdminOnScreenshotAttempts: true,
  },
  notifications: {
    adminEmailNotifications: true,
    publisherSecuritySummaryNotifications: false,
    studentAccountSecurityNotifications: true,
    deviceResetRequestNotifications: true,
  },
};

function withPlatformDefaults(settings: Partial<PlatformSettings> | undefined): PlatformSettings {
  const input = settings ?? {};
  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...input,
    accountSecurity: {
      ...DEFAULT_PLATFORM_SETTINGS.accountSecurity,
      ...(input.accountSecurity ?? {}),
    },
    deviceProtection: {
      ...DEFAULT_PLATFORM_SETTINGS.deviceProtection,
      ...(input.deviceProtection ?? {}),
    },
    readerProtection: {
      ...DEFAULT_PLATFORM_SETTINGS.readerProtection,
      ...(input.readerProtection ?? {}),
    },
    monitoring: {
      ...DEFAULT_PLATFORM_SETTINGS.monitoring,
      ...(input.monitoring ?? {}),
    },
    notifications: {
      ...DEFAULT_PLATFORM_SETTINGS.notifications,
      ...(input.notifications ?? {}),
    },
  };
}

export default function SettingsPage() {
  const { user, updateCurrentUser, logout } = useAuth();
  const { language, setLanguage, t } = useAdminLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<AdminLanguage>(language);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [phoneVerified, setPhoneVerified] = useState(Boolean(user?.phoneVerified));
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState(user?.phoneVerifiedAt ?? "");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneDevCode, setPhoneDevCode] = useState("");
  const [phoneCodeRequested, setPhoneCodeRequested] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [notifications, setNotifications] = useState(true);
  const [twoFa, setTwoFa] = useState(false);
  const [twoFaPendingEnabled, setTwoFaPendingEnabled] = useState<boolean | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaDevCode, setTwoFaDevCode] = useState("");
  const [twoFaPassword, setTwoFaPassword] = useState("");
  const [twoFaMode, setTwoFaMode] = useState<"otp" | "password" | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingPhoneCode, setIsRequestingPhoneCode] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [isUpdatingTwoFa, setIsUpdatingTwoFa] = useState(false);
  const [isForcingLogout, setIsForcingLogout] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const copy = {
    loading: language === "ar" ? "جار تحميل الإعدادات..." : "Loading settings...",
    saving: language === "ar" ? "جار الحفظ..." : "Saving...",
    success: language === "ar" ? "تم حفظ الإعدادات بنجاح." : "Settings saved successfully.",
    loadError: language === "ar" ? "تعذر تحميل الإعدادات." : "Could not load settings.",
    nameRequired: language === "ar" ? "الاسم مطلوب." : "Name is required.",
    emailInvalid: language === "ar" ? "أدخل بريد إلكتروني صحيح." : "Enter a valid email address.",
    phoneRequired: language === "ar" ? "رقم الهاتف مطلوب." : "Phone number is required.",
    phoneInvalid: language === "ar" ? "أدخل رقم موبايل مصري صحيح مثل +201001234567 أو 01001234567." : "Enter a valid Egyptian mobile number, e.g. +201001234567 or 01001234567.",
    phoneSaveFirst: language === "ar" ? "احفظ رقم الهاتف أولاً قبل طلب كود التحقق." : "Save the phone number before requesting a verification code.",
    phoneCodeRequired: language === "ar" ? "أدخل كود تحقق مكون من 6 أرقام." : "Enter the 6-digit verification code.",
    phoneVerificationSent: language === "ar" ? "تم إرسال كود تحقق الهاتف." : "Phone verification code sent.",
    phoneVerified: language === "ar" ? "تم توثيق رقم الهاتف." : "Phone number verified.",
    verified: language === "ar" ? "موثق" : "Verified",
    notVerified: language === "ar" ? "غير موثق" : "Not verified",
    verifyPhone: language === "ar" ? "تحقق من الهاتف" : "Verify phone",
    sendCode: language === "ar" ? "إرسال كود" : "Send code",
    checkingCode: language === "ar" ? "جار التحقق..." : "Verifying...",
    devOnlyCode: language === "ar" ? "كود التطوير فقط:" : "Dev-only code:",
    passwordTooShort: language === "ar" ? "كلمة المرور يجب ألا تقل عن 6 أحرف." : "Password must be at least 6 characters.",
    twoFaEnabled: language === "ar" ? "تم تفعيل المصادقة الثنائية." : "Two-factor authentication enabled.",
    twoFaDisabled: language === "ar" ? "تم تعطيل المصادقة الثنائية." : "Two-factor authentication disabled.",
    twoFaCodeSent: language === "ar" ? "تم إرسال كود المصادقة الثنائية." : "Two-factor confirmation code sent.",
    twoFaCodeRequired: language === "ar" ? "أدخل كود 2FA المكون من 6 أرقام." : "Enter the 6-digit 2FA code.",
    twoFaPasswordRequired: language === "ar" ? "أدخل كلمة المرور لتأكيد التعطيل." : "Enter your password to confirm disabling 2FA.",
    twoFaEnablePending: language === "ar" ? "أدخل كود SMS لتفعيل المصادقة الثنائية." : "Enter the SMS code to enable 2FA.",
    twoFaDisablePending: language === "ar" ? "أدخل كود SMS لتعطيل المصادقة الثنائية." : "Enter the SMS code to disable 2FA.",
    twoFaPasswordDisable: language === "ar" ? "تأكيد التعطيل بكلمة المرور" : "Confirm disable with password",
    twoFaSendOtpDisable: language === "ar" ? "إرسال كود SMS بدلاً من ذلك" : "Send SMS code instead",
    twoFaConfirm: language === "ar" ? "تأكيد" : "Confirm",
    twoFaCancel: language === "ar" ? "إلغاء" : "Cancel",
    missingVerifiedPhone: language === "ar" ? "Please add and verify your phone number first." : "Please add and verify your phone number first.",
    unverifiedPhone: language === "ar" ? "Please verify your phone number before enabling 2FA." : "Please verify your phone number before enabling 2FA.",
    enforced: language === "ar" ? "فعّال" : "Enforced",
    savedPolicy: language === "ar" ? "سياسة محفوظة" : "Saved policy",
    sessionMarker: language === "ar" ? "مؤشر جلسات" : "Session marker",
    forceLogout: language === "ar" ? "تسجيل خروج كل الأجهزة" : "Force logout all devices",
    forceLogoutDesc:
      language === "ar"
        ? "يحفظ مؤشر إلغاء جلسات عام للاستخدام مع نظام الجلسات الحقيقي."
        : "Stores a global logout marker for the session layer.",
    forceLogoutSuccess:
      language === "ar"
        ? "تم إصدار مؤشر تسجيل خروج لكل الأجهزة."
        : "Force logout marker issued for all devices.",
    minutes: language === "ar" ? "دقيقة" : "min",
    days: language === "ar" ? "يوم" : "days",
    attempts: language === "ar" ? "محاولات" : "attempts",
  };

  useEffect(() => {
    if (!user) return;
    let active = true;

    const loadSettings = async () => {
      setIsLoadingSettings(true);
      setErrorMessage("");
      try {
        const settings = await fetchAdminSettings(user);
        if (!active) return;

        setName(settings.account.name);
        setEmail(settings.account.email);
        setPhone(settings.account.phone ?? "");
        setPhoneVerified(Boolean(settings.account.phoneVerified));
        setPhoneVerifiedAt(settings.account.phoneVerifiedAt ?? "");
        setPhoneCodeRequested(false);
        setTwoFa(Boolean(settings.account.twoFactorEnabled));
        setTwoFaPendingEnabled(null);
        setTwoFaCode("");
        setTwoFaDevCode("");
        setTwoFaPassword("");
        setTwoFaMode(null);
        setSelectedLanguage(settings.preferences.adminInterfaceLanguage);
        setLanguage(settings.preferences.adminInterfaceLanguage);
        setNotifications(settings.preferences.emailNotifications);
        setPlatformSettings(withPlatformDefaults(settings.platformSettings));
        if (
          settings.account.name !== user.name ||
          settings.account.email !== user.email ||
          settings.account.phone !== user.phone ||
          Boolean(settings.account.phoneVerified) !== Boolean(user.phoneVerified) ||
          settings.account.phoneVerifiedAt !== user.phoneVerifiedAt ||
          Boolean(settings.account.twoFactorEnabled) !== Boolean(user.twoFactorEnabled)
        ) {
          updateCurrentUser(settings.account);
        }
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Could not load settings.");
      } finally {
        if (active) setIsLoadingSettings(false);
      }
    };

    void loadSettings();

    return () => {
      active = false;
    };
  }, [setLanguage, user?.id, user?.role]);

  const updatePlatformSetting = (
    key: "enableBookLending" | "autoSuspendOverdueBorrowers" | "studentArabicInterface" | "overdueLendingAlerts",
    value: boolean,
  ) => {
    setPlatformSettings((current) => ({ ...current, [key]: value }));
  };

  const updateAccountSecuritySetting = <K extends keyof PlatformSettings["accountSecurity"]>(
    key: K,
    value: PlatformSettings["accountSecurity"][K],
  ) => {
    setPlatformSettings((current) => ({
      ...current,
      accountSecurity: { ...current.accountSecurity, [key]: value },
    }));
  };

  const updateDeviceProtectionSetting = <K extends keyof PlatformSettings["deviceProtection"]>(
    key: K,
    value: PlatformSettings["deviceProtection"][K],
  ) => {
    setPlatformSettings((current) => ({
      ...current,
      deviceProtection: { ...current.deviceProtection, [key]: value },
    }));
  };

  const updateReaderProtectionSetting = <K extends keyof PlatformSettings["readerProtection"]>(
    key: K,
    value: PlatformSettings["readerProtection"][K],
  ) => {
    setPlatformSettings((current) => ({
      ...current,
      readerProtection: { ...current.readerProtection, [key]: value },
    }));
  };

  const updateMonitoringSetting = <K extends keyof PlatformSettings["monitoring"]>(
    key: K,
    value: PlatformSettings["monitoring"][K],
  ) => {
    setPlatformSettings((current) => ({
      ...current,
      monitoring: { ...current.monitoring, [key]: value },
    }));
  };

  const updatePlatformNotificationSetting = <K extends keyof PlatformSettings["notifications"]>(
    key: K,
    value: PlatformSettings["notifications"][K],
  ) => {
    setPlatformSettings((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: value },
    }));
  };

  const selectLanguage = (nextLanguage: AdminLanguage) => {
    setSelectedLanguage(nextLanguage);
    setLanguage(nextLanguage);
  };

  const handleSave = () => {
    if (!user) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const validationErrors = [
      !trimmedName ? copy.nameRequired : "",
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) ? copy.emailInvalid : "",
      !trimmedPhone ? copy.phoneRequired : "",
      trimmedPhone && !isValidEgyptPhone(trimmedPhone) ? copy.phoneInvalid : "",
      newPassword && newPassword.length < 6 ? copy.passwordTooShort : "",
    ].filter(Boolean);

    setSuccessMessage("");
    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors[0]);
      return;
    }

    const save = async () => {
      setIsSaving(true);
      setErrorMessage("");
      try {
        const savedSettings = await saveAdminSettings(user, {
          account: {
            name: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone,
            newPassword: newPassword || undefined,
          },
          preferences: {
            adminInterfaceLanguage: selectedLanguage,
            emailNotifications: notifications,
          },
          platformSettings: user.role === "admin" ? platformSettings : undefined,
        });

        updateCurrentUser(savedSettings.account);
        setName(savedSettings.account.name);
        setEmail(savedSettings.account.email);
        setPhone(savedSettings.account.phone ?? "");
        setPhoneVerified(Boolean(savedSettings.account.phoneVerified));
        setPhoneVerifiedAt(savedSettings.account.phoneVerifiedAt ?? "");
        setTwoFa(Boolean(savedSettings.account.twoFactorEnabled));
        setPhoneCode("");
        setPhoneDevCode("");
        setPhoneCodeRequested(false);
        setSelectedLanguage(savedSettings.preferences.adminInterfaceLanguage);
        setLanguage(savedSettings.preferences.adminInterfaceLanguage);
        setNotifications(savedSettings.preferences.emailNotifications);
        setPlatformSettings(withPlatformDefaults(savedSettings.platformSettings));
        setNewPassword("");
        setSuccessMessage(copy.success);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : copy.loadError);
      } finally {
        setIsSaving(false);
      }
    };

    void save();
  };

  const handleRequestPhoneCode = async () => {
    if (!user) return;
    setSuccessMessage("");
    setErrorMessage("");

    if (!phone.trim() || !isValidEgyptPhone(phone)) {
      setErrorMessage(!phone.trim() ? copy.phoneRequired : copy.phoneInvalid);
      return;
    }

    if (phone.trim() !== (user.phone ?? "")) {
      setErrorMessage(copy.phoneSaveFirst);
      return;
    }

    setIsRequestingPhoneCode(true);
    try {
      const response = await requestAdminPhoneVerification(user);
      updateCurrentUser(response.account);
      setPhone(response.account.phone ?? "");
      setPhoneVerified(Boolean(response.account.phoneVerified));
      setPhoneVerifiedAt(response.account.phoneVerifiedAt ?? "");
      setPhoneDevCode(response.devCode ?? "");
      setPhoneCode("");
      setPhoneCodeRequested(true);
      setSuccessMessage(copy.phoneVerificationSent);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setIsRequestingPhoneCode(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!user) return;
    setSuccessMessage("");
    setErrorMessage("");

    if (!/^\d{6}$/.test(phoneCode.trim())) {
      setErrorMessage(copy.phoneCodeRequired);
      return;
    }

    setIsVerifyingPhone(true);
    try {
      const response = await verifyAdminPhone(user, phoneCode.trim());
      updateCurrentUser(response.account);
      setPhone(response.account.phone ?? "");
      setPhoneVerified(Boolean(response.account.phoneVerified));
      setPhoneVerifiedAt(response.account.phoneVerifiedAt ?? "");
      setPhoneCode("");
      setPhoneDevCode("");
      setPhoneCodeRequested(false);
      setSuccessMessage(copy.phoneVerified);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const resetTwoFaPanel = () => {
    setTwoFaPendingEnabled(null);
    setTwoFaCode("");
    setTwoFaDevCode("");
    setTwoFaPassword("");
    setTwoFaMode(null);
  };

  const handleTwoFaToggle = async (nextEnabled: boolean) => {
    if (!user) return;
    setSuccessMessage("");
    setErrorMessage("");

    if (nextEnabled) {
      if (!phone.trim()) {
        setErrorMessage(copy.missingVerifiedPhone);
        return;
      }
      if (!phoneVerified) {
        setErrorMessage(copy.unverifiedPhone);
        return;
      }

      setIsUpdatingTwoFa(true);
      try {
        const response = await requestAdminTwoFactorChange(user, true);
        setTwoFaPendingEnabled(true);
        setTwoFaMode("otp");
        setTwoFaCode("");
        setTwoFaPassword("");
        setTwoFaDevCode(response.devCode ?? "");
        setSuccessMessage(copy.twoFaCodeSent);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : copy.loadError);
      } finally {
        setIsUpdatingTwoFa(false);
      }
      return;
    }

    setTwoFaPendingEnabled(false);
    setTwoFaMode("password");
    setTwoFaCode("");
    setTwoFaDevCode("");
    setTwoFaPassword("");
  };

  const handleRequestTwoFaDisableOtp = async () => {
    if (!user) return;
    setSuccessMessage("");
    setErrorMessage("");
    setIsUpdatingTwoFa(true);
    try {
      const response = await requestAdminTwoFactorChange(user, false);
      setTwoFaPendingEnabled(false);
      setTwoFaMode("otp");
      setTwoFaCode("");
      setTwoFaPassword("");
      setTwoFaDevCode(response.devCode ?? "");
      setSuccessMessage(copy.twoFaCodeSent);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setIsUpdatingTwoFa(false);
    }
  };

  const handleConfirmTwoFaOtp = async () => {
    if (!user || twoFaPendingEnabled === null) return;
    setSuccessMessage("");
    setErrorMessage("");

    if (!/^\d{6}$/.test(twoFaCode.trim())) {
      setErrorMessage(copy.twoFaCodeRequired);
      return;
    }

    setIsUpdatingTwoFa(true);
    try {
      const response = await confirmAdminTwoFactorChange(user, twoFaPendingEnabled, twoFaCode.trim());
      updateCurrentUser(response.account);
      setTwoFa(Boolean(response.account.twoFactorEnabled));
      resetTwoFaPanel();
      setSuccessMessage(response.account.twoFactorEnabled ? copy.twoFaEnabled : copy.twoFaDisabled);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setIsUpdatingTwoFa(false);
    }
  };

  const handleDisableTwoFaWithPassword = async () => {
    if (!user) return;
    setSuccessMessage("");
    setErrorMessage("");

    if (!twoFaPassword) {
      setErrorMessage(copy.twoFaPasswordRequired);
      return;
    }

    setIsUpdatingTwoFa(true);
    try {
      const response = await disableAdminTwoFactorWithPassword(user, twoFaPassword);
      updateCurrentUser(response.account);
      setTwoFa(Boolean(response.account.twoFactorEnabled));
      resetTwoFaPanel();
      setSuccessMessage(copy.twoFaDisabled);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setIsUpdatingTwoFa(false);
    }
  };

  const handleForceLogout = async () => {
    if (!user) return;
    setSuccessMessage("");
    setErrorMessage("");
    setIsForcingLogout(true);
    try {
      const response = await forceLogoutAllAdminSessions(user);
      setPlatformSettings(withPlatformDefaults(response.platformSettings));
      setSuccessMessage(copy.forceLogoutSuccess);
      logout("You were signed out by an admin. Please login again.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setIsForcingLogout(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title={t.settings.title}
        subtitle={t.settings.subtitle}
        actions={
          <button
            onClick={handleSave}
            disabled={isSaving || isLoadingSettings}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? copy.saving : t.common.saveChanges}
          </button>
        }
      />

      {isLoadingSettings && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 size={15} className="animate-spin" />
          {copy.loading}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle size={15} />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={15} />
          {errorMessage}
        </div>
      )}

      {/* Interface */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-4">
        <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Languages size={13} className="text-primary" />
          </div>
          {t.settings.interface}
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t.settings.adminLanguage}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.settings.adminLanguageDesc}</p>
          </div>
          <div className="inline-flex rounded-xl border border-border bg-muted p-1">
            {(["en", "ar"] as AdminLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                aria-pressed={selectedLanguage === lang}
                onClick={() => selectLanguage(lang)}
                className={cn(
                  "min-w-24 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  selectedLanguage === lang
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {lang === "en" ? t.settings.english : t.settings.arabic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Profile section */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-4">
        <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield size={13} className="text-primary" />
          </div>
          {t.settings.account}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t.common.name}</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t.common.email}</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-xs font-medium text-muted-foreground">{language === "ar" ? "رقم الهاتف" : "Phone number"}</label>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  phoneVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                )}
              >
                <Phone size={11} />
                {phoneVerified ? copy.verified : copy.notVerified}
              </span>
            </div>
            <input
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                if (event.target.value !== (user?.phone ?? "")) {
                  setPhoneVerified(false);
                  setPhoneVerifiedAt("");
                  setPhoneCode("");
                  setPhoneDevCode("");
                  setPhoneCodeRequested(false);
                  setTwoFa(false);
                  resetTwoFaPanel();
                }
              }}
              dir="ltr"
              type="tel"
              placeholder="+201001234567"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleRequestPhoneCode}
                disabled={isRequestingPhoneCode || isSaving || isLoadingSettings}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/5 disabled:opacity-60"
              >
                {isRequestingPhoneCode ? <Loader2 size={13} className="animate-spin" /> : <Phone size={13} />}
                {copy.sendCode}
              </button>
              {phoneVerifiedAt && (
                <span className="text-xs text-muted-foreground">
                  {language === "ar" ? "آخر تحقق:" : "Verified at:"} {new Date(phoneVerifiedAt).toLocaleString()}
                </span>
              )}
            </div>
            {(phoneCodeRequested || phoneDevCode || phoneCode) && !phoneVerified && (
              <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
                {phoneDevCode && (
                  <p className="mb-2 text-xs font-medium text-amber-700">
                    {copy.devOnlyCode} <span dir="ltr">{phoneDevCode}</span>
                  </p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={phoneCode}
                    onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="000000"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyPhone}
                    disabled={isVerifyingPhone}
                    className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isVerifyingPhone ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    {isVerifyingPhone ? copy.checkingCode : copy.verifyPhone}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t.common.role}</label>
            <input
              value={user?.role ? t.roles[user.role] : ""}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm text-muted-foreground capitalize cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t.common.newPassword}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={t.common.leaveBlank}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Platform settings — admin only */}
      {user?.role === "admin" && (
        <>
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                <BookOpen size={13} className="text-accent" />
              </div>
              {t.settings.platform}
            </h3>
            <div>
              <Toggle
                checked={platformSettings.enableBookLending}
                onChange={(value) => updatePlatformSetting("enableBookLending", value)}
                label={t.settings.enableLending}
                description={t.settings.enableLendingDesc}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.autoSuspendOverdueBorrowers}
                onChange={(value) => updatePlatformSetting("autoSuspendOverdueBorrowers", value)}
                label={t.settings.autoSuspend}
                description={t.settings.autoSuspendDesc}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.studentArabicInterface}
                onChange={(value) => updatePlatformSetting("studentArabicInterface", value)}
                label={t.settings.studentArabic}
                description={t.settings.studentArabicDesc}
                badge={copy.savedPolicy}
              />
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
                <KeyRound size={13} className="text-red-600" />
              </div>
              {language === "ar" ? "أمان الحسابات" : "Account Security"}
            </h3>
            <div>
              <Toggle
                checked={platformSettings.accountSecurity.requirePhoneVerificationForNewAccounts}
                onChange={(value) => updateAccountSecuritySetting("requirePhoneVerificationForNewAccounts", value)}
                label={language === "ar" ? "طلب توثيق الهاتف للحسابات الجديدة" : "Require phone verification for all new accounts"}
                description={
                  language === "ar"
                    ? "يتم حفظ السياسة لاستخدامها في التسجيل والتحقق."
                    : "Saved as the platform phone-verification policy."
                }
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.accountSecurity.requireTwoFactorForAdmins}
                onChange={(value) => updateAccountSecuritySetting("requireTwoFactorForAdmins", value)}
                label={language === "ar" ? "إلزام 2FA للأدمن" : "Require 2FA for admins"}
                description={
                  language === "ar"
                    ? "يتم فرض OTP عند دخول حسابات الأدمن."
                    : "Admin logins require an OTP when this policy is enabled."
                }
                badge={copy.enforced}
              />
              <Toggle
                checked={platformSettings.accountSecurity.requireTwoFactorForPublishers}
                onChange={(value) => updateAccountSecuritySetting("requireTwoFactorForPublishers", value)}
                label={language === "ar" ? "إلزام 2FA للناشرين" : "Require 2FA for publishers"}
                description={
                  language === "ar"
                    ? "يتم فرض OTP عند دخول حسابات الناشرين."
                    : "Publisher logins require an OTP when this policy is enabled."
                }
                badge={copy.enforced}
              />
              <Toggle
                checked={platformSettings.accountSecurity.allowStudentOptionalTwoFactor}
                onChange={(value) => updateAccountSecuritySetting("allowStudentOptionalTwoFactor", value)}
                label={language === "ar" ? "السماح بـ 2FA اختياري للطلاب" : "Allow optional 2FA for students"}
                description={
                  language === "ar"
                    ? "سياسة محفوظة للمرحلة القادمة من حسابات الطلاب."
                    : "Saved policy for a future student 2FA flow."
                }
                badge={copy.savedPolicy}
              />
              <NumberSetting
                value={platformSettings.accountSecurity.maxFailedLoginAttempts}
                onChange={(value) => updateAccountSecuritySetting("maxFailedLoginAttempts", value)}
                min={1}
                max={20}
                suffix={copy.attempts}
                label={language === "ar" ? "أقصى عدد لمحاولات الدخول الفاشلة" : "Max failed login attempts"}
                description={
                  language === "ar"
                    ? "يتم تطبيقها على دخول الأدمن والناشر."
                    : "Applied to admin and publisher login."
                }
                badge={copy.enforced}
              />
              <NumberSetting
                value={platformSettings.accountSecurity.accountLockDurationMinutes}
                onChange={(value) => updateAccountSecuritySetting("accountLockDurationMinutes", value)}
                min={1}
                max={1440}
                suffix={copy.minutes}
                label={language === "ar" ? "مدة قفل الحساب بعد المحاولات الفاشلة" : "Account lock duration after failed attempts"}
                description={
                  language === "ar"
                    ? "يتم تطبيقها على دخول الأدمن والناشر."
                    : "Applied to admin and publisher login."
                }
                badge={copy.enforced}
              />
              <NumberSetting
                value={platformSettings.accountSecurity.sessionTimeoutMinutes}
                onChange={(value) => updateAccountSecuritySetting("sessionTimeoutMinutes", value)}
                min={5}
                max={1440}
                suffix={copy.minutes}
                label={language === "ar" ? "مدة انتهاء الجلسة" : "Session timeout duration"}
                description={
                  language === "ar"
                    ? "سياسة محفوظة لحين إضافة session store كامل."
                    : "Saved policy until the full session store is added."
                }
                badge={copy.savedPolicy}
              />
              <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{copy.forceLogout}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {copy.sessionMarker}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {copy.forceLogoutDesc}
                    {platformSettings.accountSecurity.forceLogoutIssuedAt
                      ? ` ${language === "ar" ? "آخر إصدار:" : "Last issued:"} ${new Date(platformSettings.accountSecurity.forceLogoutIssuedAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleForceLogout}
                  disabled={isForcingLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {isForcingLogout ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
                  {copy.forceLogout}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                <Smartphone size={13} className="text-blue-600" />
              </div>
              {language === "ar" ? "حماية الأجهزة" : "Device Protection"}
            </h3>
            <div>
              <Toggle
                checked={platformSettings.deviceProtection.oneDeviceOnlyForStudents}
                onChange={(value) => updateDeviceProtectionSetting("oneDeviceOnlyForStudents", value)}
                label={language === "ar" ? "جهاز واحد فقط لحسابات الطلاب" : "One device only for student accounts"}
                description={language === "ar" ? "سياسة محفوظة لحماية حساب الطالب." : "Saved device-binding policy."}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.deviceProtection.requireAdminApprovalForDeviceReset}
                onChange={(value) => updateDeviceProtectionSetting("requireAdminApprovalForDeviceReset", value)}
                label={language === "ar" ? "طلب موافقة الأدمن لإعادة ضبط الجهاز" : "Require admin approval for device reset"}
                description={language === "ar" ? "مطابقة لتدفق طلبات إعادة ضبط الجهاز الحالي." : "Matches the current device reset request workflow."}
                badge={copy.savedPolicy}
              />
              <NumberSetting
                value={platformSettings.deviceProtection.deviceResetCooldownDays}
                onChange={(value) => updateDeviceProtectionSetting("deviceResetCooldownDays", value)}
                min={0}
                max={365}
                suffix={copy.days}
                label={language === "ar" ? "فترة الانتظار بين طلبات إعادة ضبط الجهاز" : "Device reset cooldown days"}
                description={language === "ar" ? "سياسة محفوظة للحد من تغيير الأجهزة المتكرر." : "Saved policy for limiting frequent device changes."}
                badge={copy.savedPolicy}
              />
              <NumberSetting
                value={platformSettings.deviceProtection.maxDeviceResetRequestsPerMonth}
                onChange={(value) => updateDeviceProtectionSetting("maxDeviceResetRequestsPerMonth", value)}
                min={0}
                max={50}
                label={language === "ar" ? "أقصى عدد طلبات إعادة ضبط جهاز شهرياً" : "Max device reset requests per month"}
                description={language === "ar" ? "سياسة محفوظة للمراقبة والتطبيق لاحقاً." : "Saved policy for monitoring and enforcement."}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.deviceProtection.blockLoginFromUnregisteredDevices}
                onChange={(value) => updateDeviceProtectionSetting("blockLoginFromUnregisteredDevices", value)}
                label={language === "ar" ? "حظر الدخول من أجهزة غير مسجلة" : "Block login from unregistered devices"}
                description={language === "ar" ? "السلوك الحالي يحظر الأجهزة المختلفة للطلاب." : "Current student device flow blocks different devices by default."}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.deviceProtection.logEveryBlockedDeviceAttempt}
                onChange={(value) => updateDeviceProtectionSetting("logEveryBlockedDeviceAttempt", value)}
                label={language === "ar" ? "تسجيل كل محاولة جهاز محظور" : "Log every blocked device attempt"}
                description={language === "ar" ? "سياسة محفوظة مع وجود event logging حالي للأجهزة المحظورة." : "Saved policy with existing blocked-device event logging."}
                badge={copy.savedPolicy}
              />
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                <Eye size={13} className="text-amber-600" />
              </div>
              {language === "ar" ? "حماية القارئ والمحتوى" : "Reader / Content Protection"}
            </h3>
            <div>
              <Toggle
                checked={platformSettings.readerProtection.requireInternetToOpenBooks}
                onChange={(value) => updateReaderProtectionSetting("requireInternetToOpenBooks", value)}
                label={language === "ar" ? "طلب إنترنت لفتح الكتب" : "Require internet to open books"}
                description={language === "ar" ? "سياسة محفوظة لتدفق reader/license." : "Saved policy for the reader/license flow."}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.readerProtection.blockUnpurchasedReaderAccess}
                onChange={(value) => updateReaderProtectionSetting("blockUnpurchasedReaderAccess", value)}
                label={language === "ar" ? "حظر فتح الكتب غير المشتراة" : "Block unpurchased reader access"}
                description={language === "ar" ? "الـ API الحالي يرفض الكتب غير المشتراة." : "The current reader API rejects unpurchased books."}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.readerProtection.visibleWatermark}
                onChange={(value) => updateReaderProtectionSetting("visibleWatermark", value)}
                label={language === "ar" ? "تفعيل العلامة المائية المرئية" : "Enable visible watermark"}
                description={language === "ar" ? "سياسة محفوظة لواجهة القارئ." : "Saved policy for the reader UI."}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.readerProtection.watermarkStudentEmail}
                onChange={(value) => updateReaderProtectionSetting("watermarkStudentEmail", value)}
                label={language === "ar" ? "إظهار بريد الطالب في العلامة المائية" : "Include student email in watermark"}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.readerProtection.watermarkDeviceId}
                onChange={(value) => updateReaderProtectionSetting("watermarkDeviceId", value)}
                label={language === "ar" ? "إظهار رقم الجهاز في العلامة المائية" : "Include device ID in watermark"}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.readerProtection.watermarkTimestamp}
                onChange={(value) => updateReaderProtectionSetting("watermarkTimestamp", value)}
                label={language === "ar" ? "إظهار وقت الفتح في العلامة المائية" : "Include timestamp in watermark"}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.readerProtection.screenshotProtectionEnabled}
                onChange={(value) => updateReaderProtectionSetting("screenshotProtectionEnabled", value)}
                label={language === "ar" ? "تفعيل حماية لقطات الشاشة حيثما أمكن" : "Screenshot protection enabled where supported"}
                description={language === "ar" ? "سياسة محفوظة لأن التنفيذ يعتمد على قدرات iOS/Android." : "Saved policy because enforcement depends on iOS/Android support."}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.readerProtection.logScreenshotAttempts}
                onChange={(value) => updateReaderProtectionSetting("logScreenshotAttempts", value)}
                label={language === "ar" ? "تسجيل محاولات لقطة الشاشة" : "Log screenshot attempts"}
                badge={copy.savedPolicy}
              />
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center">
                <Activity size={13} className="text-purple-600" />
              </div>
              {language === "ar" ? "المراقبة والتنبيهات الأمنية" : "Monitoring"}
            </h3>
            <div>
              <Toggle
                checked={platformSettings.monitoring.enableSecurityEventLogging}
                onChange={(value) => updateMonitoringSetting("enableSecurityEventLogging", value)}
                label={language === "ar" ? "تفعيل تسجيل الأحداث الأمنية" : "Enable security event logging"}
                description={language === "ar" ? "يؤثر على أحداث أمان لوحة الأدمن الجديدة." : "Controls new admin-panel security event logging."}
                badge={copy.enforced}
              />
              <NumberSetting
                value={platformSettings.monitoring.autoMarkLowRiskEventsAfterDays}
                onChange={(value) => updateMonitoringSetting("autoMarkLowRiskEventsAfterDays", value)}
                min={0}
                max={3650}
                suffix={copy.days}
                label={language === "ar" ? "وضع علامة مراجعة للأحداث منخفضة الخطورة بعد" : "Auto-mark low-risk events after"}
                description={language === "ar" ? "سياسة محفوظة لمرحلة automation." : "Saved policy for a later automation job."}
                badge={copy.savedPolicy}
              />
              <NumberSetting
                value={platformSettings.monitoring.keepSecurityLogsForDays}
                onChange={(value) => updateMonitoringSetting("keepSecurityLogsForDays", value)}
                min={1}
                max={3650}
                suffix={copy.days}
                label={language === "ar" ? "مدة الاحتفاظ بسجلات الأمان" : "Keep security logs for"}
                description={language === "ar" ? "سياسة محفوظة لمرحلة تنظيف السجلات." : "Saved policy for a later log retention job."}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.monitoring.notifyAdminOnCriticalEvents}
                onChange={(value) => updateMonitoringSetting("notifyAdminOnCriticalEvents", value)}
                label={language === "ar" ? "تنبيه الأدمن عند الأحداث الحرجة" : "Notify admin on critical events"}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.monitoring.notifyAdminOnRepeatedDeviceBlockedAttempts}
                onChange={(value) => updateMonitoringSetting("notifyAdminOnRepeatedDeviceBlockedAttempts", value)}
                label={language === "ar" ? "تنبيه الأدمن عند تكرار حظر الأجهزة" : "Notify admin on repeated device blocked attempts"}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.monitoring.notifyAdminOnScreenshotAttempts}
                onChange={(value) => updateMonitoringSetting("notifyAdminOnScreenshotAttempts", value)}
                label={language === "ar" ? "تنبيه الأدمن عند محاولات لقطة الشاشة" : "Notify admin on screenshot attempts"}
                badge={copy.savedPolicy}
              />
            </div>
          </div>
        </>
      )}

      {/* Notifications */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-4">
        <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Bell size={13} className="text-emerald-600" />
            </div>
          {t.settings.notifications}
        </h3>
        <div>
          <Toggle
            checked={notifications}
            onChange={setNotifications}
            label={t.settings.emailNotifications}
            description={t.settings.emailNotificationsDesc}
            badge={copy.savedPolicy}
          />
          {user?.role === "admin" && (
            <>
              <Toggle
                checked={platformSettings.overdueLendingAlerts}
                onChange={(value) => updatePlatformSetting("overdueLendingAlerts", value)}
                label={t.settings.overdueAlerts}
                description={t.settings.overdueAlertsDesc}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.notifications.adminEmailNotifications}
                onChange={(value) => updatePlatformNotificationSetting("adminEmailNotifications", value)}
                label={language === "ar" ? "تنبيهات بريد الأدمن" : "Admin email notifications"}
                description={language === "ar" ? "سياسة محفوظة لحين ربط مزود بريد حقيقي." : "Saved policy until a real email provider is connected."}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.notifications.publisherSecuritySummaryNotifications}
                onChange={(value) => updatePlatformNotificationSetting("publisherSecuritySummaryNotifications", value)}
                label={language === "ar" ? "ملخص أمان للناشرين" : "Publisher security summary notifications"}
                description={language === "ar" ? "سياسة محفوظة للتنبيهات الدورية." : "Saved policy for scheduled summary notifications."}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.notifications.studentAccountSecurityNotifications}
                onChange={(value) => updatePlatformNotificationSetting("studentAccountSecurityNotifications", value)}
                label={language === "ar" ? "تنبيهات أمان حسابات الطلاب" : "Student account/security notifications"}
                description={language === "ar" ? "سياسة محفوظة لتدفق إشعارات الطلاب." : "Saved policy for student-facing security notices."}
                badge={copy.savedPolicy}
              />
              <Toggle
                checked={platformSettings.notifications.deviceResetRequestNotifications}
                onChange={(value) => updatePlatformNotificationSetting("deviceResetRequestNotifications", value)}
                label={language === "ar" ? "تنبيهات طلبات إعادة ضبط الجهاز" : "Device reset request notifications"}
                description={language === "ar" ? "سياسة محفوظة لتنبيه الأدمن عند وصول الطلبات." : "Saved policy for notifying admins about reset requests."}
                badge={copy.savedPolicy}
              />
            </>
          )}
        </div>
      </div>

      {/* Security */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
              <Globe size={13} className="text-red-600" />
            </div>
          {t.settings.security}
        </h3>
        <div>
          <Toggle
            checked={twoFa}
            onChange={handleTwoFaToggle}
            label={t.settings.twoFactor}
            description={t.settings.twoFactorDesc}
            disabled={isUpdatingTwoFa || isLoadingSettings}
          />
          {twoFaPendingEnabled !== null && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium text-foreground">
                {twoFaPendingEnabled ? copy.twoFaEnablePending : copy.twoFaDisablePending}
              </p>
              {twoFaMode === "password" && twoFaPendingEnabled === false && (
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    type="password"
                    value={twoFaPassword}
                    onChange={(event) => setTwoFaPassword(event.target.value)}
                    placeholder={t.common.newPassword}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleDisableTwoFaWithPassword}
                      disabled={isUpdatingTwoFa}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                    >
                      {isUpdatingTwoFa ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                      {copy.twoFaPasswordDisable}
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestTwoFaDisableOtp}
                      disabled={isUpdatingTwoFa}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/5 disabled:opacity-60"
                    >
                      {copy.twoFaSendOtpDisable}
                    </button>
                    <button
                      type="button"
                      onClick={resetTwoFaPanel}
                      className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                    >
                      {copy.twoFaCancel}
                    </button>
                  </div>
                </div>
              )}
              {twoFaMode === "otp" && (
                <div className="mt-3 flex flex-col gap-2">
                  {twoFaDevCode && (
                    <p className="text-xs font-medium text-amber-700">
                      {copy.devOnlyCode} <span dir="ltr">{twoFaDevCode}</span>
                    </p>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={twoFaCode}
                      onChange={(event) => setTwoFaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      dir="ltr"
                      inputMode="numeric"
                      placeholder="000000"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmTwoFaOtp}
                      disabled={isUpdatingTwoFa}
                      className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                    >
                      {isUpdatingTwoFa ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                      {copy.twoFaConfirm}
                    </button>
                    <button
                      type="button"
                      onClick={resetTwoFaPanel}
                      className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                    >
                      {copy.twoFaCancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
