import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import {
  pendingCount,
  subscribeQueue,
  subscribeStatus,
  type QueueStatus,
} from "@/lib/offlineQueue";

export function NetworkBanner() {
  const [status, setStatus] = useState<QueueStatus>("idle");
  const [count, setCount] = useState<number>(pendingCount());

  useEffect(() => {
    const unsubQ = subscribeQueue((entries) => setCount(entries.length));
    const unsubS = subscribeStatus(setStatus);
    return () => {
      unsubQ();
      unsubS();
    };
  }, []);

  const visible = status === "offline" || status === "syncing" || status === "error";

  const label =
    status === "offline"
      ? "Offline Mode — Changes Queued"
      : status === "syncing"
        ? `Syncing ${count} change${count === 1 ? "" : "s"}…`
        : status === "error"
          ? `Retrying ${count} change${count === 1 ? "" : "s"}…`
          : "";

  const Icon = status === "syncing" || status === "error" ? RefreshCw : WifiOff;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      aria-live="polite"
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key="net-banner"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-warning-amber/15 px-4 py-2 text-xs font-semibold text-warning-amber shadow-3d-base backdrop-blur"
            role="status"
          >
            <Icon
              className={`h-4 w-4 ${status === "syncing" ? "animate-spin" : ""}`}
              strokeWidth={2.5}
            />
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
