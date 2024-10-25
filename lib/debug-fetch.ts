const apiLogContext = new AsyncLocalStorage();
export type SuccessResult<Data> = {
  success: true;
  data: Data;
  debug?: unknown;
};

export type ErrorResult<Error> = {
  success: false;
  error: Error;
  debug?: unknown;
};
export type Result<Data, Error = undefined> =
  | SuccessResult<Data>
  | ErrorResult<Error>;

function fail(): ErrorResult<never>;
function fail<Error>(error: Error): ErrorResult<Error>;
function fail(error?: unknown) {
  return { success: false, error };
}

function ok(): SuccessResult<never>;
function ok<Data>(data: Data): SuccessResult<Data>;
function ok(data?: unknown) {
  return { success: true, data };
}

export const Result = {
  ok,
  fail,
  empty: () => ok(),
  bind: <Data, Error, NewData>(fn: (data: Data) => Result<NewData, Error>) => {
    return (result: Result<Data, Error>) =>
      result.success ? fn(result.data) : result;
  },
};

export type AsyncResult<Data, Error = undefined> = Promise<Result<Data, Error>>;

type ApiLogContextEntry = {
  status: number;
  method?: string;
  input?: unknown;
  output?: unknown;
  url: string;
};

const createApiLogContext = () => {
  const context: ApiLogContextEntry[] = [];

  return {
    set: (entry: ApiLogContextEntry) => {
      context.push(entry);
    },
    get: () => Array.from(context),
  };
};

type ApiLogContext = ReturnType<typeof createApiLogContext> | undefined;

export const withApiLogContext = (callback: () => void | Promise<void>) => {
  apiLogContext.run(createApiLogContext(), callback);
};

export const getDebugResult = <T, E>(
  action: () => AsyncResult<T, E>
): AsyncResult<T, E> => {
  return new Promise<Result<T, E>>((resolve) => {
    withApiLogContext(async () => {
      const result = await action();
      result.debug = getApiLogEntries();
      resolve(result);
    });
  });
};

export const getApiLogContext = () => apiLogContext.getStore() as ApiLogContext;

export const getApiLogEntries = (): ApiLogContextEntry[] | undefined => {
  const context = getApiLogContext();

  return context?.get();
};

const tryParseJson = <T>(data: unknown): Result<T> => {
  if (typeof data !== "string") {
    return Result.fail();
  }

  try {
    return Result.ok(JSON.parse(data) as T);
  } catch (e) {
    console.log("==> Wat: ", e);
    return Result.fail();
  }
};

export const createLogEntry = async (
  url: string,
  res: Response,
  req?: RequestInit
): Promise<ApiLogContextEntry> => {
  const resultClone = res.clone();

  let resultBody: string | undefined;

  try {
    resultBody = await resultClone.text();
  } catch (e) {
    //
    console.log("==> Wat: ", e);
  }

  const body = tryParseJson(req?.body);
  const result = tryParseJson(resultBody);

  return {
    url,
    method: req?.method,
    status: res.status,
    input: body.success ? body.data : req?.body,
    output: result.success ? result.data : undefined,
  };
};

export const fetchWithDebugData: typeof fetch = (url, init) =>
  fetch(url, init).then((res) => {
    return handleFetchResponse(res, url, init);
  });

export const handleFetchResponse = async (
  res: Response,
  requestUrl?: URL | RequestInfo,
  init?: RequestInit
) => {
  const logContext = getApiLogContext();

  if (logContext != null) {
    logContext.set(
      await createLogEntry((requestUrl || res.url).toString(), res, init)
    );
  }

  return res;
};
