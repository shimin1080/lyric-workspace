Deno.serve((req) => {
  const url = new URL(req.url);
  const success = url.searchParams.get("status") === "success";
  const title = success ? "Payment completed" : "Payment canceled";
  const message = success
    ? "You can return to Lyric Workspace and press the billing refresh button."
    : "You can return to Lyric Workspace.";
  return new Response(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0a0a0a; color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { max-width: 520px; padding: 32px; }
      h1 { font-size: 28px; margin: 0 0 12px; }
      p { color: #a3a3a3; line-height: 1.6; margin: 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${message}</p>
    </main>
  </body>
</html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
