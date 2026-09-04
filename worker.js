export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = "https://assitancebackend-production.up.railway.app" + url.pathname + url.search;

    const headers = new Headers(request.headers);
    headers.set("Origin", "https://assitancebackend-production.up.railway.app");

    return fetch(target, {
      method: request.method,
      headers: headers,
      body: request.method === "GET" ? undefined : request.body,
    });
  },
};