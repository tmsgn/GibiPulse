# ⚡ GibiPulse

**The AI-Powered Campus Intelligence System for Bahir Dar University**

![GibiPulse Admin Dashboard](./public/demo-banner.png)

GibiPulse is a modern, real-time issue reporting platform that digitizes and entirely automates the maintenance workflow for university campuses. Built from the ground up to solve the fragmented, manual, and often duplicate reporting mechanisms found in university environments—it uses next-generation AI to intercept, translate, consolidate, and intelligently assign issues in real-time.

---

## ✨ Features

- 🧠 **Smart Deduplication:** When 50 students report the exact same broken pipe, GibiPulse's AI instantly merges them into a single centralized "Grouped Issue", automatically bumping its severity level without flooding the Admin dashboard.
- 👁️ **Multimodal Vision Diagnoses:** Students can upload photos of broken equipment natively. GibiPulse leverages Llama 3.2 Vision to physically execute damage estimation and append AI-verified visual insights.
- 🌍 **Native Multilingual Support ("Amharlish"):** Natively translates and understands Amharic, regional slang, and English sentences simultaneously without requiring manual text intervention.
- 📊 **Real-time Dispatch Command Center:** A glowing, glowing semantic dark-mode interactive dashboard for Admin Management. Includes analytical tracking, geo-hotzones, and team assignments (Plumbing, IT, etc).
- 🔓 **Radical Transparency (Live Feed):** Students have full access to a read-only Public Live Feed to check if their issue is already actively "In Progress", cutting down maintenance ticket bloat by 80%.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) (Semantic Native Dark Mode)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL & Storage Buckets)
- **AI Brain Engine:** [Groq Cloud](https://groq.com/) API
  - `llama3-70b-8192` (For blazingly fast text parsing & Amharic translations)
  - `llama-3.2-90b-vision-preview` (For image inference & visual breakdown analysis)

---

## 🚀 Getting Started

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/your-username/gibipulse.git
cd gibipulse
\`\`\`

### 2. Install dependencies
We recommend using [Bun](https://bun.sh/) for blazingly fast installations.
\`\`\`bash
bun install
# or
npm install
\`\`\`

### 3. Configure Environment Variables
Create a \`.env.local\` file in the root directory and add the following keys:
\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Groq AI Engine
GROQ_API_KEY=your_groq_api_key
\`\`\`

### 4. Supabase Setup
You need to set up the data models in Supabase. You can find the required PostgreSQL table, trigger, and row-level security (RLS) schemas in the \`supabase-schema.sql\` file. Run this in your Supabase SQL Editor.
Make sure to create a public storage bucket named \`report_images\` for image uploading functionalities!

### 5. Run the Local Server
\`\`\`bash
bun dev
\`\`\`
GibiPulse will start typically at [http://localhost:3000](http://localhost:3000).

---

## 🗺️ Project Structure

- \`/app/page.tsx\` - The blazing-fast student report form.
- \`/app/feed/page.tsx\` - The public transparency timeline dashboard.
- \`/app/admin/page.tsx\` - The protected, live analytics map for university staff.
- \`/app/api/report/route.ts\` - Core AI ingestion route (handles the Llama 3 logic and Supabase insertion).

---

**Built with ❤️ for Bahir Dar University**
