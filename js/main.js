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
    title: "Embedding Consumer (Ollama)",
    desc: "Handles vector generation asynchronously. The local Ollama server receives text chunks from the Embedding Consumer, computes the high-dimensional vectors, and returns them to be published to the 'opencrawling-embedded' Kafka topic."
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
      core: "Ingestion Core: Extracted text with Apache Tika. Split into semantic chunks. Publishing DocumentChunkMessages to Kafka topic 'opencrawling-chunks'...",
      vector: "Embedding Consumer: Generated vectors via Ollama. Vector Store Writer: Writing precomputed vectors to pgvector..."
    }
  },
  s3: {
    files: [
      { name: "public_dataset_images.tar.gz", size: "450 MB", acls: ["Everyone:Read"] },
      { name: "api_specifications_v2.json", size: "45 KB", acls: ["Everyone:Read"] }
    ],
    logs: {
      scan: "Scanning Amazon S3 bucket 'opencrawling-public-docs'. S3 Bucket policy detected: Public Read permission...",
      core: "Ingestion Core: Streamed object, extracted text (Tika). Split into tokens. Publishing chunk payloads to Kafka 'opencrawling-chunks'...",
      vector: "Embedding Consumer: Fetched vectors from Ollama. Vector Store Writer: Writing precomputed vectors to pgvector database..."
    }
  },
  database: {
    files: [
      { name: "active_customer_accounts (Row-ID: 10243)", size: "4 KB", acls: ["Sales-Rep-RegionWest:Read"] },
      { name: "pending_invoice_ledger (Row-ID: 55430)", size: "12 KB", acls: ["Accounting-Dept:ReadWrite"] }
    ],
    logs: {
      scan: "Running JDBC cursor statement on PostgreSQL tables. Checking Row-Level Security (RLS) constraints...",
      core: "Ingestion Core: Parsed DB columns, mapped columns to document structure. Chunking rows. Publishing to Kafka 'opencrawling-chunks'...",
      vector: "Embedding Consumer: Mapped Ollama relational embeddings. Vector Store Writer: Storing precomputed vector rows..."
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
  const p3 = document.getElementById('anim-particle-3');
  if (!p1 || !p2 || !p3) return;

  let startTime = null;
  
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = ((timestamp - startTime) % 3000) / 3000; // 3 seconds loop
    
    // Particle 1 (Violet) - Ingestion & Chunking Flow
    if (progress < 0.2) {
      const segProgress = progress / 0.2;
      const x = 130 + (240 - 130) * segProgress;
      p1.setAttribute('cx', x);
      p1.setAttribute('cy', 225);
      p1.setAttribute('opacity', 1);
    } else if (progress >= 0.2 && progress < 0.3) {
      p1.setAttribute('opacity', 0); // inside Core (Tika extraction & splitting)
    } else if (progress >= 0.3 && progress < 0.5) {
      const segProgress = (progress - 0.3) / 0.2;
      const x = 380 + (450 - 380) * segProgress;
      p1.setAttribute('cx', x);
      p1.setAttribute('cy', 225);
      p1.setAttribute('opacity', 1);
    } else {
      p1.setAttribute('opacity', 0);
    }

    // Particle 3 (Amber) - Asynchronous Ollama Embedding Consumer Loop
    if (progress >= 0.5 && progress < 0.65) {
      const segProgress = (progress - 0.5) / 0.15;
      const y = 170 - (170 - 120) * segProgress;
      p3.setAttribute('cx', 510);
      p3.setAttribute('cy', y);
      p3.setAttribute('opacity', 1);
    } else if (progress >= 0.65 && progress < 0.75) {
      p3.setAttribute('opacity', 0); // generating vectors in Ollama
    } else if (progress >= 0.75 && progress < 0.9) {
      const segProgress = (progress - 0.75) / 0.15;
      const y = 120 + (170 - 120) * segProgress;
      p3.setAttribute('cx', 510);
      p3.setAttribute('cy', y);
      p3.setAttribute('opacity', 1);
    } else {
      p3.setAttribute('opacity', 0);
    }

    // Particle 2 (Cyan) - Vector Store Writer Flow
    if (progress >= 0.9 && progress < 1.0) {
      const segProgress = (progress - 0.9) / 0.1;
      const x = 570 + (680 - 570) * segProgress;
      p2.setAttribute('cx', x);
      p2.setAttribute('cy', 225);
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
