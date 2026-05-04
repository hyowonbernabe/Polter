export default function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{
        height: 1,
        background: "rgba(255,255,255,0.07)",
        marginBottom: 14,
      }} />
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.28)",
          textTransform: "uppercase",
          letterSpacing: "0.10em",
          marginBottom: 12,
        }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}
