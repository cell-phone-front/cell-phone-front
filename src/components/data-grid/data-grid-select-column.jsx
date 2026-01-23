"use client";;
import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

function DataGridSelectHitbox({
  htmlFor,
  children,
  size,
  debug
}) {
  return (
    <div
      className={cn(
        "group relative -my-1.5 h-[calc(100%+0.75rem)] py-1.5",
        size === "default" && "-ms-3 -me-2 ps-3 pe-2",
        size === "sm" && "-ms-3 -me-1.5 ps-3 pe-1.5",
        size === "lg" && "-mx-3 px-3"
      )}>
      {children}
      <label
        htmlFor={htmlFor}
        className={cn(
          "absolute inset-0 cursor-pointer",
          debug && "border border-red-500 border-dashed bg-red-500/20"
        )} />
    </div>
  );
}

function DataGridSelectCheckbox({
  rowNumber,
  hitboxSize,
  debug,
  checked,
  className,
  ...props
}) {
  const id = React.useId();

  if (rowNumber !== undefined) {
    return (
      <DataGridSelectHitbox htmlFor={id} size={hitboxSize} debug={debug}>
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute start-3 top-1.5 flex size-4 items-center justify-center text-muted-foreground text-xs tabular-nums transition-opacity group-hover:opacity-0",
            checked && "opacity-0"
          )}>
          {rowNumber}
        </div>
        <Checkbox
          id={id}
          className={cn(
            "relative transition-[shadow,border,opacity] hover:border-primary/40",
            "opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100",
            className
          )}
          checked={checked}
          {...props} />
      </DataGridSelectHitbox>
    );
  }

  return (
    <DataGridSelectHitbox htmlFor={id} size={hitboxSize} debug={debug}>
      <Checkbox
        id={id}
        className={cn("relative transition-[shadow,border] hover:border-primary/40", className)}
        checked={checked}
        {...props} />
    </DataGridSelectHitbox>
  );
}

function DataGridSelectHeader(
  {
    table,
    hitboxSize,
    debug
  }
) {
  const onCheckedChange = React.useCallback((value) => table.toggleAllPageRowsSelected(value), [table]);

  return (
    <DataGridSelectCheckbox
      aria-label="Select all"
      checked={
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && "indeterminate")
      }
      onCheckedChange={onCheckedChange}
      hitboxSize={hitboxSize}
      debug={debug} />
  );
}

function DataGridSelectCell(
  {
    row,
    table,
    hitboxSize,
    enableRowMarkers,
    debug
  }
) {
  const meta = table.options.meta;
  const rowNumber = enableRowMarkers
    ? (meta?.getVisualRowIndex?.(row.id) ?? row.index + 1)
    : undefined;

  const onCheckedChange = React.useCallback((value) => {
    if (meta?.onRowSelect) {
      meta.onRowSelect(row.index, value, false);
    } else {
      row.toggleSelected(value);
    }
  }, [meta, row]);

  const onClick = React.useCallback((event) => {
    if (event.shiftKey) {
      event.preventDefault();
      meta?.onRowSelect?.(row.index, !row.getIsSelected(), true);
    }
  }, [meta, row]);

  return (
    <DataGridSelectCheckbox
      aria-label={rowNumber ? `Select row ${rowNumber}` : "Select row"}
      checked={row.getIsSelected()}
      onCheckedChange={onCheckedChange}
      onClick={onClick}
      rowNumber={rowNumber}
      hitboxSize={hitboxSize}
      debug={debug} />
  );
}

export function getDataGridSelectColumn(
  {
    size = 40,
    hitboxSize = "default",
    enableHiding = false,
    enableResizing = false,
    enableSorting = false,
    enableRowMarkers = false,
    debug = false,
    ...props
  } = {}
) {
  return {
    id: "select",
    header: ({ table }) => (
      <DataGridSelectHeader table={table} hitboxSize={hitboxSize} debug={debug} />
    ),
    cell: ({ row, table }) => (
      <DataGridSelectCell
        row={row}
        table={table}
        enableRowMarkers={enableRowMarkers}
        hitboxSize={hitboxSize}
        debug={debug} />
    ),
    size,
    enableHiding,
    enableResizing,
    enableSorting,
    ...props,
  };
}
