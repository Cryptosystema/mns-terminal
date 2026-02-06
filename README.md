# mns-terminal

## Integration Contract

MNS Terminal integrates with a production-ready backend via two delivery mechanisms: Server-Sent Events (SSE) as the primary real-time transport, and REST as a fallback snapshot mechanism. The formal integration contract defines endpoint specifications, delivery priority rules, degradation and recovery procedures, frontend responsibilities, and observability requirements. This contract governs Phase 22.2 (SSE client), Phase 22.3 (REST fallback), and future product development. See [docs/INTEGRATION_CONTRACT_PHASE_22.md](docs/INTEGRATION_CONTRACT_PHASE_22.md) for complete specification.