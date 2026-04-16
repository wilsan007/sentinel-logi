/**
 * Initialisation conditionnelle de Sentry.
 *
 * Sentry n'est chargé que si `VITE_SENTRY_DSN` est défini.
 * Cela évite d'embarquer le SDK en local et garde le bundle léger
 * pour les environnements sans monitoring.
 */
export async function initMonitoring(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn,
      environment:
        (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ??
        import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      // N'envoie rien en mode développement pour éviter le bruit.
      enabled: import.meta.env.PROD,
    });
  } catch (err) {
    // Sentry est optionnel — on log mais on n'échoue pas l'app.
    // eslint-disable-next-line no-console
    console.warn("[monitoring] Sentry init failed:", err);
  }
}

/**
 * Capture une exception via Sentry si disponible.
 * Fallback console.error en local.
 */
export async function captureException(error: unknown, context?: Record<string, unknown>): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn) {
    try {
      const Sentry = await import("@sentry/react");
      Sentry.captureException(error, { extra: context });
      return;
    } catch {
      /* fallthrough */
    }
  }
  // eslint-disable-next-line no-console
  console.error("[error]", error, context);
}
