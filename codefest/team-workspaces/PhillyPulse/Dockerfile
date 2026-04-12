FROM python:3.12-slim

WORKDIR /app

COPY requirements-philly-pulse.txt .
RUN pip install --no-cache-dir -r requirements-philly-pulse.txt

COPY philly_pulse/ philly_pulse/

EXPOSE 8080

CMD ["uvicorn", "philly_pulse.server:app", "--host", "0.0.0.0", "--port", "8080"]
