# Competitive Research Methodology

**Purpose**: Establish standards for thorough, credible competitive research that avoids vendor bias and surface-level analysis.

**Applies to**: Any competitive intelligence, market research, or product validation task where you need to understand competitors, their traction, and market positioning.

---

## Why This Matters

### The Problem: Shallow Research is Worse Than No Research

**Common failure pattern**:
1. ❌ Read competitor's website + blog posts
2. ❌ Summarize their marketing claims
3. ❌ Conclude "they exist, they claim X, threat level = Y"
4. ❌ **Miss the real story** (actual traction, user sentiment, founder struggles, market position)

**Why this fails**:
- **Vendor bias**: Companies only publish positive narratives (never "our product has gaps" or "users prefer weekly summaries")
- **No validation**: Claims ≠ reality (anyone can claim "thousands of users")
- **Shallow insights**: Marketing copy doesn't reveal SAY-DO gaps, product learnings, or competitive weaknesses
- **Missed opportunities**: Real insights come from user complaints, founder struggles, community discussions

### The Standard: Multi-Source Validation with Direct Attribution

**What "done" looks like**:
- ✅ 5+ independent source types (not just vendor content)
- ✅ Direct user quotes with names/links
- ✅ Revenue/traction evidence (not claims)
- ✅ Founder + key people research (LinkedIn, backgrounds)
- ✅ Community presence validated (Slack, Reddit, HN, forums)
- ✅ Third-party validation (reviews, discussions, comparisons)

**If a CI analyst wouldn't trust it, neither should Claude.**

---

## Core Principle: Multi-Source Validation

**Never rely on a single source type.** Always cross-validate claims across multiple independent sources.

**Minimum standard**: 5+ source types from the list below

**Why**:
- Vendor content = biased (marketing)
- User reviews = biased (extremes complain/praise)
- Founder posts = biased (promoting product)
- **Triangulation** = truth (where do all sources agree?)

---

## Research Methodology

### Phase 1: Founder and Key People Research

**Goal**: Understand who's building this, their credibility, and their product journey

**Sources**:
- **LinkedIn profiles**: Founder + co-founders + early employees
  - Background (serial entrepreneur? First-time founder? Domain expert?)
  - Previous companies (exits? failures? relevant experience?)
  - Posts about the product (learnings, struggles, pivots, traction claims)
  - Engagement on posts (likes, comments, who's engaging?)
  - Commenters (potential users, advisors, investors?)
- **Twitter/X**: Product updates, launch announcements, user interactions
- **Personal blogs**: Long-form reflections, product learnings
- **Podcast appearances**: Interviews about the journey
- **Conference talks**: Speaking engagements (indicates thought leadership)

**Key people beyond founder**:
- **Early employees** (engineers, designers, PMs) - what are they saying?
- **Advisors** (listed on website, LinkedIn) - who's backing them?
- **Active users** (commenters on founder posts, reviewers) - who's engaged?
- **Investors** (if funded) - tier of VCs, strategic angels?

**What to extract**:
- Direct quotes with attribution (e.g., "— [Founder Name], LinkedIn post [date]")
- Engagement metrics (85 likes, 36 comments)
- Product learnings (SAY-DO gaps, pivots, feature decisions)
- Validation milestones ($35K ARR, first 100 customers)
- Positioning struggles ("still figuring out positioning after 6 months")

---

### Phase 2: Product and Market Research

**Goal**: Understand what they actually built, who uses it, and how it's positioned

**Sources**:

**Company Fundamentals**:
- **Crunchbase** (or PitchBook, CB Insights):
  - Funding rounds (seed, Series A, etc.)
  - Total funding raised
  - Investors (tier, strategic relevance)
  - Valuation (if public)
  - Founding date (how long in market?)
- **Headcount data**:
  - LinkedIn employee count (growing? flat? shrinking?)
  - Recent hires (what roles? indicates priorities)
  - Layoffs (Layoffs.fyi, news articles)
  - Team growth trajectory (10 → 50 → 100 employees?)
- **Domain/web data**:
  - SimilarWeb, Ahrefs (traffic, ranking, referring domains)
  - Builtwith.com (tech stack)
  - Domain age (how long have they existed?)

**Product Research**:
- **Website**: Features, pricing, positioning, value prop
- **Product demos**: YouTube, Product Hunt, Twitter videos
- **Documentation**: Public docs, API references (depth, quality)
- **Free tools**: Try their free tier, freemium tools, demos
- **Feature comparisons**: Their own comparison pages (who do they compare against?)

**Traction Validation**:
- **Revenue claims**: LinkedIn posts, interviews, press releases
  - Verify: Does source link to evidence? (e.g., LinkedIn post with engagement)
  - Red flag: Vague claims ("thousands of customers" with no proof)
- **Customer count**: Public testimonials, case studies, logos
- **Usage data**: a concrete usage metric from a published case study
- **Public case studies**: Customer names, use cases, results
- **Press coverage**: TechCrunch, industry publications (not just their blog)

---

### Phase 3: User Research and Community Validation

**Goal**: Understand what real users think, where they hang out, and what they complain about

**Sources**:

**Review Platforms**:
- **G2**: Reviews, ratings, pros/cons, user roles
- **Capterra**: Similar to G2, different audience
- **TrustRadius**: B2B SaaS reviews
- **Product Hunt**: Launch discussions, upvotes, comments
- **Gartner Peer Insights**: Enterprise reviews

**Community Discussions**:
- **Reddit**: r/SaaS, r/startups, niche subreddits (r/dataengineering for data tools)
  - Search competitor name + "review", "vs", "alternative"
  - Look for user pain points, complaints, comparisons
- **HackerNews**: "Ask HN", "Show HN", launch posts
  - Search: `site:news.ycombinator.com "competitor name"`
  - User comments reveal real sentiment (not filtered marketing)
- **Slack communities**: Product Marketing Alliance, industry-specific
  - Search competitor mentions
  - Who's using it? Who's evaluating it? Who dismissed it?
- **Discord servers**: Developer communities, niche groups
- **Forums**: Indie Hackers, niche industry forums

**What to extract**:
- **Direct user quotes** (with usernames, links, dates)
- **Pain points**: a specific, concrete complaint from a real review (not a paraphrase)
- **Feature gaps**: What users wish existed
- **Competitor comparisons**: "We tried X, switched to Y because..."
- **Sentiment**: Positive, negative, neutral (with evidence, not guesses)

---

### Phase 4: Competitive Positioning and Market Analysis

**Goal**: Understand how they fit in the market and who they compete against

**Sources**:
- **Competitor comparison pages**: Their website (who do THEY think they compete with?)
- **Third-party comparisons**: G2, Capterra, industry blogs
  - "[Competitor A] vs [Competitor B] vs [Competitor C]" articles
  - Software directory listings
- **Analyst reports**: Gartner Magic Quadrant, Forrester Wave (if applicable)
- **Market maps**: VC-created market maps, industry landscape diagrams
- **Acquisition attempts**: News of acquisition offers, M&A rumors

**Competitive matrix dimensions**:
- Approach (proactive vs reactive, automated vs manual)
- Frequency (daily vs weekly vs on-demand)
- Data sources (web scraping, Reddit, GitHub, job postings)
- Pricing (transparent vs sales-driven, $X/month vs unknown)
- GTM strategy (product-led vs sales-led)
- Positioning (vertical-specific vs horizontal, enterprise vs SMB)

---

## Quality Checklist

**Before marking competitive research as "complete", verify ALL of these:**

### Founder + Key People ✓
- [ ] Founder background researched (LinkedIn, previous companies)
- [ ] Founder's public posts analyzed (LinkedIn, Twitter, blog)
- [ ] Direct quotes extracted with attribution (name, source, date, link)
- [ ] Engagement metrics captured (likes, comments, reach)
- [ ] Key employees/advisors identified
- [ ] Investors identified (if applicable)

### Company Fundamentals ✓
- [ ] Crunchbase/PitchBook data reviewed (funding, investors, headcount)
- [ ] Founding date and company age determined
- [ ] Headcount trend researched (growing, flat, layoffs?)
- [ ] Recent hires analyzed (what roles? priorities?)

### Product + Traction ✓
- [ ] Website features and pricing documented
- [ ] Product demo or free tier tested (if available)
- [ ] Revenue/traction validated (NOT just claimed - evidence required)
- [ ] Customer count validated (logos, case studies, reviews)
- [ ] Press coverage searched (TechCrunch, industry pubs)

### User Research ✓
- [ ] Reviews from 2+ platforms analyzed (G2, Capterra, etc.)
- [ ] Direct user quotes extracted (with usernames, links)
- [ ] Community discussions searched (Reddit, HN, Slack, Discord)
- [ ] User pain points identified (what do they complain about?)
- [ ] Feature gaps documented (what do users wish existed?)

### Competitive Analysis ✓
- [ ] Competitive positioning researched (who do THEY compete with?)
- [ ] Third-party comparisons found (industry blogs, directories)
- [ ] Differentiation matrix created (our product vs theirs)
- [ ] Threat level assessed with confidence score (1-10 scale + confidence %)
- [ ] Strategic implications documented (what does this mean for us?)

### Quality Standards ✓
- [ ] **Minimum 5 source types** used (not just vendor content)
- [ ] **Direct attribution** for all claims (names, links, dates)
- [ ] **No vendor-only sources** (at least 3 non-vendor sources)
- [ ] **Traction validated** (evidence, not claims)
- [ ] **Confidence level** documented (how certain are we? why?)

---

## Anti-Patterns to Avoid

### ❌ Red Flags That Indicate Shallow Research:

1. **Single source type**: Only their website, only their blog, only G2 reviews
2. **No direct quotes**: Summaries without attribution ("users say it's good")
3. **Vendor-only sources**: Blog posts, marketing materials, press releases they wrote
4. **Unvalidated claims**: "They have thousands of users" (where's the evidence?)
5. **No user voice**: No reviews, no community mentions, no real user quotes
6. **Surface-level**: Features listed but no understanding of why users chose them
7. **No founder research**: Skipped LinkedIn, Twitter, background check
8. **Missing fundamentals**: No funding data, no headcount, no founding date
9. **Vague assessments**: "Seems like a competitor" (how big? what threat? why?)
10. **No confidence score**: Didn't document how certain you are (and why)

### ❌ Statements That Should Trigger "Need More Research":

- "They claim to have X customers" (Did you validate this?)
- "Their website says Y" (What do users say?)
- "I found their blog post about Z" (What do non-vendor sources say?)
- "Looks like a competitor" (Based on what evidence? How strong?)
- "They seem to be doing well" (Define "well" with metrics)
- "No information available" (Did you check LinkedIn, Crunchbase, Reddit, HN, G2?)

---

## Source Categories and Examples

### 1. Founder + Key People
- LinkedIn posts and engagement
- Twitter/X threads and replies
- Personal blogs and Medium articles
- Podcast appearances (search: "founder name" + podcast)
- Conference talks (YouTube, Luma, industry events)
- Previous company exits/failures (Crunchbase)
- Educational background (university, bootcamps)

### 2. Company Fundamentals
- **Crunchbase**: Funding, investors, headcount, founding date
- **PitchBook**: Similar to Crunchbase (may have different data)
- **LinkedIn**: Employee count, recent hires, job postings
- **Layoffs.fyi**: Layoff announcements, reductions in force
- **SimilarWeb**: Website traffic, ranking, geography
- **Builtwith**: Tech stack, integrations

### 3. Product Research
- Website (features, pricing, positioning, value prop)
- Product demos (YouTube, Loom, Product Hunt)
- Free tier / freemium tools (try it yourself)
- Documentation (quality, depth, API references)
- GitHub repos (if open source or public)
- Integration marketplaces (Zapier, Slack, etc.)

### 4. Traction Validation
- **Revenue**: Founder LinkedIn posts, interviews, press
- **Customers**: Logos, case studies, testimonials
- **Usage**: Public metrics (e.g., a case study citing concrete usage numbers)
- **Growth**: MoM/YoY growth claims (validate with evidence)
- **Press**: TechCrunch, The Verge, industry pubs

### 5. User Reviews
- **G2**: Detailed reviews, pros/cons, user roles, company sizes
- **Capterra**: Similar to G2, different audience mix
- **TrustRadius**: B2B focus, verified reviews
- **Product Hunt**: Launch day comments, upvotes, discussions
- **Gartner Peer Insights**: Enterprise reviews (paywall)

### 6. Community Discussions
- **Reddit**: r/SaaS, r/startups, niche subreddits
  - Search: `site:reddit.com "competitor name" review`
- **HackerNews**: Launch posts, "Ask HN", "Show HN"
  - Search: `site:news.ycombinator.com "competitor name"`
- **Slack communities**: PMA Slack, niche industry Slacks
- **Discord servers**: Developer communities, product groups
- **Indie Hackers**: Bootstrapper community, build-in-public posts

### 7. Competitive Intelligence
- Competitor comparison pages (their website)
- Third-party comparison articles (G2, software blogs)
- Analyst reports (Gartner, Forrester - if available)
- Market maps (VC landscape diagrams)
- Feature comparison tables (their site vs review sites)

### 8. Digital Exhaust (Advanced)
- **Job postings**: What roles are they hiring? (indicates priorities)
- **GitHub activity**: Public repos, commits, contributors
- **Domain registrations**: New domains/subdomains (launch signals)
- **Conference sponsorships**: Where are they spending marketing $?
- **Patent filings**: Product roadmap signals (Google Patents)

---

## When to Apply This Methodology

### ALWAYS Use This for:
- ✅ Competitive research tasks (analyzing competitors)
- ✅ Market validation (does this market exist? who's in it?)
- ✅ Product positioning decisions (how do we differentiate?)
- ✅ Strategic planning (should we build this? pivot?)
- ✅ Threat assessments (how worried should we be?)

### SOMETIMES Use This for:
- ⚠️ Quick market scans (use abbreviated version, but note confidence is lower)
- ⚠️ Early exploration (when deciding whether to dive deeper)

### NEVER Skip This for:
- 🛑 **Any research you'll share with users** (customers, stakeholders, team)
- 🛑 **Strategic decisions** (build/don't build, pivot, pricing, positioning)
- 🛑 **Validation entries** (VALIDATION_JOURNAL.md, competitive analysis docs)

---

## Summary: The "Done" Test

**Before marking competitive research complete, ask:**

1. **Would a professional CI analyst trust this?**
   - If no → not done

2. **Can I defend every claim with a source?**
   - If no → not done

3. **Do I have direct user quotes (not just vendor claims)?**
   - If no → not done

4. **Did I check 5+ source types?**
   - If no → not done

5. **Do I understand WHY this competitor exists and who uses them?**
   - If no → not done

6. **Could I write a credible validation journal entry from this?**
   - If no → not done

**If you wouldn't cite it in a professional report, don't consider it research.**

---

**Last updated**: 2024-12-26
