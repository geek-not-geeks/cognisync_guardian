import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Enterprise Safeguard: force recovery screen before any dashboard redirect
        if (typeof window !== "undefined" && window.location.pathname !== "/update-password") {
          window.location.href = "/update-password";
        }
        return;
      }
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
      });

      // Foreign Key Failsafe: guarantee a public.users row exists so task
      // inserts never violate tasks_user_id_fkey.
      const u = session?.user;
      if (u) {
        void (async () => {
          try {
            const meta = u.user_metadata as { display_name?: string } | null;
            // ignoreDuplicates keeps an existing profile row intact — this only
            // seeds the row when it is missing.
            await supabase.from("users").upsert(
              {
                id: u.id,
                role: "student",
                display_name: meta?.display_name ?? null,
                target_study_hours: 6.0,
              } as never,
              { onConflict: "id", ignoreDuplicates: true },
            );

          } catch {
            // Silent background failsafe — never block the auth flow.
          }
        })();
      }
    });


    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
