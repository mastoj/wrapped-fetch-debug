import { fetchWithDebugData, handleFetchResponse } from "@/lib/debug-fetch";

type WrappedFetch = (
  url: URL | RequestInfo,
  init?: RequestInit
) => Promise<Response>;

const debugFetch = (baseFetch: WrappedFetch): WrappedFetch => {
  return (url, init) =>
    baseFetch(url, init).then((res) => {
      return handleFetchResponse(res, url, init);
    });
};
export const dynamic = "force-dynamic";
const testFetch = debugFetch(fetch);

const page = async () => {
  const start = Date.now();
  const normalFetch = await fetch(
    "https://jsonplaceholder.typicode.com/todos/1",
    {
      next: { revalidate: 120 },
    }
  ).then((d) => d.text());
  const normal = Date.now() - start;
  const wrapped = await testFetch(
    "https://jsonplaceholder.typicode.com/todos/2",
    {
      next: { revalidate: 120 },
    }
  ).then((d) => d.text());
  const wrappedFetch = Date.now() - start;

  const withDebugData = await fetchWithDebugData(
    "https://jsonplaceholder.typicode.com/todos/3",
    {
      next: { revalidate: 120 },
    }
  ).then((d) => d.text());
  const debugTime = Date.now() - start;
  return (
    <div>
      <pre className="my-6 block">
        <code>
          {normalFetch.length} {normalFetch}
        </code>
      </pre>
      <pre className="my-6 block">
        <code>{wrapped.length}</code>
      </pre>
      <pre className="my-6 block">
        <code>{withDebugData.length}</code>
      </pre>
      <div className="flex gap-2">
        <span>Normal: {normal}ms</span>
        <span>Wrapped: {wrappedFetch}ms</span>
        <span>Wrapped debug: {debugTime}ms</span>
      </div>
    </div>
  );
};

export default page;
