// JavaScript functionality for OpenCrawling Landing Page

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all interactive components
  initThemeToggle();
  initArchHover();
  initSimulator();
  initTabs();
  initCodeCopy();
  initSvgAnimation();
});

/* ==========================================
   1. Theme Toggle Management
   ========================================== */
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;

  const html = document.documentElement;

  // Retrieve theme preference from localStorage, fallback to system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Set initial theme
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);

  toggleBtn.addEventListener('click', () => {
    const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  });

  function applyTheme(theme) {
    if (theme === 'dark') {
      html.classList.remove('light');
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
      html.style.colorScheme = 'light';
    }
    localStorage.setItem('theme', theme);
  }
}

/* ==========================================
   2. Architecture Diagram Interactive Hover
   ========================================== */
const ARCH_DETAILS = {
  sources: {
    title: "Content Sources (Repository Connectors)",
    desc: "Pluggable connectors that authenticate and scan enterprise data stores (SharePoint, Amazon S3, local File Systems, Databases, Web APIs). Reads content streams, extracts metadata, and pulls native Access Control Lists (ACLs) incrementally."
  },
  core: {
    title: "Ingestion Core Engine (oc-core)",
    desc: "The heartbeat of the platform, implemented with Java 25. Leverages Virtual Threads and Structured Concurrency to orchestrate crawls, parse and extract text using Apache Tika, schedule jobs, process rate-limiting, and resolve document permissions (ACLs) on the fly."
  },
  kafka: {
    title: "Apache Kafka Ingestion Queue",
    desc: "Implements a high-throughput, event-driven architecture using the Claim Check Pattern. Instead of sending bulky binary documents, the Core publishes a light reference payload to Kafka, decoupling scanning from transformation pipelines."
  },
  outputs: {
    title: "Vector Search Outputs",
    desc: "Connects to vector databases and search engines (PostgreSQL/pgvector, Elasticsearch, Qdrant, Milvus). Sends sanitized, segmented, and embedded document chunks alongside translated ACL security filters."
  },
  ui: {
    title: "Vite + React Admin Dashboard",
    desc: "A premium admin interface (oc-admin-ui) for administrators. Provides live telemetry on job queues, connector scheduling, Kafka consumer offsets, document-level audit logs, and status reports."
  },
  ollama: {
    title: "Ollama Embedding Generation",
    desc: "On-the-fly text segmentation and vector embedding generation using local LLM models (e.g., nomic-embed-text) in Ollama, or third-party cloud APIs (OpenAI, HuggingFace, Cohere) before indexing."
  },
  db: {
    title: "PostgreSQL & Redis Cache Stack",
    desc: "PostgreSQL manages persistent state (job schedules, connector configurations, and audit reports). Redis manages high-speed ephemeral cache (repository access tokens, authority session mappings, and rate-limiting counters)."
  },
  security: {
    title: "Authority Service & Token Mapping",
    desc: "Built-in security translator. Maps user search identities (Active Directory SIDs, OAuth groups) to document ACLs. Ensures that subsequent RAG or search queries return only the files a user has permission to see."
  }
};

function initArchHover() {
  const detailTitle = document.getElementById('arch-detail-title');
  const detailDesc = document.getElementById('arch-detail-desc');
  const nodeGroups = document.querySelectorAll('.node-group');
  
  if (!detailTitle || !detailDesc || nodeGroups.length === 0) return;

  nodeGroups.forEach(group => {
    const nodeId = group.getAttribute('data-node');
    if (!nodeId || !ARCH_DETAILS[nodeId]) return;

    // Hover events
    group.addEventListener('mouseenter', () => {
      showDetail(nodeId);
    });

    group.addEventListener('focusin', () => {
      showDetail(nodeId);
    });

    // Reset instruction if mouse leaves
    group.addEventListener('mouseleave', () => {
      resetDetail();
    });
  });

  function showDetail(id) {
    const data = ARCH_DETAILS[id];
    detailTitle.textContent = data.title;
    detailDesc.textContent = data.desc;
    
    // Highlight the card slightly
    const card = document.getElementById('arch-detail');
    if (card) {
      card.style.borderColor = 'var(--accent-color)';
      card.style.boxShadow = '0 0 15px var(--accent-glow)';
    }
  }

  function resetDetail() {
    detailTitle.textContent = "System Architecture";
    detailDesc.textContent = "Hover over or tap any node in the architecture diagram to view how OpenCrawling orchestrates the high-speed data flow and security controls.";
    
    const card = document.getElementById('arch-detail');
    if (card) {
      card.style.borderColor = 'var(--card-border)';
      card.style.boxShadow = 'none';
    }
  }
}

/* ==========================================
   3. Live Ingestion Simulator
   ========================================== */
const SIMULATOR_DATA = {
  sharepoint: {
    files: [
      { name: "hr_salary_reviews_2026.xlsx", size: "3.4 MB", acls: ["HR-Admins:Read", "Exec-Board:Read"] },
      { name: "technical_blueprint_v4.docx", size: "12.8 MB", acls: ["Dev-Group:Read", "Architects:Read"] },
      { name: "partner_agreement_draft.pdf", size: "1.1 MB", acls: ["Legal-Team:ReadWrite"] }
    ],
    logs: {
      scan: "Incremental scan triggered. Querying SharePoint Graph API. Checking SIDs and folder permission inheritance...",
      core: "Core Engine spawned Virtual Threads. Text extracted. Resolving SharePoint ACL User SIDs...",
      vector: "Semantic chunking done. Connecting to Ollama embedding API. Writing vectors and ACL metadata SIDs..."
    }
  },
  s3: {
    files: [
      { name: "public_dataset_images.tar.gz", size: "450 MB", acls: ["Everyone:Read"] },
      { name: "api_specifications_v2.json", size: "45 KB", acls: ["Everyone:Read"] }
    ],
    logs: {
      scan: "Scanning Amazon S3 bucket 'opencrawling-public-docs'. S3 Bucket policy detected: Public Read permission...",
      core: "Core Ingestion resolved Claim Check pattern. File stored in local tmp directory. No explicit ACLs found, inheriting Public defaults...",
      vector: "Generating text tokens. Commencing high-dimensional indexing. Storing object reference..."
    }
  },
  database: {
    files: [
      { name: "active_customer_accounts (Row-ID: 10243)", size: "4 KB", acls: ["Sales-Rep-RegionWest:Read"] },
      { name: "pending_invoice_ledger (Row-ID: 55430)", size: "12 KB", acls: ["Accounting-Dept:ReadWrite"] }
    ],
    logs: {
      scan: "Running JDBC cursor statement on PostgreSQL tables. Checking Row-Level Security (RLS) constraints...",
      core: "Core translated Database schema. Extracting Row permissions & role mapping...",
      vector: "Creating relational embeddings. Pushing multi-dimensional fields to vector output..."
    }
  }
};

function initSimulator() {
  const startBtn = document.getElementById('start-sim-btn');
  const clearBtn = document.getElementById('clear-sim-logs');
  const sourceSelect = document.getElementById('sim-source');
  const destSelect = document.getElementById('sim-destination');
  const logsContainer = document.getElementById('sim-logs');
  const statusDot = document.getElementById('sim-status-dot');
  const statusText = document.getElementById('sim-status-text');
  
  // Pipeline stations & pulses
  const stationSrc = document.getElementById('station-src');
  const stationCore = document.getElementById('station-core');
  const stationVector = document.getElementById('station-vector');
  const pulse1 = document.getElementById('pulse-1');
  const pulse2 = document.getElementById('pulse-2');

  if (!startBtn || !logsContainer) return;

  let isSimulating = false;

  startBtn.addEventListener('click', async () => {
    if (isSimulating) return;
    isSimulating = true;
    
    // Reset Pipeline
    resetPipeline();
    
    const sourceKey = sourceSelect.value;
    const destName = destSelect.options[destSelect.selectedIndex].text;
    const simData = SIMULATOR_DATA[sourceKey];

    // Update Status to In Progress
    statusDot.className = "status-indicator active";
    statusText.textContent = "Ingesting Documents...";
    startBtn.disabled = true;
    startBtn.textContent = "Simulating Ingestion...";
    
    // Clear logs and print start message
    logsContainer.innerHTML = "";
    addLog(`[INFO] Starting ingestion job for Source: [${sourceKey.toUpperCase()}] to Destination: [${destName}]`, "info");
    await sleep(800);

    // Step 1: Source Scan
    stationSrc.classList.add('active');
    addLog(`[PROCESS] ${simData.logs.scan}`, "process");
    await sleep(1000);

    for (const file of simData.files) {
      addLog(`[INFO] Found document: '${file.name}' [Size: ${file.size}]`, "info");
      addLog(`[SECURITY] Extracted ACLs: [${file.acls.join(', ')}]`, "warn");
      
      // Step 2: Pulse Flow 1
      pulse1.classList.add('active');
      await sleep(1000);
      pulse1.classList.remove('active');

      // Step 3: Core Processing
      stationCore.classList.add('active');
      addLog(`[PROCESS] oc-core: Processing file: '${file.name}'`, "process");
      addLog(`[INFO] ${simData.logs.core}`, "info");
      await sleep(1200);

      // Step 4: Pulse Flow 2
      pulse2.classList.add('active');
      await sleep(1000);
      pulse2.classList.remove('active');

      // Step 5: Vector Store Output
      stationVector.classList.add('active');
      addLog(`[PROCESS] Output connector: Writing to ${destName}`, "process");
      addLog(`[INFO] ${simData.logs.vector}`, "info");
      addLog(`[SUCCESS] Stored document '${file.name}' into vector space successfully.`, "success");
      await sleep(800);
      
      // Deactivate intermediate stations for next document
      stationSrc.classList.remove('active');
      stationCore.classList.remove('active');
      stationVector.classList.remove('active');
      await sleep(400);
    }

    // Finished Ingestion
    statusDot.className = "status-indicator success";
    statusText.textContent = "Job Complete";
    addLog(`[SUCCESS] Ingestion Job finished. 100% documents processed without errors. Vector index is up to date.`, "success");
    
    // Reset buttons
    startBtn.disabled = false;
    startBtn.textContent = "Run Ingestion Job";
    isSimulating = false;
  });

  clearBtn.addEventListener('click', () => {
    if (isSimulating) return;
    logsContainer.innerHTML = `<p class="log-info">Console cleared. Select a source and click "Run Ingestion Job" to start...</p>`;
    resetPipeline();
    statusDot.className = "status-indicator";
    statusText.textContent = "Ready to run";
  });

  function addLog(message, type) {
    const p = document.createElement('p');
    p.className = `log-line log-${type}`;
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsContainer.appendChild(p);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  function resetPipeline() {
    stationSrc.classList.remove('active');
    stationCore.classList.remove('active');
    stationVector.classList.remove('active');
    pulse1.classList.remove('active');
    pulse2.classList.remove('active');
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/* ==========================================
   4. Tabs Component (Quick Start)
   ========================================== */
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  if (tabs.length === 0 || panes.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');

      // Deactivate all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Hide all panes
      panes.forEach(p => p.classList.remove('active'));

      // Activate selected
      tab.classList.add('active');
      const activePane = document.getElementById(`tab-${targetTab}`);
      if (activePane) activePane.classList.add('active');
    });
  });
}

/* ==========================================
   5. Code Block Copy Buttons
   ========================================== */
function initCodeCopy() {
  const copyButtons = document.querySelectorAll('.copy-code-btn');

  copyButtons.forEach(button => {
    button.addEventListener('click', () => {
      const codeBlock = button.nextElementSibling.querySelector('code');
      if (!codeBlock) return;

      navigator.clipboard.writeText(codeBlock.textContent).then(() => {
        button.textContent = "Copied!";
        button.style.color = "var(--success-color)";
        button.style.borderColor = "var(--success-color)";
        
        setTimeout(() => {
          button.textContent = "Copy";
          button.style.color = "var(--text-muted)";
          button.style.borderColor = "rgba(255, 255, 255, 0.08)";
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    });
  });
}

/* ==========================================
   6. SVG Diagram Interactive Particles
   ========================================== */
function initSvgAnimation() {
  const p1 = document.getElementById('anim-particle-1');
  const p2 = document.getElementById('anim-particle-2');
  if (!p1 || !p2) return;

  // Let's programmatically animate the SVG particles along the flow lines.
  // Line 1: 130 to 240 (x axis), y is 225
  // Line 2: 380 to 450 (x axis), y is 225
  // Line 3: 570 to 680 (x axis), y is 225
  
  let animFrame;
  let startTime = null;
  
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = (timestamp - startTime) % 3000 / 3000; // 3 seconds loop
    
    // Particle 1 (Violet) runs from Sources to Core (130 -> 240) then Core to Kafka (380 -> 450)
    // We will divide the time into segments
    if (progress < 0.4) {
      const segProgress = progress / 0.4;
      const x = 130 + (240 - 130) * segProgress;
      p1.setAttribute('cx', x);
      p1.setAttribute('cy', 225);
      p1.setAttribute('opacity', 1);
    } else if (progress >= 0.4 && progress < 0.5) {
      p1.setAttribute('opacity', 0); // inside Core
    } else if (progress >= 0.5 && progress < 0.9) {
      const segProgress = (progress - 0.5) / 0.4;
      const x = 380 + (450 - 380) * segProgress;
      p1.setAttribute('cx', x);
      p1.setAttribute('cy', 225);
      p1.setAttribute('opacity', 1);
    } else {
      p1.setAttribute('opacity', 0);
    }

    // Particle 2 (Cyan) runs from Kafka to Outputs (570 -> 680)
    const p2Progress = (progress + 0.5) % 1.0; // Offset by 50%
    if (p2Progress < 0.5) {
      const segProgress = p2Progress / 0.5;
      const x = 570 + (680 - 570) * segProgress;
      p2.setAttribute('cx', x);
      p2.setAttribute('cy', 225);
      p2.setAttribute('opacity', 1);
    } else {
      p2.setAttribute('opacity', 0);
    }

    animFrame = requestAnimationFrame(step);
  }

  animFrame = requestAnimationFrame(step);
}
