export default function BrandLockup({ compact = false }) {
  return (
    <div
      className={`relative z-10 inline-flex items-center gap-3 text-lg font-bold ${
        compact ? 'text-copy-strong' : ''
      }`}
    >
      <span
        className={`grid h-9.5 w-9.5 place-items-center rounded-lg font-black ${
          compact ? 'bg-brand text-white' : 'bg-white text-[#104f5c]'
        }`}
      >
        M
      </span>
      <span>Medpointe</span>
    </div>
  )
}