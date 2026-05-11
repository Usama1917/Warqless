import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { Shield, Bell, BookOpen, Globe, Save } from "lucide-react";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
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

export default function SettingsPage() {
  const { user } = useAuth();
  const [lending, setLending] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [overdueAlerts, setOverdueAlerts] = useState(true);
  const [twoFa, setTwoFa] = useState(false);
  const [arabicUI, setArabicUI] = useState(false);
  const [autoSuspend, setAutoSuspend] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle="Manage your account and platform preferences"
        actions={
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            <Save size={14} />
            {saved ? "Saved!" : "Save Changes"}
          </button>
        }
      />

      {/* Profile section */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-4">
        <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield size={13} className="text-primary" />
          </div>
          Account
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
            <input
              defaultValue={user?.name}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <input
              defaultValue={user?.email}
              type="email"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
            <input
              value={user?.role}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm text-muted-foreground capitalize cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">New Password</label>
            <input
              type="password"
              placeholder="Leave blank to keep current"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Platform settings — admin only */}
      {user?.role === "admin" && (
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-4">
          <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
              <BookOpen size={13} className="text-accent" />
            </div>
            Platform
          </h3>
          <div>
            <Toggle
              checked={lending}
              onChange={setLending}
              label="Enable Book Lending"
              description="Allow students to lend books to other students"
            />
            <Toggle
              checked={autoSuspend}
              onChange={setAutoSuspend}
              label="Auto-suspend Overdue Borrowers"
              description="Suspend borrowers who exceed the lending period by 7+ days"
            />
            <Toggle
              checked={arabicUI}
              onChange={setArabicUI}
              label="Arabic Interface for Students"
              description="Set Arabic as the default language in the mobile app"
            />
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-4">
        <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Bell size={13} className="text-emerald-600" />
          </div>
          Notifications
        </h3>
        <div>
          <Toggle
            checked={notifications}
            onChange={setNotifications}
            label="Email Notifications"
            description="Receive emails for new orders and important events"
          />
          <Toggle
            checked={overdueAlerts}
            onChange={setOverdueAlerts}
            label="Overdue Lending Alerts"
            description="Get notified when a borrowed book is overdue"
          />
        </div>
      </div>

      {/* Security */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
            <Globe size={13} className="text-red-600" />
          </div>
          Security
        </h3>
        <div>
          <Toggle
            checked={twoFa}
            onChange={setTwoFa}
            label="Two-Factor Authentication"
            description="Add an extra layer of security to your admin account"
          />
        </div>
      </div>
    </div>
  );
}
