"""Small standard-library client for the Inhibitor benchmark API."""

import json
import time
import urllib.error
import urllib.request


class InhibitorApiClient:
    """HTTP JSON client used by executable benchmark runners."""

    def __init__(self, base_url, api_key=None, headers=None, timeout=None):
        self.base_url = str(base_url).rstrip("/")
        self.api_key = api_key
        self.headers = {
            "User-Agent": "inhibitor-lab-benchmark/0.1",
            "Accept": "application/json",
            **(headers or {}),
        }
        self.timeout = timeout

    def check(self, thought_chain, mode="performance", options=None):
        """Call the /check endpoint with a thought chain and mode."""

        payload = {"thought_chain": thought_chain, "mode": mode}
        if options is not None:
            payload["options"] = options
        return self._post_json("/check", payload)

    def catalog(self):
        """Call the /catalog endpoint."""

        return self._get_json("/catalog")

    def _build_headers(self, method):
        headers = {
            "User-Agent": "inhibitor-lab-benchmark/0.1",
            "Accept": "application/json",
        }
        if method == "POST":
            headers["Content-Type"] = "application/json"
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        headers.update(self.headers)
        return headers

    def _url(self, path):
        if not path.startswith("/"):
            path = f"/{path}"
        return f"{self.base_url}{path}"

    def _post_json(self, path, payload):
        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            self._url(path),
            data=body,
            headers=self._build_headers("POST"),
            method="POST",
        )
        return self._open_json(request)

    def _get_json(self, path):
        request = urllib.request.Request(
            self._url(path),
            headers=self._build_headers("GET"),
            method="GET",
        )
        return self._open_json(request)

    def _open_json(self, request):
        start = time.perf_counter()
        status = None
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                status = response.getcode()
                data = _decode_json_body(response.read())
                return {
                    "ok": 200 <= status < 300,
                    "status": status,
                    "data": data,
                    "latency_ms": _elapsed_ms(start),
                }
        except urllib.error.HTTPError as exc:
            status = exc.code
            data = _decode_json_body(exc.read())
            result = {
                "ok": False,
                "status": status,
                "error": str(exc),
                "latency_ms": _elapsed_ms(start),
            }
            if data is not None:
                result["data"] = data
            return result
        except urllib.error.URLError as exc:
            return {"ok": False, "error": str(exc), "latency_ms": _elapsed_ms(start)}
        except TimeoutError as exc:
            return {"ok": False, "error": str(exc), "latency_ms": _elapsed_ms(start)}


def _decode_json_body(raw_body):
    if not raw_body:
        return None
    text = raw_body.decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw_body": text}


def _elapsed_ms(start):
    return round((time.perf_counter() - start) * 1000, 3)
