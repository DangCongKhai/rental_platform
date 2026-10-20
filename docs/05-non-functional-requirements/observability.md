# Logging alerts and monitoring

Course Task5 is required delivery work: restricted development diagnostics, structured exception logging and a critical-error alert, a query-duration and cumulative listener with slow-query alert deduplication, and separate host monitoring for CPU, memory, disk, and network with threshold alerts. A diagnostics screen alone is neither a slow-query alert nor server monitoring. Select compatible collector/dashboard/alert tool after hosting discovery (for example node exporter plus Prometheus/Grafana if permitted); document limits if provider hides host metrics. Test alert delivery and fallback without secrets. Correlate HTTP/jobs/audit with UUIDs; exclude tokens, private contracts, contact payloads and signed URLs.

Validation is part of feature/engineering issues and PR evidence. Tool versions/configuration must match the local installed framework; no invented pass result.
