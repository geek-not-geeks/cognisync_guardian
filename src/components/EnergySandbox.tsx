import { useState } from "react";
import { motion } from "framer-motion";

const STATUS_CONFIG = {
  1: {
    label: "Red State - Governor Lock",
    background: "#ef4444",
  },
  2: {
    label: "Amber State - Warning",
    background: "#f59e0b",
  },
  3: {
    label: "Green State - Sustainable",
    background: "#10b981",
  },
} as const;

type EnergyLevel = keyof typeof STATUS_CONFIG;

export function EnergySandbox() {
  const [level, setLevel] = useState<EnergyLevel>(3);
  const status = STATUS_CONFIG[level];

  return (
    <div className="rounded-xl border border-slate-800 bg-surface p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          Energy Sandbox
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Slide to see how your energy level reshapes the day.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="energy-slider"
            className="mb-3 flex items-center justify-between text-sm font-medium text-foreground"
          >
            <span>Drained</span>
            <span>Good</span>
          </label>
          <input
            id="energy-slider"
            type="range"
            min={1}
            max={3}
            step={1}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as EnergyLevel)}
            className="w-full accent-accent-mint"
          />
          <div className="mt-2 flex justify-between text-xs text-text-secondary">
            <span>1</span>
            <span>2</span>
            <span>3</span>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <motion.div
            animate={{ backgroundColor: status.background }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            {status.label}
          </motion.div>
        </div>

        <p className="text-center text-xs text-text-secondary">
          Current value: {level} —{" "}
          {level === 1
            ? "Governor locks heavy scheduling."
            : level === 2
              ? "Proactive delays kick in."
              : "Sustainable pacing is possible."}
        </p>
      </div>
    </div>
  );
}
