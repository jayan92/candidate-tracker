import { Link } from "react-router-dom";

export const NotFound = () => (
  <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
    <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
    <p className="mt-2 text-sm text-slate-600">
      That page does not exist, or has not been built yet.
    </p>
    <Link
      to="/"
      className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      Back to dashboard
    </Link>
  </div>
);
