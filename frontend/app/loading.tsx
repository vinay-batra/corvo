export default function Loading() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0e14",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes logoFloat { 0%,100%{opacity:0.6;transform:translateY(0)} 50%{opacity:0.9;transform:translateY(-4px)} }
      `}</style>

      <img
        src="/corvo-logo.svg"
        alt="Corvo"
        width={40}
        height={32}
        style={{ animation: "logoFloat 2s ease-in-out infinite" }}
      />

      <div style={{
        width: 22,
        height: 22,
        border: "2px solid rgba(201,168,76,0.15)",
        borderTopColor: "#c9a84c",
        borderRadius: "50%",
        animation: "spin 0.75s linear infinite",
      }} />
    </div>
  );
}
