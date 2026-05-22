export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500"
      style={{
        background:
          "linear-gradient(180deg, #0F1B3D 0%, #1a2a55 100%)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <img
        src="/icons/icon-192.png?v=hyttekalender-2"
        alt="Hyttekalender"
        width={96}
        height={96}
        className="rounded-3xl shadow-2xl animate-in zoom-in-95 duration-700"
      />
      <p className="text-white/80 text-lg font-medium tracking-tight">
        Hyttekalender
      </p>
    </div>
  );
}