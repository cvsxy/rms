"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

interface TableData {
  id: string;
  number: number;
  name: string;
  seats: number;
  status: string;
  posX: number | null;
  posY: number | null;
}

interface TableLayoutEditorProps {
  tables: TableData[];
  onSave: (positions: { id: string; posX: number; posY: number }[]) => Promise<void>;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 560;
const TABLE_W = 100;
const TABLE_H = 72;

function DraggableTable({ table, position }: { table: TableData; position: { x: number; y: number } }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: table.id,
  });

  const style: React.CSSProperties = {
    position: "absolute",
    left: position.x + (transform?.x || 0),
    top: position.y + (transform?.y || 0),
    width: TABLE_W,
    height: TABLE_H,
    touchAction: "none",
    cursor: "grab",
  };

  const statusColor =
    table.status === "OCCUPIED"
      ? "border-red-400 bg-red-50"
      : table.status === "RESERVED"
      ? "border-yellow-400 bg-yellow-50"
      : "border-green-400 bg-green-50";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-lg border-2 ${statusColor} flex flex-col items-center justify-center select-none shadow-sm hover:shadow-md transition-shadow`}
    >
      <span className="text-lg font-bold text-gray-800">{table.number}</span>
      <span className="text-xs text-gray-500">{table.seats} seats</span>
      {table.name && (
        <span className="text-[10px] text-gray-400 truncate max-w-[90px]">{table.name}</span>
      )}
    </div>
  );
}

export default function TableLayoutEditor({ tables, onSave }: TableLayoutEditorProps) {
  const t = useTranslations();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize positions: use saved positions or auto-arrange in grid
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    tables.forEach((table, idx) => {
      if (table.posX != null && table.posY != null) {
        pos[table.id] = { x: table.posX, y: table.posY };
      } else {
        // Auto grid: 6 columns
        const col = idx % 6;
        const row = Math.floor(idx / 6);
        pos[table.id] = {
          x: 20 + col * (TABLE_W + 16),
          y: 20 + row * (TABLE_H + 16),
        };
      }
    });
    return pos;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const id = active.id as string;

      setPositions((prev) => {
        const current = prev[id];
        if (!current) return prev;

        // Clamp to canvas bounds
        const newX = Math.max(0, Math.min(CANVAS_WIDTH - TABLE_W, current.x + delta.x));
        const newY = Math.max(0, Math.min(CANVAS_HEIGHT - TABLE_H, current.y + delta.y));

        return { ...prev, [id]: { x: newX, y: newY } };
      });
      setSaved(false);
    },
    []
  );

  async function handleSave() {
    setSaving(true);
    const posArray = Object.entries(positions).map(([id, pos]) => ({
      id,
      posX: Math.round(pos.x),
      posY: Math.round(pos.y),
    }));
    await onSave(posArray);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    const pos: Record<string, { x: number; y: number }> = {};
    tables.forEach((table, idx) => {
      const col = idx % 6;
      const row = Math.floor(idx / 6);
      pos[table.id] = {
        x: 20 + col * (TABLE_W + 16),
        y: 20 + row * (TABLE_H + 16),
      };
    });
    setPositions(pos);
    setSaved(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{t("tables.dragToPosition")}</p>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t("tables.resetLayout")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? t("common.loading") : saved ? "✓ " + t("tables.layoutSaved") : t("tables.saveLayout")}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div
            ref={containerRef}
            className="relative"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              minWidth: CANVAS_WIDTH,
            }}
          >
            {tables.map((table) => (
              <DraggableTable
                key={table.id}
                table={table}
                position={positions[table.id] || { x: 0, y: 0 }}
              />
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  );
}
