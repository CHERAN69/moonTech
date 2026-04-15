import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Capture 100% of transactions in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Replay 10% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [],
  // Strip PII from breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
      // Don't log auth endpoints
      if (breadcrumb.data?.url?.includes('/auth/')) return null
    }
    return breadcrumb
  },
  beforeSend(event) {
    // Strip user PII from error payloads before sending
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    return event
  },
})
