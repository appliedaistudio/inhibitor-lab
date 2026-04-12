#!/usr/bin/env python3
"""Generate the rehearsal script PDF for demo day."""

from fpdf import FPDF
from pathlib import Path

OUT = Path(__file__).parent.parent / "docs" / "rehearsal_script.pdf"


class PDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 5, "NotSoFast Landlord  |  Rehearsal Script  |  Philly Codefest 2026", align="C")
            self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(20, 20, 20)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(60, 60, 200)
        self.set_line_width(0.5)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def sub_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(60, 60, 60)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bold_body(self, text):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def quote(self, text):
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(40, 40, 120)
        x = self.get_x()
        self.set_x(x + 8)
        self.multi_cell(self.w - self.l_margin - self.r_margin - 16, 5.5, f'"{text}"')
        self.ln(2)

    def stage_direction(self, text):
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(100, 100, 100)
        self.multi_cell(0, 5, text)
        self.ln(1)

    def table_row(self, col1, col2, widths, bold_first=False):
        x = self.get_x()
        y = self.get_y()
        self.set_font("Helvetica", "B" if bold_first else "", 9)
        self.set_text_color(30, 30, 30)
        self.multi_cell(widths[0], 5, col1)
        h1 = self.get_y() - y
        self.set_xy(x + widths[0], y)
        self.set_font("Helvetica", "", 9)
        self.multi_cell(widths[1], 5, col2)
        h2 = self.get_y() - y
        row_h = max(h1, h2)
        self.set_y(y + row_h + 1)

    def table_header(self, col1, col2, widths):
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(230, 230, 245)
        self.set_text_color(20, 20, 20)
        y = self.get_y()
        self.cell(widths[0], 7, col1, border=1, fill=True)
        self.cell(widths[1], 7, col2, border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

    def check_space(self, needed=40):
        if self.get_y() > self.h - self.b_margin - needed:
            self.add_page()


pdf = PDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_page()

# ── Title page ──
pdf.ln(30)
pdf.set_font("Helvetica", "B", 28)
pdf.set_text_color(20, 20, 80)
pdf.cell(0, 15, "NOT SO FAST, LANDLORD", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 14)
pdf.set_text_color(80, 80, 80)
pdf.cell(0, 10, "Rehearsal Script", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 8, "Philly Codefest 2026  |  Advanced Track", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(5)
pdf.set_draw_color(60, 60, 200)
pdf.set_line_width(0.8)
pdf.line(60, pdf.get_y(), pdf.w - 60, pdf.get_y())
pdf.ln(10)

pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(50, 50, 50)
pdf.cell(0, 8, "Total time:  3:00 pitch  +  2:00 Q&A", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 8, "Team size:  4 people  (2 pitching, 2 on demo)", align="C", new_x="LMARGIN", new_y="NEXT")

pdf.ln(15)
pdf.set_font("Helvetica", "B", 12)
pdf.set_text_color(20, 20, 20)
pdf.cell(0, 8, "ROLE ASSIGNMENTS (fill in before first run)", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)

roles = [
    ("Pitcher 1", "Opens pitch, delivers hook, narrates demo, handles closer"),
    ("Pitcher 2", "Handles Q&A, jumps in with stats, backup narrator"),
    ("Demo 1", "Drives Laptop 1 (main app). Clicks on cue. Does not talk."),
    ("Demo 2", "Drives Laptop 2 (Glass Box) + Laptop 3 (traces). Switches on cue."),
]
w1, w2, w3 = 28, 50, pdf.w - pdf.l_margin - pdf.r_margin - 78
pdf.set_font("Helvetica", "B", 9)
pdf.set_fill_color(230, 230, 245)
pdf.cell(w1, 7, "Role", border=1, fill=True)
pdf.cell(w2, 7, "Name", border=1, fill=True)
pdf.cell(w3, 7, "Responsibility", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
for role, desc in roles:
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(w1, 7, role, border=1)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(w2, 7, "_________________", border=1)
    pdf.cell(w3, 7, desc, border=1, new_x="LMARGIN", new_y="NEXT")

# ── Pre-rehearsal checklist ──
pdf.add_page()
pdf.section_title("PRE-REHEARSAL CHECKLIST")
pdf.body("Do this ONCE before your first run-through.")
checks = [
    "All 3 laptops open, services running (./scripts/demo_setup.sh app|glassbox|traces)",
    "Demo 1 has the app at / (splash page, ready to click through)",
    "Demo 2 has Glass Box at /glass-box on one laptop, localhost:8765/traces on the other",
    "Pitcher 1 has this script printed or on phone",
    "Pitcher 2 has the Q&A section on phone",
    "Backup demo video queued in a browser tab on Demo 1's laptop",
    "Timer app ready (phone stopwatch)",
]
for c in checks:
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(6, 5.5, "[ ]")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 5.5, f"  {c}")
    pdf.ln(1)

# ── The Script ──
pdf.add_page()
pdf.section_title("THE SCRIPT")

# 0:00-0:15
pdf.sub_title("[0:00 - 0:15]  THE HOOK  --  Pitcher 1")
pdf.stage_direction("Stand. No laptop yet. Eye contact with judges.")
pdf.bold_body("Say this:")
pdf.quote(
    "Philadelphia has one of the highest eviction rates in the United States. "
    "Most illegal evictions succeed because tenants don't know their rights -- "
    "and when they try to find help at 11pm, they get generic internet advice "
    "or a chatbot that makes up laws."
)
pdf.stage_direction("Beat. One second pause.")
pdf.quote("We built NotSoFast Landlord. It's the friend who happens to know tenant law.")
pdf.body("Demo 1: While Pitcher 1 talks, click past the splash screen so the Landing page is visible.")

# 0:15-0:25
pdf.check_space(50)
pdf.sub_title("[0:15 - 0:25]  TRANSITION TO DEMO  --  Pitcher 1")
pdf.quote("Let me show you what it does.")
pdf.body('Demo 1: Click "Analyze Your Case" on the Landing page. You should now be on the Upload page.')

# 0:25-1:05
pdf.check_space(60)
pdf.sub_title("[0:25 - 1:05]  CORE DEMO  --  Pitcher 1 narrates, Demo 1 drives")
pdf.bold_body("Demo 1 actions (listen for verbal cues):")
cues = [
    ("Pitcher 1: \"A tenant gets a letter...\"", "Select case type: Illegal Eviction"),
    ("Pitcher 1: \"They paste the text...\"", "Click 'Load Demo' for the sample letter"),
    ("Pitcher 1: \"One click...\"", "Click 'Analyze'"),
    ("(loading animation plays)", "Do nothing. Let 5-step animation play."),
]
tw = [pdf.w / 2 - 10, pdf.w / 2 - 10]
pdf.table_header("Pitcher 1 says...", "Demo 1 does...", tw)
for c1, c2 in cues:
    pdf.table_row(c1, c2, tw, bold_first=True)
pdf.ln(2)

pdf.bold_body("Pitcher 1 narrates DURING the loading animation:")
pdf.quote(
    "You're watching five AI agents work in sequence. Intake reads the letter. "
    "Retrieval pulls the exact PA statutes. Drafting writes the response. "
    "A Critic agent checks the work. And a Finalizer polishes it."
)
pdf.quote("But between Drafting and Critic -- watch --")
pdf.stage_direction("(Results page should load around now. If not, keep talking.)")
pdf.quote(
    "Every single draft passes through Applied AI Studio's Inhibitor. "
    "That's the safety layer between the AI and a scared tenant."
)

# 1:05-1:35
pdf.check_space(50)
pdf.sub_title("[1:05 - 1:35]  RESULTS WALKTHROUGH  --  Pitcher 1 narrates, Demo 1 clicks tabs")
pdf.bold_body("Pitcher 1 says this while Demo 1 clicks each tab (~7 seconds per tab):")
tabs = [
    ("\"Concrete next steps, prioritized...\"", "Click Actions tab"),
    ("\"A timeline so they know what happens when...\"", "Click Timeline tab"),
    ("\"Full transparency -- every Inhibitor intervention logged...\"", "Click Inhibitor Log tab"),
    ("\"And a ready-to-send response letter...\"", "Click Response Letter tab"),
]
pdf.table_header("Pitcher 1 says...", "Demo 1 clicks...", tw)
for c1, c2 in tabs:
    pdf.table_row(c1, c2, tw, bold_first=True)
pdf.ln(2)

pdf.bold_body("KEY MOMENT -- On the Inhibitor Log tab, Pitcher 1 says:")
pdf.quote(
    "This is key. The agent's first draft told the tenant to 'ignore the landlord's letter.' "
    "Inhibitor caught that as potentially escalatory, flagged the missing citation, and forced a rewrite. "
    "That's not a chatbot. That's a guardrail."
)

# 1:35-2:15
pdf.check_space(60)
pdf.sub_title("[1:35 - 2:15]  GLASS BOX  --  Pitcher 1 narrates, Demo 2 drives")
pdf.quote("Now let's look under the hood.")
pdf.body("Demo 2: Switch the projected screen to the Glass Box laptop (/glass-box).")
gb_cues = [
    ("\"This is our audit dashboard...\"", "Show Pipeline Overview"),
    ("\"Every event from Applied AI's shared dataset...\"", "Switch to Event Stream view"),
    ("\"Set A: 17,000 events. Set B: 2,600.\"", "Scroll slowly through events"),
    ("\"And here are our own logs...\"", "Switch to NotSoFast Logs view"),
]
pdf.table_header("Pitcher 1 says...", "Demo 2 does...", tw)
for c1, c2 in gb_cues:
    pdf.table_row(c1, c2, tw, bold_first=True)
pdf.ln(2)
pdf.quote(
    "We didn't just use Inhibitor -- we built tools to analyze it. "
    "This dashboard parses Applied AI's shared sample logs and visualizes the entire pipeline. "
    "Judges, you can replay any intervention."
)

# 2:15-2:35
pdf.check_space(50)
pdf.sub_title("[2:15 - 2:35]  LIVE TRACES  --  Pitcher 1 narrates, Demo 2 switches")
pdf.quote("And here's the live pipeline.")
pdf.body("Demo 2: Switch projected screen to the traces laptop (localhost:8765/traces).")
pdf.quote(
    "Every analysis that runs through our app produces a trace. You can see each agent's reasoning, "
    "the Inhibitor check, and the final output. Full transparency, full reproducibility."
)
pdf.stage_direction(
    "(If traces are empty: Pitcher 1 says 'When we ran that analysis a minute ago, "
    "here's the trace it produced.')"
)

# 2:35-2:50
pdf.check_space(50)
pdf.sub_title("[2:35 - 2:50]  THE NUMBERS  --  Pitcher 2")
pdf.stage_direction("Pitcher 2 steps in for the first time. This signals to judges: the whole team knows the project.")
pdf.bold_body("Pitcher 2 says:")
pdf.quote(
    "Quick numbers. We benchmarked 30 cases -- average judge score 4.78 out of 5, "
    "with 92.8% citation coverage. We red-teamed with 22 adversarial attacks -- "
    "our strongest finding hit 0.99 confidence. And we have 78 logged Inhibitor "
    "interventions in our evidence directory."
)

# 2:50-3:00
pdf.check_space(50)
pdf.sub_title("[2:50 - 3:00]  THE CLOSER  --  Pitcher 1")
pdf.stage_direction("Step forward. Slow down. Lower your voice slightly.")
pdf.quote("This isn't a chatbot pretending to be a lawyer. It's the tool that tells landlords: not so fast.")
pdf.stage_direction("Hold eye contact for 2 seconds. Done.")

# ── Q&A ──
pdf.add_page()
pdf.section_title("Q&A PREP  --  Pitcher 2 leads, Pitcher 1 supports")
pdf.body("Pitcher 2 takes first crack at every question. Pitcher 1 only adds if P2 misses something. Never talk over each other.")
pdf.ln(2)

qas = [
    (
        "What if the agent is wrong?",
        "That's exactly what Inhibitor is for. Every draft is evaluated before the tenant sees it. "
        "Every intervention is logged. And we always end with the Community Legal Services phone number -- "
        "we're the bridge to real legal help, not a replacement."
    ),
    (
        "How is this different from just prompting GPT carefully?",
        "Careful prompting catches maybe 60% of issues. Inhibitor's systematic evaluation across bias, "
        "safety, transparency, and ethical risk catches the rest -- including failure modes we didn't anticipate. "
        "And we get structured verdicts we can analyze and improve."
    ),
    (
        "Could a landlord use this against tenants?",
        "We specifically red-teamed that. Prompt injection attacks where users claimed to be landlords "
        "looking for eviction loopholes -- Inhibitor's bias detection catches role confusion. It's in our red team report."
    ),
    (
        "What's your RAG approach?",
        "Hybrid retrieval. Dense vectors via ChromaDB with OpenAI embeddings, plus BM25 keyword search, "
        "fused with Reciprocal Rank Fusion. 10-chunk corpus from the PA Landlord-Tenant Act and Philadelphia Code. "
        "92.8% citation coverage across our benchmark."
    ),
    (
        "Why this tech stack?",
        "FastAPI for async agent orchestration, Vite + React for the frontend because we needed Framer Motion "
        "for the demo experience, ChromaDB because it runs local with zero config. Everything runs on one laptop "
        "with no cloud dependencies except the LLM and Inhibitor APIs."
    ),
    (
        "What's next?",
        "We're reaching out to Community Legal Services and Philly Tenant Union. The legal corpus is public, "
        "the pipeline is open source. This could be deployed for real users within a month."
    ),
]

for q, a in qas:
    pdf.check_space(35)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(60, 60, 150)
    pdf.multi_cell(0, 5.5, "Q: " + q)
    pdf.ln(1)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(30, 30, 30)
    pdf.multi_cell(0, 5.5, "A: " + a)
    pdf.ln(4)

pdf.body("If you don't know the answer: \"Great question -- let me check our docs and get back to you.\" Don't guess. Don't ramble.")

# ── Recovery Plays ──
pdf.add_page()
pdf.section_title("RECOVERY PLAYS")
pdf.bold_body("Demo 1 and Demo 2: memorize these.")
pdf.ln(2)

recoveries = [
    ("App shows error / spinner stuck", "Demo 1", "Switch to backup video tab. Pitcher 1: 'Here's a recording from our testing session.'"),
    ("Glass Box won't load", "Demo 2", "Show /traces instead. Pitcher 1: 'Let me show the raw pipeline traces.'"),
    ("Traces endpoint empty", "Demo 2", "Show /health. Pitcher 1: 'The pipeline is healthy -- traces populate on each run.'"),
    ("Backend completely down", "Demo 1", "Play backup video. Pitcher 1 keeps narrating as if nothing happened."),
    ("Projector / display dies", "Everyone", "Pitcher 1 keeps talking from memory. Pitcher 2 holds up phone showing the app."),
    ("You lose your place", "Pitcher 1", "Jump to closer: 'This isn't a chatbot pretending to be a lawyer...'"),
]

rw = [(pdf.w - pdf.l_margin - pdf.r_margin) * 0.30,
      (pdf.w - pdf.l_margin - pdf.r_margin) * 0.15,
      (pdf.w - pdf.l_margin - pdf.r_margin) * 0.55]

pdf.set_font("Helvetica", "B", 9)
pdf.set_fill_color(230, 230, 245)
x0 = pdf.get_x()
pdf.cell(rw[0], 7, "What breaks", border=1, fill=True)
pdf.cell(rw[1], 7, "Who", border=1, fill=True)
pdf.cell(rw[2], 7, "What to do", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

for what, who, do in recoveries:
    pdf.check_space(25)
    y = pdf.get_y()
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(30, 30, 30)
    pdf.multi_cell(rw[0], 5, what)
    h1 = pdf.get_y() - y
    pdf.set_xy(x0 + rw[0], y)
    pdf.set_font("Helvetica", "B", 9)
    pdf.multi_cell(rw[1], 5, who)
    h2 = pdf.get_y() - y
    pdf.set_xy(x0 + rw[0] + rw[1], y)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(rw[2], 5, do)
    h3 = pdf.get_y() - y
    pdf.set_y(y + max(h1, h2, h3) + 2)

pdf.ln(5)
pdf.bold_body("GOLDEN RULE: Never say 'sorry' or 'it's not working.' Always redirect: 'Let me show you another way.'")

# ── Rehearsal Protocol ──
pdf.add_page()
pdf.section_title("REHEARSAL PROTOCOL")
pdf.body("Run this at least 3 times before you go on stage.")
pdf.ln(3)

pdf.sub_title("Run 1 -- Full walkthrough with script")
pdf.body(
    "- Timer running\n"
    "- Read directly from the script, word for word\n"
    "- Demo team practices clicks on cue\n"
    "- TARGET: Get through it without freezing. Time doesn't matter yet."
)

pdf.sub_title("Run 2 -- Timed run, eyes up")
pdf.body(
    "- Pitcher 1 paraphrases (don't read word-for-word)\n"
    "- Pitcher 2 handles one mock Q&A question\n"
    "- Demo team clicks without looking at script\n"
    "- TARGET: Under 3:30. Note what felt slow."
)

pdf.sub_title("Run 3 -- Chaos run")
pdf.body(
    "- Have someone randomly yell 'THE APP JUST CRASHED'\n"
    "- Practice the recovery play\n"
    "- Run Q&A with 3 tough questions\n"
    "- TARGET: Under 3:00. Smooth recovery from the 'crash.'"
)

pdf.sub_title("After each run, ask:")
pdf.body(
    "- What felt good? Keep it.\n"
    "- What felt rushed or clunky? Cut or simplify.\n"
    "- Did Demo team click at the right time? Adjust cues."
)

# ── Timing cheat sheet ──
pdf.ln(5)
pdf.section_title("TIMING CHEAT SHEET")

tsw = [(pdf.w - pdf.l_margin - pdf.r_margin) * 0.45,
       (pdf.w - pdf.l_margin - pdf.r_margin) * 0.25,
       (pdf.w - pdf.l_margin - pdf.r_margin) * 0.30]

pdf.set_font("Helvetica", "B", 10)
pdf.set_fill_color(230, 230, 245)
pdf.cell(tsw[0], 8, "Segment", border=1, fill=True)
pdf.cell(tsw[1], 8, "Start", border=1, fill=True)
pdf.cell(tsw[2], 8, "Duration", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

segments = [
    ("Hook", "0:00", "15s"),
    ("Transition", "0:15", "10s"),
    ("Core demo + loading", "0:25", "40s"),
    ("Results walkthrough", "1:05", "30s"),
    ("Glass Box", "1:35", "40s"),
    ("Live traces", "2:15", "20s"),
    ("Numbers (Pitcher 2)", "2:35", "15s"),
    ("Closer", "2:50", "10s"),
]

pdf.set_font("Helvetica", "", 10)
for seg, start, dur in segments:
    pdf.cell(tsw[0], 7, seg, border=1)
    pdf.cell(tsw[1], 7, start, border=1)
    pdf.cell(tsw[2], 7, dur, border=1, new_x="LMARGIN", new_y="NEXT")

pdf.ln(8)
pdf.set_font("Helvetica", "B", 11)
pdf.set_text_color(180, 30, 30)
pdf.multi_cell(0, 6, "If you're at 2:30 and haven't done the closer yet -- SKIP TO IT.\nThe closer is more important than any middle section.")

pdf.output(str(OUT))
print(f"PDF written to {OUT}")
