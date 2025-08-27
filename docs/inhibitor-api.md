# Inhibitor API Documentation

The Inhibitor service provides a REST API for evaluating agent outputs, monitoring logs, and ensuring ethical reasoning in real time.

⚠️ **Note**: To use the API, you must have an **Inhibitor API key** issued by [appliedAIstudio](https://www.appliedai.studio/). Include it in all requests with the header:

```
X-API-Key: <your_api_key>
```

---

## 🔌 Base URL

Production:
```
https://inhibitor.infra-5ad.workers.dev
```

---

## 🚀 Endpoints

### 1. Health Check
```
GET /
```
- Confirms API key validity and service health.

---

### 2. Evaluate Output
```
POST /inhibitor
```
- Run ethical evaluation on text.
- Modes:
  - `insight` → detailed explanations (slower, for audits).
  - `performance` → minimal feedback (fast, for real-time).

**Request Example:**
```http
POST /inhibitor
X-API-Key: <your_api_key>
Content-Type: application/json

{
  "text": "Here’s my account number 1234-5678-9012",
  "mode": "insight"
}
```

**Response Example (Insight Mode):**

```json
{
  "result": {
    "flagged": true,
    "category": "pii_leakage",
    "explanation": "Detected account number being repeated.",
    "severity": 3
  }
}
```

**Response Example (Performance Mode):**

```json
{
  "result": {
    "flagged": true
  }
}
```

---

### 3. Retrieve Logs

```
GET /logs
```

* Returns recent evaluation logs for your API key.
* Supports pagination and time filters.

---

### 4. Delete Log Entry

```
DELETE /logs/{id}
```

* Deletes a specific log entry.

---

## ⚡ Modes Recap

* **Insight Mode** → Use for compliance, audits, debugging (rich detail).
* **Performance Mode** → Use for real-time and high-throughput agents (fast, minimal).

---

## 🔧 Python Example

```python
import requests, json

# API endpoint for evaluations
url = "https://inhibitor.infra-5ad.workers.dev/inhibitor"

# Headers include the API key
headers = {
    "X-API-Key": "your_api_key",
    "Content-Type": "application/json"
}

# Text to evaluate and the selected mode
payload = {
    "text": "Here’s my account number 1234-5678-9012",
    "mode": "insight"
}

# Send the request
response = requests.post(url, headers=headers, data=json.dumps(payload))

# Show the JSON response
print(response.json())
```

👉 Want to see this in action? Try the [Quickstart Notebook](../notebooks/quickstart_inhibitor.ipynb) for a live demo.

---

## 📌 Best Practices

* Use **insight mode** when developing, auditing, or debugging.
* Use **performance mode** in production for low-latency, high-volume use.
* Always **request an API key** from [appliedAIstudio](https://www.appliedai.studio/) before use.

