import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { useGovernorLockout } from "@/hooks/useGovernorLockout";


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
    <div className="rounded-4xl bg-surface p-6 shadow-3d-base">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Energy Sandbox</h2>
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
        <div className="rounded-full bg-surface p-3 shadow-3d-pressed">
          <input
            id="energy-slider"
            type="range"
            min={1}
            max={3}
            step={1}
            defaultValue={level}
            onInput={(e) => setLevel(Number(e.currentTarget.value) as EnergyLevel)}
            className="w-full accent-accent-mint"
          />
        </div>
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
            className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-3d-base"
            data-level={level}
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
