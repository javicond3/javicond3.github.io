"use client";

export interface SelectableProps {
  checked: boolean;
  onToggle: () => void;
}

export default function EntryBullet({ selectable }: { selectable?: SelectableProps }) {
  if (selectable) {
    return (
      <input
        type="checkbox"
        checked={selectable.checked}
        onChange={selectable.onToggle}
        className="flex-shrink-0 w-4 h-4 rounded cursor-pointer ml-3 mr-2 mt-1"
        style={{ accentColor: "#2ecfba" }}
      />
    );
  }
  return (
    <div
      className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2"
      style={{ backgroundColor: "#2ecfba", marginTop: "5.5px" }}
    />
  );
}
