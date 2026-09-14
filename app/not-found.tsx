import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="tabular text-[13px] font-medium text-subtle">404</p>
      <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-text">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
        The link may be out of date, or the course it pointed to was removed.
      </p>
      <Link
        href="/today"
        className="mt-5 inline-flex h-9 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-text hover:bg-accent-hover"
      >
        Back to Today
      </Link>
    </div>
  );
}
