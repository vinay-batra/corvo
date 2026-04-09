"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html>
      <body>
        <p>Something went wrong.</p>
      </body>
    </html>
  );
}
