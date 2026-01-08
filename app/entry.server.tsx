import { PassThrough } from 'node:stream';
import type { EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { renderToPipeableStream } from 'react-dom/server';
import { createReadableStreamFromReadable } from '@remix-run/node';

export const streamTimeout = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
): Promise<Response> {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell
          if (shellRendered === true) {
            console.error(error);
          }
        },
      }
    );

    // eslint-disable-next-line no-undef
    setTimeout(abort, streamTimeout + 1000);
  });
}
