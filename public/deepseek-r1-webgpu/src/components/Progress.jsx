function formatBytes(size) {
  const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    +(size / Math.pow(1024, i)).toFixed(2) * 1 +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
}

export default function Progress({ text, percentage, total }) {
  percentage ??= 0;
  return (
    <div
      className="w-full bg-[#030308] border border-[#00cc33] text-left rounded-lg overflow-hidden mb-1 font-mono text-sm"
      style={{ boxShadow: '0 0 10px rgba(0, 255, 65, 0.1)' }}
    >
      <div
        className="whitespace-nowrap px-2 py-1 text-[#030308] transition-all duration-300"
        style={{
          width: `${percentage}%`,
          background: 'linear-gradient(90deg, #00ff41, #00cc33)',
          boxShadow: '0 0 15px rgba(0, 255, 65, 0.5)',
          textShadow: 'none'
        }}
      >
        <span className="text-[#030308] font-bold">
          {"> "}{text} ({percentage.toFixed(2)}%
          {isNaN(total) ? "" : ` of ${formatBytes(total)}`})
        </span>
      </div>
    </div>
  );
}
