/**
 * The application name — the single source of truth shared by {@link Backend}
 * and the route loader. Keeping it here (instead of on the Backend class) lets
 * the route loader read it without importing Backend, which would otherwise
 * form a Backend ↔ RouteLoader import cycle.
 */
export const APP_NAME = 'mwpa';