import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useAdminLanguage } from "@/context/AdminLanguageContext";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  iconColor?: string;
  iconBg?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
}: StatCardProps) {
  const { t } = useAdminLanguage();
  const trendState = trend === undefined ? undefined : trend > 0 ? "up" : trend < 0 ? "down" : "flat";

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{value}</p>
          {subtitle && <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 mt-2 text-xs font-medium",
                trendState === "up" && "text-emerald-600",
                trendState === "down" && "text-red-500",
                trendState === "flat" && "text-muted-foreground",
              )}
            >
              {trendState === "down" ? (
                <TrendingDown size={12} />
              ) : trendState === "flat" ? (
                <Minus size={12} />
              ) : (
                <TrendingUp size={12} />
              )}
              <span>
                {trendState === "flat"
                  ? t.common.noChangeVsLastMonth
                  : `${Math.abs(trend)}% ${t.common.vsLastMonth}`}
              </span>
            </div>
          )}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </div>
  );
}
