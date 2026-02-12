// src/components/table/cell-text.js
export default function CellText({ title, children, className = "" }) {
  return (
    <div
      title={title ?? (children == null ? "" : String(children))}
      className={[
        "h-9 w-full",
        "px-3",
        "rounded-xl border bg-white",
        "flex items-center",
        "text-[13px] text-slate-800",
        "overflow-hidden whitespace-nowrap text-ellipsis",
        className,
      ].join(" ")}
    >
      {children == null || children === "" ? "-" : children}
    </div>
  );
}
