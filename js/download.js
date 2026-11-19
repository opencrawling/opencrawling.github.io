/**
 * OpenCrawling Download Center
 * Hydrates Stable GA and Daily Release Candidate channels from data/releases.json
 * with progressive accessible tabs, safe DOM construction, and CET/local timestamps.
 */

document.addEventListener('DOMContentLoaded', () => {
  initReleaseTabs();
  loadReleasesManifest();
});

const CATEGORY_LABELS = {
  distribution: 'ZIP Bundle',
  cli: 'CLI JAR',
  sdk: 'Java SDK',
  'python-sdk': 'Python SDK',
  docs: 'PDF Guide',
  compose: 'Docker Compose',
  other: 'Asset',
};

function announce(message) {
  const region = document.getElementById('download-announcer');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatTimestamp(isoString) {
  if (!isoString) return 'Unknown';
  try {
    if (typeof Temporal !== 'undefined' && Temporal.Instant) {
      const instant = Temporal.Instant.from(isoString);
      const cet = instant.toZonedDateTimeISO('Europe/Rome');
      const localDate = new Date(instant.epochMilliseconds);
      const localFmt = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(localDate);
      const cetFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(new Date(cet.epochMilliseconds));
      return `${cetFmt} (${localFmt} local)`;
    }
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    const cetFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
    return cetFmt;
  } catch {
    return isoString;
  }
}

async function copyText(text, label, triggerBtn) {
  try {
    await navigator.clipboard.writeText(text);
    announce(`Copied ${label} to clipboard.`);
    if (triggerBtn) {
      const span = triggerBtn.querySelector('.copy-label');
      const original = span ? span.textContent : triggerBtn.textContent;
      if (span) {
        span.textContent = 'Copied!';
      } else {
        triggerBtn.textContent = 'Copied!';
      }
      setTimeout(() => {
        if (span) {
          span.textContent = original;
        } else {
          triggerBtn.textContent = original;
        }
      }, 1800);
    }
  } catch {
    announce(`Unable to copy ${label}; select and copy manually.`);
  }
}

function initReleaseTabs() {
  const tablist = document.getElementById('channel-tablist');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map((tab) =>
    document.querySelector(`[role="tabpanel"][aria-labelledby="${tab.id}"]`)
  );

  function activateTab(selectedTab, { moveFocus = false, updateHash = true } = {}) {
    tabs.forEach((tab, index) => {
      const isSelected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.toggleAttribute('focusgroupstart', isSelected);

      const panel = panels[index];
      if (!panel) return;
      if (isSelected) {
        panel.removeAttribute('hidden');
        panel.setAttribute('tabindex', '0');
      } else {
        panel.setAttribute('hidden', 'until-found');
        panel.removeAttribute('tabindex');
      }
    });

    selectedTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    if (moveFocus) {
      selectedTab.focus();
    }

    if (updateHash) {
      const hashTarget = selectedTab.dataset.channel === 'rc' ? '#rc' : '#ga';
      if (window.location.hash !== hashTarget) {
        history.replaceState(null, '', hashTarget);
      }
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activateTab(tab);
    });
  });

  // Fallback keyboard arrow navigation when browser lacks native focusgroup support
  tablist.addEventListener('keydown', (event) => {
    if (Object.hasOwn(HTMLElement.prototype, 'focusGroup')) return;
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      activateTab(tabs[nextIndex], { moveFocus: true });
    }
  });

  // Sync active tab when browser find-in-page opens a hidden="until-found" panel
  panels.forEach((panel, index) => {
    if (!panel) return;
    panel.addEventListener('beforematch', () => {
      activateTab(tabs[index], { moveFocus: false });
    });
  });

  // Honor #rc or #ga initial hash if present
  const initialHash = window.location.hash.toLowerCase();
  if (initialHash === '#rc') {
    const rcTab = document.getElementById('tab-rc');
    if (rcTab) activateTab(rcTab, { moveFocus: false, updateHash: false });
  }
}

function createTextElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

function buildArtifactRow(asset) {
  const tr = document.createElement('tr');

  const nameCell = document.createElement('th');
  nameCell.scope = 'row';
  nameCell.appendChild(createTextElement('span', 'artifact-name', asset.name));
  if (asset.label && asset.label !== asset.name) {
    nameCell.appendChild(createTextElement('span', 'artifact-desc', asset.label));
  }
  tr.appendChild(nameCell);

  const catCell = document.createElement('td');
  const catLabel = CATEGORY_LABELS[asset.category] || 'Asset';
  catCell.appendChild(createTextElement('span', 'cat-tag', catLabel));
  tr.appendChild(catCell);

  const sizeCell = document.createElement('td');
  sizeCell.textContent = formatBytes(asset.sizeBytes);
  tr.appendChild(sizeCell);

  const shaCell = document.createElement('td');
  if (asset.sha256) {
    const shaWrap = document.createElement('div');
    shaWrap.className = 'sha-cell';
    const shortSha = createTextElement('code', '', `${asset.sha256.slice(0, 12)}…`);
    shortSha.title = asset.sha256;
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'dl-btn-secondary';
    copyBtn.setAttribute('aria-label', `Copy SHA-256 checksum for ${asset.name}`);
    copyBtn.appendChild(createTextElement('span', 'copy-label', 'Copy SHA-256'));
    copyBtn.addEventListener('click', () => copyText(asset.sha256, `SHA-256 for ${asset.name}`, copyBtn));
    shaWrap.append(shortSha, copyBtn);
    shaCell.appendChild(shaWrap);
  } else if (asset.sha256Url) {
    const shaLink = document.createElement('a');
    shaLink.href = asset.sha256Url;
    shaLink.className = 'dl-btn-secondary';
    shaLink.textContent = '.sha256';
    shaCell.appendChild(shaLink);
  } else {
    shaCell.textContent = 'See SHA256SUMS.txt';
  }
  tr.appendChild(shaCell);

  const actionCell = document.createElement('td');
  const actions = document.createElement('div');
  actions.className = 'action-btn-group';
  const dlLink = document.createElement('a');
  dlLink.href = asset.downloadUrl;
  dlLink.className = 'dl-btn';
  dlLink.textContent = 'Download';
  dlLink.setAttribute('aria-label', `Download ${asset.name}`);
  actions.appendChild(dlLink);

  if (asset.sigstoreUrl) {
    const sigLink = document.createElement('a');
    sigLink.href = asset.sigstoreUrl;
    sigLink.className = 'dl-btn-secondary';
    sigLink.textContent = '.sigstore.json';
    sigLink.setAttribute('aria-label', `Download Cosign bundle for ${asset.name}`);
    actions.appendChild(sigLink);
  }
  if (asset.ascUrl) {
    const ascLink = document.createElement('a');
    ascLink.href = asset.ascUrl;
    ascLink.className = 'dl-btn-secondary';
    ascLink.textContent = '.asc';
    ascLink.setAttribute('aria-label', `Download GPG signature for ${asset.name}`);
    actions.appendChild(ascLink);
  }

  actionCell.appendChild(actions);
  tr.appendChild(actionCell);

  return tr;
}

function buildCodeCard(title, description, codeText, copyBtnLabel, headingTag = 'h3') {
  const card = document.createElement('article');
  card.className = 'install-card';

  const head = document.createElement('div');
  head.className = 'install-card-head';
  head.appendChild(createTextElement(headingTag, '', title));

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'dl-btn-secondary';
  copyBtn.setAttribute('aria-label', copyBtnLabel);
  copyBtn.appendChild(createTextElement('span', 'copy-label', 'Copy'));
  copyBtn.addEventListener('click', () => copyText(codeText, title, copyBtn));
  head.appendChild(copyBtn);

  card.appendChild(head);
  card.appendChild(createTextElement('p', '', description));

  const pre = document.createElement('pre');
  pre.className = 'code-pre';
  pre.setAttribute('role', 'region');
  pre.setAttribute('aria-label', `${title} command`);
  pre.tabIndex = 0;
  const code = document.createElement('code');
  code.textContent = codeText;
  pre.appendChild(code);
  card.appendChild(pre);

  return card;
}

function renderChannelSummary(channelKey, release) {
  const versionEl = document.getElementById(`${channelKey}-summary-version`);
  const metaEl = document.getElementById(`${channelKey}-summary-meta`);
  const tabChip = document.getElementById(`${channelKey}-tab-chip`);

  if (!versionEl || !metaEl || !tabChip) return;

  if (!release) {
    versionEl.textContent = channelKey === 'rc' ? 'Pending next midnight CET build' : 'Unavailable';
    tabChip.textContent = channelKey === 'rc' ? 'Nightly' : 'GA';
    metaEl.replaceChildren(
      createTextElement(
        'span',
        '',
        channelKey === 'rc'
          ? 'Scheduled every day at 00:05 CET/CEST from main.'
          : 'Check GitHub Releases directly.'
      )
    );
    return;
  }

  versionEl.textContent = release.tag;
  tabChip.textContent = release.version;

  const items = [];
  if (release.publishedAt) {
    items.push(createTextElement('span', '', `Published: ${formatTimestamp(release.publishedAt)}`));
  }
  if (release.shortSha && release.commitSha) {
    const commitLink = document.createElement('a');
    commitLink.href = `https://github.com/opencrawling/opencrawling/commit/${release.commitSha}`;
    commitLink.target = '_blank';
    commitLink.rel = 'noopener noreferrer';
    commitLink.textContent = `Commit ${release.shortSha}`;
    items.push(commitLink);
  }
  if (release.compareUrl) {
    const diffLink = document.createElement('a');
    diffLink.href = release.compareUrl;
    diffLink.target = '_blank';
    diffLink.rel = 'noopener noreferrer';
    diffLink.textContent = 'Diff vs. Stable GA';
    items.push(diffLink);
  }
  if (release.releaseUrl) {
    const relLink = document.createElement('a');
    relLink.href = release.releaseUrl;
    relLink.target = '_blank';
    relLink.rel = 'noopener noreferrer';
    relLink.textContent = 'GitHub Release';
    items.push(relLink);
  }
  metaEl.replaceChildren(...items);
}

function renderChannelBody(channelKey, release, stableFallback) {
  const container = document.getElementById(`${channelKey}-panel-body`);
  if (!container) return;

  if (!release) {
    const nextSnapshot = stableFallback
      ? `${stableFallback.baseVersion.replace(/\.(\d+)$/, (_, p) => `.${Number(p) + 1}`)}-SNAPSHOT`
      : 'main';

    const emptyBox = document.createElement('div');
    emptyBox.className = 'empty-rc-box';
    emptyBox.appendChild(
      createTextElement('h2', '', 'No Active Release Candidate Published Yet')
    );
    emptyBox.appendChild(
      createTextElement(
        'p',
        '',
        `Daily Release Candidates are built automatically every night at 00:05 CET/CEST from the main trunk (${nextSnapshot}). Once the next nightly build finishes, artifacts, checksums, and :rc Docker images appear here automatically.`
      )
    );

    const actions = document.createElement('div');
    actions.className = 'verification-links';
    const workflowLink = document.createElement('a');
    workflowLink.href = 'https://github.com/opencrawling/opencrawling/actions/workflows/nightly-rc.yml';
    workflowLink.target = '_blank';
    workflowLink.rel = 'noopener noreferrer';
    workflowLink.className = 'dl-btn';
    workflowLink.textContent = 'View Nightly RC Workflow';

    const releasesLink = document.createElement('a');
    releasesLink.href = 'https://github.com/opencrawling/opencrawling/releases';
    releasesLink.target = '_blank';
    releasesLink.rel = 'noopener noreferrer';
    releasesLink.className = 'dl-btn-secondary';
    releasesLink.textContent = 'Browse GitHub Releases';

    actions.append(workflowLink, releasesLink);
    emptyBox.appendChild(actions);

    const sourceBuildSection = document.createElement('section');
    sourceBuildSection.className = 'channel-section';
    const secHead = document.createElement('div');
    secHead.className = 'channel-section-header';
    secHead.appendChild(createTextElement('h3', '', 'Build Trunk Snapshot Locally'));
    sourceBuildSection.appendChild(secHead);
    const grid = document.createElement('div');
    grid.className = 'install-grid';
    grid.appendChild(
      buildCodeCard(
        'Build from main trunk (Java 25 + Maven)',
        'Run the latest main snapshot locally before the midnight RC build runs.',
        'git clone https://github.com/opencrawling/opencrawling.git\ncd opencrawling\n./run.sh build\n./run.sh decoupled:up',
        'Copy local trunk build commands',
        'h4'
      )
    );
    grid.appendChild(
      buildCodeCard(
        'Pull main edge containers (GHCR)',
        'Every push to main publishes :edge images to GitHub Container Registry.',
        'docker pull ghcr.io/opencrawling/oc-mcp-server:edge\ndocker pull ghcr.io/opencrawling/oc-admin-ui:edge',
        'Copy GHCR edge Docker pull commands',
        'h4'
      )
    );
    sourceBuildSection.appendChild(grid);

    container.replaceChildren(emptyBox, sourceBuildSection);
    return;
  }

  const isRc = channelKey === 'rc';
  const nodes = [];

  // Banner
  const notice = document.createElement('div');
  notice.className = `channel-notice ${isRc ? 'channel-notice-rc' : 'channel-notice-ga'}`;
  const noticeMsg = createTextElement(
    'p',
    '',
    isRc
      ? `Release Candidate ${release.version} is an automated nightly build from main (${formatTimestamp(release.publishedAt)}). Intended for evaluation, integration testing, and early feedback — use Stable GA for production workloads.`
      : `OpenCrawling ${release.version} is the latest General Availability (GA) release (${formatTimestamp(release.publishedAt)}), recommended for production deployments.`
  );
  notice.appendChild(noticeMsg);

  if (release.releaseUrl) {
    const link = document.createElement('a');
    link.href = release.releaseUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'dl-btn-secondary';
    link.textContent = 'View Release Notes on GitHub';
    notice.appendChild(link);
  }
  nodes.push(notice);

  // Artifact Table Section
  const tableSection = document.createElement('section');
  tableSection.className = 'channel-section';
  const tableHead = document.createElement('div');
  tableHead.className = 'channel-section-header';
  tableHead.appendChild(
    createTextElement(
      'h2',
      '',
      isRc
        ? `Release Candidate Archives, JARs & Docs (${release.version})`
        : `Stable Release Archives, JARs & Docs (${release.version})`
    )
  );
  tableSection.appendChild(tableHead);
  tableSection.appendChild(
    createTextElement(
      'p',
      'channel-section-sub',
      'Every distribution archive includes Java 25 launch scripts, systemd units, configuration templates, and SHA-256 verification metadata.'
    )
  );

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'table-wrapper';
  tableWrapper.tabIndex = 0;
  tableWrapper.setAttribute('role', 'region');
  const captionId = `${channelKey}-table-caption`;
  tableWrapper.setAttribute('aria-labelledby', captionId);

  const table = document.createElement('table');
  table.className = 'artifact-table';

  const caption = document.createElement('caption');
  caption.id = captionId;
  caption.textContent = `${release.name} downloadable artifacts (${release.assets.length} files)`;
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Artifact', 'Category', 'Size', 'SHA-256', 'Download'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  release.assets.forEach((asset) => {
    tbody.appendChild(buildArtifactRow(asset));
  });
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  tableSection.appendChild(tableWrapper);
  nodes.push(tableSection);

  // Container, CLI & SDK Quick Install Section
  const quickSection = document.createElement('section');
  quickSection.className = 'channel-section';
  const quickHead = document.createElement('div');
  quickHead.className = 'channel-section-header';
  quickHead.appendChild(
    createTextElement(
      'h2',
      '',
      isRc ? 'Container, CLI & SDK Usage (RC)' : 'Container, CLI & SDK Usage (GA)'
    )
  );
  quickSection.appendChild(quickHead);

  const quickGrid = document.createElement('div');
  quickGrid.className = 'install-grid';

  if (isRc) {
    const composeAsset = release.assets.find((a) => a.name.includes('decoupled-rc'));
    const composeUrl = composeAsset
      ? composeAsset.downloadUrl
      : `https://github.com/opencrawling/opencrawling/releases/download/${release.tag}/docker-compose-decoupled-rc.yml`;
    quickGrid.appendChild(
      buildCodeCard(
        'Docker Compose (Decoupled RC Stack)',
        `Pulls isolated :${release.version} (or floating :rc) images without touching :latest.`,
        `curl -fsSL -O ${composeUrl}\nOPENCRAWLING_IMAGE_TAG=${release.version} docker compose -f docker-compose-decoupled-rc.yml up -d`,
        'Copy RC Docker Compose commands'
      )
    );

    const cliAsset = release.assets.find((a) => a.category === 'cli');
    if (cliAsset) {
      quickGrid.appendChild(
        buildCodeCard(
          'Standalone CLI (oc-cli RC)',
          'Run the pre-release CLI JAR directly with Java 25 without modifying your Homebrew installation.',
          `curl -fsSL -O ${cliAsset.downloadUrl}\njava --enable-preview -jar ${cliAsset.name} --version`,
          'Copy RC CLI Java command'
        )
      );
    }

    const sdkAsset = release.assets.find((a) => a.category === 'sdk');
    if (sdkAsset) {
      quickGrid.appendChild(
        buildCodeCard(
          'Java Client SDK (RC Preview JAR)',
          'RC JARs are attached to the GitHub Pre-Release rather than Maven Central Releases.',
          `curl -fsSL -O ${sdkAsset.downloadUrl}`,
          'Copy RC Java SDK download command'
        )
      );
    }

    const pyWheelAsset = release.assets.find(
      (a) => a.category === 'python-sdk' && a.name.endsWith('.whl')
    );
    if (pyWheelAsset) {
      quickGrid.appendChild(
        buildCodeCard(
          'Python Client SDK (RC Preview Wheel)',
          'Install the nightly pre-release Python 3.11+ wheel directly with pip.',
          `pip install ${pyWheelAsset.downloadUrl}`,
          'Copy RC Python SDK pip install command'
        )
      );
    }
  } else {
    quickGrid.appendChild(
      buildCodeCard(
        'Docker Compose (Production GA)',
        `Launches the decoupled platform using the Docker Hub release stack (${release.version}).`,
        `curl -fsSL -O https://github.com/opencrawling/opencrawling/releases/download/${release.tag}/docker-compose-decoupled-dockerhub.yml\ndocker compose -f docker-compose-decoupled-dockerhub.yml up -d`,
        'Copy GA Docker Compose commands'
      )
    );

    quickGrid.appendChild(
      buildCodeCard(
        'Homebrew CLI (macOS / Linux)',
        'Install or upgrade the stable oc command via the official Homebrew Tap.',
        'brew tap opencrawling/tap\nbrew install opencrawling/tap/oc\noc --version',
        'Copy Homebrew install commands'
      )
    );

    quickGrid.appendChild(
      buildCodeCard(
        'Maven Central (Java Client SDK)',
        'Add the stable Java Client SDK directly from Maven Central.',
        `<dependency>\n  <groupId>org.opencrawling</groupId>\n  <artifactId>oc-java-client-sdk</artifactId>\n  <version>${release.version}</version>\n</dependency>`,
        'Copy Maven Central SDK dependency XML'
      )
    );

    const gaPyAsset = release.assets.find((a) => a.category === 'python-sdk');
    if (gaPyAsset) {
      quickGrid.appendChild(
        buildCodeCard(
          'PyPI (Python Client SDK)',
          'Install the official Python 3.11+ sync & async SDK (Platform API v1, OIS, gRPC Push, DataFrame extras).',
          `pip install opencrawling-sdk==${release.version}\n# Optional extras:\npip install "opencrawling-sdk[http2,grpc,dataframe]==${release.version}"`,
          'Copy PyPI Python SDK pip install command'
        )
      );
    }
  }

  quickSection.appendChild(quickGrid);
  nodes.push(quickSection);

  // Supply-chain Verification Section
  const verify = release.verification || {};
  if (verify.sha256SumsUrl || verify.cosignBundleUrl || verify.slsaProvenanceUrl) {
    const verifySection = document.createElement('section');
    verifySection.className = 'channel-section';
    const verifyHead = document.createElement('div');
    verifyHead.className = 'channel-section-header';
    verifyHead.appendChild(createTextElement('h2', '', 'Integrity & Supply-Chain Verification'));
    verifySection.appendChild(verifyHead);

    const platformZip = release.assets.find((a) => a.name.startsWith('opencrawling-platform-dist-'));
    const zipName = platformZip ? platformZip.name : `opencrawling-platform-dist-${release.version}.zip`;

    const verifyGrid = document.createElement('div');
    verifyGrid.className = 'install-grid';

    if (verify.sha256SumsUrl && verify.cosignBundleUrl) {
      verifyGrid.appendChild(
        buildCodeCard(
          'Verify SHA-256 & Keyless Cosign Signature',
          'Confirm archive integrity and verify that SHA256SUMS.txt was signed by GitHub Actions OIDC.',
          `curl -fsSL -O ${verify.sha256SumsUrl}\ncurl -fsSL -O ${verify.cosignBundleUrl}\ncosign verify-blob \\\n  --bundle SHA256SUMS.txt.sigstore.json \\\n  --certificate-oidc-issuer https://token.actions.githubusercontent.com \\\n  --certificate-identity-regexp '^https://github\\.com/opencrawling/opencrawling/' \\\n  SHA256SUMS.txt\nsha256sum -c SHA256SUMS.txt --ignore-missing`,
          'Copy Cosign and SHA-256 verification commands'
        )
      );
    }

    if (verify.slsaProvenanceUrl) {
      verifyGrid.appendChild(
        buildCodeCard(
          'Verify SLSA Level 3 Provenance',
          'Cryptographically attest that binaries were built cleanly from the official GitHub repository.',
          `curl -fsSL -O ${verify.slsaProvenanceUrl}\nslsa-verifier verify-artifact ${zipName} \\\n  --provenance-path ${verify.slsaProvenanceUrl.split('/').pop()} \\\n  --source-uri github.com/opencrawling/opencrawling \\\n  --source-tag ${release.tag}`,
          'Copy SLSA verifier command'
        )
      );
    }

    verifySection.appendChild(verifyGrid);

    const verifyLinks = document.createElement('div');
    verifyLinks.className = 'verification-links';
    if (verify.sha256SumsUrl) {
      const a = document.createElement('a');
      a.href = verify.sha256SumsUrl;
      a.className = 'dl-btn-secondary';
      a.textContent = 'SHA256SUMS.txt';
      verifyLinks.appendChild(a);
    }
    if (verify.cosignBundleUrl) {
      const a = document.createElement('a');
      a.href = verify.cosignBundleUrl;
      a.className = 'dl-btn-secondary';
      a.textContent = 'SHA256SUMS.txt.sigstore.json';
      verifyLinks.appendChild(a);
    }
    if (verify.slsaProvenanceUrl) {
      const a = document.createElement('a');
      a.href = verify.slsaProvenanceUrl;
      a.className = 'dl-btn-secondary';
      a.textContent = verify.slsaProvenanceUrl.split('/').pop();
      verifyLinks.appendChild(a);
    }
    verifySection.appendChild(verifyLinks);
    nodes.push(verifySection);
  }

  container.replaceChildren(...nodes);
}

async function loadReleasesManifest() {
  try {
    const response = await fetch('data/releases.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} loading data/releases.json`);
    }
    const manifest = await response.json();
    renderChannelSummary('ga', manifest.stable);
    renderChannelSummary('rc', manifest.rc);
    renderChannelBody('ga', manifest.stable, null);
    renderChannelBody('rc', manifest.rc, manifest.stable);
  } catch (err) {
    renderChannelSummary('ga', null);
    renderChannelSummary('rc', null);
    const gaBody = document.getElementById('ga-panel-body');
    if (gaBody) {
      const fallback = createTextElement(
        'p',
        '',
        'Unable to load data/releases.json locally. Visit https://github.com/opencrawling/opencrawling/releases for all downloads.'
      );
      gaBody.replaceChildren(fallback);
    }
    renderChannelBody('rc', null, null);
    console.error('Failed to load release manifest:', err);
  }
}
