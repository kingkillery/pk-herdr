const RELEASE_PATH_PREFIX = "/releases/download/";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith(RELEASE_PATH_PREFIX)) {
      const key = url.pathname.slice(1);
      const object = await env.RELEASES.get(key);
      if (object === null) {
        return new Response("release asset not found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=31536000, immutable");
      return new Response(object.body, { headers });
    }

    return env.ASSETS.fetch(request);
  },
};
