"use client";;
import {
  AlignVerticalSpaceAroundIcon,
  ChevronsDownUpIcon,
  EqualIcon,
  MinusIcon,
} from "lucide-react";
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const rowHeights = [{
  label: "Short",
  value: "short",
  icon: MinusIcon,
}, {
  label: "Medium",
  value: "medium",
  icon: EqualIcon,
}, {
  label: "Tall",
  value: "tall",
  icon: AlignVerticalSpaceAroundIcon,
}, {
  label: "Extra Tall",
  value: "extra-tall",
  icon: ChevronsDownUpIcon,
}];

export function DataGridRowHeightMenu(
  {
    table,
    disabled,
    ...props
  }
) {
  const rowHeight = table.options.meta?.rowHeight;
  const onRowHeightChange = table.options.meta?.onRowHeightChange;

  const selectedRowHeight = React.useMemo(() => {
    return (rowHeights.find((opt) => opt.value === rowHeight) ?? {
      label: "Short",
      value: "short",
      icon: MinusIcon,
    });
  }, [rowHeight]);

  return (
    <Select value={rowHeight} onValueChange={onRowHeightChange} disabled={disabled}>
      <SelectTrigger size="sm" className="[&_svg:nth-child(2)]:hidden">
        <SelectValue placeholder="Row height">
          <selectedRowHeight.icon />
          {selectedRowHeight.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent {...props}>
        {rowHeights.map((option) => {
          const OptionIcon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <OptionIcon className="size-4" />
              {option.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
