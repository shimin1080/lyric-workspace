Deno.serve((req) => {
  const url = new URL(req.url);
  const success = url.searchParams.get("status") === "success";
  const appUrl = new URL(Deno.env.get("APP_RETURN_URL") || "https://lyric-workspace.vercel.app/");
  appUrl.searchParams.set("billing", success ? "success" : "cancel");
  appUrl.hash = appUrl.hash || "#pc";
  return new Response(null, {
    status: 302,
    headers: {
      Location: appUrl.toString(),
      "Cache-Control": "no-store",
    },
  });
});
