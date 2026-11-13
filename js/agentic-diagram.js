/* ==========================================================================
   OpenCrawling — Interactive Zero-Trust Data Provider Agent Diagram (Issue #203)
   Classic global script (compatible with http://, https://, and file://)
   ========================================================================== */

(function () {
  "use strict";

  const FLOW_META = {
    all: {
      id: "all",
      badge: "*",
      label: "Everything",
      title: "Overview — Five entry points, one zero-trust pipeline",
      desc: "Click or press Enter on any component, red checkpoint segment, loop step, or table row below to inspect its contract, enforcement invariant, and data path.",
      invariant:
        "Invariant: every caller presents RFC 8693 user delegation (sub + act.sub) and exits are scoped to that user's source ACL."
    },
    "1": {
      id: "1",
      badge: "1",
      label: "Explore",
      title: "Phase 1 · Explore (DiscoveryMcpTools)",
      desc: "Before downloading or embedding anything, the agent maps repository folders, MIME types, and counts via exploreRepositoryTree (dry run) strictly bounded by the delegated human user's source ACL.",
      invariant:
        "Zero-trust rule: no content bytes downloaded, no vectors created, and only folders readable by token.sub appear."
    },
    "2": {
      id: "2",
      badge: "2",
      label: "Govern",
      title: "Phase 2 · Govern (GovernanceGate)",
      desc: "Every Kafka ingestion message passes sequentially through GovernanceGate hooks (built-in PII masking followed by external HTTP hooks) before reaching Chunk and Embed.",
      invariant:
        "Zero-trust rule: hooks can inspect/redact text, never mutate acl, security, or ois:* fields; first rejection halts evaluation."
    },
    "3": {
      id: "3",
      badge: "3",
      label: "Ingest",
      title: "Phase 3 · Ingest (DynamicJobMcpTools → Embed)",
      desc: "The agent requests a scoped, idempotent crawl via DynamicJobMcpTools. DynamicJobService validates scope + readability, Connector fetch extracts text and source ACL, and approved/sanitized chunks are embedded into Vector stores.",
      invariant:
        "Zero-trust rule: agents never supply source hosts or credentials; same idempotency key reuses the same job."
    },
    "4": {
      id: "4",
      badge: "4",
      label: "Retrieve",
      title: "Phase 4 · Retrieve (Vector Search & OIS Sidecars)",
      desc: "At query time, McpVectorServer delegates every hit to McpAclEvaluator while SidecarMcpTools filters *.ois.json rows against the delegated user's permissions before returning results.",
      invariant:
        "Zero-trust rule: deny overrides grant and evaluation fails closed — nothing leaves wider than the human user's source read rights."
    },
    E: {
      id: "E",
      badge: "E",
      label: "BPM event",
      title: "Flow E · Event, no agent (BpmEventController)",
      desc: "An enterprise BPM engine (Flowable or Alfresco Process Services) emits a signed POST .../bpm/document-transition webhook validated via HMAC to trigger re-ingestion in the exact same pipeline.",
      invariant:
        "Zero-trust rule: authenticated via HMAC and funneled into the same DynamicJobService -> GovernanceGate -> Vector stores pipeline."
    }
  };

  const ITEM_DETAILS = {
    "human-user": {
      title: "Human user (sub · onBehalfOf principal)",
      flows: ["1", "2", "3", "4"],
      desc: "The verified human identity whose permissions define the hard ceiling for discovery, dynamic job scope checks, vector retrieval, and OIS sidecar reads.",
      invariant: "Claim: sub (required on every MCP call; missing sub fails closed)."
    },
    "ai-agent": {
      title: "AI agent (Spring AI · LangGraph · AutoGen · CrewAI)",
      flows: ["1", "2", "3", "4"],
      desc: "Autonomous orchestrator whose own LLM plans the Explore -> Decide -> Ingest -> Retrieve loop. Exchanges the user's token via RFC 8693 instead of holding direct credentials.",
      invariant: "Claims carried: sub=user plus act.sub=agent (SPIFFE ID or URI)."
    },
    "bpm-engine": {
      title: "BPM engine (Flowable · Alfresco Process Svcs)",
      flows: ["2", "E"],
      desc: "Process automation engine that triggers deterministic document re-ingestion on workflow state transitions without an AI agent in the loop.",
      invariant: "Authentication: signed request verified at the HMAC checkpoint before entering OC-RUNTIME."
    },
    "checkpoint-caller": {
      title: "Checkpoint · CALLER CHECK",
      flows: ["checkpoint", "1", "2", "3", "4"],
      desc: "First ingress gate inside the zero-trust boundary for MCP calls. Verifies RFC 8693 token signature, extracts both human principal (sub) and acting agent (act.sub), and rejects impersonation without user binding.",
      invariant: "Failure mode: FAIL_CLOSED — unverified callers never reach any MCP tool."
    },
    "checkpoint-hmac": {
      title: "Checkpoint · HMAC",
      flows: ["checkpoint", "E"],
      desc: "Cryptographic webhook verification gate for REST event ingestion from BPM engines (POST .../bpm/document-transition).",
      invariant: "Failure mode: invalid or missing HMAC signature is rejected at the boundary."
    },
    "checkpoint-token": {
      title: "Checkpoint · TOKEN + USER + SCOPE ELSE FAIL_CLOSED",
      flows: ["checkpoint", "1", "2", "3", "4", "E"],
      desc: "Uniform policy enforcement bar across all MCP tools and REST endpoints: a valid token, resolved human user, and required operational scope must all hold simultaneously.",
      invariant: "Failure mode: ELSE FAIL_CLOSED (never downgrades to anonymous or service-account access)."
    },
    "discovery-mcp": {
      title: "DiscoveryMcpTools",
      flows: ["1"],
      desc: "Exposes exploreRepositoryTree with dry-run semantics so agents can inspect repository hierarchy, MIME distributions, and document counts before triggering ingestion.",
      invariant: "No binary download, no chunking, no embedding; returns only folders readable by sub."
    },
    "dynamic-job-mcp": {
      title: "DynamicJobMcpTools",
      flows: ["3"],
      desc: "Exposes triggerDynamicJob and ingestDocument so an agent can schedule targeted ingestion on folders discovered during Phase 1.",
      invariant: "Requires explicit dynamic-job OAuth scope in addition to verified human user sub."
    },
    "dynamic-job-service": {
      title: "DynamicJobService",
      flows: ["2", "3", "E"],
      desc: "Validates that the requested folder is within configured scope and readable by the human user, and deduplicates repeat calls using caller idempotency keys.",
      invariant: "Idempotency: same idempotency key resolves to the same job without duplicate fetches."
    },
    "connector-fetch": {
      title: "Connector fetch",
      flows: ["2", "3", "E"],
      desc: "Executes the physical read against Source repositories using server-managed connector credentials, extracting full text alongside authoritative source ACL metadata.",
      invariant: "Isolation: AI agents never supply repository hostnames, URLs, or connector secrets."
    },
    "bpm-controller": {
      title: "BpmEventController",
      flows: ["2", "E"],
      desc: "REST endpoint (POST .../bpm/document-transition) receiving workflow events and dispatching them straight into DynamicJobService.",
      invariant: "Events converge into the exact same Kafka + GovernanceGate ingestion pipeline as agent jobs."
    },
    "observability-mcp": {
      title: "ObservabilityMcpTools",
      flows: ["1", "2", "3", "4"],
      desc: "Exposes fetchJobTraces and getErrorLogs so operators and supervising agents can inspect ingestion execution traces and failure diagnostics behind the same zero-trust boundary.",
      invariant: "Guarded by TOKEN + USER + SCOPE ELSE FAIL_CLOSED just like ingestion and retrieval tools."
    },
    kafka: {
      title: "Kafka · ingestion topic",
      flows: ["2", "3", "E"],
      desc: "Durable asynchronous hand-off decoupling source connector reads from pre-chunking governance checks and vector embedding workers.",
      invariant: "Messages carry extracted content, document identity, and immutable source ACL payloads."
    },
    "governance-gate": {
      title: "GovernanceGate",
      flows: ["2", "3", "E"],
      desc: "Pre-chunking policy gate executing hooks in order: built-in PII masking followed by external HTTP compliance hooks. Produces APPROVED, SANITIZED, REJECTED, or UNAVAILABLE verdicts.",
      invariant: "Hooks operate on text only; cannot mutate acl, security, or ois:* metadata. First rejection stops evaluation."
    },
    chunk: {
      title: "Chunk",
      flows: ["2", "3", "E"],
      desc: "Splits only APPROVED or SANITIZED text according to a capped per-job ChunkingSpec while preserving parent document security metadata on every slice.",
      invariant: "Rejected or failed-gate documents never reach chunking and never produce vectors."
    },
    embed: {
      title: "Embed (oc-embedding-service)",
      flows: ["2", "3", "E"],
      desc: "Generates dense vector representations for approved/sanitized chunks and upserts vectors alongside authoritative source ACL attributes into Vector stores.",
      invariant: "Upsert payload binds vector embeddings directly to source ACL predicates."
    },
    "mcp-vector-server": {
      title: "McpVectorServer (secureVectorSearch)",
      flows: ["4"],
      desc: "Handles semantic retrieval queries from AI agents and enforces inline post-query or filter evaluation through McpAclEvaluator.",
      invariant: "Returns zero unauthorized chunks even if underlying ANN vector indexes hold mixed-visibility corpora."
    },
    "mcp-acl-evaluator": {
      title: "McpAclEvaluator",
      flows: ["4"],
      desc: "Authoritative zero-trust filter checking the caller's delegated sub identity against each candidate vector chunk's source ACL.",
      invariant: "Semantics: deny overrides grant, and indeterminate/error states fail closed."
    },
    "sidecar-mcp": {
      title: "SidecarMcpTools (readOisSidecars · *.ois.json)",
      flows: ["4"],
      desc: "Allows agents to inspect structured Open Ingestion Standard (OIS) JSON sidecars stored in object storage with row- and field-level ACL filtering.",
      invariant: "Only rows permitted by the delegated user's source ACL are exposed to the agent."
    },
    "source-repos": {
      title: "Source repositories",
      flows: ["1", "2", "3", "E"],
      desc: "Enterprise content stores including SharePoint, Alfresco, Hyland CIC, FileNet, Documentum, M-Files, Doxis, and CMIS systems holding both documents and authoritative ACLs.",
      invariant: "Source of truth for both folder/document hierarchy and user access control lists."
    },
    "vector-stores": {
      title: "Vector stores",
      flows: ["2", "3", "4", "E"],
      desc: "Pluggable vector backends (pgvector, Milvus, Qdrant, Vespa, Solr, OpenSearch) storing chunks tagged with the document's end-to-end source ACL.",
      invariant: "Every stored vector chunk carries its source ACL for enforcement on retrieval."
    },
    "ois-sidecars": {
      title: "OIS sidecars (<key>.ois.json)",
      flows: ["4"],
      desc: "Structured Open Ingestion Standard metadata objects stored in Apache Ozone or AWS S3, validated in CI against the live OIS JSON schema.",
      invariant: "Includes governance audit facts (e.g. ois:governance) when text is sanitized."
    },
    "claim-sub": {
      title: "Token claim · sub",
      flows: ["checkpoint", "1", "2", "3", "4"],
      desc: "The human user principal (onBehalfOf). Their repository permissions bound Phase 1 discovery, Phase 3 ingestion scope, and Phase 4 retrieval.",
      invariant: "If missing: FAIL_CLOSED — request is rejected at the red checkpoint."
    },
    "claim-act-sub": {
      title: "Token claim · act.sub",
      flows: ["checkpoint", "1", "2", "3", "4"],
      desc: "Identifies the AI agent acting on the human user's behalf via a SPIFFE ID or URI, mapped to the runtime's caller actor for telemetry and auditing.",
      invariant: "If missing: — (logged/mapped if present; sub remains mandatory)."
    },
    "claim-scope": {
      title: "Token claim · scope",
      flows: ["checkpoint", "3"],
      desc: "Explicit OAuth scope authorizing dynamic job execution on top of user identity.",
      invariant: "If missing: FAIL_CLOSED — agent cannot trigger dynamic ingestion jobs."
    },
    "gate-approved": {
      title: "Gate status · APPROVED",
      flows: ["2", "3", "E"],
      desc: "All PII masking and HTTP governance hooks cleared the extracted text without alteration.",
      invariant: "Embeds: As is · Earlier version in vector store: Replaced."
    },
    "gate-sanitized": {
      title: "Gate status · SANITIZED",
      flows: ["2", "3", "E"],
      desc: "One or more governance hooks redacted sensitive text; downstream hooks see the sanitized output and chunking receives only redacted text.",
      invariant: "Embeds: Redacted text · Earlier version: Replaced; audit facts recorded in ois:governance."
    },
    "gate-rejected": {
      title: "Gate status · REJECTED",
      flows: ["2", "3", "E"],
      desc: "A governance hook rejected the document and terminated further hook evaluation immediately.",
      invariant: "Embeds: Nothing · Earlier version: Purged when onRejectedUpdate policy says so."
    },
    "gate-unavailable": {
      title: "Gate status · UNAVAILABLE",
      flows: ["2", "3", "E"],
      desc: "An external HTTP governance hook timed out or returned an error state.",
      invariant: "Embeds: Nothing · Earlier version: Kept; a failing hook never silently deletes previously indexed knowledge."
    },
    "loop-1": {
      title: "Agent Loop · 1 Explore (map before fetching)",
      flows: ["1"],
      desc: "The agent maps folders, MIME distributions, and counts via DiscoveryMcpTools without downloading binary content or creating vector embeddings.",
      invariant: "Phase 1 isolates metadata discovery behind CALLER CHECK using only folders token.sub can read."
    },
    "loop-2": {
      title: "Agent Loop · 2 Decide (pick a scope; the gate governs)",
      flows: ["2"],
      desc: "The agent selects a target folder scope to ingest, while GovernanceGate enforces PII masking and external HTTP policy hooks before chunking.",
      invariant: "Phase 2 guarantees redacted or rejected content never reaches Chunk, Embed, or Vector stores."
    },
    "loop-3": {
      title: "Agent Loop · 3 Ingest (scoped, idempotent job)",
      flows: ["3"],
      desc: "DynamicJobMcpTools triggers DynamicJobService with an explicit idempotency key and required dynamic-job scope; Connector fetch extracts text and ACLs.",
      invariant: "Phase 3 enforces server-managed repository credentials and ACL extraction into Kafka -> Embed."
    },
    "loop-4": {
      title: "Agent Loop · 4 Retrieve (only what the user may read)",
      flows: ["4"],
      desc: "At query time, McpVectorServer filters vector hits through McpAclEvaluator and SidecarMcpTools filters *.ois.json rows against token.sub.",
      invariant: "Phase 4 applies deny-overrides-grant semantics and fails closed on indeterminate ACL checks."
    },
    "loop-E": {
      title: "Event, no agent · E (a BPM transition re-ingests)",
      flows: ["E"],
      desc: "Flowable or Alfresco Process Services triggers BpmEventController on document transitions, entering the identical DynamicJobService -> GovernanceGate pipeline.",
      invariant: "REST webhooks authenticate via HMAC at the zero-trust boundary instead of RFC 8693 delegation."
    }
  };

  let instanceCounter = 0;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null) continue;
        if (k === "text") {
          node.textContent = v;
        } else {
          node.setAttribute(k, String(v));
        }
      }
    }
    if (children) {
      for (const child of children) {
        if (child) node.appendChild(child);
      }
    }
    return node;
  }

  function svgEl(tag, attrs, children) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null) continue;
        if (k === "text") {
          node.textContent = v;
        } else {
          node.setAttribute(k, String(v));
        }
      }
    }
    if (children) {
      for (const child of children) {
        if (child) node.appendChild(child);
      }
    }
    return node;
  }

  function createFlowBadge(cx, cy, flowCode, radius) {
    const r = radius || 10;
    const fillMap = {
      "1": "var(--zt-f1-badge)",
      "2": "var(--zt-f2-badge)",
      "3": "var(--zt-f3-badge)",
      "4": "var(--zt-f4-badge)",
      E: "var(--zt-fe-badge)"
    };
    return svgEl("g", { class: "zt-flow-badge", "aria-hidden": "true" }, [
      svgEl("circle", {
        cx,
        cy,
        r,
        fill: fillMap[flowCode] || "#334155",
        stroke: "var(--zt-surface)",
        "stroke-width": 1.5
      }),
      svgEl("text", {
        x: cx,
        y: cy + 3.5,
        "text-anchor": "middle",
        fill: "#ffffff",
        "font-family": "var(--font-mono, 'Fira Code', monospace)",
        "font-size": "10.5",
        "font-weight": "700",
        text: flowCode
      })
    ]);
  }

  function createWire(uid, opts) {
    const colorClass = {
      neutral: "zt-wire-neutral",
      dashed: "zt-wire-dashed",
      "1": "zt-wire-f1",
      "2": "zt-wire-f2",
      "3": "zt-wire-f3",
      "4": "zt-wire-f4",
      E: "zt-wire-fe"
    }[opts.style || "neutral"];

    const markerName = `${uid}-arr-${opts.style || "neutral"}`;
    const g = svgEl("g", {
      class: "zt-wire-group",
      "data-flows": opts.flows.join(" ")
    });

    const pathAttrs = {
      d: opts.d,
      class: `zt-wire ${colorClass}`
    };
    if (opts.arrowEnd) pathAttrs["marker-end"] = `url(#${markerName})`;
    if (opts.arrowStart) pathAttrs["marker-start"] = `url(#${markerName})`;
    g.appendChild(svgEl("path", pathAttrs));

    if (opts.animated && opts.style !== "dashed" && opts.style !== "neutral") {
      const pulseStroke = {
        "1": "var(--zt-f1)",
        "2": "var(--zt-f2)",
        "3": "var(--zt-f3)",
        "4": "var(--zt-f4)",
        E: "var(--zt-fe)"
      }[opts.style];
      g.appendChild(
        svgEl("path", {
          d: opts.d,
          class: "zt-wire-pulse",
          stroke: pulseStroke
        })
      );
    }

    if (opts.labels) {
      for (const lbl of opts.labels) {
        g.appendChild(
          svgEl("text", {
            x: lbl.x,
            y: lbl.y,
            "text-anchor": lbl.anchor || "start",
            class: lbl.strong ? "zt-wire-label-strong" : "zt-wire-label",
            style:
              "paint-order: stroke; stroke: var(--zt-surface); stroke-width: 4.5px; stroke-linejoin: round;",
            text: lbl.text
          })
        );
      }
    }
    return g;
  }

  function buildDiagramSvg(uid) {
    const svg = svgEl("svg", {
      class: "zt-svg",
      viewBox: "0 0 1160 704",
      role: "img",
      "aria-label":
        "Zero-trust data provider architecture diagram spanning Caller Side, OC-Runtime Zero-Trust Boundary, and Data stores"
    });

    // Arrowhead markers
    const defs = svgEl("defs");
    const markerSpecs = [
      { id: "neutral", color: "var(--zt-text-secondary)" },
      { id: "dashed", color: "var(--zt-text-muted)" },
      { id: "1", color: "var(--zt-f1)" },
      { id: "2", color: "var(--zt-f2)" },
      { id: "3", color: "var(--zt-f3)" },
      { id: "4", color: "var(--zt-f4)" },
      { id: "E", color: "var(--zt-fe)" }
    ];
    for (const m of markerSpecs) {
      defs.appendChild(
        svgEl(
          "marker",
          {
            id: `${uid}-arr-${m.id}`,
            viewBox: "0 0 10 10",
            refX: 8.2,
            refY: 5,
            markerWidth: 6,
            markerHeight: 6,
            orient: "auto-start-reverse"
          },
          [
            svgEl("path", {
              d: "M 0 1.4 L 9 5 L 0 8.6 z",
              fill: m.color
            })
          ]
        )
      );
    }
    svg.appendChild(defs);

    // ------------------------------------------------------------------
    // 1. Structural Zone Frames
    // ------------------------------------------------------------------
    svg.appendChild(
      svgEl("rect", { x: 14, y: 14, width: 214, height: 676, rx: 10, class: "zt-zone-bg" })
    );
    svg.appendChild(svgEl("text", { x: 26, y: 34, class: "zt-zone-label", text: "CALLER SIDE" }));

    svg.appendChild(
      svgEl("rect", {
        x: 240,
        y: 14,
        width: 662,
        height: 676,
        rx: 10,
        class: "zt-boundary-frame"
      })
    );
    svg.appendChild(svgEl("text", { x: 256, y: 34, class: "zt-zone-label", text: "OC-RUNTIME" }));
    svg.appendChild(
      svgEl("text", {
        x: 888,
        y: 34,
        "text-anchor": "end",
        class: "zt-zone-label zt-zone-label-danger",
        text: "ZERO-TRUST BOUNDARY"
      })
    );

    svg.appendChild(
      svgEl("rect", { x: 914, y: 14, width: 232, height: 676, rx: 10, class: "zt-zone-bg" })
    );
    svg.appendChild(svgEl("text", { x: 928, y: 34, class: "zt-zone-label", text: "DATA" }));

    // Bottom DATA store wrapper group card
    svg.appendChild(
      svgEl("rect", {
        x: 926,
        y: 440,
        width: 208,
        height: 238,
        rx: 10,
        class: "zt-box-group-bg"
      })
    );

    // THE AGENT'S LOOP section divider & label
    svg.appendChild(
      svgEl("line", {
        x1: 26,
        y1: 332,
        x2: 216,
        y2: 332,
        stroke: "var(--zt-border)",
        "stroke-width": 1
      })
    );
    svg.appendChild(
      svgEl("text", {
        x: 26,
        y: 353,
        class: "zt-zone-label",
        text: "THE AGENT'S LOOP"
      })
    );

    // Outer left label along the red checkpoint bar
    svg.appendChild(
      svgEl("text", {
        x: 249,
        y: 446,
        transform: "rotate(-90 249 446)",
        "text-anchor": "middle",
        class: "zt-node-mono",
        style: "font-size: 9px; letter-spacing: 0.04em;",
        text: "MCP tools · REST"
      })
    );

    // ------------------------------------------------------------------
    // 2. Wires & Arrows (drawn underneath interactive node cards)
    // ------------------------------------------------------------------
    const wireSpecs = [
      // Caller Side delegation
      {
        d: "M 121 98 L 121 129",
        style: "neutral",
        flows: ["1", "2", "3", "4"],
        arrowEnd: true,
        labels: [{ x: 128, y: 117, text: "delegates · RFC 8693" }]
      },
      // Human user + AI agent wires entering CALLER CHECK bar
      {
        d: "M 216 70 L 236 70 L 236 164 L 252 164",
        style: "neutral",
        flows: ["1", "2", "3", "4"]
      },
      {
        d: "M 216 172 L 252 172",
        style: "neutral",
        flows: ["1", "2", "3", "4"]
      },
      // Checkpoint -> DiscoveryMcpTools (Flow 1)
      {
        d: "M 272 72 L 297 72",
        style: "1",
        flows: ["1"],
        arrowEnd: true,
        animated: true
      },
      // Checkpoint -> DynamicJobMcpTools (Flow 3)
      {
        d: "M 272 164 L 297 164",
        style: "3",
        flows: ["3"],
        arrowEnd: true,
        animated: true
      },
      // BPM engine -> HMAC -> BpmEventController (Flow E)
      {
        d: "M 216 286 L 252 286",
        style: "E",
        flows: ["2", "E"],
        animated: true
      },
      {
        d: "M 272 286 L 297 286",
        style: "E",
        flows: ["2", "E"],
        arrowEnd: true,
        animated: true
      },
      // Checkpoint -> ObservabilityMcpTools
      {
        d: "M 272 370 L 297 370",
        style: "neutral",
        flows: ["1", "2", "3", "4"],
        arrowEnd: true
      },
      // Checkpoint -> McpVectorServer (Flow 4)
      {
        d: "M 272 534 L 297 534",
        style: "4",
        flows: ["4"],
        arrowEnd: true,
        animated: true
      },
      // Checkpoint -> SidecarMcpTools (Flow 4)
      {
        d: "M 272 624 L 297 624",
        style: "4",
        flows: ["4"],
        arrowEnd: true,
        animated: true
      },
      // DiscoveryMcpTools -> Source repositories (Flow 1)
      {
        d: "M 490 72 L 927 72",
        style: "1",
        flows: ["1"],
        arrowEnd: true,
        animated: true,
        labels: [
          { x: 706, y: 63, anchor: "middle", strong: true, text: "folder tree · MIME types · counts" },
          {
            x: 706,
            y: 88,
            anchor: "middle",
            text: "no download, no embedding · only folders the user can read"
          }
        ]
      },
      // DynamicJobMcpTools -> DynamicJobService (Flow 3)
      {
        d: "M 478 164 L 498 164",
        style: "3",
        flows: ["3"],
        arrowEnd: true,
        animated: true
      },
      // DynamicJobService -> Connector fetch (Flows 2, 3, E)
      {
        d: "M 678 164 L 696 164",
        style: "3",
        flows: ["2", "3", "E"],
        arrowEnd: true,
        animated: true
      },
      // Source repositories -> reads -> Connector fetch
      {
        d: "M 929 164 L 897 164",
        style: "3",
        flows: ["2", "3", "E"],
        arrowEnd: true,
        animated: true,
        labels: [{ x: 913, y: 155, anchor: "middle", text: "reads" }]
      },
      // BpmEventController -> DynamicJobService (Flow E)
      {
        d: "M 478 286 L 490 286 L 490 214 L 552 214 L 552 203",
        style: "E",
        flows: ["2", "E"],
        arrowEnd: true,
        animated: true
      },
      // Connector fetch -> Kafka (ingestion pipeline)
      {
        d: "M 830 200 L 830 233",
        style: "3",
        flows: ["2", "3", "E"],
        arrowEnd: true,
        animated: true
      },
      // Kafka -> GovernanceGate (Flow 2)
      {
        d: "M 766 260 L 735 260",
        style: "2",
        flows: ["2", "3", "E"],
        arrowEnd: true,
        animated: true
      },
      // GovernanceGate -> Chunk (Flow 2)
      {
        d: "M 582 404 L 582 435",
        style: "2",
        flows: ["2", "3", "E"],
        arrowEnd: true,
        animated: true,
        labels: [{ x: 591, y: 424, strong: true, text: "approved · sanitized only" }]
      },
      // Chunk -> Embed (Flows 2, 3, E)
      {
        d: "M 664 464 L 694 464",
        style: "3",
        flows: ["2", "3", "E"],
        arrowEnd: true,
        animated: true
      },
      // Embed -> Vector stores (Flows 2, 3, E)
      {
        d: "M 852 464 L 936 464",
        style: "3",
        flows: ["2", "3", "E"],
        arrowEnd: true,
        animated: true,
        labels: [{ x: 894, y: 454, anchor: "middle", strong: true, text: "upsert + ACL" }]
      },
      // McpVectorServer <-> McpAclEvaluator (Flow 4)
      {
        d: "M 484 534 L 516 534",
        style: "4",
        flows: ["4"],
        arrowStart: true,
        arrowEnd: true,
        animated: true
      },
      // Vector stores -> McpAclEvaluator (Flow 4)
      {
        d: "M 936 534 L 727 534",
        style: "4",
        flows: ["4"],
        arrowEnd: true,
        animated: true,
        labels: [
          {
            x: 831,
            y: 550,
            anchor: "middle",
            text: "query → only the hits"
          },
          {
            x: 831,
            y: 563,
            anchor: "middle",
            text: "the user may read come back"
          }
        ]
      },
      // SidecarMcpTools <-> OIS sidecars (Flow 4)
      {
        d: "M 484 624 L 936 624",
        style: "4",
        flows: ["4"],
        arrowStart: true,
        arrowEnd: true,
        animated: true,
        labels: [{ x: 710, y: 615, anchor: "middle", text: "rows filtered by the user's ACL" }]
      },
      // DATA Vertical dashed ACL lineage spine
      {
        d: "M 946 190 L 946 436",
        style: "dashed",
        flows: ["1", "2", "3", "4", "E"],
        arrowEnd: true
      }
    ];

    for (const w of wireSpecs) {
      svg.appendChild(createWire(uid, w));
    }

    // DATA vertical spine 2-line caption (not obscured by dashed line)
    svg.appendChild(
      svgEl("text", {
        x: 957,
        y: 296,
        class: "zt-wire-label",
        text: "every document keeps its"
      })
    );
    svg.appendChild(
      svgEl("text", {
        x: 957,
        y: 311,
        class: "zt-wire-label",
        text: "source ACL end to end"
      })
    );

    // ------------------------------------------------------------------
    // 3. Interactive Red Checkpoint Bar Segments
    // ------------------------------------------------------------------
    function addInteractiveNode(id, flows, ariaLabel, children) {
      const g = svgEl(
        "g",
        {
          class: "zt-interactive",
          tabindex: "0",
          role: "button",
          "aria-label": ariaLabel,
          "data-node-id": id,
          "data-flows": flows.join(" "),
          "data-selected": "false"
        },
        children
      );
      return g;
    }

    svg.appendChild(
      addInteractiveNode("checkpoint-caller", ["1", "2", "3", "4"], "Inspect CALLER CHECK gate", [
        svgEl("rect", {
          x: 254,
          y: 46,
          width: 18,
          height: 196,
          rx: 4,
          class: "zt-checkpoint-bar"
        }),
        svgEl("text", {
          x: 266,
          y: 144,
          transform: "rotate(-90 266 144)",
          "text-anchor": "middle",
          fill: "#ffffff",
          "font-family": "var(--font-mono, 'Fira Code', monospace)",
          "font-size": "9.5",
          "font-weight": "700",
          "letter-spacing": "0.08em",
          text: "CALLER CHECK"
        })
      ])
    );

    svg.appendChild(
      addInteractiveNode("checkpoint-hmac", ["2", "E"], "Inspect HMAC checkpoint", [
        svgEl("rect", {
          x: 254,
          y: 248,
          width: 18,
          height: 76,
          rx: 4,
          class: "zt-checkpoint-bar"
        }),
        svgEl("text", {
          x: 266,
          y: 286,
          transform: "rotate(-90 266 286)",
          "text-anchor": "middle",
          fill: "#ffffff",
          "font-family": "var(--font-mono, 'Fira Code', monospace)",
          "font-size": "9.5",
          "font-weight": "700",
          "letter-spacing": "0.08em",
          text: "HMAC"
        })
      ])
    );

    svg.appendChild(
      addInteractiveNode(
        "checkpoint-token",
        ["1", "2", "3", "4", "E"],
        "Inspect TOKEN + USER + SCOPE ELSE FAIL_CLOSED checkpoint",
        [
          svgEl("rect", {
            x: 254,
            y: 330,
            width: 18,
            height: 318,
            rx: 4,
            class: "zt-checkpoint-bar"
          }),
          svgEl("text", {
            x: 266,
            y: 489,
            transform: "rotate(-90 266 489)",
            "text-anchor": "middle",
            fill: "#ffffff",
            "font-family": "var(--font-mono, 'Fira Code', monospace)",
            "font-size": "9",
            "font-weight": "700",
            "letter-spacing": "0.06em",
            text: "TOKEN + USER + SCOPE   ELSE FAIL_CLOSED"
          })
        ]
      )
    );

    // ------------------------------------------------------------------
    // 4. Interactive Architectural Nodes
    // ------------------------------------------------------------------

    // CALLER SIDE nodes
    svg.appendChild(
      addInteractiveNode("human-user", ["1", "2", "3", "4"], "Inspect Human user principal", [
        svgEl("rect", { x: 26, y: 46, width: 190, height: 52, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 38, y: 67, class: "zt-node-title", text: "Human user" }),
        svgEl("text", {
          x: 38,
          y: 85,
          class: "zt-node-sub",
          text: "sub · the onBehalfOf principal"
        })
      ])
    );

    svg.appendChild(
      addInteractiveNode("ai-agent", ["1", "2", "3", "4"], "Inspect AI agent caller", [
        svgEl("rect", { x: 26, y: 132, width: 190, height: 106, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 38, y: 153, class: "zt-node-title", text: "AI agent" }),
        svgEl("text", { x: 38, y: 169, class: "zt-node-sub", text: "its own LLM plans the loop" }),
        svgEl("text", {
          x: 38,
          y: 184,
          class: "zt-node-sub",
          text: "Spring AI · LangGraph ·"
        }),
        svgEl("text", { x: 38, y: 198, class: "zt-node-sub", text: "AutoGen · CrewAI" }),
        svgEl("rect", { x: 36, y: 208, width: 170, height: 21, rx: 5, class: "zt-pill-rect" }),
        svgEl("text", {
          x: 121,
          y: 222,
          "text-anchor": "middle",
          class: "zt-node-mono",
          text: "sub=user   act.sub=agent"
        })
      ])
    );

    svg.appendChild(
      addInteractiveNode("bpm-engine", ["2", "E"], "Inspect BPM engine caller", [
        svgEl("rect", { x: 26, y: 260, width: 190, height: 52, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 38, y: 281, class: "zt-node-title", text: "BPM engine" }),
        svgEl("text", {
          x: 38,
          y: 299,
          class: "zt-node-sub",
          text: "Flowable · Alfresco Process Svcs"
        })
      ])
    );

    // THE AGENT'S LOOP steps
    const loopSteps = [
      { id: "loop-1", flow: "1", y: 364, title: "Explore", sub: "map before fetching" },
      {
        id: "loop-2",
        flow: "2",
        y: 410,
        title: "Decide",
        sub: "pick a scope; the gate governs"
      },
      { id: "loop-3", flow: "3", y: 456, title: "Ingest", sub: "scoped, idempotent job" },
      {
        id: "loop-4",
        flow: "4",
        y: 502,
        title: "Retrieve",
        sub: "only what the user may read"
      },
      {
        id: "loop-E",
        flow: "E",
        y: 564,
        title: "Event, no agent",
        sub: "a BPM transition re-ingests"
      }
    ];

    svg.appendChild(
      svgEl("line", {
        x1: 28,
        y1: 552,
        x2: 212,
        y2: 552,
        stroke: "var(--zt-border)",
        "stroke-width": 1,
        "stroke-dasharray": "3 3"
      })
    );

    for (const step of loopSteps) {
      const g = addInteractiveNode(
        step.id,
        [step.flow],
        `Filter / inspect loop step ${step.flow}: ${step.title}`,
        [
          svgEl("rect", {
            x: 24,
            y: step.y,
            width: 192,
            height: 40,
            rx: 8,
            fill: "transparent",
            class: "zt-loop-bg"
          }),
          createFlowBadge(40, step.y + 20, step.flow, 10.5),
          svgEl("text", {
            x: 58,
            y: step.y + 17,
            class: "zt-node-title",
            style: "font-size: 11.5px;",
            text: step.title
          }),
          svgEl("text", {
            x: 58,
            y: step.y + 32,
            class: "zt-node-sub",
            style: "font-size: 9.8px;",
            text: step.sub
          })
        ]
      );
      g.classList.add("zt-loop-item");
      g.setAttribute("data-filter-flow", step.flow);
      svg.appendChild(g);
    }

    // OC-RUNTIME Row 1: DiscoveryMcpTools
    svg.appendChild(
      addInteractiveNode("discovery-mcp", ["1"], "Inspect DiscoveryMcpTools", [
        svgEl("rect", { x: 296, y: 46, width: 194, height: 52, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 308, y: 67, class: "zt-node-title", text: "DiscoveryMcpTools" }),
        svgEl("text", {
          x: 308,
          y: 85,
          class: "zt-node-sub",
          text: "exploreRepositoryTree · dry run"
        }),
        createFlowBadge(490, 46, "1", 10.5)
      ])
    );

    // OC-RUNTIME Row 2: DynamicJobMcpTools -> DynamicJobService -> Connector fetch
    svg.appendChild(
      addInteractiveNode("dynamic-job-mcp", ["3"], "Inspect DynamicJobMcpTools", [
        svgEl("rect", { x: 296, y: 138, width: 182, height: 52, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 306, y: 159, class: "zt-node-title", text: "DynamicJobMcpTools" }),
        svgEl("text", {
          x: 306,
          y: 177,
          class: "zt-node-sub",
          style: "font-size: 8.8px;",
          text: "triggerDynamicJob · ingestDocument"
        }),
        createFlowBadge(478, 138, "3", 10.5)
      ])
    );

    svg.appendChild(
      addInteractiveNode("dynamic-job-service", ["2", "3", "E"], "Inspect DynamicJobService", [
        svgEl("rect", { x: 500, y: 132, width: 178, height: 68, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 511, y: 152, class: "zt-node-title", text: "DynamicJobService" }),
        svgEl("text", {
          x: 511,
          y: 170,
          class: "zt-node-sub",
          style: "font-size: 9.4px;",
          text: "folder in scope + readable"
        }),
        svgEl("text", {
          x: 511,
          y: 185,
          class: "zt-node-sub",
          style: "font-size: 8.9px;",
          text: "same idempotency key → same job"
        })
      ])
    );

    svg.appendChild(
      addInteractiveNode("connector-fetch", ["2", "3", "E"], "Inspect Connector fetch", [
        svgEl("rect", { x: 698, y: 132, width: 196, height: 68, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 709, y: 152, class: "zt-node-title", text: "Connector fetch" }),
        svgEl("text", {
          x: 709,
          y: 170,
          class: "zt-node-sub",
          style: "font-size: 9.4px;",
          text: "text + source ACL extracted"
        }),
        svgEl("text", {
          x: 709,
          y: 185,
          class: "zt-node-sub",
          style: "font-size: 8.6px;",
          text: "agent never supplies hosts or credentials"
        })
      ])
    );

    // OC-RUNTIME Row 3 Left: BpmEventController + ObservabilityMcpTools
    svg.appendChild(
      addInteractiveNode("bpm-controller", ["2", "E"], "Inspect BpmEventController", [
        svgEl("rect", { x: 296, y: 260, width: 182, height: 52, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 306, y: 281, class: "zt-node-title", text: "BpmEventController" }),
        svgEl("text", {
          x: 306,
          y: 299,
          class: "zt-node-sub",
          style: "font-size: 8.9px;",
          text: "POST .../bpm/document-transition"
        }),
        createFlowBadge(478, 260, "E", 10.5)
      ])
    );

    svg.appendChild(
      addInteractiveNode(
        "observability-mcp",
        ["1", "2", "3", "4"],
        "Inspect ObservabilityMcpTools",
        [
          svgEl("rect", { x: 296, y: 344, width: 182, height: 52, rx: 8, class: "zt-box-rect" }),
          svgEl("text", { x: 306, y: 365, class: "zt-node-title", text: "ObservabilityMcpTools" }),
          svgEl("text", {
            x: 306,
            y: 383,
            class: "zt-node-sub",
            style: "font-size: 9.4px;",
            text: "fetchJobTraces · getErrorLogs"
          })
        ]
      )
    );

    // OC-RUNTIME Row 3 Center: Kafka & GovernanceGate
    svg.appendChild(
      addInteractiveNode("kafka", ["2", "3", "E"], "Inspect Kafka ingestion topic", [
        svgEl("rect", { x: 766, y: 235, width: 128, height: 48, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 778, y: 256, class: "zt-node-title", text: "Kafka" }),
        svgEl("text", { x: 778, y: 272, class: "zt-node-sub", text: "ingestion topic" })
      ])
    );

    svg.appendChild(
      addInteractiveNode("governance-gate", ["2", "3", "E"], "Inspect GovernanceGate", [
        svgEl("rect", { x: 500, y: 232, width: 232, height: 172, rx: 10, class: "zt-gate-rect" }),
        svgEl("text", { x: 512, y: 252, class: "zt-node-title", text: "GovernanceGate" }),
        svgEl("text", {
          x: 512,
          y: 267,
          class: "zt-node-sub",
          style: "font-size: 9.4px;",
          text: "hooks in order: PII masking → HTTP hook"
        }),

        // 2x2 status mini-cards inside GovernanceGate
        svgEl("rect", {
          x: 512,
          y: 276,
          width: 101,
          height: 36,
          rx: 5,
          class: "zt-gate-card-approved"
        }),
        svgEl("text", { x: 519, y: 290, class: "zt-status-tag-approved", text: "APPROVED" }),
        svgEl("text", {
          x: 519,
          y: 304,
          class: "zt-node-sub",
          style: "font-size: 9px;",
          text: "embed as is"
        }),

        svgEl("rect", {
          x: 619,
          y: 276,
          width: 101,
          height: 36,
          rx: 5,
          class: "zt-gate-card-sanitized"
        }),
        svgEl("text", { x: 626, y: 290, class: "zt-status-tag-sanitized", text: "SANITIZED" }),
        svgEl("text", {
          x: 626,
          y: 304,
          class: "zt-node-sub",
          style: "font-size: 8.7px;",
          text: "embed redacted text"
        }),

        svgEl("rect", {
          x: 512,
          y: 318,
          width: 101,
          height: 36,
          rx: 5,
          class: "zt-gate-card-rejected"
        }),
        svgEl("text", { x: 519, y: 332, class: "zt-status-tag-rejected", text: "REJECTED" }),
        svgEl("text", {
          x: 519,
          y: 346,
          class: "zt-node-sub",
          style: "font-size: 9px;",
          text: "embed nothing"
        }),

        svgEl("rect", {
          x: 619,
          y: 318,
          width: 101,
          height: 36,
          rx: 5,
          class: "zt-gate-card-rejected"
        }),
        svgEl("text", { x: 626, y: 332, class: "zt-status-tag-rejected", text: "UNAVAILABLE" }),
        svgEl("text", {
          x: 626,
          y: 346,
          class: "zt-node-sub",
          style: "font-size: 8.8px;",
          text: "nothing; keep old"
        }),

        svgEl("text", {
          x: 512,
          y: 374,
          class: "zt-node-sub",
          style: "font-size: 9.4px;",
          text: "hooks can't touch: acl · security · ois:*"
        }),
        svgEl("text", {
          x: 512,
          y: 390,
          class: "zt-node-sub",
          style: "font-size: 9.4px;",
          text: "first rejection ends evaluation"
        }),
        createFlowBadge(732, 232, "2", 11)
      ])
    );

    // Chunk -> Embed
    svg.appendChild(
      addInteractiveNode("chunk", ["2", "3", "E"], "Inspect Chunk stage", [
        svgEl("rect", { x: 500, y: 438, width: 164, height: 50, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 512, y: 458, class: "zt-node-title", text: "Chunk" }),
        svgEl("text", {
          x: 512,
          y: 475,
          class: "zt-node-sub",
          style: "font-size: 9.1px;",
          text: "per-job ChunkingSpec, capped"
        })
      ])
    );

    svg.appendChild(
      addInteractiveNode("embed", ["2", "3", "E"], "Inspect Embed stage", [
        svgEl("rect", { x: 696, y: 438, width: 156, height: 50, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 708, y: 458, class: "zt-node-title", text: "Embed" }),
        svgEl("text", {
          x: 708,
          y: 475,
          class: "zt-node-sub",
          style: "font-size: 9.5px;",
          text: "oc-embedding-service"
        })
      ])
    );

    // OC-RUNTIME Row 4: McpVectorServer + McpAclEvaluator
    svg.appendChild(
      addInteractiveNode("mcp-vector-server", ["4"], "Inspect McpVectorServer", [
        svgEl("rect", { x: 296, y: 508, width: 186, height: 52, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 308, y: 529, class: "zt-node-title", text: "McpVectorServer" }),
        svgEl("text", { x: 308, y: 547, class: "zt-node-sub", text: "secureVectorSearch" }),
        createFlowBadge(482, 508, "4", 10.5)
      ])
    );

    svg.appendChild(
      addInteractiveNode("mcp-acl-evaluator", ["4"], "Inspect McpAclEvaluator", [
        svgEl("rect", { x: 518, y: 512, width: 206, height: 44, rx: 22, class: "zt-pill-rect" }),
        svgEl("text", {
          x: 621,
          y: 531,
          "text-anchor": "middle",
          class: "zt-node-title",
          text: "McpAclEvaluator"
        }),
        svgEl("text", {
          x: 621,
          y: 546,
          "text-anchor": "middle",
          class: "zt-node-sub",
          style: "font-size: 9.6px;",
          text: "deny overrides grant · fails closed"
        })
      ])
    );

    // OC-RUNTIME Row 5: SidecarMcpTools
    svg.appendChild(
      addInteractiveNode("sidecar-mcp", ["4"], "Inspect SidecarMcpTools", [
        svgEl("rect", { x: 296, y: 598, width: 186, height: 52, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 308, y: 619, class: "zt-node-title", text: "SidecarMcpTools" }),
        svgEl("text", {
          x: 308,
          y: 637,
          class: "zt-node-sub",
          text: "readOisSidecars · *.ois.json"
        }),
        createFlowBadge(482, 598, "4", 10.5)
      ])
    );

    // DATA Zone Nodes
    svg.appendChild(
      addInteractiveNode("source-repos", ["1", "2", "3", "E"], "Inspect Source repositories", [
        svgEl("rect", { x: 930, y: 46, width: 202, height: 144, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 942, y: 67, class: "zt-node-title", text: "Source repositories" }),
        svgEl("text", { x: 942, y: 89, class: "zt-node-sub", text: "SharePoint · Alfresco" }),
        svgEl("text", { x: 942, y: 109, class: "zt-node-sub", text: "Hyland CIC · FileNet" }),
        svgEl("text", { x: 942, y: 129, class: "zt-node-sub", text: "Documentum · M-Files" }),
        svgEl("text", { x: 942, y: 149, class: "zt-node-sub", text: "Doxis · CMIS" })
      ])
    );

    svg.appendChild(
      addInteractiveNode("vector-stores", ["2", "3", "4", "E"], "Inspect Vector stores", [
        svgEl("rect", { x: 938, y: 450, width: 186, height: 104, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 950, y: 470, class: "zt-node-title", text: "Vector stores" }),
        svgEl("text", { x: 950, y: 490, class: "zt-node-sub", text: "pgvector · Milvus · Qdrant" }),
        svgEl("text", { x: 950, y: 506, class: "zt-node-sub", text: "Vespa · Solr · OpenSearch" }),
        svgEl("text", {
          x: 950,
          y: 533,
          class: "zt-node-sub",
          style: "fill: var(--zt-f4); font-weight: 600;",
          text: "chunks carry the source ACL"
        })
      ])
    );

    svg.appendChild(
      addInteractiveNode("ois-sidecars", ["4"], "Inspect OIS sidecars", [
        svgEl("rect", { x: 938, y: 566, width: 186, height: 102, rx: 8, class: "zt-box-rect" }),
        svgEl("text", { x: 950, y: 586, class: "zt-node-title", text: "OIS sidecars" }),
        svgEl("text", { x: 950, y: 606, class: "zt-node-sub", text: "Apache Ozone · AWS S3" }),
        svgEl("text", { x: 950, y: 622, class: "zt-node-mono", text: "<key>.ois.json" }),
        svgEl("text", {
          x: 950,
          y: 641,
          class: "zt-node-sub",
          style: "font-size: 9.2px;",
          text: "checked in CI against the"
        }),
        svgEl("text", {
          x: 950,
          y: 655,
          class: "zt-node-sub",
          style: "font-size: 9.2px;",
          text: "live OIS schema"
        })
      ])
    );

    return svg;
  }

  function buildReferenceTables(headingLevel) {
    const tableTitleTag = headingLevel === 2 ? "h3" : "h4";

    // Table 1: The token on every call
    const tokenRows = [
      {
        id: "claim-sub",
        flows: ["1", "2", "3", "4"],
        claim: "sub",
        means:
          "The human user. Their source permissions bound discovery, ingestion and retrieval.",
        ifMissing: "FAIL_CLOSED",
        fail: true
      },
      {
        id: "claim-act-sub",
        flows: ["1", "2", "3", "4"],
        claim: "act.sub",
        means:
          "The agent acting for them, as a SPIFFE ID or URI. It is mapped to the caller's actor.",
        ifMissing: "—",
        fail: false
      },
      {
        id: "claim-scope",
        flows: ["3"],
        claim: "scope",
        means: "The scope required to start dynamic jobs.",
        ifMissing: "FAIL_CLOSED",
        fail: true
      }
    ];

    const tokenTbody = el("tbody");
    for (const r of tokenRows) {
      const tr = el("tr", {
        tabindex: "0",
        "data-node-id": r.id,
        "data-flows": r.flows.join(" "),
        "data-selected": "false"
      });
      tr.appendChild(
        el("th", { scope: "row", class: "zt-table-code", "data-col-label": "Claim", text: r.claim })
      );
      tr.appendChild(el("td", { "data-col-label": "Means", text: r.means }));
      tr.appendChild(
        el("td", {
          "data-col-label": "If missing",
          class: r.fail ? "zt-status-text-fail" : "zt-table-code",
          text: r.ifMissing
        })
      );
      tokenTbody.appendChild(tr);
    }

    const tokenCard = el("section", { class: "zt-table-card" }, [
      el(tableTitleTag, { class: "zt-table-heading", text: "The token on every call" }),
      el("p", {
        class: "zt-table-desc",
        text: "An agent never acts as itself. It exchanges the user's token (RFC 8693) and calls with a token that names both parties."
      }),
      el("div", { class: "zt-table-wrapper" }, [
        el("table", { class: "zt-table" }, [
          el("thead", null, [
            el("tr", null, [
              el("th", { scope: "col", text: "CLAIM" }),
              el("th", { scope: "col", text: "MEANS" }),
              el("th", { scope: "col", text: "IF MISSING" })
            ])
          ]),
          tokenTbody
        ])
      ])
    ]);

    // Table 2: What the gate can decide
    const gateRows = [
      {
        id: "gate-approved",
        status: "APPROVED",
        statusClass: "zt-status-text-approved",
        embeds: "As is",
        earlier: "Replaced"
      },
      {
        id: "gate-sanitized",
        status: "SANITIZED",
        statusClass: "zt-status-text-sanitized",
        embeds: "Redacted text",
        earlier: "Replaced; audit facts in ois:governance"
      },
      {
        id: "gate-rejected",
        status: "REJECTED",
        statusClass: "zt-status-text-rejected",
        embeds: "Nothing",
        earlier: "Purged when onRejectedUpdate says so"
      },
      {
        id: "gate-unavailable",
        status: "UNAVAILABLE",
        statusClass: "zt-status-text-rejected",
        embeds: "Nothing",
        earlier: "Kept; a failing hook never deletes"
      }
    ];

    const gateTbody = el("tbody");
    for (const r of gateRows) {
      const tr = el("tr", {
        tabindex: "0",
        "data-node-id": r.id,
        "data-flows": "2 3 E",
        "data-selected": "false"
      });
      tr.appendChild(
        el("th", {
          scope: "row",
          class: "zt-table-code",
          "data-col-label": "Status",
          text: r.status
        })
      );
      tr.appendChild(
        el("td", {
          "data-col-label": "Embeds",
          class: r.statusClass,
          text: r.embeds
        })
      );
      tr.appendChild(el("td", { "data-col-label": "Earlier version", text: r.earlier }));
      gateTbody.appendChild(tr);
    }

    const gateCard = el("section", { class: "zt-table-card" }, [
      el(tableTitleTag, { class: "zt-table-heading", text: "What the gate can decide" }),
      el("p", {
        class: "zt-table-desc",
        text: "GovernanceGate runs before chunking, on every upsert. A sanitized text is what the next hook sees."
      }),
      el("div", { class: "zt-table-wrapper" }, [
        el("table", { class: "zt-table" }, [
          el("thead", null, [
            el("tr", null, [
              el("th", { scope: "col", text: "STATUS" }),
              el("th", { scope: "col", text: "EMBEDS" }),
              el("th", { scope: "col", text: "EARLIER VERSION" })
            ])
          ]),
          gateTbody
        ])
      ])
    ]);

    return el("div", { class: "zt-tables-grid" }, [tokenCard, gateCard]);
  }

  function installRovingTabindexFallback(toolbar) {
    // Only load roving-tabindex fallback when native focusgroup is unsupported
    if ("focusGroup" in HTMLElement.prototype) return;

    const buttons = Array.from(toolbar.querySelectorAll("button"));
    if (!buttons.length) return;

    buttons.forEach((btn, idx) => {
      btn.setAttribute("tabindex", idx === 0 ? "0" : "-1");
    });

    toolbar.addEventListener("keydown", (event) => {
      const current = document.activeElement;
      const idx = buttons.indexOf(current);
      if (idx === -1) return;

      let nextIdx = -1;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIdx = (idx + 1) % buttons.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIdx = (idx - 1 + buttons.length) % buttons.length;
      } else if (event.key === "Home") {
        nextIdx = 0;
      } else if (event.key === "End") {
        nextIdx = buttons.length - 1;
      }

      if (nextIdx !== -1) {
        event.preventDefault();
        buttons[idx].setAttribute("tabindex", "-1");
        buttons[nextIdx].setAttribute("tabindex", "0");
        buttons[nextIdx].focus();
      }
    });
  }

  function setupScrollFadeFallback(scroller, startSentinel, endSentinel) {
    const supportsTimeline =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline", "scroll()");
    if (supportsTimeline || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === startSentinel) {
            scroller.classList.toggle("more-start", !entry.isIntersecting);
          } else if (entry.target === endSentinel) {
            scroller.classList.toggle("more-end", !entry.isIntersecting);
          }
        }
      },
      { root: scroller, threshold: 0.99 }
    );
    io.observe(startSentinel);
    io.observe(endSentinel);
  }

  function mountAgenticDiagram(container) {
    if (container.dataset.ztMounted === "true") return;
    container.dataset.ztMounted = "true";

    const uid = `zt-${++instanceCounter}`;
    const rawLevel = parseInt(container.dataset.headingLevel || "3", 10);
    const headingLevel = rawLevel === 2 ? 2 : 3;
    const titleTag = headingLevel === 2 ? "h2" : "h3";
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let activeFlow = "all";
    let selectedNodeId = null;
    let motionRunning = !reducedMotion;

    const root = el("div", {
      class: "zt-diagram-root",
      "data-motion": motionRunning ? "running" : "paused"
    });

    const shell = el("div", { class: "zt-shell" });

    // ------------------------------------------------------------------
    // Top Header + Filter Toolbar + Motion Toggle
    // ------------------------------------------------------------------
    const toolbar = el("div", {
      class: "zt-toolbar",
      role: "toolbar",
      "aria-label": "Filter zero-trust architecture flows",
      focusgroup: "toolbar wrap"
    });

    const filterDefs = [
      { id: "all", badge: "*", label: "Everything" },
      { id: "1", badge: "1", label: "Explore" },
      { id: "2", badge: "2", label: "Govern" },
      { id: "3", badge: "3", label: "Ingest" },
      { id: "4", badge: "4", label: "Retrieve" },
      { id: "E", badge: "E", label: "BPM event" }
    ];

    const filterButtons = [];
    for (const f of filterDefs) {
      const btn = el(
        "button",
        {
          type: "button",
          class: "zt-filter-btn",
          "data-flow": f.id,
          "aria-pressed": f.id === "all" ? "true" : "false"
        },
        [
          el("span", { class: "zt-pill-badge", "data-badge": f.id, "aria-hidden": "true", text: f.badge }),
          el("span", { text: f.label })
        ]
      );
      toolbar.appendChild(btn);
      filterButtons.push(btn);
    }

    // Motion pause/play button (changes text label without aria-pressed)
    const motionBtnLabel = el("span", {
      text: motionRunning ? "Pause flow" : "Play flow"
    });
    const motionBtn = el(
      "button",
      {
        type: "button",
        class: "zt-motion-btn"
      },
      [el("span", { class: "zt-motion-dot", "aria-hidden": "true" }), motionBtnLabel]
    );

    const header = el("header", { class: "zt-header" }, [
      el("p", { class: "zt-eyebrow", text: "OPENCRAWLING · ISSUE #203 · OC-RUNTIME" }),
      el(titleTag, { class: "zt-title", text: "Zero-trust data provider for AI agents" }),
      el("p", {
        class: "zt-lead",
        text: "An agent explores, decides, ingests and retrieves on its own, but every call carries a verified human, and nothing reaches the agent that this person couldn't read in the source repository."
      }),
      el("div", { class: "zt-controls-bar" }, [toolbar, motionBtn]),
      el("p", {
        class: "zt-sublead",
        text: "Five entry points, one pipeline, one rule: each call names a verified user, and nothing leaves wider than that user's permissions in the source repository."
      })
    ]);

    shell.appendChild(header);

    // ------------------------------------------------------------------
    // Interactive Diagram Card + Scroll Scroller + Inspector + Caption
    // ------------------------------------------------------------------
    const startSentinel = el("span", { class: "zt-scroll-sentinel", "aria-hidden": "true" });
    const endSentinel = el("span", { class: "zt-scroll-sentinel", "aria-hidden": "true" });
    const svg = buildDiagramSvg(uid);

    const scrollStage = el("div", { class: "zt-scroll-stage" }, [
      startSentinel,
      svg,
      endSentinel
    ]);

    const scroller = el(
      "div",
      {
        class: "zt-canvas-scroller",
        tabindex: "0",
        role: "region",
        "aria-label": "Interactive zero-trust architecture diagram (scroll sideways on narrow screens)"
      },
      [scrollStage]
    );

    const canvasFocusWrap = el("div", { class: "zt-canvas-focus-wrap" }, [scroller]);

    // Inspector UI
    const inspectorTags = el("div", { class: "zt-inspector-tags" });
    const inspectorTitle = el("p", { class: "zt-inspector-title" });
    const inspectorDesc = el("p", { class: "zt-inspector-desc" });
    const inspectorMeta = el("p", { class: "zt-inspector-meta" });
    const clearBtn = el("button", {
      type: "button",
      class: "zt-clear-btn",
      hidden: "hidden",
      text: "Reset selection"
    });

    const inspector = el(
      "div",
      {
        class: "zt-inspector",
        "aria-live": "polite"
      },
      [
        el("div", { class: "zt-inspector-main" }, [
          el("div", { class: "zt-inspector-header" }, [
            el("span", { class: "zt-inspector-kicker", text: "Inspector" }),
            inspectorTitle,
            inspectorTags
          ]),
          inspectorDesc,
          inspectorMeta
        ]),
        clearBtn
      ]
    );

    const caption = el("p", {
      class: "zt-caption",
      text: "Every agent call crosses the red checkpoint before reaching a tool. Ingestion snakes through one pipeline whichever way it starts, and the governance gate sits before chunking, so redacted or rejected text never becomes a vector. On narrow screens, scroll the drawing sideways."
    });

    const canvasCard = el("div", { class: "zt-canvas-card" }, [
      canvasFocusWrap,
      inspector,
      caption
    ]);
    shell.appendChild(canvasCard);

    // ------------------------------------------------------------------
    // Bottom Reference Tables
    // ------------------------------------------------------------------
    const tablesGrid = buildReferenceTables(headingLevel);
    shell.appendChild(tablesGrid);

    root.appendChild(shell);
    container.innerHTML = "";
    container.appendChild(root);

    installRovingTabindexFallback(toolbar);
    setupScrollFadeFallback(scroller, startSentinel, endSentinel);

    // ------------------------------------------------------------------
    // Interactivity State & DOM Sync
    // ------------------------------------------------------------------
    const interactiveNodes = Array.from(root.querySelectorAll("[data-node-id]"));
    const wires = Array.from(svg.querySelectorAll(".zt-wire-group"));

    function renderInspector() {
      inspectorTags.innerHTML = "";

      if (selectedNodeId && ITEM_DETAILS[selectedNodeId]) {
        const info = ITEM_DETAILS[selectedNodeId];
        inspectorTitle.textContent = info.title;
        inspectorDesc.textContent = info.desc;
        inspectorMeta.textContent = info.invariant;
        clearBtn.hidden = false;

        for (const f of info.flows) {
          const label =
            f === "checkpoint"
              ? "Zero-Trust Gate"
              : FLOW_META[f]
                ? `${FLOW_META[f].badge} ${FLOW_META[f].label}`
                : f;
          inspectorTags.appendChild(
            el("span", {
              class: "zt-inspector-tag",
              "data-flow": f,
              text: label
            })
          );
        }
      } else {
        const flowInfo = FLOW_META[activeFlow] || FLOW_META.all;
        inspectorTitle.textContent = flowInfo.title;
        inspectorDesc.textContent = flowInfo.desc;
        inspectorMeta.textContent = flowInfo.invariant;
        clearBtn.hidden = true;

        if (activeFlow !== "all") {
          inspectorTags.appendChild(
            el("span", {
              class: "zt-inspector-tag",
              "data-flow": activeFlow,
              text: `${flowInfo.badge} ${flowInfo.label}`
            })
          );
        }
      }
    }

    function applyFilterAndSelection() {
      for (const btn of filterButtons) {
        btn.setAttribute("aria-pressed", btn.dataset.flow === activeFlow ? "true" : "false");
      }

      const hasSelectedNode = Boolean(selectedNodeId);

      for (const node of interactiveNodes) {
        const nodeId = node.dataset.nodeId;
        const isSelected = hasSelectedNode && nodeId === selectedNodeId;
        node.setAttribute("data-selected", isSelected ? "true" : "false");

        const flows = (node.dataset.flows || "").split(/\s+/).filter(Boolean);
        let highlighted = true;

        if (activeFlow !== "all") {
          highlighted = flows.includes(activeFlow);
        }

        if (node.tagName.toLowerCase() === "tr") {
          node.classList.toggle("zt-table-row-dim", !highlighted);
        } else {
          node.classList.toggle("zt-is-dimmed", !highlighted);
          node.classList.toggle("zt-is-active", highlighted);
        }
      }

      for (const wire of wires) {
        const flows = (wire.dataset.flows || "").split(/\s+/).filter(Boolean);
        const wireMatches = activeFlow === "all" || flows.includes(activeFlow);
        wire.classList.toggle("zt-is-dimmed", !wireMatches);
        wire.classList.toggle("zt-is-active", wireMatches);
      }

      renderInspector();
    }

    function setActiveFlow(flowId) {
      activeFlow = flowId;
      // Clear mismatched node selection when switching flow filter
      if (selectedNodeId && flowId !== "all") {
        const selectedInfo = ITEM_DETAILS[selectedNodeId];
        if (selectedInfo && !selectedInfo.flows.includes(flowId)) {
          selectedNodeId = null;
        }
      }
      applyFilterAndSelection();
    }

    function toggleNodeSelection(node) {
      const nodeId = node.dataset.nodeId;
      const filterFlow = node.getAttribute("data-filter-flow");
      if (filterFlow) {
        activeFlow = activeFlow === filterFlow && selectedNodeId === nodeId ? "all" : filterFlow;
      }
      selectedNodeId = selectedNodeId === nodeId ? null : nodeId;
      applyFilterAndSelection();
    }

    toolbar.addEventListener("click", (event) => {
      const btn = event.target.closest(".zt-filter-btn");
      if (!btn) return;
      setActiveFlow(btn.dataset.flow || "all");
    });

    motionBtn.addEventListener("click", () => {
      motionRunning = !motionRunning;
      root.setAttribute("data-motion", motionRunning ? "running" : "paused");
      motionBtnLabel.textContent = motionRunning ? "Pause flow" : "Play flow";
    });

    clearBtn.addEventListener("click", () => {
      selectedNodeId = null;
      applyFilterAndSelection();
    });

    for (const node of interactiveNodes) {
      node.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleNodeSelection(node);
      });

      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleNodeSelection(node);
        }
      });
    }

    applyFilterAndSelection();
  }

  function initAll() {
    const containers = document.querySelectorAll("[data-agentic-diagram]");
    for (const container of containers) {
      mountAgenticDiagram(container);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
