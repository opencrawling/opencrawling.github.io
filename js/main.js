// JavaScript functionality for OpenCrawling Landing Page

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all interactive components
  initThemeToggle();
  initArchHover();
  initSlider();
  initSimulator();
  initTabs();
  initCodeCopy();
  initSvgAnimation();
  initMobileMenu();
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
    desc: "The scanning and chunking coordinator. Leverages Java 25 virtual threads to run repository connectors, extract text with Apache Tika, split documents into semantic chunks (using TokenTextSplitter), and publish Chunk Messages to the 'opencrawling-chunks' Kafka topic."
  },
  kafka: {
    title: "Apache Kafka Message Broker",
    desc: "The central broker carrying decoupled event streams. Manages three main topics: 'opencrawling-ingestion' for scanned metadata, 'opencrawling-chunks' for text-extracted chunks, and 'opencrawling-embedded' for precomputed vector embeddings."
  },
  outputs: {
    title: "Vector Search Outputs & Writer",
    desc: "Saves precomputed vector embeddings and chunks directly to the database. The Vector Store Writer consumes embedded chunk messages and uses PrecomputedEmbeddingModel to bypass downstream model execution, writing directly to PgVectorStore."
  },
  ui: {
    title: "Vite + React Admin Dashboard",
    desc: "A premium admin interface (oc-admin-ui) for administrators. Provides live telemetry on job queues, connector scheduling, Kafka consumer offsets, document-level audit logs, and status reports."
  },
  ollama: {
    title: "Embedding Consumer (Legacy - now part of oc-embedding-service)",
    desc: "Handles vector generation asynchronously via the local Ollama server."
  },
  embedding: {
    title: "oc-embedding-service (Decoupled Embedding Microservice)",
    desc: "A new stateless, horizontally scalable microservice that consumes chunk messages from the Kafka 'opencrawling-chunks' topic. The EmbeddingModelFactory dynamically routes chunks to the configured model engine (Ollama, OpenAI, HuggingFace) and publishes the resulting high-dimensional vectors to the 'opencrawling-embedded' topic. Scale out instantly with: docker compose scale oc-embedding-service=N."
  },
  db: {
    title: "PostgreSQL & Redis Cache Stack",
    desc: "PostgreSQL manages persistent state (job schedules, connector configurations, and audit reports). Redis manages high-speed ephemeral cache (repository access tokens, authority session mappings, and rate-limiting counters)."
  },
  security: {
    title: "Authority Service & Token Mapping",
    desc: "Built-in security translator. Maps user search identities (Active Directory SIDs, OAuth groups) to document ACLs. Ensures that subsequent RAG or search queries return only the files a user has permission to see."
  },
  mcp: {
    title: "Secure MCP Server (Spring AI)",
    desc: "Exposes secure enterprise knowledge retrieval tools to AI models and agents using the Model Context Protocol (MCP). Enforces server-side user identity verification (principals and roles) and ACL checks against the vector store, ensuring LLMs never receive unauthorized content."
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
      scan: "SharePoint Crawler triggered. Requesting graph deltas, resolving folder permission SIDs...",
      claimCheck: "Crawler published IngestionMessage to Kafka 'opencrawling-ingestion' containing claim check URI reference.",
      tika: "IngestionConsumer fetched reference. Read Excel/Word binary from storage, parsed text via Apache Tika, split into token chunks, published ChunkMessages to 'opencrawling-chunks'.",
      ollama: "EmbeddingConsumer consumed chunks. Dispatched batches to local Ollama server (mxbai-embed-large). Generated 1024-dimension vectors, published to 'opencrawling-embedded'.",
      vector: "VectorStoreWriterConsumer consumed embedded chunks. Stored vectors, metadata attributes, and ACL tokens into pgvector."
    }
  },
  s3: {
    files: [
      { name: "public_dataset_images.tar.gz", size: "450 MB", acls: ["Everyone:Read"] },
      { name: "api_specifications_v2.json", size: "45 KB", acls: ["Everyone:Read"] }
    ],
    logs: {
      scan: "S3 Bucket Connector triggered. Listing objects in bucket 'opencrawling-public-docs'...",
      claimCheck: "Crawler generated storage claim check URI and sent IngestionMessage to 'opencrawling-ingestion'.",
      tika: "IngestionConsumer read object stream. Extracted text, generated semantic chunks, sent ChunkMessages to 'opencrawling-chunks'.",
      ollama: "EmbeddingConsumer requested embeddings from Ollama for S3 content chunks, published vector tokens to 'opencrawling-embedded'.",
      vector: "VectorStoreWriterConsumer saved vectors and public ACLs to Elasticsearch KNN indices."
    }
  },
  database: {
    files: [
      { name: "active_customer_accounts (Row-ID: 10243)", size: "4 KB", acls: ["Sales-Rep-RegionWest:Read"] },
      { name: "pending_invoice_ledger (Row-ID: 55430)", size: "12 KB", acls: ["Accounting-Dept:ReadWrite"] }
    ],
    logs: {
      scan: "Database JDBC Connector triggered. Scanning PostgreSQL CRM tables, verifying Row-Level Security parameters...",
      claimCheck: "Crawler published row metadata and primary key references as claim checks to 'opencrawling-ingestion'.",
      tika: "IngestionConsumer mapped relational column contents, chunked record texts, sent ChunkMessages to 'opencrawling-chunks'.",
      ollama: "EmbeddingConsumer called local Ollama server, generated record embeddings, sent to 'opencrawling-embedded'.",
      vector: "VectorStoreWriterConsumer saved embeddings, record primary keys, and regional ACL SIDs to Qdrant Cloud."
    }
  },
  iceberg: {
    files: [
      { name: "analytics.events / record-sha256:a3f7c1 (Parquet)", size: "2.1 KB", acls: ["public"] },
      { name: "analytics.events / record-sha256:b8d2e4 (Parquet)", size: "1.8 KB", acls: ["public"] },
      { name: "analytics.events / record-sha256:c0f9a5 (Parquet)", size: "3.2 KB", acls: ["public"] }
    ],
    logs: {
      scan: "IcebergRepositoryConnector triggered. Connecting to REST Catalog at http://iceberg-rest:8181, warehouse: s3://warehouse/. Loading table 'analytics.events'...",
      claimCheck: "Scan complete. Planned 3 Parquet file scan tasks via Structured Task Scope. Serialized Iceberg records to JSON RepositoryDocuments. Published IngestionMessages to 'opencrawling-ingestion'.",
      tika: "IngestionConsumer received Iceberg JSON documents. Text extracted from JSON content, chunked into token segments, ChunkMessages published to 'opencrawling-chunks'.",
      ollama: "EmbeddingConsumer consumed Iceberg record chunks. Dispatched to Ollama (mxbai-embed-large) for 1024-dimension embedding. Published embedded vectors to 'opencrawling-embedded'.",
      vector: "VectorStoreWriterConsumer persisted Iceberg embeddings with iceberg:// URI metadata to pgvector (vector_store_1024)."
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
  const stationKafka = document.getElementById('station-kafka');
  const stationTika = document.getElementById('station-tika');
  const stationEmbedSvc = document.getElementById('station-embed-svc');
  const stationVector = document.getElementById('station-vector');
  const embedScaleBadge = document.getElementById('embed-scale-badge');
  const embedScaleSelect = document.getElementById('sim-embed-scale');
  
  const pulse1 = document.getElementById('pulse-1');
  const pulse2 = document.getElementById('pulse-2');
  const pulse3 = document.getElementById('pulse-3');
  const pulse4 = document.getElementById('pulse-4');

  console.log("initSimulator: Initializing simulator components...");
  const elementsExist = !!startBtn && !!logsContainer && !!stationSrc && !!stationKafka && !!stationTika && !!stationEmbedSvc && !!stationVector && !!pulse1 && !!pulse2 && !!pulse3 && !!pulse4;
  console.log("initSimulator: Elements check:", {
    startBtn: !!startBtn,
    logsContainer: !!logsContainer,
    stationSrc: !!stationSrc,
    stationKafka: !!stationKafka,
    stationTika: !!stationTika,
    stationEmbedSvc: !!stationEmbedSvc,
    stationVector: !!stationVector,
    pulse1: !!pulse1,
    pulse2: !!pulse2,
    pulse3: !!pulse3,
    pulse4: !!pulse4
  });

  if (!elementsExist) {
    console.warn("initSimulator: Simulator elements not found on this page. Returning early.");
    return;
  }

  let isSimulating = false;

  startBtn.addEventListener('click', async () => {
    console.log("initSimulator: startBtn clicked. isSimulating:", isSimulating);
    if (isSimulating) return;
    isSimulating = true;
    
    // Reset Pipeline
    resetPipeline();
    
    const sourceKey = sourceSelect.value;
    const destName = destSelect.options[destSelect.selectedIndex].text;
    const simData = SIMULATOR_DATA[sourceKey];
    const embedReplicas = embedScaleSelect ? parseInt(embedScaleSelect.value, 10) : 1;

    // Update embed scale badge
    if (embedScaleBadge) embedScaleBadge.textContent = `\u00d7${embedReplicas}`;

    // Update Status to In Progress
    statusDot.className = "status-indicator active";
    statusText.textContent = "Ingesting Documents...";
    startBtn.disabled = true;
    startBtn.textContent = "Simulating Ingestion...";
    
    // Clear logs and print start message
    logsContainer.innerHTML = "";
    addLog(`[INFO] Starting ingestion job. Source: [${sourceKey.toUpperCase()}], Target Store: [${destName}]`, "info");
    if (embedReplicas > 1) {
      addLog(`[INFO] oc-embedding-service scaled to ${embedReplicas} replicas. Kafka will distribute partitions automatically.`, "info");
    }
    await sleep(800);

    // Step 1: Crawler Scan
    stationSrc.classList.add('active');
    addLog(`[PROCESS] Crawler: ${simData.logs.scan}`, "process");
    await sleep(1000);

    for (const file of simData.files) {
      addLog(`[INFO] Crawler: Found document '${file.name}' (${file.size})`, "info");
      addLog(`[SECURITY] Crawler: Extracted Access Control SIDs: [${file.acls.join(', ')}]`, "warn");
      await sleep(600);
      
      // Step 2: Pulse 1 - Crawler to Kafka
      pulse1.classList.add('active');
      await sleep(1000);
      pulse1.classList.remove('active');

      // Step 3: Kafka Ingestion Topic
      stationKafka.classList.add('active');
      addLog(`[KAFKA] ${simData.logs.claimCheck}`, "info");
      await sleep(1000);

      // Step 4: Pulse 2 - Kafka to Ingestion (Tika)
      pulse2.classList.add('active');
      await sleep(1000);
      pulse2.classList.remove('active');

      // Step 5: Ingestion / Tika Extractor
      stationTika.classList.add('active');
      addLog(`[PROCESS] Ingestion Worker: ${simData.logs.tika}`, "process");
      await sleep(1200);

      // Step 6: Pulse 3 - Ingestion to Ollama worker
      pulse3.classList.add('active');
      await sleep(1000);
      pulse3.classList.remove('active');

      // Step 7: Embedding Service worker
      stationEmbedSvc.classList.add('active');
      addLog(`[PROCESS] oc-embedding-service (replica): ${simData.logs.ollama}`, "process");
      await sleep(1200);

      // Step 8: Pulse 4 - Embedding to Vector Store Writer
      pulse4.classList.add('active');
      await sleep(1000);
      pulse4.classList.remove('active');

      // Step 9: Vector Store Output
      stationVector.classList.add('active');
      addLog(`[PROCESS] Vector Writer: ${simData.logs.vector}`, "process");
      addLog(`[SUCCESS] Stored document '${file.name}' with ACL credentials into vector store successfully.`, "success");
      await sleep(1000);
      
      // Reset pipeline state for next document, leaving Crawler active
      stationKafka.classList.remove('active');
      stationTika.classList.remove('active');
      stationEmbedSvc.classList.remove('active');
      stationVector.classList.remove('active');
      await sleep(500);
    }

    // Finished Ingestion
    statusDot.className = "status-indicator success";
    statusText.textContent = "Job Complete";
    addLog(`[SUCCESS] Ingestion Job finished. All document events processed. Decoupled pipeline is idle.`, "success");
    
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
    stationKafka.classList.remove('active');
    stationTika.classList.remove('active');
    stationEmbedSvc.classList.remove('active');
    stationVector.classList.remove('active');
    pulse1.classList.remove('active');
    pulse2.classList.remove('active');
    pulse3.classList.remove('active');
    pulse4.classList.remove('active');
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
  const p3 = document.getElementById('anim-particle-3');
  if (!p1 || !p2 || !p3) return;

  let startTime = null;
  
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = ((timestamp - startTime) % 3600) / 3600; // 3.6 seconds loop
    
    // Particle 1 (Violet) - Sources → Ingestion Core → Kafka
    if (progress < 0.18) {
      const segProgress = progress / 0.18;
      const x = 130 + (220 - 130) * segProgress;
      p1.setAttribute('cx', x);
      p1.setAttribute('cy', 230);
      p1.setAttribute('opacity', 1);
    } else if (progress >= 0.18 && progress < 0.28) {
      p1.setAttribute('opacity', 0); // inside Core (Tika extraction & splitting)
    } else if (progress >= 0.28 && progress < 0.46) {
      const segProgress = (progress - 0.28) / 0.18;
      const x = 370 + (430 - 370) * segProgress;
      p1.setAttribute('cx', x);
      p1.setAttribute('cy', 230);
      p1.setAttribute('opacity', 1);
    } else {
      p1.setAttribute('opacity', 0);
    }

    // Particle 3 (Amber) - Kafka → oc-embedding-service (up) → back to Kafka (down)
    if (progress >= 0.48 && progress < 0.63) {
      const segProgress = (progress - 0.48) / 0.15;
      const y = 190 - (190 - 90) * segProgress;
      p3.setAttribute('cx', 490);
      p3.setAttribute('cy', y);
      p3.setAttribute('opacity', 1);
    } else if (progress >= 0.63 && progress < 0.73) {
      p3.setAttribute('opacity', 0); // computing vectors in oc-embedding-service
    } else if (progress >= 0.73 && progress < 0.88) {
      const segProgress = (progress - 0.73) / 0.15;
      const y = 90 + (190 - 90) * segProgress;
      p3.setAttribute('cx', 540);
      p3.setAttribute('cy', y);
      p3.setAttribute('opacity', 1);
    } else {
      p3.setAttribute('opacity', 0);
    }

    // Particle 2 (Cyan) - Kafka → Vector Writer
    if (progress >= 0.88 && progress < 1.0) {
      const segProgress = (progress - 0.88) / 0.12;
      const x = 560 + (640 - 560) * segProgress;
      p2.setAttribute('cx', x);
      p2.setAttribute('cy', 230);
      p2.setAttribute('opacity', 1);
    } else {
      p2.setAttribute('opacity', 0);
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* ==========================================
   7. Screenshot Slider / Carousel
   ========================================== */
function initSlider() {
  const slider = document.getElementById('screenshot-slider');
  const prevBtn = document.getElementById('slider-prev-btn');
  const nextBtn = document.getElementById('slider-next-btn');
  const dotsContainer = document.getElementById('slider-dots-container');
  
  if (!slider || !prevBtn || !nextBtn || !dotsContainer) return;
  
  const slides = slider.querySelectorAll('.slide');
  const dots = dotsContainer.querySelectorAll('.slider-dot');
  const slideCount = slides.length;
  let currentIndex = 0;
  let autoPlayTimer = null;
  
  function updateSlider() {
    slider.style.transform = `translateX(-${currentIndex * 100}%)`;
    
    slides.forEach((slide, idx) => {
      if (idx === currentIndex) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });
    
    dots.forEach((dot, idx) => {
      if (idx === currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }
  
  function nextSlide() {
    currentIndex = (currentIndex + 1) % slideCount;
    updateSlider();
  }
  
  function prevSlide() {
    currentIndex = (currentIndex - 1 + slideCount) % slideCount;
    updateSlider();
  }
  
  function selectSlide(index) {
    currentIndex = index;
    updateSlider();
  }
  
  nextBtn.addEventListener('click', () => {
    nextSlide();
    resetAutoPlay();
  });
  
  prevBtn.addEventListener('click', () => {
    prevSlide();
    resetAutoPlay();
  });
  
  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'), 10);
      selectSlide(index);
      resetAutoPlay();
    });
  });
  
  function startAutoPlay() {
    autoPlayTimer = setInterval(nextSlide, 5000);
  }
  
  function resetAutoPlay() {
    clearInterval(autoPlayTimer);
    startAutoPlay();
  }
  
  startAutoPlay();
}

/* ==========================================
   Mobile Menu Management
   ========================================== */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const header = document.querySelector('.site-header');
  const navLinks = document.querySelectorAll('.main-nav a');
  
  if (!toggleBtn || !header) return;
  
  toggleBtn.addEventListener('click', () => {
    const isOpen = header.classList.contains('mobile-menu-open');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });
  
  // Close menu when a link is clicked (important for anchor links on same page)
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });
  
  // Close menu on resize if we scale past mobile breakpoint
  window.addEventListener('resize', () => {
    if (window.innerWidth > 992 && header.classList.contains('mobile-menu-open')) {
      closeMenu();
    }
  });

  function openMenu() {
    header.classList.add('mobile-menu-open');
    document.body.classList.add('mobile-menu-active');
    document.documentElement.classList.add('mobile-menu-active');
    toggleBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    header.classList.remove('mobile-menu-open');
    document.body.classList.remove('mobile-menu-active');
    document.documentElement.classList.remove('mobile-menu-active');
    toggleBtn.setAttribute('aria-expanded', 'false');
  }
}
