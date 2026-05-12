"use client";

import * as React from "react";

// useSyncExternalStore with a no-op subscribe is the canonical React 19
// pattern for "true on client, false on server". It satisfies the
// react-hooks/set-state-in-effect rule because nothing is set in an effect.
// On the server `getServerSnapshot` returns false (we render the fallback);
// on the client the first render uses `getSnapshot` which returns true after
// hydration commits, and the component swaps to children.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ClientOnly({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const mounted = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  if (!mounted) return <>{fallback ?? null}</>;
  return <>{children}</>;
}
