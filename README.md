# OpenCrawling Organization Website 🌐

This repository contains the source code for the official website of the **OpenCrawling** GitHub organization, hosted on GitHub Pages at [opencrawling.github.io](https://opencrawling.github.io/).

## 💡 About OpenCrawling

OpenCrawling is a high-performance enterprise data ingestion and security mapping framework. It bridges siloed content stores (SharePoint, Amazon S3, Databases) to AI and vector search infrastructure (pgvector, Elasticsearch, Qdrant) while fully respecting document Access Control Lists (ACLs).

## 🚀 Features of the Website

- **Fully Responsive & Modern Design**: Uses a custom dark-themed cybernetic layout with glassmorphic components, fluid grids, and CSS container queries.
- **System-Adaptive Light/Dark Mode**: Fully supports browser and OS light/dark preferences natively via `light-dark()` CSS declarations and includes an interactive manual theme toggle.
- **Interactive Architecture Diagram**: Hover over nodes in the SVG diagram to learn how the repository connectors, Kafka claim check queues, and vector indexers communicate.
- **Live Ingestion Simulator**: Run simulated crawl operations right in your browser to see how documents flow, ACLs are mapped, and vector embeddings are generated.
- **Fast and Lightweight**: Built entirely with native HTML5, Vanilla CSS, and modern client-side JavaScript. No build steps are required for deployment.

## 🛠️ Local Development

You can run the website locally using standard npm commands:

```bash
# Clone the repository (if not already done)
git clone https://github.com/OpenCrawling/opencrawling.github.io.git
cd opencrawling.github.io

# Start the local development server (spins up a lightweight server on port 8080)
npm run dev
```

Alternatively, you can open `index.html` directly in any modern web browser or serve it using Python:

```bash
python3 -m http.server 8080
```

## 📂 Project Structure

```text
├── assets/
│   └── logo-without-text-200px.png  # OpenCrawling Brand Logo
├── css/
│   └── styles.css        # Core stylesheet using modern CSS variables & @layer
├── js/
│   └── main.js           # Simulator, SVG interactive pathing, and theme toggle logic
├── index.html            # Main site markup
├── package.json          # Development server script configuration
└── README.md             # Project documentation
```

## 📬 Contact & Community

Join our [Slack Community](https://join.slack.com/t/opencrawling/shared_invite/zt-43r2anb6q-YLoBsOrxCCcBWU5Up3P1rw) to connect with the team, collaborate, and ask questions!

For general inquiries, documentation support, or partner discussions, you can reach us at [info@opencrawling.org](mailto:info@opencrawling.org).

## 📄 License

This website and the OpenCrawling project are distributed under the [Apache License 2.0](https://github.com/OpenCrawling/opencrawling/blob/main/LICENSE).
