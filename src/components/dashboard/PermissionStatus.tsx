import { Monitor, Clipboard, CalendarDays } from "lucide-react";

export interface Tier2Permissions {
  screen: boolean;
  clipboard: boolean;
  calendar: boolean;
}

interface PermissionStatusProps {
  permissions: Tier2Permissions;
}

function StatusRow({ 
  icon, 
  label, 
  desc, 
  on 
}: { 
  icon: React.ReactNode; 
  label: string; 
  desc: string; 
  on: boolean 
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: on ? "rgba(107,163,214,0.12)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${on ? "rgba(107,163,214,0.25)" : "rgba(255,255,255,0.05)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: on ? "rgba(107,163,214,0.85)" : "rgba(255,255,255,0.35)",
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)", marginBottom: 2 }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", lineHeight: 1.3 }}>
            {desc}
          </div>
        </div>
      </div>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 5,
        background: on ? "rgba(107,214,163,0.12)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${on ? "rgba(107,214,163,0.25)" : "rgba(255,255,255,0.08)"}`,
        color: on ? "rgba(107,214,163,0.9)" : "rgba(255,255,255,0.40)",
      }}>
        {on ? "On" : "Off"}
      </div>
    </div>
  );
}

export default function PermissionStatus({ permissions }: PermissionStatusProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.60)", marginBottom: 4, letterSpacing: "0.02em", textTransform: "uppercase" }}>
        Optional Signals
      </div>
      <StatusRow
        icon={<Monitor size={14} strokeWidth={1.8} />}
        label="Screen Context"
        desc="Visual clues for state detection"
        on={permissions.screen}
      />
      <StatusRow
        icon={<Clipboard size={14} strokeWidth={1.8} />}
        label="Clipboard Activity"
        desc="Copy/paste frequency"
        on={permissions.clipboard}
      />
      <StatusRow
        icon={<CalendarDays size={14} strokeWidth={1.8} />}
        label="Calendar Context"
        desc="Upcoming meeting awareness"
        on={permissions.calendar}
      />
    </div>
  );
}
