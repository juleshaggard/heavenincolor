/** Soft sky-tinted aurora — sits behind page content at low opacity. */
export function Aurora() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="aurora absolute -top-1/3 left-1/2 h-[120vh] w-[140vw] -translate-x-1/2 rounded-full opacity-[0.35] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--sky-h) var(--sky-s) var(--sky-l) / 0.9), transparent 70%)",
        }}
      />
      <div
        className="aurora absolute bottom-[-30vh] left-[10%] h-[80vh] w-[80vw] rounded-full opacity-[0.22] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(calc(var(--sky-h) + 40) var(--sky-s) calc(var(--sky-l) - 10%) / 0.8), transparent 70%)",
          animationDelay: "-7s",
        }}
      />
    </div>
  );
}