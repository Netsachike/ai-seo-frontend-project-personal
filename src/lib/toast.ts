import { toast as sonner } from "sonner";

/**
 * The toast API the shared account pages call (`success`, `error`, `upgrade`,
 * `loading`, `dismiss`), on top of Orbit's sonner Toaster. Durations follow
 * the handoff. `upgrade` takes a translated action label and handler from the
 * caller, since this module has no access to the router or messages.
 */
type AppToastOptions = {
  id?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
};

const DURATION = { success: 3000, error: 4500, upgrade: 6000 } as const;

const asId = (id: string | number) => String(id);

export const toast = {
  success: (message: string, options?: AppToastOptions) =>
    asId(sonner.success(message, { duration: DURATION.success, ...options })),
  error: (message: string, options?: AppToastOptions) =>
    asId(sonner.error(message, { duration: DURATION.error, ...options })),
  upgrade: (message: string, options?: AppToastOptions) =>
    asId(sonner.warning(message, { duration: DURATION.upgrade, ...options })),
  loading: (message: string, options?: AppToastOptions) =>
    asId(sonner.loading(message, { duration: Infinity, ...options })),
  dismiss: (id?: string) => {
    sonner.dismiss(id);
  },
};

export type AppToastApi = typeof toast;
export const useToast = (): AppToastApi => toast;
