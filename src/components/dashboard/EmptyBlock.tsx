export default function EmptyBlock({ message }: { message: string }) {
  return (
    <p style={{
      margin: 0,
      color: "rgba(255,255,255,0.35)",
      fontSize: 12,
      fontStyle: "italic",
      textAlign: "center",
      padding: "8px 0",
    }}>
      {message}
    </p>
  );
}
