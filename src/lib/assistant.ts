import { decorateCardSections, getCatalogueItems, searchCatalogueItems } from "./catalogue"
import { getProcedureByIdSnapshot, getProcedureLibrarySnapshot, getProceduresBySpecialtySnapshot } from "./procedure-library"
import { getCatalogueProducts } from "./catalogue-products-store"
import {
  hasResolvableCatalogueProduct,
  resolveBestProcedure,
  resolveEntityDefinition,
  resolveProcedureMatches,
  resolveProductMatches,
  resolveSystemMatches,
} from "./assistant-resolver"
import type {
  AssistantAction,
  AssistantCarryContext,
  AssistantContext,
  AssistantDecisionTrace,
  AssistantPendingState,
  AssistantReply,
  AssistantStat,
  AssistantTable,
} from "./assistant-contracts"
import {
  getFixedDataComponentsForSystem,
  getFixedDataRelatedSystems,
  resolveFixedDataComponentMatches,
} from "./fixed-data-entities"
import {
  getAnatomyForServiceLine,
  getAnatomyNameById,
  getDescendantAnatomyIds,
  getOperatingTheatreSpecialtyIdByLabel,
  getServiceLineNameById,
  getServiceLinesForSpecialty,
} from "./operating-theatre-taxonomy"
import { CLINICAL_SETTINGS, SETTING_SPECIALTIES } from "./settings"
import { buildSystemCardSections } from "./system-card"
import type { ClinicalSetting, Procedure, Section } from "./types"
import {
  getSpecialtyLauncherItems,
  getWorkflowLauncherItems,
  type AssistantLauncherItem,
} from "./assistant-launchers"
import {
  getCuratedVariantsForProcedureWithSystems,
  getDefaultSystemForVariant,
  getProcedureVariantById,
  getWorkflowStepsForProcedure,
  getSystemById,
  hasVariantsForProcedure,
  type VariantWithSystems,
} from "./variants"
import { getMockWalkthroughs, type MockWalkthrough } from "./video-mocks"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type AssistantIntentId =
  | "entity_intro"
  | "related_systems"
  | "procedure_systems"
  | "entity_products"
  | "welcome"
  | "smalltalk_greeting"
  | "smalltalk_thanks"
  | "smalltalk_status"
  | "smalltalk_compliment"
  | "smalltalk_confused"
  | "smalltalk_help_meta"
  | "prepare_card"
  | "browse_procedures"
  | "broad_domain_browse"
  | "compare_cards"
  | "summary"
  | "visual"
  | "navigation"
  | "catalogue"
  | "implants"
  | "missing_sizes"
  | "implant_sizes"
  | "trays"
  | "consumables"
  | "notes"
  | "references"
  | "walkthroughs"
  | "workflow_tools"
  | "specialties"
  | "repair_previous_turn"
  | "user_correction"
  | "source_check"
  | "procedure_count"
  | "what_can_you_do"
  | "fallback"

interface AssistantIntent {
  id: AssistantIntentId
  confidence: number
  entities?: Record<string, string>
}

type AssistantResponseMode =
  | "ANSWER_IN_CHAT"
  | "SHOW_OPTIONS"
  | "SHOW_CARD"
  | "SHOW_TABLE"
  | "SHOW_LAUNCHER"
  | "ASK_CONSTRAINED_CLARIFICATION"
  | "REPAIR_PREVIOUS_TURN"
  | "REFUSE_UNGROUNDED"

/** Minimum confidence required to act on an intent rather than falling back */
const CONFIDENCE_THRESHOLD = 0.55

interface GroundingDecision {
  domain?: string
  specialty?: string
  procedureId?: string
  procedureName?: string
  entityKind?: "procedure" | "system" | "component" | "product"
  entityLabel?: string
  source: "fixed_data" | "authored_card" | "catalogue" | "heuristic"
  confidence: number
  ambiguity: "none" | "low" | "high"
  multipleOptions?: Array<{
    id: string
    label: string
    kind: "procedure" | "system" | "component" | "product"
    href?: string
  }>
  rejectedReason?: string
}

interface AssistantEvidence {
  context: AssistantContext
  entityDefinition?: {
    label: string
    kind: "system" | "component" | "product" | "procedure"
    description: string
  }
  procedureName?: string
  disambiguationKind?: "approach" | "system"
  disambiguationTarget?: string
  narrativeText?: string
  stats?: AssistantStat[]
  table?: AssistantTable
  sizeFocus?: string
  browseLabel?: string
  actions?: AssistantAction[]
  chips?: string[]
  matchedProcedures?: Array<{
    id: string
    name: string
    specialty: string
    setting: string
    sectionsCount: number
    fixedCount: number
    editableCount: number
    implantSystem?: string
    href: string
  }>
  variantChoices?: Array<{
    id: string
    label: string
    description?: string
    href: string
  }>
  specialtyCount?: number
  launcher?: {
    title: string
    items: AssistantLauncherItem[]
  }
  walkthroughs?: {
    title: string
    items: MockWalkthrough[]
  }
  compactCard?: {
    title: string
    meta: string
    summary?: string
    checklist: string[]
    href?: string
  }
}

interface AssistantResponsePlan {
  leadIn: string
  text?: string
  entityDefinition?: {
    label: string
    kind: "system" | "component" | "product" | "procedure"
    description: string
  }
  procedureName?: string
  disambiguationKind?: "approach" | "system"
  disambiguationTarget?: string
  narrativeText?: string
  table?: AssistantTable
  stats?: AssistantStat[]
  actions?: AssistantAction[]
  chips?: string[]
  matchedProcedures?: Array<{
    id: string
    name: string
    specialty: string
    setting: string
    sectionsCount: number
    fixedCount: number
    editableCount: number
    implantSystem?: string
    href: string
  }>
  variantChoices?: Array<{
    id: string
    label: string
    description?: string
    href: string
  }>
  launcher?: {
    title: string
    items: AssistantLauncherItem[]
  }
  walkthroughs?: {
    title: string
    items: MockWalkthrough[]
  }
  compactCard?: {
    title: string
    meta: string
    summary?: string
    checklist: string[]
    href?: string
  }
}

type ResolvedProcedure = ReturnType<typeof findProcedureMatch> | undefined

function getAllProcedures(): Procedure[] {
  return getProcedureLibrarySnapshot()
}

// ─────────────────────────────────────────────
// TERM LISTS — expanded to cover all natural-language permutations
// ─────────────────────────────────────────────

const GREETING_TERMS = [
  "hello", "hi", "hey", "hiya", "hiya!", "yo", "sup", "what's up", "whats up",
  "good morning", "good afternoon", "good evening", "good day", "morning",
  "afternoon", "evening", "howdy", "greetings", "salutations", "hi there",
  "hey there", "hello there", "alright", "alright?", "hey prep", "hi prep",
]

const THANKS_TERMS = [
  "thanks", "thank you", "thank you so much", "thank you very much",
  "cheers", "appreciate it", "appreciated", "many thanks", "much appreciated",
  "ta", "brilliant thanks", "great thanks", "perfect thanks", "lovely thanks",
  "helpful thanks", "that's helpful", "that was helpful", "that was great",
  "that's great", "nice one", "legend", "perfect", "brilliant", "lovely",
  "ace", "brill", "top", "excellent thanks", "amazing thanks", "fab", "fabulous",
  "wonderful", "wonderful thanks", "superb", "you're a star", "you're great",
  "thanks a lot", "thanks a bunch", "thanks a million", "big thanks",
]

const STATUS_TERMS = [
  "how are you", "how's it going", "how are things", "you alright", "you okay",
  "how are you doing", "how do you do", "how's everything", "you good",
  "are you well", "how you doing", "all good", "how's prep", "you well",
  "you there", "are you there", "anyone there", "still there",
]

const COMPLIMENT_TERMS = [
  "you're amazing", "you are amazing", "you're brilliant", "you are brilliant",
  "you're clever", "you are clever", "you're smart", "you are smart",
  "you're helpful", "you are helpful", "you're great", "you are great",
  "love this", "love it", "this is great", "this is brilliant", "this is amazing",
  "this is useful", "this is helpful", "really helpful", "very helpful",
  "incredibly helpful", "so useful", "very useful", "impressive", "well done",
  "good job", "nice work", "great work", "excellent work",
]

const HELP_META_TERMS = [
  "help", "how do i use this", "how does this work", "what can i ask",
  "how do i ask", "what do i say", "give me a hint", "give me some examples",
  "show me examples", "what are some examples", "i don't know what to ask",
  "i dont know what to ask", "where do i start", "how do i start",
  "getting started", "get started", "how does prep work", "how does the assistant work",
  "what should i ask", "any suggestions", "tips", "hint", "hints",
]

const CONFUSED_TERMS = [
  "i'm confused", "im confused", "i am confused", "confused", "i don't understand",
  "i dont understand", "don't understand", "dont understand", "what do you mean",
  "what does that mean", "not sure what to do", "not sure", "lost",
  "i'm lost", "im lost", "what now", "now what", "where am i",
  "what is this", "what's going on", "what is going on",
]

const FRUSTRATION_TERMS = [
  "what", "what?", "what??", "huh", "huh?",
  "you dont know what i am talking about",
  "you don't know what i am talking about",
  "you have no idea", "you don't have a clue",
  "this is dumb", "this is stupid", "this is so dumb", "this is so stupid",
  "that is wrong", "that's wrong", "that was wrong", "that isn't right",
  "that's not right", "not helpful", "not very helpful", "useless",
  "this is useless", "terrible", "awful", "rubbish", "nonsense",
  "that makes no sense", "doesn't make sense", "makes no sense",
  "wrong answer", "completely wrong", "totally wrong", "that's incorrect",
  "that is incorrect", "nope", "no that's wrong", "no that is wrong",
  "ugh", "argh", "come on", "seriously", "really?",
]

const CORRECTION_TERMS = [
  "no i meant", "no, i meant", "i meant", "not that", "wrong one",
  "wrong procedure", "wrong system", "wrong card", "stay on", "not that one",
  "i was asking about", "i meant to say", "i was talking about",
  "no not that", "that's not what i meant", "that isn't what i meant",
  "go back to", "back to", "return to", "keep it on", "stick with",
  "i said", "no i said", "i meant the other", "the other one",
  "no the other", "different one", "different procedure", "different card",
  "try again", "not quite", "close but", "almost but",
]

const SOURCE_CHECK_TERMS = [
  "where did that come from", "is that from the card", "is that from the catalogue",
  "is that grounded", "are you sure", "what source", "what is the source",
  "where is that from", "is that accurate", "is that correct", "can you verify",
  "how do you know", "where does that come from", "what's your source",
  "is that real", "is that up to date", "how current is that",
  "can i trust that", "is that reliable", "double check", "double-check",
  "check that", "verify that", "confirm that", "is that confirmed",
  "sourced from", "based on what", "what data", "which data",
]

const PREPARE_TERMS = [
  "prepare", "prep", "get ready", "set up", "setup", "get set up",
  "preparing for", "prepare for", "prep for", "ready for", "getting ready for",
  "setting up for", "what do i need for", "what do we need for",
  "what's needed for", "whats needed for", "what to prepare", "how to prepare",
  "how do i prepare", "how do we prepare", "what should i prepare",
  "pre-op", "preop", "pre op", "before the case", "before surgery",
  "case prep", "theatre prep", "surgical prep", "getting prepared",
  "start preparing", "start prep", "begin prep", "begin preparing",
  "build the card", "pull up the card", "open the card",
]

const COMPARE_TERMS = [
  "compare", "comparison", "difference", "differences", "vs", "versus",
  "which is better", "whats the difference", "what's the difference",
  "contrast", "side by side", "side-by-side", "how do they differ",
  "how are they different", "same as", "similar to", "compared to",
  "against", "both", "either", "pros and cons", "pros cons",
  "choose between", "deciding between", "difference between", "differ",
]

const SUMMARY_TERMS = [
  "where am i", "what page", "what am i looking at", "summaris", "summary",
  "summarize", "what's on this card", "what is on this card",
  "what did i just talk about", "what did i just talked about",
  "what were we talking about", "give me a summary", "give me a quick summary",
  "quick summary", "overview", "give me an overview", "what's here",
  "whats here", "what's on here", "brief", "brief summary", "recap",
  "quick recap", "rundown", "quick rundown", "gist", "the gist",
  "bottom line", "in a nutshell", "nutshell", "tldr", "tl;dr",
  "sum up", "sum it up", "summarise this", "summarize this",
  "describe this", "what does this cover", "what's covered",
  "tell me what's here", "explain this page",
]

const EXPLAIN_TERMS = [
  "what is", "tell me about", "explain", "talk me through", "quick read",
  "give me a quick read", "overview of", "describe", "what are", "what's",
  "what does", "how does", "how do", "define", "definition of",
  "meaning of", "what does it mean", "tell me more", "tell me more about",
  "more about", "more on", "expand on", "elaborate", "elaborate on",
  "break down", "break it down", "walk me through", "talk through",
  "fill me in", "fill me in on", "catch me up", "catch me up on",
  "educate me", "teach me", "teach me about", "learn about",
  "i want to know about", "what should i know about",
]

const VISUAL_TERMS = [
  "show visually", "visual", "dashboard", "overview", "visualise", "visualize",
  "show me visually", "graphical", "graphic", "diagram", "chart",
  "at a glance", "at-a-glance", "snapshot", "quick view", "quick look",
  "bird's eye", "birds eye", "high level", "high-level view",
]

const NAVIGATION_VERBS = [
  "take me", "open", "go to", "show me", "bring me", "jump to",
  "navigate to", "navigate", "take me to", "bring me to", "take me there",
  "get me to", "get me there", "send me to", "redirect me", "move to",
  "head to", "go there", "get there", "i want to go to", "i want to open",
  "i want to see", "i need to go to", "switch to", "switch me to",
  "change to", "load", "launch", "pull up",
]

const CATALOGUE_TERMS = [
  "catalogue", "catalog", "sku", "supplier", "product", "product code",
  "product codes", "cement", "cements", "stock", "inventory", "item",
  "items", "part number", "part no", "barcode", "ref", "reference number",
  "supplier ref", "supplier code", "order code", "order number",
  "catalogue number", "cat no", "find product", "search product",
  "look up product", "lookup product", "check stock", "check product",
  "product search", "catalogue search", "find in catalogue",
  "search the catalogue", "search catalogue", "find in catalog",
]

const IMPLANT_TERMS = [
  "implant", "implants", "prosthesis", "prostheses", "prosthetic", "prosthetics",
  "arthroplasty", "replacement", "component", "components", "fixation",
  "nail", "nails", "screw", "screws", "plate", "plates", "rod", "rods",
  "stem", "stems", "cup", "cups", "liner", "liners", "head", "heads",
  "insert", "inserts", "glenoid", "humeral", "acetabular", "femoral",
  "tibial", "patellar", "bearing", "bearings", "augment", "augments",
  "anchor", "anchors", "what implants", "which implants", "implant list",
  "implant details", "implant info", "implant information",
  "prosthetic components", "implant components",
]

const SYSTEM_TERMS = [
  "system", "systems", "what systems", "which systems", "available systems",
  "what systems are there", "prosthetic", "implant system", "implant systems",
  "which system", "what system", "system options", "system choices",
  "what are the systems", "list systems", "show systems",
  "available implant systems", "supported systems", "compatible systems",
]

const SIZE_TERMS = [
  "implant size", "implant sizes", "sizes", "size ladder", "trials",
  "sizing", "size range", "size options", "what sizes", "which sizes",
  "available sizes", "size run", "size chart", "sizing guide",
  "prep ladder", "sizing ladder", "trial sizes", "size selection",
  "size up", "sizing up", "size check", "check sizes",
]

const MISSING_TERMS = [
  "missing", "miss", "not have", "dont have", "don't have", "without",
  "gap", "gaps", "left out", "not here", "not there", "absent",
  "unavailable", "not available", "not in stock", "out of stock",
  "lacking", "lack", "incomplete", "what's missing", "whats missing",
  "what is missing", "what are we missing", "what are we short of",
  "short of", "short on", "running low", "do we have", "have we got",
  "got the", "do we have all", "have we got all", "check gaps",
  "what gaps", "identify gaps",
]

const TRAY_TERMS = [
  "tray", "trays", "instrument", "instruments", "sets", "instrument set",
  "instrument sets", "instrument tray", "instrument trays", "set list",
  "what trays", "which trays", "tray list", "tray contents",
  "what instruments", "which instruments", "instrument list",
  "surgical instruments", "theatre instruments", "show trays",
  "tray setup", "instrument setup", "set up trays",
  "what sets", "which sets", "set contents", "surgical sets",
  "what's on the tray", "whats on the tray", "list trays",
]

const CONSUMABLE_TERMS = [
  "consumable", "consumables", "drape", "drapes", "ppe", "personal protective",
  "medication", "medications", "fluids", "fluid", "dressing", "dressings",
  "suture", "sutures", "staples", "skin closure", "wound closure",
  "swab", "swabs", "gauze", "syringe", "syringes", "needle", "needles",
  "gloves", "gown", "gowns", "sterile", "supplies", "supply",
  "consumable list", "consumables list", "disposables", "disposable",
  "what consumables", "which consumables", "show consumables",
  "list consumables", "consumables needed", "consumable requirements",
  "what supplies", "which supplies", "supply list",
]

const NOTES_TERMS = [
  "notes", "nurse notes", "prep notes", "local notes", "nursing notes",
  "theatre notes", "prep note", "note", "clinical notes", "team notes",
  "local prep", "local information", "local info", "local guidance",
  "local instructions", "specific notes", "special notes",
  "any notes", "are there notes", "show notes", "what are the notes",
  "what notes", "which notes", "note section", "notes section",
  "nurse prep", "scrub notes", "circulating notes",
]

const REFERENCE_TERMS = [
  "references", "reference", "operative reference", "technique guide",
  "implant guide", "surgical guide", "technique", "guide", "guides",
  "surgical technique", "operative technique", "how to", "how is it done",
  "how it's done", "link", "links", "document", "documents",
  "resource", "resources", "source", "sources", "external link",
  "external links", "ifu", "instructions for use", "package insert",
  "data sheet", "spec sheet", "specification", "specifications",
  "show references", "list references", "what references",
  "reference material", "reading material", "further reading",
]

const WALKTHROUGH_TERMS = [
  "walkthrough", "walkthroughs", "video", "videos", "show videos",
  "show walkthroughs", "watch", "footage", "clip", "clips",
  "media", "multimedia", "animation", "animations",
  "surgical video", "surgical videos", "technique video", "technique videos",
  "procedural video", "play video", "show video", "any videos",
  "are there videos", "any walkthroughs", "are there walkthroughs",
  "training video", "training videos", "demonstration", "demo",
  "watch the procedure", "how is it performed", "see it done",
]

const WORKFLOW_TERMS = [
  "workflow", "workflow tools", "toolset", "working set", "working tools",
  "tool", "tools", "utilities", "what tools", "which tools",
  "show tools", "open tools", "list tools", "available tools",
  "what can i do here", "what's available", "whats available",
  "what options do i have", "what are the options",
  "functional tools", "workspace tools", "platform tools",
]

const SPECIALTY_TERMS = [
  "specialt", "specialism", "specialisms", "areas", "browse here",
  "specialty", "specialties", "subspecialty", "subspecialties",
  "disciplines", "discipline", "fields", "field", "department", "departments",
  "what specialties", "which specialties", "available specialties",
  "list specialties", "show specialties", "browse specialties",
  "what's available", "what areas", "which areas", "available areas",
  "what departments", "which departments",
]

const BROWSE_PROCEDURE_TERMS = [
  "what procedures", "which procedures", "procedures do we have",
  "show procedures", "procedure list", "what cards", "cards do we have",
  "show me the cards", "show cards", "list cards", "all procedures",
  "all cards", "browse procedures", "browse cards", "available procedures",
  "available cards", "what's in the library", "whats in the library",
  "library contents", "what procedures are there", "list procedures",
  "procedure catalogue", "card library", "show the library",
  "open the library", "see all procedures", "view all procedures",
  "what do we have", "what have we got", "show everything",
  "what's here", "what procedures have been set up",
  "what procedures do you have", "what cards do you have",
]

const PROCEDURE_COUNT_TERMS = [
  "how many procedures", "how many cards", "how many have we got",
  "how many do we have", "count of procedures", "number of procedures",
  "total procedures", "total cards", "how many are there",
  "how many procedures are there", "how many cards are there",
  "count procedures", "count cards",
]

const WHAT_CAN_YOU_DO_TERMS = [
  "what can you do", "what do you do", "what are you for",
  "what is your purpose", "what's your purpose", "what are your capabilities",
  "capabilities", "what can i ask you", "how can you help",
  "how can you help me", "what help can you give", "what sort of help",
  "what kind of help", "how do you work", "what are you",
  "tell me what you can do", "explain what you can do",
  "what do you know", "what do you know about", "your features",
  "feature list", "what features", "abilities", "what abilities",
]

const FILLER_TERMS = [
  "can you", "could you", "would you", "please", "hey", "just",
  "show me", "tell me", "let me", "i want", "i need", "i'd like",
  "i would like", "i wish to", "i want to", "can we", "could we",
  "shall we", "should we", "let's", "lets", "how about", "what about",
  "maybe", "perhaps", "possibly", "kindly", "quickly", "asap",
  "urgently", "right now", "now", "immediately",
]

const PROCEDURE_MATCH_STOP_WORDS = new Set([
  "what", "is", "show", "open", "explain", "tell", "about", "give",
  "quick", "read", "overview", "summary", "summarise", "summarize",
  "prepare", "prep", "notes", "note", "references", "reference",
  "guide", "guides", "implant", "implants", "sizes", "size",
  "trays", "tray", "consumables", "consumable", "supplies", "supply",
  "videos", "video", "walkthroughs", "walkthrough", "for", "the",
  "a", "an", "card", "procedure", "case", "today", "todays",
  "do", "does", "did", "has", "have", "had", "are", "is", "was",
  "were", "be", "been", "being", "get", "got", "getting",
  "can", "could", "would", "should", "shall", "will", "may", "might",
  "please", "just", "me", "we", "us", "you", "they", "them",
  "this", "that", "these", "those", "it", "its",
  "there", "here", "where", "when", "how", "why", "which", "who",
])

// ─────────────────────────────────────────────
// BROWSE SCOPES
// ─────────────────────────────────────────────

interface BrowseScope {
  label: string
  serviceLineIds: Set<string>
  anatomyIds: Set<string>
}

const BROWSE_SCOPES: BrowseScope[] = (() => {
  const merged = new Map<string, BrowseScope>()

  for (const specialty of SETTING_SPECIALTIES["Operating Theatre"] ?? []) {
    const specialtyId = getOperatingTheatreSpecialtyIdByLabel(specialty)
    if (!specialtyId) continue

    for (const serviceLine of getServiceLinesForSpecialty(specialtyId)) {
      const anatomyRows = getAnatomyForServiceLine(serviceLine.id)
      const lineKey = normalize(serviceLine.name)
      const lineScope = merged.get(lineKey) ?? {
        label: serviceLine.name,
        serviceLineIds: new Set<string>(),
        anatomyIds: new Set<string>(),
      }
      lineScope.serviceLineIds.add(serviceLine.id)
      for (const anatomy of anatomyRows) {
        for (const descendantId of getDescendantAnatomyIds(anatomy.id)) {
          lineScope.anatomyIds.add(descendantId)
        }
      }
      merged.set(lineKey, lineScope)

      for (const anatomy of anatomyRows) {
        const anatomyKey = normalize(anatomy.name)
        const anatomyScope = merged.get(anatomyKey) ?? {
          label: anatomy.name,
          serviceLineIds: new Set<string>(),
          anatomyIds: new Set<string>(),
        }
        anatomyScope.serviceLineIds.add(serviceLine.id)
        for (const descendantId of getDescendantAnatomyIds(anatomy.id)) {
          anatomyScope.anatomyIds.add(descendantId)
        }
        merged.set(anatomyKey, anatomyScope)
      }
    }
  }

  return Array.from(merged.values())
})()

// ─────────────────────────────────────────────
// TEXT UTILITIES
// ─────────────────────────────────────────────

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s/]/g, " ")
    .replace(/\s+/g, " ")
}

function normalizeForIntent(value: string): string {
  let normalized = normalize(value)
  for (const filler of FILLER_TERMS) {
    // Use word-boundary safe replacement to avoid corrupting meaningful words
    const escapedFiller = filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    normalized = normalized.replace(new RegExp(`(?<![\\w])${escapedFiller}(?![\\w])`, "gi"), " ")
  }
  return normalized
    .replace(/\s+/g, " ")
    .trim()
}

function hasCatalogueProductHint(prompt: string): boolean {
  return hasResolvableCatalogueProduct(prompt)
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function includesAny(query: string, terms: string[]): boolean {
  return terms.some((term) => {
    const normalizedTerm = normalizeForIntent(term)
    if (!normalizedTerm) return false
    if (normalizedTerm.includes(" ")) {
      return query.includes(normalizedTerm)
    }
    const pattern = new RegExp(`\\b${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)
    return pattern.test(query)
  })
}

function isFrustrationPrompt(prompt: string): boolean {
  const query = normalizeForIntent(prompt)
  if (!query) return false
  return includesAny(query, FRUSTRATION_TERMS)
}

function isCorrectionPrompt(prompt: string): boolean {
  const query = normalizeForIntent(prompt)
  if (!query) return false
  return includesAny(query, CORRECTION_TERMS)
}

function isSourceCheckPrompt(prompt: string): boolean {
  const query = normalizeForIntent(prompt)
  if (!query) return false
  return includesAny(query, SOURCE_CHECK_TERMS)
}

function getActiveDomain(context: AssistantContext, carry?: AssistantCarryContext): string | undefined {
  return carry?.specialty ?? context.specialty ?? context.setting
}

function isOrthopaedicDomain(domain?: string): boolean {
  const normalized = normalize(domain ?? "")
  return normalized.includes("orthopaed") || normalized.includes("ortho") || normalized.includes("trauma")
}

function isCandidateDomainCompatible(
  context: AssistantContext,
  carry: AssistantCarryContext | undefined,
  candidate?: { specialty?: string; setting?: string },
): boolean {
  if (!candidate) return true
  const activeDomain = getActiveDomain(context, carry)
  if (!activeDomain) return true
  if (isOrthopaedicDomain(activeDomain)) {
    const candidateText = normalize([candidate.specialty, candidate.setting].filter(Boolean).join(" "))
    if (!candidateText) return true
    return candidateText.includes("orthopaed") || candidateText.includes("ortho") || candidateText.includes("trauma")
  }
  return true
}

function levenshteinDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i += 1) dp[i]![0] = i
  for (let j = 0; j <= b.length; j += 1) dp[0]![j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost)
    }
  }
  return dp[a.length]![b.length] ?? 0
}

function hasApproximateWord(query: string, target: string, maxDistance = 2): boolean {
  const words = query.split(/\s+/).filter(Boolean)
  if (target.length <= 3) {
    return words.some((word) => word === target)
  }
  return words.some((word) => {
    if (word.length < 3) return false
    if (word.includes(target) || target.includes(word)) return true
    return levenshteinDistance(word, target) <= maxDistance
  })
}

function hashText(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function pickVariant(options: string[], seed: string): string {
  if (options.length === 0) return ""
  return options[hashText(seed) % options.length] ?? options[0] ?? ""
}

type PromptTone = "direct" | "tentative" | "neutral" | "frustrated" | "curious"

function getPromptTone(prompt: string): PromptTone {
  const normalized = normalizeForIntent(prompt)

  if (isFrustrationPrompt(prompt)) return "frustrated"

  if (/(maybe|perhaps|i wonder|could you|can you|would you|shall we|should we|would it|could it|i was thinking|might you)/.test(normalized)) {
    return "tentative"
  }

  if (/(what is|what are|tell me about|explain|how does|how do|i want to know|curious|interested in)/.test(normalized)) {
    return "curious"
  }

  if (/(show|open|take me|bring up|find|compare|prepare|summaris|explain|give me|pull|check|list|get me)/.test(normalized)) {
    return "direct"
  }

  return "neutral"
}

// ─────────────────────────────────────────────
// CARD / SECTION BUILDERS
// ─────────────────────────────────────────────

function buildCompactChecklist(sections: Section[] | undefined): string[] {
  const labels: string[] = []

  for (const section of sections ?? []) {
    const itemCount = section.items.length

    switch (section.sectionType) {
      case "overview":
        if (section.summary || section.duration || section.anaesthesiaType) {
          labels.push("Overview and case framing")
        }
        break
      case "patient_positioning":
        labels.push("Positioning instructions ready")
        break
      case "instrument_sets_trays":
        labels.push(itemCount > 0 ? `${itemCount} tray items surfaced` : "Tray setup surfaced")
        break
      case "implants_prosthetics":
        labels.push(itemCount > 0 ? `${itemCount} implant lines surfaced` : "Implant setup surfaced")
        break
      case "consumables_supplies":
        labels.push(itemCount > 0 ? `${itemCount} consumables listed` : "Consumables section ready")
        break
      case "medications_fluids":
        labels.push(itemCount > 0 ? `${itemCount} medication or fluid lines listed` : "Medication support listed")
        break
      case "nurse_prep_notes":
        if (section.nurseNotes) labels.push("Local prep notes included")
        break
      case "procedure_reference":
        if (section.operativeTechniqueUrl || section.implantGuideUrl || (section.externalLinks?.length ?? 0) > 0) {
          labels.push("Reference links attached")
        }
        break
      default:
        if (labels.length < 3 && section.title) {
          labels.push(section.title)
        }
        break
    }

    if (labels.length >= 3) break
  }

  return labels.slice(0, 3)
}

function buildCompactCardSummary(sections: Section[] | undefined): string | undefined {
  const overview = sections?.find((section) => section.sectionType === "overview")
  if (overview?.summary) return overview.summary

  const nurseNotes = sections?.find((section) => section.sectionType === "nurse_prep_notes")
  if (nurseNotes?.nurseNotes) {
    return nurseNotes.nurseNotes.split(/\r?\n/)[0]?.trim() || undefined
  }

  const reference = sections?.find((section) => section.sectionType === "procedure_reference")
  if (reference?.items[0]?.description) return reference.items[0].description

  return undefined
}

function buildReferenceTable(section: Section | undefined, title = "Operative references"): AssistantTable | undefined {
  if (!section) return undefined

  const rows: string[][] = []
  if (section.operativeTechniqueUrl) rows.push(["Operative technique", section.operativeTechniqueUrl, "Primary source"])
  if (section.implantGuideUrl) rows.push(["Implant guide", section.implantGuideUrl, "System reference"])
  for (const link of section.externalLinks ?? []) {
    rows.push([link.label, link.url, "External link"])
  }

  if (rows.length === 0) return undefined

  return {
    title,
    columns: ["Reference", "Link", "Type"],
    rows,
  }
}

function buildNotesExcerpt(section: Section | undefined): string | undefined {
  if (!section?.nurseNotes) return undefined
  return section.nurseNotes.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 2).join(" ")
}

function getScopedProcedureExamples(context: AssistantContext, count = 3) {
  const available = getAllProcedures().filter((procedure) => hasVariantsForProcedure(procedure.id) || procedure.sections.length > 0)
  let scoped = available

  if (context.setting) {
    const narrowed = scoped.filter((procedure) => procedure.setting === context.setting)
    if (narrowed.length > 0) scoped = narrowed
  }

  if (context.specialty) {
    const narrowed = scoped.filter((procedure) => procedure.specialty === context.specialty)
    if (narrowed.length > 0) scoped = narrowed
  }

  const anatomyId = (context as AssistantContext & { anatomy?: string; anatomyId?: string }).anatomyId
  const serviceLineId = (context as AssistantContext & { serviceLineId?: string }).serviceLineId

  if (anatomyId) {
    const allowed = new Set([anatomyId, ...getDescendantAnatomyIds(anatomyId)])
    const narrowed = scoped.filter((procedure) => {
      const procedureAnatomy = (procedure as typeof procedure & { anatomy_id?: string }).anatomy_id
      return procedureAnatomy ? allowed.has(procedureAnatomy) : false
    })
    if (narrowed.length > 0) scoped = narrowed
  } else if (serviceLineId) {
    const narrowed = scoped.filter((procedure) => {
      const procedureServiceLine = (procedure as typeof procedure & { service_line_id?: string }).service_line_id
      return procedureServiceLine === serviceLineId
    })
    if (narrowed.length > 0) scoped = narrowed
  }

  const unique = new Map<string, typeof scoped[number]>()
  for (const procedure of scoped) {
    if (!unique.has(procedure.name)) {
      unique.set(procedure.name, procedure)
    }
  }

  return Array.from(unique.values()).slice(0, count)
}

function buildProcedureHintChips(
  kind: "prepare" | "summary" | "trays" | "consumables" | "implants" | "missing_sizes" | "implant_sizes" | "notes" | "references" | "walkthroughs",
  context?: AssistantContext,
): string[] {
  const scoped = context ? getScopedProcedureExamples(context) : []
  const examples = scoped.length > 0 ? scoped.map((procedure) => procedure.name) : ["hemiarthroplasty", "THR", "DHS fixation"]

  const first = examples[0] ?? "hemiarthroplasty"
  const second = examples[1] ?? "THR"
  const third = examples[2] ?? "DHS fixation"

  switch (kind) {
    case "prepare":
      return [`Prepare ${first}`, `Prepare ${second}`, `Prepare ${third}`]
    case "summary":
      return [`Summarise ${first}`, `What is ${second}`, `Explain ${third}`]
    case "trays":
      return [`Show trays for ${first}`, `${second} tray list`, `${third} trays`]
    case "consumables":
      return [`Show consumables for ${first}`, `${second} consumables`, `${third} supplies`]
    case "implants":
      return [`Show implants for ${first}`, `${second} implants`, `${third} implants`]
    case "missing_sizes":
      return [`What sizes are we missing for ${first}`, `Missing femoral sizes for ${second}`, `What implant sizes are missing for ${third}`]
    case "implant_sizes":
      return [`Show implant sizes for ${first}`, `${second} implant sizes`, `${third} sizing ladder`]
    case "notes":
      return [`Show notes for ${first}`, `${second} nurse notes`, `${third} prep notes`]
    case "references":
      return [`Show references for ${first}`, `${second} references`, `${third} operative guide`]
    case "walkthroughs":
      return [`Show walkthroughs for ${first}`, `Show ${second} videos`, `${third} walkthroughs`]
    default:
      return []
  }
}

function buildBrowsePromptChips(context: AssistantContext): string[] {
  if (context.anatomy) {
    return [
      `What procedures do we have for ${context.anatomy}?`,
      `Show ${context.anatomy} procedures`,
      `Take me to ${context.anatomy}`,
    ]
  }

  if (context.serviceLine) {
    return [
      `What procedures do we have for ${context.serviceLine}?`,
      `Show ${context.serviceLine} procedures`,
      `Take me to ${context.serviceLine}`,
    ]
  }

  if (context.specialty) {
    const examples = getScopedProcedureExamples(context, 2)
    return [
      `Show ${context.specialty}`,
      `What procedures do we have for ${context.specialty}?`,
      examples[0] ? `Prepare ${examples[0].name}` : "Prepare hemiarthroplasty",
    ]
  }

  if (context.setting) {
    return ["Show specialties", "Open workflow tools", "Browse the operating theatre workspace"]
  }

  return ["Show specialties", "Open workflow tools", "What procedures do we have for knee?"]
}

function buildFallbackChips(context: AssistantContext): string[] {
  if (context.pageKind === "card") {
    return ["Summarise this card", "Show trays", "Show references", "Show walkthroughs"]
  }

  if (context.pageKind === "catalogue") {
    return ["Open catalogue", "Find hip implants", "Show supplier items", "Make a table"]
  }

  return buildBrowsePromptChips(context)
}

function buildWhatCanYouDoChips(context: AssistantContext): string[] {
  const base = ["Show procedures", "Prepare a case", "Compare two procedures", "Find a product"]
  if (context.pageKind === "card") {
    return ["Show trays", "Show implants", "Show notes", "Show references", "Show walkthroughs"]
  }
  return base
}

// ─────────────────────────────────────────────
// PROCEDURE MATCHING UTILITIES
// ─────────────────────────────────────────────

function buildProcedureAliases(procedure: {
  id: string
  familyId?: string
  name: string
  specialty?: string
  setting?: string
  aliases?: string[]
  approach?: string
  variantLabel?: string
  implantSystem?: string
}): string[] {
  const aliases = new Set<string>()
  const add = (value?: string) => {
    if (!value) return
    const trimmed = value.trim()
    if (trimmed) aliases.add(trimmed)
  }

  add(procedure.id)
  add(procedure.familyId)
  add(procedure.name)
  add(procedure.approach)
  add(procedure.variantLabel)
  add(procedure.implantSystem)
  for (const alias of procedure.aliases ?? []) add(alias)

  const normalizedName = normalize(procedure.name)
  const normalizedId = normalize(procedure.id)
  const normalizedFamily = normalize(procedure.familyId ?? "")
  const normalizedVariant = normalize(procedure.variantLabel ?? "")
  const normalizedSystem = normalize(procedure.implantSystem ?? "")

  if (normalizedId === "dhs" || normalizedName.includes("dynamic hip screw")) {
    add("dhs"); add("dynamic hip screw"); add("hip screw")
  }
  if (normalizedId === "ukr" || normalizedName.includes("unicompartmental knee replacement")) {
    add("ukr"); add("uni knee replacement"); add("partial knee replacement")
    add("unicompartmental knee"); add("half knee replacement")
  }
  if (normalizedId === "tkr" || normalizedName.includes("total knee replacement")) {
    add("tkr"); add("total knee replacement"); add("knee replacement")
    add("knee arthroplasty"); add("total knee arthroplasty")
  }
  if (normalizedId === "thr-posterior" || normalizedFamily.includes("total-hip-replacement") || normalizedName.includes("total hip replacement")) {
    add("thr"); add("total hip replacement"); add("hip replacement")
    add("hip arthroplasty"); add("total hip arthroplasty")
  }
  if (normalizedName.includes("hemiarthroplasty")) {
    add("hemi"); add("hip hemi"); add("hemiarthroplasty")
    add("hip hemiarthroplasty"); add("partial hip replacement")
    add("partial hip"); add("Austin Moore"); add("thompson")
  }
  if (normalizedId === "im-nail-femur" || normalizedName.includes("im nail")) {
    add("im nail"); add("femoral nail"); add("femur nail")
    add("intramedullary nail"); add("intramedullary nailing"); add("imn")
  }
  if (normalizedName.includes("pfna") || normalizedVariant.includes("pfna") || normalizedSystem.includes("pfna")) {
    add("pfna"); add("proximal femoral nail"); add("proximal femoral nail antirotation")
  }
  if (normalizedName.includes("distal radius")) {
    add("drrf"); add("distal radius fixation"); add("distal radius orif")
    add("wrist fixation"); add("radius orif"); add("orif wrist")
  }
  if (normalizedName.includes("total shoulder replacement") || normalizedName.includes("shoulder arthroplasty")) {
    add("tsa"); add("total shoulder arthroplasty"); add("shoulder replacement")
  }
  if (normalizedName.includes("reverse shoulder") || normalizedName.includes("reverse total shoulder")) {
    add("rtsa"); add("reverse shoulder arthroplasty"); add("reverse tsa")
    add("reverse total shoulder")
  }
  if (normalizedName.includes("ankle replacement") || normalizedName.includes("ankle arthroplasty")) {
    add("tar"); add("total ankle replacement"); add("ankle arthroplasty")
  }
  if (normalizedName.includes("acl") || normalizedName.includes("anterior cruciate")) {
    add("acl"); add("acl reconstruction"); add("acl repair")
    add("anterior cruciate ligament")
  }
  if (normalizedName.includes("spinal") || normalizedName.includes("spine") || normalizedName.includes("lumbar") || normalizedName.includes("cervical")) {
    add("spinal fusion"); add("spine surgery"); add("decompression")
  }

  return [...aliases]
}

function buildCompactCardMeta(args: {
  setting?: string
  specialty?: string
  variantName?: string
  systemName?: string
}): string {
  return [args.setting, args.specialty, args.variantName ?? args.systemName].filter(Boolean).join(" · ")
}

function promptMentionsVariantDetail(prompt: string, procedure: {
  variantLabel?: string
  approach?: string
  implantSystem?: string
}, variants: VariantWithSystems[]): boolean {
  const query = normalizeForIntent(prompt)
  const candidates = [
    procedure.variantLabel,
    procedure.approach,
    procedure.implantSystem,
    ...variants.flatMap((variant) => [variant.name, variant.approach, variant.description]),
    ...variants.flatMap((variant) => variant.systems.slice(0, 2).map((system) => system.name)),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalize(value))
    .filter((value) => value.length >= 4)

  return candidates.some((value) => query.includes(value))
}

function buildVariantChoicesForProcedure(procedure: {
  id: string
  name: string
  setting?: string
  specialty?: string
  variantLabel?: string
  approach?: string
  implantSystem?: string
}): Array<{
  id: string
  label: string
  description?: string
  href: string
}> {
  const variants = getCuratedVariantsForProcedureWithSystems(procedure.id, procedure.name)
  if (variants.length <= 1) return []

  return variants.slice(0, 6).map((variant) => ({
    id: variant.id,
    label: variant.name,
    description:
      variant.systems.length > 1
        ? `${variant.systems.length} systems available`
        : variant.systems[0]?.name ?? variant.description ?? undefined,
    href: `/procedures/${encodeURIComponent(procedure.id)}?variant=${encodeURIComponent(variant.id)}`,
  }))
}

function findMatchingProcedureVariant(
  prompt: string,
  procedure: { id: string; name: string },
): VariantWithSystems | undefined {
  const query = normalizeForIntent(prompt)
  if (!query) return undefined

  const variants = getCuratedVariantsForProcedureWithSystems(procedure.id, procedure.name)
  let bestMatch: VariantWithSystems | undefined
  let bestScore = 0

  for (const variant of variants) {
    const candidates = [variant.name, variant.approach, variant.description]
      .filter((value): value is string => Boolean(value))
      .map((value) => normalize(value))
      .filter((value) => value.length >= 4)

    let score = 0
    for (const candidate of candidates) {
      if (query.includes(candidate)) score += 8
      const candidateWords = candidate.split(/\s+/).filter((word) => word.length >= 4)
      score += candidateWords.filter((word) => query.includes(word)).length * 2
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = variant
    }
  }

  return bestScore >= 4 ? bestMatch : undefined
}

function promptMentionsSystemDetail(prompt: string, variant: VariantWithSystems): boolean {
  const query = normalizeForIntent(prompt)
  const systemNames = variant.systems
    .map((system) => normalize(system.name))
    .filter((value) => value.length >= 3)

  return systemNames.some((value) => query.includes(value))
}

function buildSystemChoicesForVariant(
  procedure: { id: string },
  variant: VariantWithSystems,
): Array<{
  id: string
  label: string
  description?: string
  href: string
}> {
  return variant.systems.slice(0, 8).map((system) => ({
    id: system.id,
    label: system.name,
    description: system.supplier?.name ?? system.category ?? undefined,
    href: `/procedures/${encodeURIComponent(procedure.id)}?variant=${encodeURIComponent(variant.id)}&system=${encodeURIComponent(system.id)}`,
  }))
}

function buildProcedureDisambiguationEvidence(
  procedure: ResolvedProcedure,
  context: AssistantContext,
  prompt: string,
): Pick<AssistantEvidence, "context" | "procedureName" | "variantChoices" | "disambiguationKind" | "disambiguationTarget"> | undefined {
  if (!procedure) return undefined

  const curatedVariants = getCuratedVariantsForProcedureWithSystems(procedure.id, procedure.name)
  if (curatedVariants.length <= 1) return undefined

  const matchedVariant = findMatchingProcedureVariant(prompt, procedure)
  if (matchedVariant && matchedVariant.systems.length > 1 && !promptMentionsSystemDetail(prompt, matchedVariant)) {
    return {
      context,
      procedureName: procedure.name,
      disambiguationKind: "system",
      disambiguationTarget: matchedVariant.name,
      variantChoices: buildSystemChoicesForVariant(procedure, matchedVariant),
    }
  }

  if (!matchedVariant && !promptMentionsVariantDetail(prompt, procedure, curatedVariants)) {
    return {
      context,
      procedureName: procedure.name,
      disambiguationKind: "approach",
      variantChoices: buildVariantChoicesForProcedure(procedure),
    }
  }

  return undefined
}

function scoreProcedureMatch(query: string, candidate: {
  name: string
  aliases?: string[]
  specialty?: string
  setting?: string
}): number {
  const haystacks = [candidate.name, ...(candidate.aliases ?? [])]
    .map((value) => normalize(value))
    .filter(Boolean)

  let score = 0
  for (const haystack of haystacks) {
    if (query.includes(haystack)) score += 8
    if (haystack.includes(query)) score += 5

    const queryWords = query.split(/\s+/).filter(Boolean)
    for (const word of queryWords) {
      if (word.length < 3) continue
      if (haystack.includes(word)) score += 2
    }
  }

  if (candidate.aliases?.some((alias) => normalize(alias) === query)) {
    score += 10
  }

  return score
}

function extractProcedureTokens(value: string): string[] {
  return normalizeForIntent(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !PROCEDURE_MATCH_STOP_WORDS.has(token))
}

function findBrowseScope(prompt: string): BrowseScope | undefined {
  const query = normalizeForIntent(prompt)
  const queryWords = new Set(query.split(/\s+/).filter(Boolean))

  let bestScope: BrowseScope | undefined
  let bestScore = 0

  for (const scope of BROWSE_SCOPES) {
    const scopeTokens = normalize(scope.label).split(/\s+/).filter(Boolean)
    if (scopeTokens.length === 0) continue
    if (!scopeTokens.every((token) => queryWords.has(token))) continue

    const score = scopeTokens.length * 2 + (query.includes(normalize(scope.label)) ? 1 : 0)
    if (score > bestScore) {
      bestScope = scope
      bestScore = score
    }
  }

  return bestScope
}

function findSpecialtyMention(prompt: string, context: AssistantContext): string | undefined {
  const query = normalizeForIntent(prompt)
  const queryWords = query.split(/\s+/).filter(Boolean)
  const meaningfulQueryWords = queryWords.filter((word) => (
    word.length >= 4 &&
    !["show", "cards", "card", "browse", "open", "procedure", "procedures"].includes(word)
  ))

  if (meaningfulQueryWords.length === 0) return undefined

  const specialties = context.setting ? (SETTING_SPECIALTIES[context.setting] ?? []) : SETTING_SPECIALTIES["Operating Theatre"]

  let best: string | undefined
  let bestScore = 0

  for (const specialty of specialties) {
    const aliases = [
      specialty,
      specialty.replace("Trauma and Orthopaedics", "Ortho"),
      specialty.replace("General Surgery", "GenSurg"),
      specialty.replace("Gynecology", "Gynae"),
      specialty.replace("Otolaryngology (Ear, Nose and Throat)", "ENT"),
    ]
      .map((value) => normalize(value))
      .filter(Boolean)

    let score = 0
    for (const alias of aliases) {
      const aliasWords = alias.split(/\s+/).filter(Boolean)
      const exactPhraseMatch =
        aliasWords.length > 1
          ? query.includes(alias)
          : queryWords.includes(alias)

      if (exactPhraseMatch) {
        score = Math.max(score, aliasWords.length * 3)
        continue
      }

      if (
        aliasWords.length === 1 &&
        meaningfulQueryWords.length > 0 &&
        hasApproximateWord(query, alias, alias.length > 6 ? 2 : 1)
      ) {
        score = Math.max(score, 2)
      }
    }

    if (score > bestScore) {
      best = specialty
      bestScore = score
    }
  }

  return bestScore > 0 ? best : undefined
}

function hasSpecificProcedureSignal(query: string, aliases: string[]): boolean {
  const queryTokens = extractProcedureTokens(query)
  if (queryTokens.length === 0) return false

  const aliasTokens = aliases
    .flatMap((alias) => normalize(alias).split(/\s+/))
    .filter((token) => token.length >= 3)

  return queryTokens.some((token) => aliasTokens.includes(token))
}

function findProcedureMatchesForBrowse(prompt: string, context: AssistantContext, limit = 8) {
  const query = normalizeForIntent(prompt)
  const queryTokens = extractProcedureTokens(query)
  const browseScope = findBrowseScope(prompt)
  if (queryTokens.length === 0 && !browseScope) return []

  const rankedMatches = resolveProcedureMatches(prompt, {
    setting: context.setting,
    specialty: context.specialty,
  }, 32)
    .map((entry) => {
      const scopeMatch = browseScope
        ? Boolean(
            (entry.procedure.service_line_id && browseScope.serviceLineIds.has(entry.procedure.service_line_id)) ||
            (entry.procedure.anatomy_id && browseScope.anatomyIds.has(entry.procedure.anatomy_id))
          )
        : false
      return { procedure: entry.procedure, score: entry.score, tokenHits: entry.matchedTerms, scopeMatch }
    })
    .filter((entry) => (entry.tokenHits > 0 && entry.score >= 4) || entry.scopeMatch)

  const scopedMatches =
    browseScope && rankedMatches.some((entry) => entry.scopeMatch)
      ? rankedMatches.filter((entry) => entry.scopeMatch)
      : rankedMatches

  return scopedMatches
    .sort((left, right) => {
      if (right.scopeMatch !== left.scopeMatch) return Number(right.scopeMatch) - Number(left.scopeMatch)
      if (right.tokenHits !== left.tokenHits) return right.tokenHits - left.tokenHits
      return right.score - left.score
    })
    .slice(0, limit)
    .map((entry) => entry.procedure)
}

function isGenericProcedureBrowsePrompt(prompt: string): boolean {
  const query = normalizeForIntent(prompt)
  if (!query) return false

  const mentionsCards = query.includes("card") || query.includes("cards")
  const mentionsProcedures = query.includes("procedure") || query.includes("procedures")
  const mentionsBrowseVerb = /\b(show|browse|list|open|see|view|have|got)\b/.test(query)

  return (mentionsCards || mentionsProcedures) && mentionsBrowseVerb
}

function getBroadProcedureBrowseMatches(context: AssistantContext, limit = 8): Procedure[] {
  return getAllProcedures()
    .filter((procedure) => hasAuthoredCardContent(procedure))
    .filter((procedure) => !context.setting || procedure.setting === context.setting)
    .filter((procedure) => !context.specialty || procedure.specialty === context.specialty)
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, limit)
}

function findProcedureMatch(prompt: string, context: AssistantContext) {
  return resolveBestProcedure(prompt, {
    setting: context.setting,
    specialty: context.specialty,
  })
}

function hasAuthoredCardContent(procedure: Procedure): boolean {
  return procedure.sections.length > 0
}

function findProcedureCandidateMatches(prompt: string, context: AssistantContext, limit = 3) {
  return resolveProcedureMatches(prompt, {
    setting: context.setting,
    specialty: context.specialty,
  }, limit).map((entry) => {
    const fixedCount = entry.procedure.sections.filter((section) => section.contentMode === "fixed").length
    const editableCount = entry.procedure.sections.filter((section) => section.contentMode !== "fixed").length

    return {
      id: entry.procedure.id,
      name: entry.procedure.name,
      specialty: entry.procedure.specialty,
      setting: entry.procedure.setting,
      sectionsCount: entry.procedure.sections.length,
      fixedCount,
      editableCount,
      href: `/procedures/${encodeURIComponent(entry.procedure.id)}`,
      implantSystem: entry.procedure.implantSystem,
    }
  }).filter((entry) => entry.sectionsCount > 0)
}

function findBroadDomainProcedureMatches(
  context: AssistantContext,
  sectionKind: "implants" | "trays" | "consumables" | "notes" | "references",
  limit = 6,
) {
  const scoped = getAllProcedures()
    .filter((procedure) => !context.setting || procedure.setting === context.setting)
    .filter((procedure) => !context.specialty || procedure.specialty === context.specialty)
    .filter((procedure) => hasAuthoredCardContent(procedure))

  const filtered = scoped.filter((procedure) => {
    const section = (() => {
      switch (sectionKind) {
        case "implants": return findSectionFromProcedure(procedure, ["implant", "prosthe"])
        case "trays": return findSectionFromProcedure(procedure, ["tray", "instrument", "set"])
        case "consumables": return findSectionFromProcedure(procedure, ["consumable", "drap", "ppe", "medication"])
        case "notes": return findSectionFromProcedure(procedure, ["note"])
        case "references": return findSectionFromProcedure(procedure, ["reference"])
        default: return undefined
      }
    })()
    return Boolean(section)
  })

  return filtered.slice(0, limit).map((procedure) => {
    const fixedCount = procedure.sections.filter((section) => section.contentMode === "fixed").length
    const editableCount = procedure.sections.filter((section) => section.contentMode !== "fixed").length

    return {
      id: procedure.id,
      name: procedure.name,
      specialty: procedure.specialty,
      setting: procedure.setting,
      sectionsCount: procedure.sections.length,
      fixedCount,
      editableCount,
      href: `/procedures/${encodeURIComponent(procedure.id)}`,
      implantSystem: procedure.implantSystem,
    }
  })
}

function looksLikeBareEntityPrompt(prompt: string): boolean {
  const query = normalizeForIntent(prompt)
  if (!query) return false
  const words = query.split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.length > 4) return false

  return !includesAny(query, [
    ...GREETING_TERMS, ...THANKS_TERMS, ...STATUS_TERMS, ...PREPARE_TERMS,
    ...COMPARE_TERMS, ...SUMMARY_TERMS, ...VISUAL_TERMS, ...NAVIGATION_VERBS,
    ...CATALOGUE_TERMS, ...TRAY_TERMS, ...CONSUMABLE_TERMS, ...NOTES_TERMS,
    ...REFERENCE_TERMS, ...WORKFLOW_TERMS, ...SPECIALTY_TERMS,
    ...COMPLIMENT_TERMS, ...CONFUSED_TERMS, ...HELP_META_TERMS, ...WHAT_CAN_YOU_DO_TERMS,
    "open", "show", "edit", "update", "change", "compare", "browse", "find", "search",
  ])
}

function isGenericEntityFollowUpPrompt(prompt: string): boolean {
  const query = normalizeForIntent(prompt)
  if (!query) return false

  return [
    "what is it", "what is that", "what is this", "tell me about it",
    "tell me about that", "tell me about this", "explain it",
    "explain that", "explain this", "more about it", "more about that",
    "more on it", "more on that", "expand on it", "expand on that",
    "what does it do", "what does that do", "describe it", "describe that",
  ].some((phrase) => query === phrase || query.startsWith(phrase))
}

function isRelatedSystemsPrompt(prompt: string): boolean {
  const query = normalizeForIntent(prompt)
  if (!query) return false

  return [
    "show related systems", "show systems", "related systems",
    "what systems", "which systems", "linked systems", "connected systems",
    "associated systems", "what system is this used with",
    "what systems use this", "systems for this",
  ].some((phrase) => query === phrase || query.includes(phrase))
}

function isEntityProductsPrompt(prompt: string): boolean {
  const query = normalizeForIntent(prompt)
  if (!query) return false

  return [
    "show products", "show product", "products", "product",
    "show related products", "related products", "linked products",
    "what products", "which products", "products for this",
    "catalogue products", "associated products",
  ].some((phrase) => query === phrase || query.includes(phrase))
}

function looksLikeBrowsePrompt(prompt: string, context: AssistantContext): boolean {
  const query = normalizeForIntent(prompt)
  if (!query) return false

  const tokenCount = query.split(/\s+/).filter(Boolean).length
  if (findBrowseScope(prompt)) return true
  if (findSpecialtyMention(prompt, context)) return true

  if (tokenCount <= 3 && /\b(knee|hip|ankle|foot|shoulder|elbow|wrist|hand|spine|pelvis|trauma|arthroplasty|urology|vascular|ent|eyes|ophthalmology|breast|colorectal|hepatobiliary|upper gi|lower gi|laparoscopic)\b/.test(query)) {
    return true
  }

  return false
}

function sanitizeCompareFragment(value: string): string {
  return normalizeForIntent(value)
    .replace(/\b(compare|difference|differences|between|for|the|a|an|case|procedure|card)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function findProcedureMatches(prompt: string, context: AssistantContext) {
  const raw = normalizeForIntent(prompt)
  const cleaned = raw
    .replace(/\bdifference between\b/g, " ")
    .replace(/\bcompare\b/g, " ")
    .replace(/\bdifferences\b/g, " ")
    .replace(/\bdifference\b/g, " ")
    .trim()

  const fragments = cleaned
    .split(/\b(?:vs|versus|and)\b/)
    .map(sanitizeCompareFragment)
    .filter(Boolean)

  const matched: Procedure[] = []
  const seen = new Set<string>()

  for (const fragment of fragments) {
    const best = resolveProcedureMatches(fragment, {
      setting: context.setting,
      specialty: context.specialty,
    }, 1)[0]
    if (best && !seen.has(best.procedure.id)) {
      matched.push(best.procedure)
      seen.add(best.procedure.id)
    }
    if (matched.length === 2) return matched
  }

  const ranked = resolveProcedureMatches(cleaned, {
    setting: context.setting,
    specialty: context.specialty,
  }, 8).map((entry) => ({ procedure: entry.procedure, score: entry.score }))

  for (const entry of ranked) {
    if (seen.has(entry.procedure.id)) continue
    matched.push(entry.procedure)
    seen.add(entry.procedure.id)
    if (matched.length === 2) break
  }

  return matched
}

function buildCompareTable(matchedProcedures: Array<{
  name: string
  specialty: string
  setting: string
  sectionsCount: number
  fixedCount: number
  editableCount: number
  implantSystem?: string
}>): AssistantTable {
  const [left, right] = matchedProcedures
  return {
    title: `${left?.name ?? "Procedure"} vs ${right?.name ?? "Procedure"}`,
    columns: ["Area", left?.name ?? "First", right?.name ?? "Second"],
    rows: [
      ["Specialty", left?.specialty ?? "Unknown", right?.specialty ?? "Unknown"],
      ["Setting", left?.setting ?? "Unknown", right?.setting ?? "Unknown"],
      ["Sections", String(left?.sectionsCount ?? 0), String(right?.sectionsCount ?? 0)],
      ["Fixed", String(left?.fixedCount ?? 0), String(right?.fixedCount ?? 0)],
      ["Editable", String(left?.editableCount ?? 0), String(right?.editableCount ?? 0)],
      ["Implant system", left?.implantSystem ?? "Not surfaced", right?.implantSystem ?? "Not surfaced"],
    ],
  }
}

// ─────────────────────────────────────────────
// SIZE TABLE BUILDERS
// ─────────────────────────────────────────────

function buildHipSizeTable(systemName: string): AssistantTable {
  return {
    title: `${systemName} prep ladder`,
    columns: ["Group", "Have ready", "Notes"],
    rows: [
      ["Acetabular cups", "46–60 mm", "Include adjacent backup sizes"],
      ["Liners", "Standard + elevated", "Match shell and head options"],
      ["Femoral stems", "Common primary size run", "Include one size above and below expected"],
      ["Heads", "32 / 36 mm", "Neutral and offset options ready"],
    ],
  }
}

function buildKneeSizeTable(systemName: string): AssistantTable {
  return {
    title: `${systemName} prep ladder`,
    columns: ["Group", "Have ready", "Notes"],
    rows: [
      ["Femoral", "Expected size run + backups", "Keep one size above and below"],
      ["Tibial trays", "Expected size run + backups", "Confirm compatible inserts"],
      ["Poly inserts", "Thickness ladder", "Keep adjacent thicknesses open-ready"],
      ["Patella", "Primary sizes", "Only if surgeon routinely resurfaces"],
    ],
  }
}

function buildShoulderSizeTable(systemName: string): AssistantTable {
  return {
    title: `${systemName} prep ladder`,
    columns: ["Group", "Have ready", "Notes"],
    rows: [
      ["Humeral stems", "Expected size run + backups", "Check press-fit vs cemented plan"],
      ["Heads", "Diameter and height options", "Keep adjacent head sizes available"],
      ["Glenoid components", "Primary size range", "Confirm pegged vs keeled preference"],
      ["Augments", "As indicated", "Useful for revision or bone-loss cases"],
    ],
  }
}

function buildAnkleSizeTable(systemName: string): AssistantTable {
  return {
    title: `${systemName} prep ladder`,
    columns: ["Group", "Have ready", "Notes"],
    rows: [
      ["Tibial components", "Primary size run + backups", "Check alignment with preoperative templating"],
      ["Talar components", "Primary size run + backups", "Match tibial sizing where required"],
      ["Bearing inserts", "Thickness ladder", "Keep adjacent sizes available"],
      ["Trial set", "Complete", "Confirm range before final implant selection"],
    ],
  }
}

function buildGenericSizeTable(systemName: string): AssistantTable {
  return {
    title: `${systemName} prep ladder`,
    columns: ["Area", "What to have ready", "Notes"],
    rows: [
      ["Trials", "Full expected run", "Keep adjacent sizes immediately available"],
      ["Final implants", "Booked sizes + backups", "Avoid opening until decision is made"],
      ["Ancillaries", "System-specific screws / liners / heads", "Confirm compatibility before incision"],
      ["Rescue options", "Backup sizes and compatible alternatives", "Escalate early if anything is missing"],
    ],
  }
}

function getSizeFocus(prompt: string): string | undefined {
  const query = normalizeForIntent(prompt)

  if (/\bfemoral?\b|\bfemur\b/.test(query)) return "femoral"
  if (/\btibial?\b|\btibia\b/.test(query)) return "tibial"
  if (/\bpoly\b|\binsert\b|\binserts\b/.test(query)) return "poly inserts"
  if (/\bpatella\b|\bpatellar\b/.test(query)) return "patella"
  if (/\bcup\b|\bacetabular\b|\bshell\b/.test(query)) return "acetabular cups"
  if (/\bliner\b|\bliners\b/.test(query)) return "liners"
  if (/\bstem\b|\bstems\b/.test(query)) return "stems"
  if (/\bhead\b|\bheads\b/.test(query)) return "heads"
  if (/\bhumeral\b/.test(query)) return "humeral stems"
  if (/\bglenoid\b/.test(query)) return "glenoid components"
  if (/\btalar\b|\btalus\b/.test(query)) return "talar components"
  if (/\bbearing\b|\bbearings\b/.test(query)) return "bearing inserts"

  return undefined
}

function filterSizeTableByFocus(table: AssistantTable, focus: string | undefined): AssistantTable {
  if (!focus) return table

  const normalizedFocus = normalize(focus)
  const rows = table.rows.filter((row) => normalize(row[0]).includes(normalizedFocus) || normalizedFocus.includes(normalize(row[0])))
  if (rows.length === 0) return table

  return {
    ...table,
    title: `${table.title} · ${focus}`,
    rows,
  }
}

function buildSizeTable(
  procedureName: string,
  variantName: string | undefined,
  systemName: string,
): AssistantTable {
  const context = normalize([procedureName, variantName, systemName].filter(Boolean).join(" "))
  if (context.includes("hip") || context.includes("thr") || context.includes("hemi")) return buildHipSizeTable(systemName)
  if (context.includes("knee") || context.includes("tkr") || context.includes("ukr")) return buildKneeSizeTable(systemName)
  if (context.includes("shoulder") || context.includes("tsa") || context.includes("rtsa")) return buildShoulderSizeTable(systemName)
  if (context.includes("ankle") || context.includes("tar")) return buildAnkleSizeTable(systemName)
  return buildGenericSizeTable(systemName)
}

function buildSectionTable(section: Section, title?: string): AssistantTable | undefined {
  if (!section.items.length) return undefined
  return {
    title: title ?? section.title,
    columns: ["Item", "Qty", "Notes"],
    rows: section.items.slice(0, 12).map((item) => [
      item.name,
      String(item.defaultQty ?? 1),
      item.supplier?.name ?? item.description ?? item.product ?? "Ready",
    ]),
  }
}

function findSectionFromProcedure(procedure: { sections: Section[] }, keys: string[]): Section | undefined {
  for (const key of keys) {
    const match = findSection(procedure.sections, key)
    if (match) return match
  }
  return undefined
}

function findSection(sections: Section[] | undefined, key: string): Section | undefined {
  return sections?.find((section) => normalize(section.title).includes(key))
}

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────

function matchRouteTarget(query: string): AssistantAction[] {
  const actions: AssistantAction[] = []
  const normalized = normalize(query)

  if (normalized.includes("chat") || normalized.includes("tom")) {
    actions.push({ label: "Open chat", href: "/TOM", tone: "primary" })
  }

  if (normalized.includes("library") || normalized.includes("browse")) {
    actions.push({ label: "Browse library", href: "/?library=1", tone: actions.length === 0 ? "primary" : "secondary" })
  }

  if (normalized.includes("catalogue") || normalized.includes("supplier")) {
    actions.push({ label: "Open catalogue", href: "/catalogue", tone: "primary" })
  }

  if (/\b(add product|new product|register product)\b/.test(normalized)) {
    actions.push({ label: "Add product", href: "/catalogue/add-product?source=chat", tone: "primary" })
  }

  for (const setting of CLINICAL_SETTINGS) {
    const shortForms = [
      setting,
      setting.replace("Operating Theatre", "Theatre"),
      setting.replace("Interventional Radiology / Cath Lab", "IR / Cath"),
      setting.replace("Outpatient / Clinic", "Clinic"),
      setting.replace("Maternity & Obstetrics", "Maternity"),
    ]
    if (shortForms.some((value) => normalized.includes(normalize(value)))) {
      actions.push({
        label: `Open ${setting}`,
        href: `/?setting=${encodeURIComponent(setting)}`,
        tone: actions.length === 0 ? "primary" : "secondary",
      })
    }
  }

  for (const specialty of SETTING_SPECIALTIES["Operating Theatre"]) {
    const aliases = [
      specialty,
      specialty.replace("Trauma and Orthopaedics", "Ortho"),
      specialty.replace("General Surgery", "GenSurg"),
      specialty.replace("Gynecology", "Gynae"),
    ]
    if (aliases.some((value) => normalized.includes(normalize(value)))) {
      actions.push({
        label: `Open ${specialty}`,
        href: `/?setting=${encodeURIComponent("Operating Theatre")}&specialty=${encodeURIComponent(specialty)}`,
        tone: actions.length === 0 ? "primary" : "secondary",
      })
    }
  }

  return actions.slice(0, 3)
}

// ─────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────

export function buildAssistantContext(
  pathname: string,
  searchParams: URLSearchParams,
): AssistantContext {
  if (pathname === "/catalogue") {
    const catalogueItems = getCatalogueItems()
    const uniqueCategories = new Set(catalogueItems.map((item) => item.category))
    return {
      pageKind: "catalogue",
      title: "Catalogue",
      description: "You're in the product catalogue. I can help you find items, group them, or turn the results into a prep table.",
      stats: [
        { label: "Items", value: String(catalogueItems.length) },
        { label: "Categories", value: String(uniqueCategories.size) },
      ],
    }
  }

  if (pathname.startsWith("/procedures/")) {
    const parts = pathname.split("/")
    const procedureId = decodeURIComponent(parts[parts.length - 1] ?? "")
    const procedure = getProcedureByIdSnapshot(procedureId)
    if (procedure) {
      const variantId = searchParams.get("variant") ?? undefined
      const systemId = searchParams.get("system") ?? undefined
      const variant = variantId ? getProcedureVariantById(variantId) : null
      const system = systemId ? getSystemById(systemId) : null
      const sections = decorateCardSections(
        variant && system
          ? buildSystemCardSections(procedure, variant.id, variant.name, system.id, system.name)
          : procedure.sections,
      )

      const fixedCount = sections.filter((section) => section.contentMode === "fixed").length
      const editableCount = sections.filter((section) => section.contentMode !== "fixed").length

      return {
        pageKind: "card",
        title: procedure.name,
        description: `You're on the card for ${[procedure.name, variant?.name, system?.name].filter(Boolean).join(" · ")}.`,
        setting: procedure.setting,
        specialty: procedure.specialty,
        procedureId: procedure.id,
        procedureName: procedure.name,
        variantId: variant?.id ?? undefined,
        variantName: variant?.name ?? undefined,
        systemId: system?.id ?? undefined,
        systemName: system?.name ?? undefined,
        sections,
        stats: [
          { label: "Sections", value: String(sections.length) },
          { label: "Fixed", value: String(fixedCount) },
          { label: "Editable", value: String(editableCount) },
        ],
      }
    }
  }

  if (pathname === "/") {
    const setting = searchParams.get("setting") as ClinicalSetting | null
    const specialty = searchParams.get("specialty") ?? undefined
    const serviceLineId = searchParams.get("service_line") ?? undefined
    const anatomyId = searchParams.get("anatomy") ?? undefined

    if (!setting) {
      return {
        pageKind: "home",
        title: "Home",
        description: "You're on the mobile launcher. I can open settings, specialties, cards, or the catalogue.",
      }
    }

    if (setting && specialty && anatomyId) {
      const serviceLine = serviceLineId
        ? getServiceLineNameById(serviceLineId) ?? serviceLineId
        : undefined
      const anatomy = getAnatomyNameById(anatomyId) ?? anatomyId
      const allowedAnatomy = new Set([anatomyId, ...getDescendantAnatomyIds(anatomyId)])
      const procs = getProceduresBySpecialtySnapshot(setting, specialty).filter((procedure) => {
        const anatomyValue = (procedure as { anatomy_id?: string }).anatomy_id
        if (!anatomyValue) return false
        return allowedAnatomy.has(anatomyValue) && (hasVariantsForProcedure(procedure.id) || procedure.sections.length > 0)
      })
      const variantCount = procs.reduce(
        (count, procedure) => count + getCuratedVariantsForProcedureWithSystems(procedure.id, procedure.name).length,
        0,
      )

      return {
        pageKind: "anatomy",
        title: serviceLine ? `${serviceLine}: ${anatomy}` : anatomy,
        description: `You're in ${specialty}, looking at ${serviceLine ? `${serviceLine} · ` : ""}${anatomy}.`,
        setting,
        specialty,
        serviceLine,
        serviceLineId,
        anatomy,
        anatomyId,
        stats: [
          { label: "Procedures", value: String(procs.length) },
          { label: "Variants", value: String(variantCount) },
        ],
      }
    }

    if (setting && specialty) {
      const specialtyId = getOperatingTheatreSpecialtyIdByLabel(specialty)
      const serviceLines = specialtyId ? getServiceLinesForSpecialty(specialtyId) : []
      const anatomyCount = serviceLines.reduce(
        (count, line) => count + getAnatomyForServiceLine(line.id).length,
        0,
      )

      return {
        pageKind: "specialty",
        title: specialty,
        description: `You're in the ${specialty} browse page.`,
        setting,
        specialty,
        stats: [
          { label: "Subspecialties", value: String(serviceLines.length) },
          { label: "Anatomy views", value: String(anatomyCount) },
        ],
      }
    }

    return {
      pageKind: "setting",
      title: setting,
      description: `You're browsing ${setting}. I can help you jump to a specialty or summarise what's available here.`,
      setting,
      stats: [
        { label: "Specialties", value: String(SETTING_SPECIALTIES[setting]?.length ?? 0) },
      ],
    }
  }

  return {
    pageKind: "unknown",
    title: "PrepSight",
    description: "I'm ready. Ask me about this page, a procedure, a product, or tell me where you want to go.",
  }
}

// ─────────────────────────────────────────────
// WELCOME
// ─────────────────────────────────────────────

export function buildAssistantWelcome(context: AssistantContext): AssistantReply {
  const quick =
    context.pageKind === "card"
      ? ["Summarise this card", "Show implant sizes", "List tray items", "Show references"]
      : context.pageKind === "catalogue"
        ? ["Find hip implants", "Make a table", "Show supplier items", "Open theatre"]
        : buildFallbackChips(context)

  return {
    text: `${context.description} You can ask this naturally — I can talk it through, turn the useful bits into a table, or send you straight to the right part of PrepSight if that's quicker.`,
    stats: context.stats,
    chips: quick,
  }
}

function buildVisualReply(context: AssistantContext): AssistantReply {
  return {
    text:
      context.stats && context.stats.length > 0
        ? "Here's the quickest visual read of this page."
        : "I don't have a meaningful visual summary for this page yet, but I can still summarise it or take you somewhere else.",
    stats: context.stats,
  }
}

function buildSummaryReply(context: AssistantContext): AssistantReply {
  if (context.pageKind === "card") {
    const sections = context.sections ?? []
    const fixed = sections.filter((section) => section.contentMode === "fixed").length
    const editable = sections.filter((section) => section.contentMode !== "fixed").length
    return {
      text: `You're on the ${[context.procedureName, context.variantName, context.systemName].filter(Boolean).join(" · ")} card. It has ${sections.length} sections — ${fixed} supplier-fixed and ${editable} locally tailored.`,
      actions: [{ label: "Open catalogue", href: "/catalogue", tone: "secondary" }],
      stats: context.stats,
    }
  }

  if (context.pageKind === "catalogue") {
    return {
      text: "This is the central product catalogue — the reusable bank for implants, trays, consumables, and equipment that cards can pull from.",
      stats: context.stats,
    }
  }

  return {
    text: context.description,
    stats: context.stats,
  }
}

// ─────────────────────────────────────────────
// CATALOGUE REPLY
// ─────────────────────────────────────────────

function buildCatalogueReply(query: string): AssistantReply {
  const asksForEdit = /\b(edit|update|change|mark|set)\b/i.test(query)
  const catalogueStopWords = new Set([
    "what", "which", "tell", "show", "give", "find", "search", "need", "want", "have",
    "for", "me", "we", "the", "a", "an", "edit", "update", "change", "mark", "set",
  ])

  const cleaned = normalizeForIntent(query)
    .replace(/\b(show|find|search|catalogue|catalog|table|for|product code|product codes|sku|code|codes|tell me|give me|can you|edit|update|change|mark|set)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const familyTerms = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => (term.endsWith("s") && term.length > 4 ? term.slice(0, -1) : term))
    .filter((term) => term.length >= 3 && !catalogueStopWords.has(term))

  const genericOnly = familyTerms.length === 0
  if (genericOnly) {
    return {
      text: asksForEdit
        ? "I can edit a catalogue line, but I need the **product**, **supplier**, or **product code** first so I can lock onto one exact item."
        : "I can pull the product code, but I need the **product**, **supplier**, or **product family** first. What do you want me to check?",
      actions: [
        { label: "Open catalogue", href: "/catalogue", tone: "primary" },
        { label: "Add product", href: "/catalogue/add-product?source=chat", tone: "secondary" },
      ],
      chips: asksForEdit
        ? ["Edit Palacos", "Update Aquacel Ag+", "Change Exeter V40"]
        : ["Bone cement", "Palacos", "Simplex P", "Show cements"],
    }
  }

  const productCandidates = resolveProductMatches(query, 8)

  const topProduct = productCandidates[0]
  const nextProduct = productCandidates[1]
  const hasStrongSingleProductMatch =
    Boolean(topProduct) &&
    topProduct.score >= 30 &&
    (!nextProduct || nextProduct.score <= topProduct.score - 4)

  if (hasStrongSingleProductMatch && topProduct) {
    const { product } = topProduct
    const editorHref = `/catalogue/add-product?id=${encodeURIComponent(product.id)}&source=chat`
    const productHref = `/catalogue/products?product=${encodeURIComponent(product.id)}`

    return {
      text: asksForEdit
        ? `I matched **${product.name}** as the strongest catalogue line. Taking you to the single-item editor so you can update the exact record.`
        : `I matched **${product.name}** as the strongest catalogue line.`,
      table: {
        title: "Resolved product line",
        columns: ["Item", "Product code", "Supplier"],
        rows: [[product.name, product.sku, product.supplier]],
      },
      actions: asksForEdit
        ? [
            { label: "Edit product", href: editorHref, tone: "primary" },
            { label: "Open product", href: productHref, tone: "secondary" },
          ]
        : [
            { label: "Open product", href: productHref, tone: "primary" },
            { label: "Edit product", href: editorHref, tone: "secondary" },
          ],
      chips: asksForEdit
        ? ["Change location", "Update supplier phone", "Mark off-contract"]
        : ["Edit this product", "Show product code", "Open catalogue"],
    }
  }

  const literalResults = searchCatalogueItems(cleaned)
  const tokenResults = getCatalogueItems().filter((item) => {
    const haystacks = [
      item.name, item.sku, item.product, item.description,
      item.manufacturer, item.supplier?.name, ...(item.aliases ?? []),
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())

    return familyTerms.every((term) => haystacks.some((value) => value.includes(term)))
  })

  const results = Array.from(
    new Map([...literalResults, ...tokenResults].map((item) => [item.id, item])).values(),
  ).slice(0, 8)

  if (results.length === 0) {
    return {
      text: `Nothing strong enough to act on for **${cleaned || query}** yet. Try the **supplier name**, the exact **product line**, or a clearer **product family** and I'll narrow it properly.`,
      actions: [
        { label: "Open catalogue", href: "/catalogue", tone: "primary" },
        { label: "Add product", href: "/catalogue/add-product?source=chat", tone: "secondary" },
      ],
      chips: ["Bone cement", "Palacos", "Simplex P", "CMW 1"],
    }
  }

  const asksForCode = /\b(product code|product codes|sku|code|codes)\b/i.test(query)

  return {
    text: asksForCode
      ? `Found **${results.length}** relevant matches. Product codes surfaced first so you can identify the right line quickly.`
      : asksForEdit
        ? `Found **${results.length}** possible matches — not a clean enough single-item lock to edit blindly. Pick the exact line first, then I can open the right record.`
        : `Found **${results.length}** relevant catalogue items.`,
    table: {
      title: cleaned ? titleCase(cleaned) : "Catalogue results",
      columns: asksForCode ? ["Item", "Product code", "Supplier / product"] : ["Item", "Category", "Supplier / product"],
      rows: results.map((item) => [
        item.name,
        asksForCode ? item.sku ?? "No code surfaced" : titleCase(item.category.replace(/_/g, " ")),
        item.supplier?.name ?? item.product ?? item.manufacturer ?? "PrepSight catalogue",
      ]),
    },
    actions: [
      { label: "Open catalogue", href: "/catalogue", tone: "primary" },
      { label: "Add product", href: "/catalogue/add-product?source=chat", tone: "secondary" },
    ],
  }
}

// ─────────────────────────────────────────────
// INTENT EXTRACTION
// ─────────────────────────────────────────────

function extractIntentEntities(
  intentId: AssistantIntentId,
  prompt: string,
  context: AssistantContext,
): Record<string, string> | undefined {
  const entities: Record<string, string> = {}

  if (context.setting) {
    entities.setting = context.setting
  }

  if (intentId === "browse_procedures" || intentId === "specialties" || intentId === "workflow_tools") {
    const browseScope = findBrowseScope(prompt)
    if (browseScope?.label) entities.browseLabel = browseScope.label
    const specialty = findSpecialtyMention(prompt, context)
    if (specialty) entities.specialty = specialty
  }

  if (intentId === "implant_sizes" || intentId === "missing_sizes") {
    const sizeFocus = getSizeFocus(prompt)
    if (sizeFocus) entities.sizeFocus = sizeFocus
  }

  if ([
    "summary", "prepare_card", "walkthroughs", "notes", "references",
    "trays", "consumables", "implants", "implant_sizes", "missing_sizes",
  ].includes(intentId)) {
    const matchedProcedure = findProcedureMatch(prompt, context)
    if (matchedProcedure) {
      entities.procedureId = matchedProcedure.id
      entities.procedureName = matchedProcedure.name
      if (matchedProcedure.implantSystem) entities.systemName = matchedProcedure.implantSystem
      entities.specialty = matchedProcedure.specialty
      entities.setting = matchedProcedure.setting
    }
  }

  return Object.keys(entities).length > 0 ? entities : undefined
}

function resolveProcedureFromIntent(
  intent: AssistantIntent,
  context: AssistantContext,
  prompt: string,
  carry?: AssistantCarryContext,
): ResolvedProcedure {
  const procedureId = intent.entities?.procedureId
  if (procedureId) return getProcedureByIdSnapshot(procedureId)

  const carryEligibleIntents: AssistantIntentId[] = [
    "summary", "prepare_card", "walkthroughs", "notes", "references",
    "trays", "consumables", "implants", "implant_sizes", "missing_sizes",
    "procedure_systems",
  ]

  if (carry?.procedureId && carryEligibleIntents.includes(intent.id)) {
    const carriedProcedure = getProcedureByIdSnapshot(carry.procedureId)
    if (carriedProcedure) return carriedProcedure
  }

  if (
    carry?.entityKind === "system" &&
    carry.entityLabel &&
    carryEligibleIntents.includes(intent.id)
  ) {
    const carriedSystemMatch = resolveSystemMatches(carry.entityLabel, {
      setting: context.setting,
      specialty: context.specialty,
    }, 1)[0]
    if (carriedSystemMatch) return carriedSystemMatch.procedure
  }

  return findProcedureMatch(prompt, context)
}

// ─────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────

function detectIntent(context: AssistantContext, prompt: string): AssistantIntent {
  const query = normalizeForIntent(prompt)
  if (!query) return { id: "welcome", confidence: 1 }

  const withEntities = (id: AssistantIntentId, confidence: number): AssistantIntent => ({
    id,
    confidence,
    entities: extractIntentEntities(id, prompt, context),
  })

  // ── Meta / conversational signals first ──

  if (isFrustrationPrompt(prompt)) return withEntities("repair_previous_turn", 0.99)
  if (isCorrectionPrompt(prompt)) return withEntities("user_correction", 0.97)
  if (isSourceCheckPrompt(prompt)) return withEntities("source_check", 0.95)

  if (includesAny(query, GREETING_TERMS) && query.split(/\s+/).length <= 6) {
    return withEntities("smalltalk_greeting", 0.96)
  }
  if (includesAny(query, THANKS_TERMS)) return withEntities("smalltalk_thanks", 0.96)
  if (includesAny(query, STATUS_TERMS)) return withEntities("smalltalk_status", 0.94)
  if (includesAny(query, COMPLIMENT_TERMS)) return withEntities("smalltalk_compliment", 0.94)
  if (includesAny(query, CONFUSED_TERMS)) return withEntities("smalltalk_confused", 0.93)
  if (includesAny(query, HELP_META_TERMS) && query.split(/\s+/).length <= 8) {
    return withEntities("smalltalk_help_meta", 0.92)
  }
  if (includesAny(query, WHAT_CAN_YOU_DO_TERMS)) return withEntities("what_can_you_do", 0.93)

  // ── Procedure count ──
  if (includesAny(query, PROCEDURE_COUNT_TERMS)) return withEntities("procedure_count", 0.92)

  // ── Entity-level signals ──
  const genericDomainOnly =
    includesAny(query, IMPLANT_TERMS) ||
    includesAny(query, TRAY_TERMS) ||
    includesAny(query, CONSUMABLE_TERMS) ||
    includesAny(query, NOTES_TERMS) ||
    includesAny(query, REFERENCE_TERMS)

  if (
    !genericDomainOnly &&
    looksLikeBareEntityPrompt(prompt) &&
    resolveEntityDefinition(prompt, {
      setting: context.setting,
      specialty: context.specialty,
    })
  ) {
    return withEntities("entity_intro", 0.93)
  }

  if (isRelatedSystemsPrompt(prompt)) return withEntities("related_systems", 0.94)
  if (isEntityProductsPrompt(prompt)) return withEntities("entity_products", 0.94)

  // ── Compare ──
  if (includesAny(query, COMPARE_TERMS)) return withEntities("compare_cards", 0.92)

  // ── Walkthroughs ──
  if (includesAny(query, WALKTHROUGH_TERMS)) return withEntities("walkthroughs", 0.91)

  // ── Implants (without size) ──
  // Strip implant/section noise before procedure matching so "implants for THR" finds THR cleanly
  if (includesAny(query, IMPLANT_TERMS) && !includesAny(query, SIZE_TERMS)) {
    const cleanedForProcedure = prompt
      .replace(/\b(implant|implants|prosthes[ei]s|prosthetics?|component|components|show|for|me|the|a|an)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
    const hasDirectProcedure = Boolean(
      findProcedureMatch(cleanedForProcedure || prompt, context) ??
      findProcedureMatch(prompt, context)
    )
    return withEntities(hasDirectProcedure ? "implants" : "broad_domain_browse", hasDirectProcedure ? 0.92 : 0.9)
  }

  // ── Procedure browse ──
  if (
    includesAny(query, BROWSE_PROCEDURE_TERMS) ||
    ((query.includes("procedure") || query.includes("procedures") || query.includes("cards")) && query.includes("have")) ||
    ((query.includes("what") || query.includes("which")) && (query.includes("procedure") || query.includes("card")))
  ) {
    return withEntities("browse_procedures", 0.9)
  }

  if (looksLikeBrowsePrompt(prompt, context) && !findProcedureMatch(prompt, context)) {
    return withEntities("browse_procedures", 0.82)
  }

  // ── Prepare ──
  if (includesAny(query, PREPARE_TERMS) && context.pageKind === "card") {
    return withEntities("prepare_card", 0.93)
  }

  // ── Systems ──
  if (includesAny(query, SYSTEM_TERMS) && findProcedureMatch(prompt, context)) {
    return withEntities("procedure_systems", 0.95)
  }

  // ── Summary / explain ──
  if (includesAny(query, SUMMARY_TERMS)) return withEntities("summary", 0.95)
  if (includesAny(query, EXPLAIN_TERMS)) return withEntities("summary", 0.9)

  // ── Visual ──
  if (includesAny(query, VISUAL_TERMS)) return withEntities("visual", 0.92)

  // ── Navigation — add product ──
  if (/\badd( a)? product\b/.test(query) || /\bnew product\b/.test(query) || /\bregister( a)? product\b/.test(query)) {
    return withEntities("navigation", 0.95)
  }

  // ── Catalogue edit ──
  if (/\b(edit|update|change|mark|set)\b/.test(query) && hasCatalogueProductHint(prompt)) {
    return withEntities("catalogue", 0.91)
  }

  // ── Workflow ──
  if (
    includesAny(query, WORKFLOW_TERMS) ||
    (hasApproximateWord(query, "workflow") && (query.includes("tool") || query.includes("open")))
  ) {
    return withEntities("workflow_tools", 0.9)
  }

  // ── Specialties ──
  if (
    includesAny(query, SPECIALTY_TERMS) ||
    hasApproximateWord(query, "specialties") ||
    hasApproximateWord(query, "speciality") ||
    hasApproximateWord(query, "specialty") ||
    (query.includes("what") && query.includes("have") && (query.includes("areas") || query.includes("browse")))
  ) {
    return withEntities("specialties", 0.9)
  }

  // ── Navigation ──
  if (
    includesAny(query, NAVIGATION_VERBS) &&
    /(catalogue|supplier|theatre|ortho|orthopaedics|urology|gynae|home|operating theatre|library|browse|chat|tom)/.test(query)
  ) {
    return withEntities("navigation", 0.94)
  }

  // ── Catalogue ──
  if (
    includesAny(query, REFERENCE_TERMS) &&
    (includesAny(query, CATALOGUE_TERMS) || hasApproximateWord(query, "product") || hasApproximateWord(query, "cement"))
  ) {
    return withEntities("catalogue", 0.9)
  }

  if (includesAny(query, CATALOGUE_TERMS)) return withEntities("catalogue", 0.88)

  // ── Section-level intents ──
  if (includesAny(query, REFERENCE_TERMS)) return withEntities("references", 0.87)
  if (includesAny(query, NOTES_TERMS)) return withEntities("notes", 0.86)

  if (
    includesAny(query, MISSING_TERMS) &&
    (includesAny(query, SIZE_TERMS) || includesAny(query, IMPLANT_TERMS) || hasApproximateWord(query, "sizes"))
  ) {
    return withEntities("missing_sizes", 0.91)
  }

  if (includesAny(query, SIZE_TERMS)) return withEntities("implant_sizes", 0.9)

  if (includesAny(query, PREPARE_TERMS)) {
    return withEntities("prepare_card", context.pageKind === "card" ? 0.93 : 0.84)
  }

  if (includesAny(query, TRAY_TERMS) || hasApproximateWord(query, "trays")) {
    return withEntities("trays", 0.9)
  }

  if (includesAny(query, CONSUMABLE_TERMS)) return withEntities("consumables", 0.88)

  // ── Procedure match fallback ──
  if (findProcedureMatch(prompt, context)) return withEntities("summary", 0.82)

  if (
    resolveProcedureMatches(prompt, {
      setting: context.setting,
      specialty: context.specialty,
    }, 1).length > 0
  ) {
    return withEntities("summary", 0.76)
  }

  return withEntities("fallback", 0.4)
}

// ─────────────────────────────────────────────
// EVIDENCE COLLECTION
// ─────────────────────────────────────────────

function collectEvidence(
  intent: AssistantIntent,
  context: AssistantContext,
  prompt: string,
  carry?: AssistantCarryContext,
): AssistantEvidence {

  // If confidence is below threshold for non-conversational intents, fall through to fallback evidence
  const conversationalIntents: AssistantIntentId[] = [
    "welcome", "smalltalk_greeting", "smalltalk_thanks", "smalltalk_status",
    "smalltalk_compliment", "smalltalk_confused", "smalltalk_help_meta",
    "repair_previous_turn", "user_correction", "source_check", "fallback",
    "what_can_you_do", "procedure_count",
  ]
  if (intent.confidence < CONFIDENCE_THRESHOLD && !conversationalIntents.includes(intent.id)) {
    return {
      context,
      chips: buildFallbackChips(context),
      stats: context.stats,
    }
  }

  switch (intent.id) {

    case "repair_previous_turn": {
      const carriedProcedure = carry?.procedureId ? getProcedureByIdSnapshot(carry.procedureId) : undefined
      return {
        context,
        procedureName: carriedProcedure?.name ?? carry?.procedureName,
        compactCard: carriedProcedure
          ? {
              title: carriedProcedure.name,
              meta: buildCompactCardMeta({
                setting: carriedProcedure.setting,
                specialty: carriedProcedure.specialty,
                systemName: carriedProcedure.implantSystem,
              }),
              summary: buildCompactCardSummary(carriedProcedure.sections),
              checklist: buildCompactChecklist(carriedProcedure.sections),
              href: `/procedures/${encodeURIComponent(carriedProcedure.id)}`,
            }
          : undefined,
        actions: carriedProcedure
          ? [{ label: "Open full card", href: `/procedures/${encodeURIComponent(carriedProcedure.id)}`, tone: "primary" }]
          : undefined,
        chips: carriedProcedure
          ? ["Show implants", "Show trays", "Show references"]
          : buildFallbackChips(context),
        stats: context.stats,
      }
    }

    case "user_correction": {
      const correctedProcedure = findProcedureMatch(prompt, context)
      return {
        context,
        procedureName: correctedProcedure?.name ?? carry?.procedureName,
        compactCard: correctedProcedure
          ? {
              title: correctedProcedure.name,
              meta: buildCompactCardMeta({
                setting: correctedProcedure.setting,
                specialty: correctedProcedure.specialty,
                systemName: correctedProcedure.implantSystem,
              }),
              summary: buildCompactCardSummary(correctedProcedure.sections),
              checklist: buildCompactChecklist(correctedProcedure.sections),
              href: `/procedures/${encodeURIComponent(correctedProcedure.id)}`,
            }
          : undefined,
        actions: correctedProcedure
          ? [{ label: "Open full card", href: `/procedures/${encodeURIComponent(correctedProcedure.id)}`, tone: "primary" }]
          : undefined,
        chips: correctedProcedure ? ["Show implants", "Show trays", "Show references"] : buildFallbackChips(context),
        stats: context.stats,
      }
    }

    case "source_check": {
      return {
        context,
        narrativeText: context.pageKind === "card"
          ? "This answer is grounded against the current procedure card and its authored sections first — fixed data, then local editable content, then catalogue where relevant."
          : "I'm using the strongest grounded source available — authored card content first, then fixed data, then catalogue data depending on what you're asking about.",
        stats: context.stats,
      }
    }

    case "what_can_you_do": {
      return {
        context,
        narrativeText: context.pageKind === "card"
          ? `On a card, I can summarise, pull up trays, implants, consumables, notes, references, or walkthroughs — either for this card or any other. I can also compare two procedures, check implant sizes, find catalogue products, or take you somewhere else entirely.`
          : `I can help you find and open procedure cards, compare procedures, summarise what's here, show implant sizes, pull up trays or consumables, find catalogue products, and navigate around PrepSight. Just tell me what you want in your own words.`,
        chips: buildWhatCanYouDoChips(context),
        stats: context.stats,
      }
    }

    case "procedure_count": {
      const allAuthoredProcedures = getAllProcedures().filter((p) => hasAuthoredCardContent(p))
      const scopedProcedures = allAuthoredProcedures
        .filter((p) => !context.setting || p.setting === context.setting)
        .filter((p) => !context.specialty || p.specialty === context.specialty)

      return {
        context,
        narrativeText: context.specialty
          ? `There are **${scopedProcedures.length}** authored procedure cards in **${context.specialty}**${context.setting ? ` (${context.setting})` : ""}. Across the whole library there are **${allAuthoredProcedures.length}** authored cards in total.`
          : `There are **${allAuthoredProcedures.length}** authored procedure cards in the library${context.setting ? ` for ${context.setting}` : ""}.`,
        stats: [
          { label: context.specialty ? `${context.specialty} cards` : "Authored cards", value: String(scopedProcedures.length) },
          ...(context.specialty ? [{ label: "Total in library", value: String(allAuthoredProcedures.length) }] : []),
        ],
        chips: ["Show procedures", "Browse by specialty", "Browse by anatomy"],
      }
    }

    case "smalltalk_greeting":
    case "smalltalk_thanks":
    case "smalltalk_status":
    case "smalltalk_compliment":
    case "smalltalk_confused":
    case "smalltalk_help_meta":
      return {
        context,
        chips: buildFallbackChips(context),
        stats: undefined,
      }

    case "broad_domain_browse": {
      const implantProcedures = findBroadDomainProcedureMatches(context, "implants", 6)
      return {
        context,
        matchedProcedures: implantProcedures,
        table: implantProcedures.length > 0
          ? {
              title: context.specialty ? `${context.specialty} implant procedures` : "Implant-authored procedures",
              columns: ["Procedure", "Specialty", "Setting"],
              rows: implantProcedures.map((procedure) => [procedure.name, procedure.specialty, procedure.setting]),
              rowHrefs: implantProcedures.map((procedure) => procedure.href),
            }
          : undefined,
        actions: implantProcedures.length > 0
          ? [{ label: `Open ${implantProcedures[0]!.name}`, href: implantProcedures[0]!.href, tone: "primary" }]
          : undefined,
        chips: implantProcedures.length > 0
          ? ["Show implant checks", "Show trays", "Keep it broad"]
          : buildProcedureHintChips("implants", context),
        stats: implantProcedures.length > 0
          ? [{ label: "Matches", value: String(implantProcedures.length) }]
          : context.stats,
      }
    }

    case "entity_intro": {
      const entityDefinition =
        carry?.entityLabel && carry.entityKind && carry.entityDescription && isGenericEntityFollowUpPrompt(prompt)
          ? { label: carry.entityLabel, kind: carry.entityKind, description: carry.entityDescription }
          : resolveEntityDefinition(prompt, { setting: context.setting, specialty: context.specialty })

      return {
        context,
        entityDefinition: entityDefinition ?? undefined,
        chips: entityDefinition
          ? entityDefinition.kind === "component"
            ? ["What is it?", "Show related systems", "Show products"]
            : ["What is it?", "Show implants", "Show products"]
          : undefined,
        stats: context.stats,
      }
    }

    case "related_systems": {
      if (!carry?.entityLabel || !carry.entityKind || !carry.entityDescription) {
        return { context, chips: ["What is it?", "Show implants", "Show products"], stats: context.stats }
      }

      const relatedSystems = getFixedDataRelatedSystems(
        carry.entityLabel,
        carry.entityKind === "component" ? "component" : "system",
        8,
      )

      return {
        context,
        entityDefinition: { label: carry.entityLabel, kind: carry.entityKind, description: carry.entityDescription },
        table: relatedSystems.length > 0
          ? {
              title: `${carry.entityLabel} related systems`,
              columns: ["System", "Supplier", "Context"],
              rows: relatedSystems.map((system) => [
                system.label,
                system.supplierName,
                system.procedureContexts[0] ?? system.category,
              ]),
            }
          : undefined,
        narrativeText: relatedSystems.length > 0
          ? `Keeping this anchored to **${carry.entityLabel}** and showing the related system constructs from the extracted fixed data.`
          : `No stronger related-system set for **${carry.entityLabel}** from the extracted data yet.`,
        chips: ["What is it?", "Show implants", "Show products"],
        stats: context.stats,
      }
    }

    case "entity_products": {
      if (!carry?.entityLabel || !carry.entityKind || !carry.entityDescription) {
        return { context, chips: ["Show related systems", "What is it?", "Show implants"], stats: context.stats }
      }

      const relatedProducts = resolveProductMatches(carry.entityLabel, 8)

      return {
        context,
        entityDefinition: { label: carry.entityLabel, kind: carry.entityKind, description: carry.entityDescription },
        table: relatedProducts.length > 0
          ? {
              title: `${carry.entityLabel} products`,
              columns: ["Item", "Supplier", "Category"],
              rows: relatedProducts.map((entry) => [
                entry.product.name,
                entry.product.supplier,
                entry.product.subcategory || entry.product.category,
              ]),
            }
          : undefined,
        narrativeText: relatedProducts.length > 0
          ? `Keeping this anchored to **${carry.entityLabel}** and showing the closest related products.`
          : `No stronger product set for **${carry.entityLabel}** from the current catalogue layer yet.`,
        chips: ["Show related systems", "What is it?", "Show implants"],
        stats: context.stats,
      }
    }

    case "procedure_systems": {
      const matchedProcedure = resolveProcedureFromIntent(intent, context, prompt, carry)

      if (matchedProcedure) {
        const variants = getCuratedVariantsForProcedureWithSystems(matchedProcedure.id, matchedProcedure.name)
        const choices = variants.flatMap((variant) =>
          variant.systems.map((system) => ({
            id: `${variant.id}:${system.id}`,
            label: system.name,
            description: variant.name,
            href: `/procedures/${encodeURIComponent(matchedProcedure.id)}?variant=${encodeURIComponent(variant.id)}&system=${encodeURIComponent(system.id)}`,
          })),
        )

        return {
          context,
          procedureName: matchedProcedure.name,
          variantChoices: choices.slice(0, 8),
          compactCard: {
            title: matchedProcedure.name,
            meta: buildCompactCardMeta({
              setting: matchedProcedure.setting,
              specialty: matchedProcedure.specialty,
              systemName: matchedProcedure.implantSystem,
            }),
            summary: buildCompactCardSummary(matchedProcedure.sections),
            checklist: buildCompactChecklist(matchedProcedure.sections),
            href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`,
          },
          actions: choices.length > 0
            ? [{ label: `Open ${choices[0]!.label}`, href: choices[0]!.href, tone: "primary" }]
            : [{ label: "Open full card", href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`, tone: "primary" }],
          stats: [{ label: "Systems", value: String(choices.length) }],
        }
      }

      return {
        context,
        chips: ["What systems for THR", "What systems for TKR", "What systems for hemiarthroplasty"],
        stats: context.stats,
      }
    }

    case "browse_procedures": {
      const browseScope = intent.entities?.browseLabel ? { label: intent.entities.browseLabel } : findBrowseScope(prompt)
      const specialtyScope = intent.entities?.specialty
      const browseContext = specialtyScope ? { ...context, specialty: specialtyScope } : context
      const matchedProcedures = (
        findProcedureMatchesForBrowse(prompt, browseContext).length > 0
          ? findProcedureMatchesForBrowse(prompt, browseContext)
          : isGenericProcedureBrowsePrompt(prompt)
            ? getBroadProcedureBrowseMatches(browseContext)
            : []
      )
        .filter((procedure) => hasAuthoredCardContent(procedure))
        .map((procedure) => {
          const fixedCount = procedure.sections.filter((s) => s.contentMode === "fixed").length
          const editableCount = procedure.sections.filter((s) => s.contentMode !== "fixed").length
          return {
            id: procedure.id,
            name: procedure.name,
            specialty: procedure.specialty,
            setting: procedure.setting,
            sectionsCount: procedure.sections.length,
            fixedCount,
            editableCount,
            href: `/procedures/${encodeURIComponent(procedure.id)}`,
            implantSystem: procedure.implantSystem,
          }
        })

      return {
        context,
        browseLabel: browseScope?.label ?? specialtyScope,
        matchedProcedures,
        table: matchedProcedures.length > 0
          ? {
              title: (browseScope?.label ?? specialtyScope) ? `${browseScope?.label ?? specialtyScope} procedures` : "Matching procedures",
              columns: ["Procedure", "Specialty", "Setting"],
              rows: matchedProcedures.map((procedure) => [procedure.name, procedure.specialty, procedure.setting]),
              rowHrefs: matchedProcedures.map((procedure) => procedure.href),
            }
          : undefined,
        actions: matchedProcedures.length > 0
          ? [{ label: `Open ${matchedProcedures[0]!.name}`, href: matchedProcedures[0]!.href, tone: "primary" }]
          : specialtyScope
            ? [{
                label: `Open ${specialtyScope}`,
                href: `/?setting=${encodeURIComponent(context.setting ?? "Operating Theatre")}&specialty=${encodeURIComponent(specialtyScope)}`,
                tone: "primary",
              }]
            : undefined,
        chips: matchedProcedures.length > 0 ? undefined : buildBrowsePromptChips(context),
        stats: matchedProcedures.length > 0 ? [{ label: "Matches", value: String(matchedProcedures.length) }] : context.stats,
      }
    }

    case "summary": {
      if (context.pageKind === "card") {
        return { context, stats: context.stats, chips: buildFallbackChips(context) }
      }

      if (
        carry?.entityLabel && carry.entityKind && carry.entityDescription &&
        /\bvariant\b/.test(normalizeForIntent(prompt))
      ) {
        return {
          context,
          entityDefinition: { label: carry.entityLabel, kind: carry.entityKind, description: carry.entityDescription },
          narrativeText: carry.entityKind === "component"
            ? `Keeping this tied to **${carry.entityLabel}** as the active component. If you mean another variant or construct in the same family, name it directly.`
            : `Keeping this tied to **${carry.entityLabel}** as the active system. Name the variant directly if you want a different one.`,
          chips: carry.entityKind === "component"
            ? ["Show related systems", "Show implants", "Show products"]
            : ["Show implants", "Show products", "What is it?"],
          stats: context.stats,
        }
      }

      const matchedProcedure = resolveProcedureFromIntent(intent, context, prompt, carry)
      if (matchedProcedure) {
        const disambiguation = buildProcedureDisambiguationEvidence(matchedProcedure, context, prompt)
        if (disambiguation) return disambiguation

        if (!hasAuthoredCardContent(matchedProcedure)) {
          return {
            context,
            narrativeText: `I found **${matchedProcedure.name}**, but there isn't an authored card for it yet. I can help you find a related authored card instead.`,
            chips: ["Browse related procedures", "Show implants", "What is it?"],
            stats: context.stats,
          }
        }

        const fixedCount = matchedProcedure.sections.filter((s) => s.contentMode === "fixed").length
        const editableCount = matchedProcedure.sections.filter((s) => s.contentMode !== "fixed").length

        return {
          context,
          stats: [
            { label: "Sections", value: String(matchedProcedure.sections.length) },
            { label: "Fixed", value: String(fixedCount) },
            { label: "Editable", value: String(editableCount) },
          ],
          compactCard: {
            title: matchedProcedure.name,
            meta: buildCompactCardMeta({
              setting: matchedProcedure.setting,
              specialty: matchedProcedure.specialty,
              systemName: matchedProcedure.implantSystem,
            }),
            summary: buildCompactCardSummary(matchedProcedure.sections),
            checklist: buildCompactChecklist(matchedProcedure.sections),
            href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`,
          },
          actions: [{ label: "Open full card", href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`, tone: "primary" }],
        }
      }

      if (carry?.entityLabel && carry.entityKind && carry.entityDescription) {
        return {
          context,
          entityDefinition: { label: carry.entityLabel, kind: carry.entityKind, description: carry.entityDescription },
          stats: context.stats,
        }
      }

      const matchedProcedures = findProcedureCandidateMatches(prompt, context)
      if (matchedProcedures.length > 0) {
        return {
          context,
          matchedProcedures,
          actions: [{ label: `Open ${matchedProcedures[0]!.name}`, href: matchedProcedures[0]!.href, tone: "primary" }],
          stats: [{ label: "Matches", value: String(matchedProcedures.length) }],
        }
      }

      return { context, stats: context.stats, chips: buildProcedureHintChips("summary", context) }
    }

    case "compare_cards": {
      const matchedProcedures = findProcedureMatches(prompt, context)
        .filter((procedure) => hasAuthoredCardContent(procedure))
        .map((procedure) => {
          const fixedCount = procedure.sections.filter((s) => s.contentMode === "fixed").length
          const editableCount = procedure.sections.filter((s) => s.contentMode !== "fixed").length
          return {
            id: procedure.id,
            name: procedure.name,
            specialty: procedure.specialty,
            setting: procedure.setting,
            sectionsCount: procedure.sections.length,
            fixedCount,
            editableCount,
            href: `/procedures/${encodeURIComponent(procedure.id)}`,
            implantSystem: procedure.implantSystem,
          }
        })

      return {
        context,
        matchedProcedures,
        table: matchedProcedures.length >= 2 ? buildCompareTable(matchedProcedures) : undefined,
        actions: matchedProcedures.slice(0, 2).map((procedure, index) => ({
          label: `Open ${procedure.name}`,
          href: procedure.href,
          tone: index === 0 ? "primary" : "secondary",
        })),
        chips: matchedProcedures.length < 2 ? ["Compare hemiarthroplasty and THR", "DHS vs PFNA", "Compare TKR and UKR"] : undefined,
      }
    }

    case "walkthroughs": {
      if (context.pageKind === "card") {
        const procedure = context.procedureId ? getProcedureByIdSnapshot(context.procedureId) : undefined
        if (procedure) {
          return {
            context,
            walkthroughs: { title: "Related walkthroughs", items: getMockWalkthroughs(procedure) },
            actions: [{ label: "Open full card", href: `/procedures/${encodeURIComponent(procedure.id)}`, tone: "primary" }],
          }
        }
      }

      const matchedProcedure = resolveProcedureFromIntent(intent, context, prompt, carry)
      if (matchedProcedure) {
        const disambiguation = buildProcedureDisambiguationEvidence(matchedProcedure, context, prompt)
        if (disambiguation) return disambiguation

        return {
          context,
          walkthroughs: { title: `${matchedProcedure.name} walkthroughs`, items: getMockWalkthroughs(matchedProcedure) },
          compactCard: {
            title: matchedProcedure.name,
            meta: buildCompactCardMeta({
              setting: matchedProcedure.setting,
              specialty: matchedProcedure.specialty,
              systemName: matchedProcedure.implantSystem,
            }),
            summary: buildCompactCardSummary(matchedProcedure.sections),
            checklist: buildCompactChecklist(matchedProcedure.sections),
            href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`,
          },
          actions: [{ label: "Open full card", href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`, tone: "primary" }],
        }
      }

      return { context, chips: buildProcedureHintChips("walkthroughs", context) }
    }

    case "prepare_card": {
      if (context.pageKind === "card") {
        return {
          context,
          stats: context.stats,
          compactCard: {
            title: context.procedureName ?? context.title,
            meta: buildCompactCardMeta({
              setting: context.setting,
              specialty: context.specialty,
              variantName: context.variantName,
              systemName: context.systemName,
            }),
            summary: buildCompactCardSummary(context.sections),
            checklist: buildCompactChecklist(context.sections),
            href: context.procedureId ? `/procedures/${encodeURIComponent(context.procedureId)}` : undefined,
          },
        }
      }

      const matchedProcedure = resolveProcedureFromIntent(intent, context, prompt, carry)
      if (matchedProcedure) {
        const disambiguation = buildProcedureDisambiguationEvidence(matchedProcedure, context, prompt)
        if (disambiguation) return disambiguation

        return {
          context,
          compactCard: {
            title: matchedProcedure.name,
            meta: buildCompactCardMeta({
              setting: matchedProcedure.setting,
              specialty: matchedProcedure.specialty,
              systemName: matchedProcedure.implantSystem,
            }),
            summary: buildCompactCardSummary(matchedProcedure.sections),
            checklist: buildCompactChecklist(matchedProcedure.sections),
            href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`,
          },
        }
      }

      return { context, chips: buildProcedureHintChips("prepare", context) }
    }

    case "catalogue": {
      const reply = buildCatalogueReply(prompt)
      return {
        context,
        narrativeText: reply.text,
        table: reply.table,
        actions: reply.actions,
        chips: reply.chips,
        stats: context.stats,
      }
    }

    case "navigation": {
      return { context, actions: matchRouteTarget(prompt), stats: context.stats }
    }

    case "notes": {
      if (context.pageKind === "card") {
        const section = findSectionFromProcedure({ sections: context.sections ?? [] }, ["note"])
        return {
          context,
          compactCard: context.procedureId
            ? {
                title: context.procedureName ?? context.title,
                meta: buildCompactCardMeta({
                  setting: context.setting,
                  specialty: context.specialty,
                  variantName: context.variantName,
                  systemName: context.systemName,
                }),
                summary: buildNotesExcerpt(section) ?? buildCompactCardSummary(context.sections),
                checklist: buildCompactChecklist(context.sections),
                href: `/procedures/${encodeURIComponent(context.procedureId)}`,
              }
            : undefined,
          actions: context.procedureId
            ? [{ label: "Open full card", href: `/procedures/${encodeURIComponent(context.procedureId)}`, tone: "primary" }]
            : undefined,
          stats: context.stats,
        }
      }

      const matchedProcedure = resolveProcedureFromIntent(intent, context, prompt, carry)
      const disambiguation = matchedProcedure ? buildProcedureDisambiguationEvidence(matchedProcedure, context, prompt) : undefined
      if (disambiguation) return disambiguation

      const section = matchedProcedure ? findSectionFromProcedure(matchedProcedure, ["note"]) : undefined

      return {
        context,
        compactCard: matchedProcedure
          ? {
              title: matchedProcedure.name,
              meta: buildCompactCardMeta({
                setting: matchedProcedure.setting,
                specialty: matchedProcedure.specialty,
                systemName: matchedProcedure.implantSystem,
              }),
              summary: buildNotesExcerpt(section) ?? buildCompactCardSummary(matchedProcedure.sections),
              checklist: buildCompactChecklist(matchedProcedure.sections),
              href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`,
            }
          : undefined,
        actions: matchedProcedure
          ? [{ label: "Open full card", href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`, tone: "primary" }]
          : undefined,
        chips: matchedProcedure ? undefined : buildProcedureHintChips("notes", context),
        stats: context.stats,
      }
    }

    case "references": {
      if (context.pageKind === "card") {
        const section = findSectionFromProcedure({ sections: context.sections ?? [] }, ["reference"])
        return {
          context,
          table: buildReferenceTable(section),
          actions: context.procedureId
            ? [{ label: "Open full card", href: `/procedures/${encodeURIComponent(context.procedureId)}`, tone: "primary" }]
            : undefined,
          stats: context.stats,
        }
      }

      const matchedProcedure = resolveProcedureFromIntent(intent, context, prompt, carry)
      const disambiguation = matchedProcedure ? buildProcedureDisambiguationEvidence(matchedProcedure, context, prompt) : undefined
      if (disambiguation) return disambiguation

      const section = matchedProcedure ? findSectionFromProcedure(matchedProcedure, ["reference"]) : undefined

      return {
        context,
        table: buildReferenceTable(section, `${matchedProcedure?.name ?? "Procedure"} references`),
        compactCard: matchedProcedure
          ? {
              title: matchedProcedure.name,
              meta: buildCompactCardMeta({
                setting: matchedProcedure.setting,
                specialty: matchedProcedure.specialty,
                systemName: matchedProcedure.implantSystem,
              }),
              summary: buildCompactCardSummary(matchedProcedure.sections),
              checklist: buildCompactChecklist(matchedProcedure.sections),
              href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`,
            }
          : undefined,
        actions: matchedProcedure
          ? [{ label: "Open full card", href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`, tone: "primary" }]
          : undefined,
        chips: matchedProcedure ? undefined : buildProcedureHintChips("references", context),
        stats: context.stats,
      }
    }

    case "trays": {
      if (context.pageKind === "card") {
        const traySection = findSection(context.sections, "tray")
        return { context, table: traySection ? buildSectionTable(traySection) : undefined, stats: context.stats }
      }

      const matchedProcedure = resolveProcedureFromIntent(intent, context, prompt, carry)
      const disambiguation = matchedProcedure ? buildProcedureDisambiguationEvidence(matchedProcedure, context, prompt) : undefined
      if (disambiguation) return disambiguation

      const traySection = matchedProcedure
        ? findSectionFromProcedure(matchedProcedure, ["tray", "instrument", "set"])
        : undefined

      return {
        context,
        table: traySection ? buildSectionTable(traySection, `${matchedProcedure?.name ?? "Procedure"} trays`) : undefined,
        compactCard: matchedProcedure
          ? {
              title: matchedProcedure.name,
              meta: buildCompactCardMeta({
                setting: matchedProcedure.setting,
                specialty: matchedProcedure.specialty,
                systemName: matchedProcedure.implantSystem,
              }),
              summary: buildCompactCardSummary(matchedProcedure.sections),
              checklist: buildCompactChecklist(matchedProcedure.sections),
              href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`,
            }
          : undefined,
        actions: matchedProcedure
          ? [{ label: "Open full card", href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`, tone: "primary" }]
          : undefined,
        chips: matchedProcedure ? undefined : buildProcedureHintChips("trays", context),
        stats: context.stats,
      }
    }

    case "consumables": {
      if (context.pageKind === "card") {
        const section =
          findSection(context.sections, "consumable") ??
          findSection(context.sections, "drap") ??
          findSection(context.sections, "ppe") ??
          findSection(context.sections, "medication")
        return {
          context,
          table: section ? buildSectionTable(section) : undefined,
          actions: [{ label: "Open catalogue", href: "/catalogue", tone: "primary" }],
          stats: context.stats,
        }
      }

      const matchedProcedure = resolveProcedureFromIntent(intent, context, prompt, carry)
      const disambiguation = matchedProcedure ? buildProcedureDisambiguationEvidence(matchedProcedure, context, prompt) : undefined
      if (disambiguation) return disambiguation

      const section = matchedProcedure
        ? findSectionFromProcedure(matchedProcedure, ["consumable", "drap", "ppe", "medication"])
        : undefined

      return {
        context,
        table: section ? buildSectionTable(section, `${matchedProcedure?.name ?? "Procedure"} consumables`) : undefined,
        compactCard: matchedProcedure
          ? {
              title: matchedProcedure.name,
              meta: buildCompactCardMeta({
                setting: matchedProcedure.setting,
                specialty: matchedProcedure.specialty,
                systemName: matchedProcedure.implantSystem,
              }),
              summary: buildCompactCardSummary(matchedProcedure.sections),
              checklist: buildCompactChecklist(matchedProcedure.sections),
              href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`,
            }
          : undefined,
        actions: matchedProcedure
          ? [{ label: "Open full card", href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`, tone: "primary" }]
          : [{ label: "Open catalogue", href: "/catalogue", tone: "primary" }],
        chips: matchedProcedure ? undefined : buildProcedureHintChips("consumables", context),
        stats: context.stats,
      }
    }

    case "implants": {
      if (context.pageKind === "card") {
        const section = findSectionFromProcedure({ sections: context.sections ?? [] }, ["implant", "prosthe"])
        return {
          context,
          table: section ? buildSectionTable(section, "Implants and prosthetics") : undefined,
          actions: context.procedureId
            ? [{ label: "Open full card", href: `/procedures/${encodeURIComponent(context.procedureId)}`, tone: "primary" }]
            : undefined,
          stats: context.stats,
        }
      }

      if (
        (carry?.entityKind === "system" || carry?.entityKind === "component") &&
        carry.entityLabel && !findProcedureMatch(prompt, context)
      ) {
        const relatedComponents = carry.entityKind === "system"
          ? getFixedDataComponentsForSystem(carry.entityLabel, 8)
          : resolveFixedDataComponentMatches(carry.entityLabel, 8)
        const relatedProducts = resolveProductMatches(carry.entityLabel, 8)

        return {
          context,
          entityDefinition: carry.entityDescription
            ? { label: carry.entityLabel, kind: carry.entityKind, description: carry.entityDescription }
            : undefined,
          table: relatedComponents.length > 0
            ? {
                title: carry.entityKind === "system" ? `${carry.entityLabel} components` : `${carry.entityLabel} contexts`,
                columns: ["Item", "System", "Supplier"],
                rows: relatedComponents.map((entry) => [entry.label, entry.systemName, entry.supplierName]),
              }
            : relatedProducts.length > 0
              ? {
                  title: `${carry.entityLabel} products`,
                  columns: ["Item", "Supplier", "Category"],
                  rows: relatedProducts.map((entry) => [
                    entry.product.name,
                    entry.product.supplier,
                    entry.product.subcategory || entry.product.category,
                  ]),
                }
              : undefined,
          chips: carry.entityKind === "component"
            ? ["Show related systems", "What is it?", "Show products"]
            : relatedProducts.length > 0 || relatedComponents.length > 0
              ? ["Show related procedures", "What is it?", "Show products"]
              : ["Show related procedures", "What is it?"],
          stats: context.stats,
        }
      }

      // Strip implant/section noise before procedure resolution so "implants for THR" finds THR cleanly
      const implantCleanedPrompt = prompt
        .replace(/\b(implant|implants|prosthes[ei]s|prosthetics?|component|components|show|for|me|the|a|an)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
      const matchedProcedure =
        resolveProcedureFromIntent(intent, context, implantCleanedPrompt || prompt, carry) ??
        resolveProcedureFromIntent(intent, context, prompt, carry)
      const disambiguation = matchedProcedure ? buildProcedureDisambiguationEvidence(matchedProcedure, context, prompt) : undefined
      if (disambiguation) return disambiguation

      const section = matchedProcedure ? findSectionFromProcedure(matchedProcedure, ["implant", "prosthe"]) : undefined

      if (matchedProcedure) {
        return {
          context,
          table: section ? buildSectionTable(section, `${matchedProcedure.name} implants`) : undefined,
          compactCard: {
            title: matchedProcedure.name,
            meta: buildCompactCardMeta({
              setting: matchedProcedure.setting,
              specialty: matchedProcedure.specialty,
              systemName: matchedProcedure.implantSystem,
            }),
            summary: buildCompactCardSummary(matchedProcedure.sections),
            checklist: buildCompactChecklist(matchedProcedure.sections),
            href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`,
          },
          actions: [{ label: "Open full card", href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`, tone: "primary" }],
          stats: context.stats,
        }
      }

      const matchedProcedures = findProcedureCandidateMatches(implantCleanedPrompt || prompt, context)
      if (matchedProcedures.length > 0) {
        return {
          context,
          matchedProcedures,
          actions: [{ label: `Open ${matchedProcedures[0]!.name}`, href: matchedProcedures[0]!.href, tone: "primary" }],
          stats: [{ label: "Matches", value: String(matchedProcedures.length) }],
        }
      }

      const broadMatches = findBroadDomainProcedureMatches(context, "implants", 6)
      if (broadMatches.length > 0) {
        return {
          context,
          matchedProcedures: broadMatches,
          table: {
            title: context.specialty ? `${context.specialty} implant procedures` : "Implant-authored procedures",
            columns: ["Procedure", "Specialty", "Setting"],
            rows: broadMatches.map((procedure) => [procedure.name, procedure.specialty, procedure.setting]),
            rowHrefs: broadMatches.map((procedure) => procedure.href),
          },
          actions: [{ label: `Open ${broadMatches[0]!.name}`, href: broadMatches[0]!.href, tone: "primary" }],
          chips: ["Show implant checks", "Keep it broad", "Open procedure card"],
          stats: [{ label: "Matches", value: String(broadMatches.length) }],
        }
      }

      return { context, chips: buildProcedureHintChips("implants", context), stats: context.stats }
    }

    case "missing_sizes": {
      if (context.pageKind === "card") {
        const systemName = context.systemName ?? "current system"
        const sizeFocus = getSizeFocus(prompt)
        return {
          context,
          table: filterSizeTableByFocus(
            buildSizeTable(context.procedureName ?? context.title, context.variantName, systemName),
            sizeFocus,
          ),
          sizeFocus,
          actions: context.procedureId
            ? [{ label: "Open full card", href: `/procedures/${encodeURIComponent(context.procedureId)}`, tone: "primary" }]
            : undefined,
          stats: context.stats,
        }
      }

      const matchedProcedure = resolveProcedureFromIntent(intent, context, prompt, carry)
      const sizeFocus = intent.entities?.sizeFocus ?? getSizeFocus(prompt)

      if (matchedProcedure) {
        const disambiguation = buildProcedureDisambiguationEvidence(matchedProcedure, context, prompt)
        if (disambiguation) return disambiguation

        return {
          context,
          table: filterSizeTableByFocus(
            buildSizeTable(matchedProcedure.name, matchedProcedure.variantLabel, matchedProcedure.implantSystem ?? "current system"),
            sizeFocus,
          ),
          sizeFocus,
          compactCard: {
            title: matchedProcedure.name,
            meta: buildCompactCardMeta({
              setting: matchedProcedure.setting,
              specialty: matchedProcedure.specialty,
              systemName: matchedProcedure.implantSystem,
            }),
            summary: buildCompactCardSummary(matchedProcedure.sections),
            checklist: buildCompactChecklist(matchedProcedure.sections),
            href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`,
          },
          actions: [{ label: "Open full card", href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`, tone: "primary" }],
          stats: context.stats,
        }
      }

      return { context, chips: buildProcedureHintChips("missing_sizes", context), stats: context.stats }
    }

    case "implant_sizes": {
      if (context.pageKind === "card") {
        const systemName = context.systemName ?? "current system"
        const sizeFocus = getSizeFocus(prompt)
        return {
          context,
          table: filterSizeTableByFocus(
            buildSizeTable(context.procedureName ?? context.title, context.variantName, systemName),
            sizeFocus,
          ),
          sizeFocus,
          stats: context.stats,
        }
      }

      const matchedProcedure = resolveProcedureFromIntent(intent, context, prompt)
      const sizeFocus = intent.entities?.sizeFocus ?? getSizeFocus(prompt)

      if (matchedProcedure) {
        const disambiguation = buildProcedureDisambiguationEvidence(matchedProcedure, context, prompt)
        if (disambiguation) return disambiguation

        return {
          context,
          table: filterSizeTableByFocus(
            buildSizeTable(matchedProcedure.name, matchedProcedure.variantLabel, matchedProcedure.implantSystem ?? "current system"),
            sizeFocus,
          ),
          sizeFocus,
          compactCard: {
            title: matchedProcedure.name,
            meta: buildCompactCardMeta({
              setting: matchedProcedure.setting,
              specialty: matchedProcedure.specialty,
              systemName: matchedProcedure.implantSystem,
            }),
            summary: buildCompactCardSummary(matchedProcedure.sections),
            checklist: buildCompactChecklist(matchedProcedure.sections),
            href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`,
          },
          actions: [{ label: "Open full card", href: `/procedures/${encodeURIComponent(matchedProcedure.id)}`, tone: "primary" }],
          stats: context.stats,
        }
      }

      return { context, chips: buildProcedureHintChips("implant_sizes", context), stats: context.stats }
    }

    case "specialties": {
      const specialtyCount = context.setting ? (SETTING_SPECIALTIES[context.setting]?.length ?? 0) : 0
      return {
        context,
        specialtyCount,
        stats: specialtyCount > 0 ? [{ label: "Specialties", value: String(specialtyCount) }] : context.stats,
        launcher: { title: "Specialties", items: getSpecialtyLauncherItems(context.setting) },
      }
    }

    case "workflow_tools": {
      return {
        context,
        stats: context.stats,
        launcher: { title: "Workflow tools", items: getWorkflowLauncherItems() },
      }
    }

    default: {
      return {
        context,
        stats: context.stats,
        chips: buildAssistantWelcome(context).chips,
      }
    }
  }
}

// ─────────────────────────────────────────────
// RESPONSE PLAN BUILDER
// ─────────────────────────────────────────────

function buildResponsePlan(intent: AssistantIntent, evidence: AssistantEvidence, prompt: string): AssistantResponsePlan {
  const seed = `${intent.id}:${prompt}:${evidence.context.title}`

  // ── Disambiguation plan ──
  if (evidence.variantChoices?.length && evidence.procedureName && evidence.disambiguationKind) {
    if (evidence.disambiguationKind === "approach") {
      return {
        leadIn: withAcknowledgement(intent.id, seed, prompt, pickVariant([
          "There are a few different ways this procedure is set up here.",
          "This one branches — I want the approach clear before I narrow it.",
          "I can bring it forward, but there are multiple approaches available.",
        ], `${seed}:approach`)),
        text: `**${evidence.procedureName}** has more than one **approach** configured in the library. Which one are you working with? Once I know, I can narrow to the right **system** too if needed.`,
        variantChoices: evidence.variantChoices,
      }
    }
    return {
      leadIn: withAcknowledgement(intent.id, seed, prompt, pickVariant([
        "Approach is clear — now I need the system.",
        "Good, we're at the right approach level.",
        "That gets us to the right approach.",
      ], `${seed}:system`)),
      text: `For **${evidence.procedureName}**, I'm inside **${evidence.disambiguationTarget ?? "that approach"}** but there's more than one **system** attached. Which system do you want?`,
      variantChoices: evidence.variantChoices,
    }
  }

  switch (intent.id) {

    case "repair_previous_turn":
      return {
        leadIn: pickVariant(["You're right.", "Fair enough.", "I missed the target there.", "Got it — let me reset."], seed),
        text: evidence.compactCard
          ? `You were asking about **${evidence.compactCard.title}** and I should have stayed anchored to that. I can take you straight into the card, the implant section, or the supporting setup from here.`
          : "I missed your intended target. Let me anchor back to what you actually meant and take it from there.",
        compactCard: evidence.compactCard,
        actions: evidence.actions,
        chips: evidence.chips,
        stats: evidence.stats,
      }

    case "user_correction":
      return {
        leadIn: pickVariant(["Understood.", "Got it.", "Correcting course.", "On it — switching now."], seed),
        text: evidence.compactCard
          ? `Switching to **${evidence.compactCard.title}**. I'll stay anchored here from now unless you say otherwise.`
          : "I'll stay on whatever you name next. What's the correct procedure or card?",
        compactCard: evidence.compactCard,
        actions: evidence.actions,
        chips: evidence.chips,
        stats: evidence.stats,
      }

    case "source_check":
      return {
        leadIn: pickVariant([
          "Here's what I'm grounding against.",
          "This is the source logic I'm using right now.",
          "Good question — here's the grounding breakdown.",
        ], seed),
        text: evidence.narrativeText ?? "Grounding against the strongest available structured source first.",
        stats: evidence.stats,
      }

    case "what_can_you_do":
      return {
        leadIn: pickVariant([
          "Here's what I can do.",
          "Happy to explain what I'm built for.",
          "Sure — here's the full picture.",
        ], seed),
        text: evidence.narrativeText ?? "I can help you find procedure cards, check implants, pull up trays, compare procedures, and navigate PrepSight — just ask naturally.",
        chips: evidence.chips,
        stats: evidence.stats,
      }

    case "procedure_count":
      return {
        leadIn: pickVariant([
          "Here's the count.",
          "Good question — here's what the library has.",
          "Let me pull the numbers.",
        ], seed),
        text: evidence.narrativeText ?? "I can give you a count once I know which area you're asking about.",
        stats: evidence.stats,
        chips: evidence.chips,
      }

    case "broad_domain_browse":
      return evidence.table
        ? {
            leadIn: pickVariant([
              "Keeping it broad and grounded.",
              "Here's the widest useful view I can give you.",
              "I've surfaced the strongest implant-authored targets first.",
            ], seed),
            text: evidence.context.specialty
              ? `I'm staying inside **${evidence.context.specialty}** and surfacing the procedures that already have authored implant coverage, so you get something actionable rather than a vague specialty overview.`
              : "I'm surfacing the strongest implant-authored procedure targets first so you can pick the right route without having to name one exactly.",
            table: evidence.table,
            matchedProcedures: evidence.matchedProcedures,
            actions: evidence.actions,
            chips: evidence.chips,
            stats: evidence.stats,
          }
        : {
            leadIn: pickVariant([
              "I can keep this broad — just need a little more to go on.",
              "Happy to start at the concept level.",
              "Let's start broad and narrow from there.",
            ], seed),
            text: "I can explain the implant side at a concept level first, or narrow into a specific procedure as soon as you want to drill down.",
            chips: evidence.chips,
            stats: evidence.stats,
          }

    case "entity_intro":
      return {
        leadIn: pickVariant([
          "Here's the closest read of that term.",
          "Most likely this is what you're pointing at.",
          "I think I know what you mean — let me confirm.",
          "This is the closest definition I can ground that to.",
        ], seed),
        text: evidence.entityDefinition
          ? `**${evidence.entityDefinition.label}** is ${/^[aeiou]/i.test(evidence.entityDefinition.description.replace(/^(a|an|the)\s+/i, "")) ? `an ${evidence.entityDefinition.description.replace(/^(a|an|the)\s+/i, "")}` : /^(a|an|the)\b/i.test(evidence.entityDefinition.description) ? evidence.entityDefinition.description : `a ${evidence.entityDefinition.description.charAt(0).toLowerCase()}${evidence.entityDefinition.description.slice(1)}`}. What do you want to do with it?`
          : "I can probably define that, but I need one more clue before I commit — there's more than one thing that could match.",
        entityDefinition: evidence.entityDefinition,
        chips: evidence.chips,
      }

    case "related_systems":
      return {
        leadIn: pickVariant([
          "Here are the related system constructs.",
          "These are the linked systems I can anchor to from here.",
          "This is the related system set from the extracted data.",
        ], seed),
        text: evidence.narrativeText,
        entityDefinition: evidence.entityDefinition,
        table: evidence.table,
        chips: evidence.chips,
        stats: evidence.stats,
      }

    case "entity_products":
      return {
        leadIn: pickVariant([
          "Here are the closest related products.",
          "These are the nearest catalogue products without leaving the current entity context.",
          "I've kept this anchored to the active entity.",
        ], seed),
        text: evidence.narrativeText,
        entityDefinition: evidence.entityDefinition,
        table: evidence.table,
        chips: evidence.chips,
        stats: evidence.stats,
      }

    case "welcome":
      return {
        leadIn: pickVariant([
          "I'm ready when you are.",
          "We can start anywhere.",
          "I'm here — tell me what you want to bring forward.",
          "All set. What are we working on?",
        ], seed),
        text: `${evidence.context.description} Just ask naturally and I'll shape the answer around what's actually on this page. ${invitationPrompt(prompt, seed,
          ["Tell me whether you want a card, a section, a comparison, or the quickest route into the right workspace."],
          ["If you'd like, I can start with a card, a section, a comparison, or the quickest route."],
        )}`,
        stats: evidence.stats,
        chips: evidence.chips,
      }

    case "smalltalk_greeting":
      return {
        leadIn: pickVariant([
          "Hi — what are we looking for?",
          "Hey. What do you want to pull up?",
          "Hello! Where do you want to start?",
          "Hi there. What's on the list today?",
          "Hey — good to go. What do you need?",
        ], seed),
        text: pickVariant([
          "I can keep it broad or go straight into the detail, depending on what you need.",
          "Point me at the area you care about and I'll bring the useful part forward first.",
          "Ask me about a procedure, a product, or anything else on PrepSight and I'll get it.",
          "Whether you want a card summary, a tray list, or just to find something — I'm on it.",
        ], `${seed}:body`),
      }

    case "smalltalk_thanks":
      return {
        leadIn: pickVariant(["Any time.", "Of course.", "Happy to help.", "Glad that worked.", "No problem at all."], seed),
        text: pickVariant([
          "Just let me know what you need next.",
          "We can keep building from here if there's more.",
          "Ask away if there's another angle you want to explore.",
          "I'm here if there's anything else on the list.",
        ], `${seed}:body`),
      }

    case "smalltalk_status":
      return {
        leadIn: pickVariant([
          "Ready and waiting. What are we pulling up?",
          "All good here — what do you need?",
          "Doing exactly what I'm built for. What's next?",
          "Sharp and ready. What are we working on?",
        ], seed),
        text: pickVariant([
          "Just say what you need in your own words and I'll work out the most useful entry point.",
          "You don't need to phrase it neatly — just tell me what you're after.",
          "Say it however feels natural. I'll handle the structure on my end.",
          "No need to be precise — give me the rough shape and I'll fill in the rest.",
        ], `${seed}:body`),
      }

    case "smalltalk_compliment":
      return {
        leadIn: pickVariant([
          "Thanks — that genuinely helps to hear.",
          "Really glad it's useful.",
          "That means a lot, thank you.",
          "Appreciated — let's keep the momentum going.",
        ], seed),
        text: pickVariant([
          "Let me know what you need next and I'll keep it at the same level.",
          "There's more where that came from — just ask.",
          "I'm here whenever you need me. What's next?",
        ], `${seed}:body`),
      }

    case "smalltalk_confused":
      return {
        leadIn: pickVariant([
          "No worries — let me orient you.",
          "That's fine — let's reset.",
          "Happy to explain what's going on here.",
          "Let me help you find your footing.",
        ], seed),
        text: evidence.context.pageKind === "card"
          ? `You're on a **procedure card** — think of it as a structured prep sheet for a surgical case. I can summarise it, pull specific sections like trays or implants, show walkthroughs, or take you somewhere else entirely. What would help most right now?`
          : `You're on PrepSight — a surgical preparation platform. I can help you find procedure cards, check implant details, navigate to a specialty, or search the product catalogue. Just tell me what you're trying to do.`,
        chips: buildFallbackChips(evidence.context),
      }

    case "smalltalk_help_meta":
      return {
        leadIn: pickVariant([
          "Here's a quick guide to what you can ask.",
          "Let me show you the most useful starting points.",
          "Happy to walk you through it.",
          "Good place to start — here's what I can do.",
        ], seed),
        text: evidence.context.pageKind === "card"
          ? `On a **card**, try asking things like: *"Summarise this card"*, *"Show me the trays"*, *"What implants are used?"*, *"Are there any walkthroughs?"*, or *"What are the prep notes?"*. You can also ask about **sizes**, **references**, or **consumables** for this or any other procedure.`
          : `Try asking things like: *"Show me knee procedures"*, *"Prepare a THR"*, *"Compare hemi and THR"*, *"Find Palacos in the catalogue"*, or *"Take me to orthopaedics"*. You can also ask me what's available in a specialty or navigate to any part of PrepSight.`,
        chips: buildFallbackChips(evidence.context),
      }

    case "summary": {
      const summary = evidence.narrativeText
        ? { text: evidence.narrativeText, stats: evidence.stats, actions: evidence.actions }
        : evidence.compactCard
          ? {
              text: `I matched that to **${evidence.compactCard.title}**. Here's the compact read first so you can orient before opening the full working card — the shape of it, the key setup cues, and the quickest path into the detail you actually need.`,
              stats: evidence.stats,
              actions: evidence.actions,
            }
          : evidence.entityDefinition
            ? {
                text: `You were asking about **${evidence.entityDefinition.label}** — it is ${/^[aeiou]/i.test(evidence.entityDefinition.description.replace(/^(a|an|the)\s+/i, "")) ? `an ${evidence.entityDefinition.description.replace(/^(a|an|the)\s+/i, "")}` : /^(a|an|the)\b/i.test(evidence.entityDefinition.description) ? evidence.entityDefinition.description : `a ${evidence.entityDefinition.description.charAt(0).toLowerCase()}${evidence.entityDefinition.description.slice(1)}`}.`,
                stats: evidence.stats,
                actions: evidence.actions,
              }
            : evidence.matchedProcedures?.length
              ? {
                  text: "More than one plausible procedure behind that wording — I'm surfacing the closest matches rather than picking blindly. Pick the right card and I'll stay anchored to it from there.",
                  stats: evidence.stats,
                  actions: evidence.actions,
                }
              : buildSummaryReply(evidence.context)

      return {
        leadIn: withAcknowledgement("summary", seed, prompt, pickVariant([
          "Here's the quickest read.",
          "At a glance, this is what's in front of you.",
          "Here's the shape of it.",
          "Let me give you the fast version first.",
          "Here's the condensed view.",
        ], seed)),
        text: summary.text,
        stats: summary.stats,
        actions: summary.actions,
        chips: evidence.chips,
        compactCard: evidence.compactCard,
        matchedProcedures: evidence.matchedProcedures,
      }
    }

    case "browse_procedures":
      return evidence.table
        ? {
            leadIn: pickVariant([
              "Here's the closest procedure set from that area.",
              "I've pulled the strongest matching cards forward.",
              "These are the procedure cards that line up most closely.",
              "Here's what's in the library for that.",
            ], seed),
            text: evidence.browseLabel
              ? `Grounding this to the cards under **${evidence.browseLabel}**, so what you see here is something you can open and work from straight away rather than a vague specialty overview.`
              : "Keeping this grounded to **authored procedure cards** so everything here is openable and workable right now.",
            table: evidence.table,
            actions: evidence.actions,
            matchedProcedures: evidence.matchedProcedures,
            stats: evidence.stats,
          }
        : {
            leadIn: pickVariant([
              "I can get there — I just need the area a bit clearer.",
              "That browse request works, I just need a tighter target.",
              "Nearly there — name the anatomy or subspecialty directly.",
            ], seed),
            text: evidence.browseLabel
              ? `I can see you're aiming at **${evidence.browseLabel}** but I don't have a tight enough card match yet. Give me the anatomy, subspecialty, or procedure family a bit more directly.`
              : "Try naming the anatomy or subspecialty directly and I'll pull the closest procedure cards for it.",
            actions: evidence.actions,
            chips: evidence.chips,
          }

    case "prepare_card":
      return {
        leadIn: withAcknowledgement("prepare_card", seed, prompt, pickVariant([
          "Let's get the essentials up first.",
          "The cleanest starting point is the card itself.",
          "I'd start with the core card.",
          "Here's the fast prep read.",
        ], seed)),
        text: evidence.compactCard
          ? `Here's the **compact version** first so you can orient before opening the full working surface. This gives you the **procedure frame**, the **key setup cues**, and the fastest path into the full card when you're ready to work in detail. ${invitationPrompt(prompt, seed,
              ["I can take you straight into the full card from here.", "Want me to open the full card next?"],
              ["If you'd like, I can take you straight into the full card.", "If that helps, I can open the full card next."],
            )}`
          : "I haven't pinned the procedure down yet. Name it directly and I'll bring the right card forward.",
        stats: evidence.stats,
        compactCard: evidence.compactCard,
        chips: evidence.compactCard ? undefined : buildProcedureHintChips("prepare", evidence.context),
      }

    case "compare_cards":
      return evidence.table
        ? {
            leadIn: withAcknowledgement("compare_cards", seed, prompt, pickVariant([
              "Here's the side-by-side.",
              "I've lined up the closest pair.",
              "Here's the grounded comparison.",
              "Side by side — here's what the library knows about each.",
            ], seed)),
            text: "This is anchored to **authored card structure and metadata**, so I'm comparing what PrepSight actually knows about each procedure rather than guessing at clinical differences that aren't in the data.",
            table: evidence.table,
            actions: evidence.actions,
            matchedProcedures: evidence.matchedProcedures,
          }
        : {
            leadIn: pickVariant([
              "I can compare them — I just need both names a bit clearer.",
              "The side-by-side is ready to go once I have the two targets.",
              "Almost there — I need both procedure names in one message.",
            ], seed),
            text: `I haven't locked onto two specific procedures yet. Put both names in one message and I'll build the grounded side-by-side. ${invitationPrompt(prompt, seed,
              ["I can help you tighten the pair if you want.", "Want me to suggest the closest pair?"],
              ["If you'd like, I can help narrow the pair.", "If that helps, I can suggest a likely pair."],
            )}`,
            chips: evidence.chips,
          }

    case "visual": {
      const visual = buildVisualReply(evidence.context)
      return {
        leadIn: withAcknowledgement("visual", seed, prompt, pickVariant([
          "Here's the quickest visual read.",
          "At a glance, this is the shape of the page.",
          "Here's the fast overview.",
          "Here's the condensed view of what's here.",
        ], seed)),
        text: `${visual.text} Keeping it compact so you can decide whether to stay at this level or go deeper.`,
        stats: visual.stats,
      }
    }

    case "navigation":
      return {
        leadIn: withAcknowledgement("navigation", seed, prompt, pickVariant([
          "I can take you there.",
          "That's in range.",
          "I can open that directly.",
          "On it — here's the route.",
        ], seed)),
        text: evidence.actions && evidence.actions.length > 0
          ? `Here's the closest route so you don't have to back yourself out and hunt for it manually. ${invitationPrompt(prompt, seed,
              ["I can take you there now.", "Want me to open that now?"],
              ["If you'd like, I can take you there.", "If that helps, I can open it now."],
            )}`
          : "I can do that — I just need the destination a little clearer first.",
        actions: evidence.actions,
      }

    case "catalogue":
      return {
        leadIn: withAcknowledgement("catalogue", seed, prompt, pickVariant([
          "Here are the closest catalogue matches.",
          "I found some likely hits.",
          "I've pulled the strongest product matches first.",
          "Here's what the catalogue has on that.",
        ], seed)),
        text: evidence.narrativeText
          ? `${evidence.narrativeText} ${invitationPrompt(prompt, seed,
              ["I can also open the full catalogue if you want the wider list.", "Want me to take you into the full catalogue?"],
              ["If you'd like, I can also open the full catalogue.", "If that helps, I can take you into the full catalogue."],
            )}`
          : evidence.table
            ? `Keeping this to the **strongest matches first** so the list stays useful rather than noisy. ${invitationPrompt(prompt, seed,
                ["We can narrow by supplier, product family, or card context.", "I can narrow it further by supplier or product family."],
                ["If you'd like, we can narrow by supplier, product family, or card context.", "If that helps, I can narrow it further."],
              )}`
            : "I'm not seeing a strong match yet from the wording you've given me.",
        table: evidence.table,
        actions: evidence.actions,
        chips: evidence.chips,
      }

    case "notes":
      return evidence.compactCard
        ? {
            leadIn: withAcknowledgement("notes", seed, prompt, pickVariant([
              "I've pulled the prep-note side forward.",
              "Here's the note-heavy part of the card.",
              "This is the quickest notes read I can give you.",
              "Notes first — here's the local prep signal.",
            ], seed)),
            text: `Keeping it compact so you get the **useful local prep signal** without opening the full card straight away. This is usually where the practical cues live once the case becomes real. ${invitationPrompt(prompt, seed,
              ["I can open the full card next.", "Want me to take you to the full card?"],
              ["If you'd like, I can take you to the full card.", "If that helps, I can open the full card next."],
            )}`,
            compactCard: evidence.compactCard,
            actions: evidence.actions,
          }
        : {
            leadIn: pickVariant([
              "I can bring those notes up once the target is clearer.",
              "That works — I just need the procedure name first.",
              "I can do that, but I want the target card a touch tighter.",
            ], seed),
            text: "I haven't pinned the procedure down yet. Name it directly and I'll pull the prep-note content from that card.",
            chips: evidence.chips,
          }

    case "references":
      return evidence.table
        ? {
            leadIn: withAcknowledgement("references", seed, prompt, pickVariant([
              "I've pulled the operative references into view.",
              "Here's the reference side of the card.",
              "These are the source links attached to that procedure.",
              "References surfaced — here they are.",
            ], seed)),
            text: `Showing the **authored reference links** here rather than a generic catalogue search — if the card has a proper guide, technique source, or external link, this is the cleanest way to surface it. ${invitationPrompt(prompt, seed,
              ["I can take you to the full card as well.", "Want me to open the full card too?"],
              ["If you'd like, I can take you to the full card.", "If that helps, I can open the full card too."],
            )}`,
            table: evidence.table,
            compactCard: evidence.compactCard,
            actions: evidence.actions,
          }
        : {
            leadIn: pickVariant([
              "I can surface those references once the target is clearer.",
              "That works — I just need the procedure name first.",
              "I can do that. I just need the exact card before I pull the references.",
            ], seed),
            text: "I haven't pinned the card down yet. Name the procedure directly and I'll bring up its reference section.",
            chips: evidence.chips,
          }

    case "implants":
      return evidence.table
        ? {
            leadIn: withAcknowledgement("implants", seed, prompt, pickVariant([
              "I've pulled the implant side of the card.",
              "Here's the authored implant section.",
              "Here's the implant-facing part of the procedure.",
              "Implant section — here's what's on the card.",
            ], seed)),
            text: evidence.entityDefinition?.kind === "system"
              ? `Keeping this tied to **${evidence.entityDefinition.label}** as a system so I show the related implant components first, rather than guessing a procedure context.`
              : `Keeping this tied to the **authored implant section**, so it stays grounded in the card rather than drifting into general supplier content. ${invitationPrompt(prompt, seed,
                  ["I can take you into the full card from here.", "Want me to open the full card next?"],
                  ["If you'd like, I can take you into the full card.", "If that helps, I can open the full card next."],
                )}`,
            table: evidence.table,
            compactCard: evidence.compactCard,
            actions: evidence.actions,
          }
        : {
            leadIn: pickVariant([
              "I can bring that up once the procedure is a bit clearer.",
              "That works — I just need the procedure a touch tighter.",
              "I can do that. I just need the exact procedure before I pull the implant section.",
            ], seed),
            text: evidence.matchedProcedures?.length
              ? "More than one plausible card behind that wording — surfacing the closest matches so you can pick the right one."
              : "I haven't pinned the procedure down yet. Name it directly and I'll surface the implant section authored for it.",
            matchedProcedures: evidence.matchedProcedures,
            actions: evidence.actions,
            chips: evidence.matchedProcedures?.length ? undefined : evidence.chips,
          }

    case "missing_sizes":
      return evidence.table
        ? {
            leadIn: withAcknowledgement("missing_sizes", seed, prompt, pickVariant([
              "I can show the expected size run, but not live gaps yet.",
              "I can give you the baseline ladder — actual missing sizes need a checked state.",
              "Here's the prep ladder to check against.",
            ], seed)),
            text: evidence.compactCard
              ? `There's no live **availability or checked-stock state** attached yet, so I can't tell you which ${evidence.sizeFocus ?? "implant"} sizes are actually missing. What I can do is show the expected **${evidence.sizeFocus ?? "size"} ladder** as the checking baseline.`
              : "I can show the expected ladder, but I need the procedure pinned first to give you a useful baseline.",
            table: evidence.table,
            compactCard: evidence.compactCard,
            actions: evidence.actions,
            chips: evidence.compactCard ? undefined : evidence.chips,
          }
        : {
            leadIn: pickVariant([
              "I need the procedure name first.",
              "I can check that once I know which procedure you mean.",
              "Name the procedure and I'll build the checking ladder.",
            ], seed),
            text: "I can't tell you which sizes are missing unless I know the procedure and implant system. Name it directly and I'll pull the expected ladder.",
            chips: evidence.chips,
          }

    case "implant_sizes":
      return {
        leadIn: withAcknowledgement("implant_sizes", seed, prompt, pickVariant([
          "Here's the sizing ladder.",
          "I'd stage it like this.",
          "This is the size prep I'd want in reach.",
          "Here's the prep ladder, grounded to this system.",
        ], seed)),
        text: evidence.sizeFocus
          ? `Keeping this anchored to the **current system context** and narrowing to the **${evidence.sizeFocus}** side of the ladder, so it stays useful without pretending to know booked sizes the card doesn't carry.`
          : "Keeping this anchored to the **current system context** rather than guessing booked sizes — so this stays useful without overpromising.",
        table: evidence.table,
      }

    case "trays":
      return evidence.table
        ? {
            leadIn: withAcknowledgement("trays", seed, prompt, pickVariant([
              "Here's the tray read from the card.",
              "I've pulled the tray-facing part forward.",
              "Tray section — here's what the card carries.",
              "Here's the authored tray list.",
            ], seed)),
            text: "Keeping this to the **authored tray content** rather than mixing in anything speculative — so this is a fast read of what the card currently carries, not a guessed theatre setup.",
            table: evidence.table,
            compactCard: evidence.compactCard,
            actions: evidence.actions,
          }
        : {
            leadIn: pickVariant([
              "No strong tray section on this card yet.",
              "I'm not seeing a proper tray list here yet.",
              "That tray section isn't clearly authored yet.",
            ], seed),
            text: evidence.compactCard
              ? "I matched the procedure, but there isn't a strong authored tray section to surface from it yet."
              : "I haven't pinned the procedure yet. Name it directly and I'll pull the tray section if it's on the card.",
            chips: evidence.chips,
          }

    case "consumables":
      return evidence.table
        ? {
            leadIn: withAcknowledgement("consumables", seed, prompt, pickVariant([
              "Here's the consumables read.",
              "I've pulled the consumables-facing section.",
              "Consumables side of the card — here it is.",
              "Here's the authored consumables list.",
            ], seed)),
            text: "This gives you the **practical consumables read** first without making you dig through the rest of the card. I'm keeping it close to what's actually authored rather than inflating into a wider pick list.",
            table: evidence.table,
            compactCard: evidence.compactCard,
            actions: evidence.actions,
          }
        : {
            leadIn: pickVariant([
              "That detail isn't surfaced strongly on this card yet.",
              "No strong authored section for that here yet.",
              "This card doesn't expose that cleanly yet.",
            ], seed),
            text: evidence.compactCard
              ? "I matched the procedure, but there isn't a strong authored consumables section to surface from it yet."
              : "I haven't pinned the procedure yet. Name it and I'll pull the consumables section if it's on the card.",
            actions: evidence.actions,
            chips: evidence.chips,
          }

    case "walkthroughs":
      return evidence.walkthroughs
        ? {
            leadIn: withAcknowledgement("walkthroughs", seed, prompt, pickVariant([
              "I've pulled the walkthrough layer in.",
              "Here are the video-style support pieces tied to that card.",
              "Walkthroughs surfaced — here they are.",
              "Here's the media layer for that procedure.",
            ], seed)),
            text: `Keeping these clearly **secondary to the card** — the workflow reference stays in charge and the videos stay supporting context. The media explains the work, it doesn't replace the structured card. ${invitationPrompt(prompt, seed,
              ["I can take you to the full card or stay on the walkthrough layer.", "Want me to open the full card?"],
              ["If you'd like, I can open the full card or stay with walkthroughs.", "If that helps, I can open the full card."],
            )}`,
            walkthroughs: evidence.walkthroughs,
            compactCard: evidence.compactCard,
            actions: evidence.actions,
          }
        : {
            leadIn: pickVariant([
              "I can do that — I just need the target procedure first.",
              "Walkthroughs are ready to surface, but I need the procedure name.",
              "That works — I just need to know which procedure.",
            ], seed),
            text: "I haven't pinned the procedure yet. Name it directly and I'll pull the closest walkthrough set.",
            chips: evidence.chips,
          }

    case "workflow_tools":
      return {
        leadIn: withAcknowledgement("workflow_tools", seed, prompt, pickVariant([
          "Here's the working set for this workspace.",
          "I've brought the toolset up.",
          "These are the workflow tools tied to this area.",
          "Here's what's available from here.",
        ], seed)),
        text: `This is usually the cleanest way to jump into the **operational side** without leaving the conversation completely. Chat stays as the entry surface, then the right tool comes forward when you ask. ${invitationPrompt(prompt, seed,
          ["Want me to open one of these now?", "Shall I take you into one of them?"],
          ["If you'd like, I can open one of these.", "If that helps, I can open one for you."],
        )}`,
        launcher: evidence.launcher,
      }

    case "specialties":
      return {
        leadIn: withAcknowledgement("specialties", seed, prompt, pickVariant([
          "Here's the lineup for this workspace.",
          "I've brought the specialty lanes up.",
          "These are the specialties you can jump into from here.",
          "Here's what's available from this setting.",
        ], seed)),
        text: evidence.specialtyCount && evidence.specialtyCount > 0
          ? `There are **${evidence.specialtyCount} specialty lanes** available here. I'm surfacing them visually because that's easier to scan than a list. ${invitationPrompt(prompt, seed,
              ["Shall I take you into one of them?", "Want me to open one?"],
              ["If you'd like, I can open one of them.", "If that helps, I can take you into one."],
            )}`
          : "I can still bring the specialty layer up here, but the workspace context isn't giving me a strong count right now.",
        stats: evidence.stats,
        launcher: evidence.launcher,
      }

    case "procedure_systems":
      return {
        leadIn: withAcknowledgement("procedure_systems", seed, prompt, pickVariant([
          "Here are the available systems.",
          "I've pulled the system options for that procedure.",
          "These are the implant systems available here.",
          "Here's what the library has on systems for that procedure.",
        ], seed)),
        text: evidence.variantChoices?.length
          ? `I'm showing all the **system configurations** available for **${evidence.procedureName ?? "that procedure"}** so you can pick the right one before opening the full working card.`
          : evidence.compactCard
            ? `I found **${evidence.procedureName ?? "the procedure"}** but there's only one system configuration in the library for it — so you can go straight to the full card.`
            : "I need the procedure name to pull the system options. Name it directly and I'll surface everything available.",
        variantChoices: evidence.variantChoices,
        compactCard: evidence.compactCard,
        actions: evidence.actions,
        stats: evidence.stats,
      }

    case "fallback":
    default:
      return {
        leadIn: pickVariant([
          "I can work with that.",
          "I can help — let me steer it properly.",
          "That's close enough to move forward with.",
          "Let me figure out the best angle here.",
          "I'm on it — give me a moment to orient.",
        ], seed),
        text: evidence.context.specialty
          ? `I'm keeping this inside **${evidence.context.specialty}**. I can summarise the current area, surface matching procedures, bring up implants, trays, notes, references, or take you straight to the closest authored card. What do you need?`
          : "I can summarise the current area, surface matching procedures, bring up implants, trays, notes, or references, or take you straight to the closest authored card. Just tell me what you're after.",
        chips: evidence.chips ?? buildFallbackChips(evidence.context),
      }
  }
}

// ─────────────────────────────────────────────
// ACKNOWLEDGEMENT & INVITATION HELPERS
// ─────────────────────────────────────────────

function withAcknowledgement(
  intentId: AssistantIntentId,
  seed: string,
  prompt: string,
  leadIn: string,
): string {
  const tone = getPromptTone(prompt)

  type ToneMap = Record<PromptTone, string[]>

  const acknowledgementFamilies: Partial<Record<AssistantIntentId, ToneMap>> = {
    summary: {
      direct: ["Definitely.", "Absolutely.", "Yes.", "Of course.", "Sure."],
      tentative: ["Yes, I can.", "I think so, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Yes.", "Definitely.", "Absolutely.", "Sure."],
      frustrated: ["Understood.", "Got it.", "Let me sort that out.", "I hear you."],
      curious: ["Good question.", "Yes, let's look at that.", "Interesting — let me pull it up."],
    },
    prepare_card: {
      direct: ["Definitely.", "Absolutely.", "Yes, let's do that.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "Yes, I can help with that.", "I can do that, yes.", "Happy to."],
      neutral: ["Definitely.", "Absolutely.", "Yes, let's do that.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me get that sorted.", "I hear you."],
      curious: ["Yes — let's build that out.", "Good thinking.", "Let's get the card ready."],
    },
    compare_cards: {
      direct: ["Definitely.", "Yes.", "Absolutely.", "Sure.", "Let's do it."],
      tentative: ["Yes, I can.", "I can do that, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Yes.", "Definitely.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me do a proper comparison.", "On it."],
      curious: ["Good question.", "That's worth comparing.", "Let's see the differences."],
    },
    visual: {
      direct: ["Yes.", "Absolutely.", "Definitely.", "Sure."],
      tentative: ["Yes, I can.", "I can do that, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Yes.", "Absolutely.", "Definitely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me give you a clear view.", "On it."],
      curious: ["Good call.", "Yes — let's look at it visually.", "Here's the visual read."],
    },
    navigation: {
      direct: ["Definitely.", "Yes.", "Absolutely.", "On it.", "Sure."],
      tentative: ["Yes, I can.", "I can take you there, yes.", "Yes, that works.", "Happy to."],
      neutral: ["Definitely.", "Yes.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me take you there now.", "On it."],
      curious: ["Sure.", "Yes — let me open that.", "Let's go there."],
    },
    catalogue: {
      direct: ["Yes.", "Definitely.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "I can look for that, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Yes.", "Definitely.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me find that.", "On it."],
      curious: ["Good question.", "Let me check the catalogue.", "Let's see what's there."],
    },
    notes: {
      direct: ["Yes.", "Definitely.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "I can bring that up, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Yes.", "Definitely.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me pull the notes.", "On it."],
      curious: ["Good thinking.", "Yes — let's look at the notes.", "Let me surface those."],
    },
    references: {
      direct: ["Definitely.", "Yes.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "I can surface that, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Definitely.", "Yes.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me find the references.", "On it."],
      curious: ["Good call.", "Yes — let me pull those references.", "Let's see what's there."],
    },
    implants: {
      direct: ["Yes.", "Definitely.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "I can bring that up, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Yes.", "Definitely.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me pull the implant section.", "On it."],
      curious: ["Good question.", "Let's look at the implants.", "Here's the implant side."],
    },
    missing_sizes: {
      direct: ["Yes.", "Definitely.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can check that.", "I can look at that, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Yes.", "Definitely.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me check the size run.", "On it."],
      curious: ["Good thinking.", "Let's check the ladder.", "Here's the size baseline."],
    },
    implant_sizes: {
      direct: ["Definitely.", "Yes.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "I can stage that, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Definitely.", "Yes.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me pull the size ladder.", "On it."],
      curious: ["Good call.", "Let's look at the sizing.", "Here's the prep ladder."],
    },
    trays: {
      direct: ["Yes.", "Definitely.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "I can bring that up, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Yes.", "Definitely.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me pull the tray list.", "On it."],
      curious: ["Good thinking.", "Let's look at the trays.", "Here's the tray side."],
    },
    consumables: {
      direct: ["Definitely.", "Yes.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "I can pull that up, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Definitely.", "Yes.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me pull the consumables list.", "On it."],
      curious: ["Good thinking.", "Let's look at the consumables.", "Here's the consumables side."],
    },
    walkthroughs: {
      direct: ["Yes.", "Definitely.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "I can bring that up, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Yes.", "Definitely.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me pull the walkthroughs.", "On it."],
      curious: ["Good idea.", "Let's bring up the videos.", "Here's the media layer."],
    },
    workflow_tools: {
      direct: ["Definitely.", "Yes.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "I can bring those up, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Definitely.", "Yes.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me open the tools.", "On it."],
      curious: ["Good call.", "Let's look at the tools.", "Here's what's available."],
    },
    specialties: {
      direct: ["Yes.", "Definitely.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "I can bring those up, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Yes.", "Definitely.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me open the specialties.", "On it."],
      curious: ["Good question.", "Let's see what's available.", "Here are the specialty lanes."],
    },
    procedure_systems: {
      direct: ["Yes.", "Definitely.", "Absolutely.", "Sure.", "On it."],
      tentative: ["Yes, I can.", "I can pull those up, yes.", "Yes, that makes sense.", "Happy to."],
      neutral: ["Yes.", "Definitely.", "Absolutely.", "Sure."],
      frustrated: ["Got it.", "Understood.", "Let me find the system options.", "On it."],
      curious: ["Good question.", "Let's see the available systems.", "Here are the system options."],
    },
  }

  const toneMap = acknowledgementFamilies[intentId]
  const acknowledgements = toneMap?.[tone] ?? toneMap?.["neutral"]
  if (!acknowledgements?.length) return leadIn

  const acknowledgement = pickVariant(acknowledgements, `${seed}:ack`)
  return `${acknowledgement} ${leadIn}`
}

function invitationPrompt(
  prompt: string,
  seed: string,
  directOptions: string[],
  tentativeOptions: string[],
  neutralOptions?: string[],
): string {
  const tone = getPromptTone(prompt)
  const options =
    tone === "direct"
      ? directOptions
      : tone === "tentative"
        ? tentativeOptions
        : (neutralOptions ?? directOptions)

  return pickVariant(options, `${seed}:invite`)
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function renderReply(plan: AssistantResponsePlan): AssistantReply {
  return {
    text: plan.text ? `${plan.leadIn} ${plan.text}`.trim() : plan.leadIn,
    entityDefinition: plan.entityDefinition,
    table: plan.table,
    stats: plan.stats,
    actions: plan.actions,
    chips: plan.chips,
    matchedProcedures: plan.matchedProcedures,
    variantChoices: plan.variantChoices,
    launcher: plan.launcher,
    walkthroughs: plan.walkthroughs,
    compactCard: plan.compactCard,
  }
}

// ─────────────────────────────────────────────
// PENDING STATE BUILDER
// ─────────────────────────────────────────────

function buildPendingState(intent: AssistantIntent, context: AssistantContext, carry?: AssistantCarryContext): AssistantPendingState {
  const procedureName = intent.entities?.procedureName ?? carry?.procedureName
  const browseLabel = intent.entities?.browseLabel
  const sizeFocus = intent.entities?.sizeFocus

  const map: Record<AssistantIntentId, AssistantPendingState> = {
    repair_previous_turn: {
      label: "Re-anchoring the conversation",
      detail: "Using the last grounded target instead of widening into a new lane",
      delay: 1200,
    },
    user_correction: {
      label: "Switching to the correct target",
      detail: "Correcting the active entity and re-anchoring",
      delay: 1200,
    },
    source_check: {
      label: "Checking the grounding",
      detail: "Confirming which source layer is driving the answer",
      delay: 1200,
    },
    what_can_you_do: {
      label: "Pulling up capabilities",
      detail: "Summarising what I can help with from here",
      delay: 1200,
    },
    procedure_count: {
      label: "Counting authored procedures",
      detail: context.specialty ? `Scoping to ${context.specialty}` : "Scanning the full library",
      delay: 1200,
    },
    broad_domain_browse: {
      label: "Keeping it broad, but grounded",
      detail: context.specialty
        ? `Scanning authored procedure targets inside ${context.specialty}`
        : "Scanning the strongest authored procedure targets before narrowing",
      delay: 1500,
    },
    entity_intro: {
      label: "Working out the term",
      detail: "Checking what that entity is before assuming what you want to do with it",
      delay: 1200,
    },
    related_systems: {
      label: "Tracing the linked systems",
      detail: carry?.entityLabel
        ? `Keeping this anchored to ${carry.entityLabel} while surfacing related constructs`
        : "Checking the related extracted system set",
      delay: 1400,
    },
    entity_products: {
      label: "Tracing related products",
      detail: carry?.entityLabel
        ? `Keeping this anchored to ${carry.entityLabel} while surfacing the nearest product set`
        : "Checking the closest related products",
      delay: 1400,
    },
    procedure_systems: {
      label: "Finding available systems",
      detail: procedureName
        ? `Checking system configurations for ${procedureName}`
        : "Scanning system configurations for the matched procedure",
      delay: 1800,
    },
    compare_cards: {
      label: "Lining up the closest pair",
      detail: "Checking authored cards, metadata, and structure before the side-by-side lands",
      delay: 2000,
    },
    walkthroughs: {
      label: "Pulling the media layer forward",
      detail: procedureName
        ? `Checking walkthroughs attached to ${procedureName}`
        : "Checking the matched procedure context before walkthroughs surface",
      delay: 2000,
    },
    browse_procedures: {
      label: "Scanning the library lanes",
      detail: browseLabel
        ? `Keeping this scoped to ${browseLabel} so the first results are usable`
        : "Using anatomy and service-line context to keep the browse result narrow",
      delay: 2000,
    },
    workflow_tools: {
      label: "Opening the toolset",
      detail: context.setting ? `Keeping this tied to ${context.setting}` : "Shaping the operational side before the tools come forward",
      delay: 2000,
    },
    specialties: {
      label: "Opening the relevant lanes",
      detail: context.setting
        ? `Using ${context.setting} to keep the specialty view grounded`
        : "Keeping the specialty view tied to the current workspace context",
      delay: 2000,
    },
    prepare_card: {
      label: "Pulling the right card forward",
      detail: procedureName
        ? `Matching the closest working card for ${procedureName}`
        : "Matching the closest procedure card before the working surface opens",
      delay: 2000,
    },
    summary: {
      label: "Shaping the quickest read",
      detail: procedureName
        ? `Building the first pass from the ${procedureName} card`
        : "Building the first read from grounded card data",
      delay: 2000,
    },
    notes: {
      label: "Finding the note layer",
      detail: procedureName
        ? `Pulling authored notes attached to ${procedureName}`
        : "Checking the local notes and prep-note layer first",
      delay: 2000,
    },
    references: {
      label: "Finding the authored references",
      detail: procedureName
        ? `Checking linked references attached to ${procedureName}`
        : "Pulling the reference layer attached to the matched card",
      delay: 2000,
    },
    trays: {
      label: "Pulling the tray side forward",
      detail: procedureName
        ? `Checking the tray-facing section on ${procedureName}`
        : "Checking the authored tray section before the table appears",
      delay: 2000,
    },
    consumables: {
      label: "Pulling the consumables side forward",
      detail: procedureName
        ? `Checking the consumables layer on ${procedureName}`
        : "Checking the authored consumables section before the list lands",
      delay: 2000,
    },
    implants: {
      label: "Pulling the implant side forward",
      detail: procedureName
        ? `Checking the implant layer attached to ${procedureName}`
        : "Checking the authored implant section rather than guessing supplier context",
      delay: 2000,
    },
    implant_sizes: {
      label: "Checking the sizing baseline",
      detail: sizeFocus
        ? `Narrowing the expected ladder to the ${sizeFocus} side first`
        : "Keeping this anchored to the expected size ladder rather than booked guesses",
      delay: 2000,
    },
    missing_sizes: {
      label: "Checking the size run for gaps",
      detail: sizeFocus
        ? `Using the expected ${sizeFocus} ladder as the checking baseline`
        : "Checking the expected ladder first so the gap review has a real baseline",
      delay: 2000,
    },
    catalogue: {
      label: "Searching the catalogue",
      detail: "Pulling the strongest product matches forward before the full catalogue opens",
      delay: 2000,
    },
    navigation: {
      label: "Lining up the nearest route",
      detail: "Keeping the route tied to the current workspace so the jump is direct",
      delay: 2000,
    },
    visual: {
      label: "Shaping the visual read",
      detail: "Condensing the page structure so the overview lands before the detail",
      delay: 2000,
    },
    welcome: {
      label: "Getting ready",
      detail: "Setting up the welcome context for this workspace",
      delay: 800,
    },
    smalltalk_greeting: {
      label: "Saying hello",
      detail: "Keeping the reply light so the task can come forward next",
      delay: 800,
    },
    smalltalk_thanks: {
      label: "Acknowledging",
      detail: "Keeping the reply light so the task can come forward next",
      delay: 800,
    },
    smalltalk_status: {
      label: "Checking in",
      detail: "Keeping the reply light so the task can come forward next",
      delay: 800,
    },
    smalltalk_compliment: {
      label: "Receiving that gracefully",
      detail: "Keeping the reply light so the task can come forward next",
      delay: 800,
    },
    smalltalk_confused: {
      label: "Orienting you",
      detail: "Building a clear map of what's available from here",
      delay: 1000,
    },
    smalltalk_help_meta: {
      label: "Building the quick-start guide",
      detail: "Surfacing the most useful entry points for this workspace",
      delay: 1000,
    },
    fallback: {
      label: "Tightening the angle",
      detail: "Working out which lane you mean before committing to a card, tool, or browse path",
      delay: 2000,
    },
  }

  return map[intent.id] ?? {
    label: "Tightening the angle",
    detail: "Working out the best path forward",
    delay: 2000,
  }
}

function normalizeWorkflowQuery(value: string): string {
  return value.trim().toLowerCase()
}

function includesWorkflowTerm(query: string, terms: string[]): boolean {
  return terms.some((term) => query.includes(term))
}

function findWorkflowStepMention(
  query: string,
  steps: Array<{ id: string; title: string }>,
): { id: string; title: string } | null {
  const normalizedQuery = normalizeWorkflowQuery(query)

  for (const step of steps) {
    const title = step.title.toLowerCase()
    if (normalizedQuery.includes(title)) return step

    const titleTokens = title.split(/\s+/).filter((token) => token.length >= 4)
    if (titleTokens.length > 0 && titleTokens.every((token) => normalizedQuery.includes(token))) {
      return step
    }
  }

  if (normalizedQuery.includes("drape")) {
    return steps.find((step) => step.title.toLowerCase().includes("drape")) ?? null
  }

  if (normalizedQuery.includes("cement")) {
    return steps.find((step) => step.title.toLowerCase().includes("cement")) ?? null
  }

  if (normalizedQuery.includes("trial")) {
    return steps.find((step) => step.title.toLowerCase().includes("trial")) ?? null
  }

  return null
}

function buildWorkflowCarry(
  context: AssistantContext,
  carry?: AssistantCarryContext,
): AssistantCarryContext {
  return {
    ...carry,
    procedureId: context.procedureId ?? carry?.procedureId,
    procedureName: context.procedureName ?? carry?.procedureName,
    specialty: context.specialty ?? carry?.specialty,
    variantId: context.variantId ?? carry?.variantId,
    variantName: context.variantName ?? carry?.variantName,
    systemId: context.systemId ?? carry?.systemId,
    systemName: context.systemName ?? carry?.systemName,
  }
}

function maybeBuildWorkflowReply(
  context: AssistantContext,
  prompt: string,
  carry?: AssistantCarryContext,
): AssistantReply | null {
  if (context.pageKind !== "card") return null

  const procedureId = context.procedureId ?? carry?.procedureId
  if (!procedureId) return null

  const steps = getWorkflowStepsForProcedure(
    procedureId,
    context.variantId ?? carry?.variantId,
    context.systemId ?? carry?.systemId,
  )
  if (steps.length === 0) return null

  const query = normalizeWorkflowQuery(prompt)
  const isWorkflowPrompt =
    includesWorkflowTerm(query, [
      "step",
      "next",
      "prepare first",
      "what should i prepare",
      "what comes next",
      "instrument will i need",
      "instrument do i need",
      "at this stage",
      "have we already",
      "remember",
      "why is this",
      "why do we",
      "workflow",
      "sequence",
      "drape",
      "trial",
      "cement",
    ]) || Boolean(findWorkflowStepMention(query, steps))

  if (!isWorkflowPrompt) return null

  const mentionedStep = findWorkflowStepMention(query, steps)
  const currentIndex = mentionedStep
    ? steps.findIndex((step) => step.id === mentionedStep.id)
    : -1
  const currentStep = currentIndex >= 0 ? steps[currentIndex] : null
  const nextStep = currentIndex >= 0 ? steps[currentIndex + 1] ?? null : steps[0] ?? null
  const carryContext = buildWorkflowCarry(context, carry)
  const cardHref = context.procedureId ? `/procedures/${encodeURIComponent(context.procedureId)}` : undefined

  if (includesWorkflowTerm(query, ["what are the steps", "steps", "workflow", "sequence"])) {
    return {
      text: [
        `For ${context.procedureName ?? "this card"}, the sequence is:`,
        ...steps.map((step) => `${step.order}. ${step.title}: ${step.summary}`),
      ].join("\n"),
      actions: cardHref ? [{ label: "Open full card", href: cardHref, tone: "primary" }] : undefined,
      grounding: { source: "authored_card", confidence: 0.96, ambiguity: "none" },
      carry: carryContext,
      debugSummary: "workflow_sequence_list",
    }
  }

  if (includesWorkflowTerm(query, ["prepare first", "what should i prepare", "what should i prepare first"])) {
    const firstStep = steps[0]
    const secondStep = steps[1]
    const instruments = firstStep.expectedInstruments?.join(", ") ?? "the opening tray stack"
    return {
      text: [
        `Start with ${firstStep.title.toLowerCase()}. ${firstStep.summary}`,
        `Have ${instruments} ready first.`,
        secondStep ? `After that, move straight to ${secondStep.title.toLowerCase()}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
      grounding: { source: "authored_card", confidence: 0.95, ambiguity: "none" },
      carry: carryContext,
      debugSummary: "workflow_first_step",
    }
  }

  if (includesWorkflowTerm(query, ["instrument will i need", "instrument do i need", "what instrument"])) {
    const targetStep = currentIndex >= 0 ? steps[currentIndex + 1] ?? steps[currentIndex] : steps[0]
    const instruments = targetStep?.expectedInstruments?.join(", ") ?? "the relevant tray and implant ladder"
    const prefix =
      currentStep && targetStep && currentStep.id !== targetStep.id
        ? `If you're at ${currentStep.title.toLowerCase()}, next is ${targetStep.title.toLowerCase()}.`
        : `The next instrument set to stage is for ${targetStep?.title.toLowerCase() ?? "the next step"}.`

    return {
      text: `${prefix} Have ${instruments} ready.`,
      grounding: { source: "authored_card", confidence: 0.93, ambiguity: currentStep ? "none" : "low" },
      carry: carryContext,
      debugSummary: "workflow_next_instruments",
    }
  }

  if (includesWorkflowTerm(query, ["what comes next", "next"])) {
    if (!nextStep) {
      return {
        text: `You are already at the end of the authored sequence. The final step is ${currentStep?.title.toLowerCase() ?? "closure and handover"}.`,
        grounding: { source: "authored_card", confidence: 0.9, ambiguity: "low" },
        carry: carryContext,
        debugSummary: "workflow_end_of_sequence",
      }
    }

    const reminders = nextStep.reminders?.length ? ` Remember: ${nextStep.reminders.join("; ")}.` : ""
    const prefix =
      currentStep
        ? `If you're at ${currentStep.title.toLowerCase()}, next is ${nextStep.title.toLowerCase()}.`
        : `The first authored step is ${nextStep.title.toLowerCase()}.`

    return {
      text: `${prefix} ${nextStep.summary}.${reminders}`,
      grounding: { source: "authored_card", confidence: 0.94, ambiguity: currentStep ? "none" : "low" },
      carry: carryContext,
      debugSummary: "workflow_next_step",
    }
  }

  if (includesWorkflowTerm(query, ["have we already", "at this stage"])) {
    const targetStep = currentStep ?? steps[0]
    return {
      text: currentStep
        ? `I cannot confirm live progress from the card alone. If you're at ${targetStep.title.toLowerCase()}, the expected work is: ${targetStep.summary}`
        : `I cannot confirm live progress from the card alone. If you're at ${targetStep.title.toLowerCase()}, the expected work is: ${targetStep.summary}`,
      grounding: { source: "authored_card", confidence: 0.88, ambiguity: "low" },
      carry: carryContext,
      debugSummary: "workflow_status_limit",
    }
  }

  if (includesWorkflowTerm(query, ["remember"])) {
    const targetStep = currentStep ?? nextStep ?? steps[0]
    const reminders = targetStep.reminders?.join("; ") ?? "keep the mapped trays, implants, and backup sizes staged before the next transition."
    return {
      text: `For ${targetStep.title.toLowerCase()}, remember: ${reminders}`,
      grounding: { source: "authored_card", confidence: 0.91, ambiguity: currentStep ? "none" : "low" },
      carry: carryContext,
      debugSummary: "workflow_reminders",
    }
  }

  if (includesWorkflowTerm(query, ["why is this", "why do we"])) {
    const targetStep = currentStep ?? steps[0]
    return {
      text: targetStep.rationale
        ? `${targetStep.title}: ${targetStep.rationale}`
        : `${targetStep.title} is included because it keeps the sequence safe and prevents setup delays later in the case.`,
      grounding: { source: "authored_card", confidence: 0.9, ambiguity: currentStep ? "none" : "low" },
      carry: carryContext,
      debugSummary: "workflow_rationale",
    }
  }

  if (currentStep) {
    return {
      text: `${currentStep.title}: ${currentStep.summary}`,
      grounding: { source: "authored_card", confidence: 0.9, ambiguity: "none" },
      carry: carryContext,
      debugSummary: "workflow_step_summary",
    }
  }

  return null
}

// ─────────────────────────────────────────────
// PUBLIC EXPORTS
// ─────────────────────────────────────────────

export function buildAssistantPendingState(
  context: AssistantContext,
  prompt: string,
  carry?: AssistantCarryContext,
): AssistantPendingState {
  if (maybeBuildWorkflowReply(context, prompt, carry)) {
    return {
      label: "Reading the procedure sequence",
      detail: "Grounding the reply in the authored workflow steps for this card",
      delay: 1200,
    }
  }

  const intent = detectIntent(context, prompt)
  return buildPendingState(intent, context, carry)
}

export function buildAssistantReply(
  context: AssistantContext,
  prompt: string,
  carry?: AssistantCarryContext,
): AssistantReply {
  const workflowReply = maybeBuildWorkflowReply(context, prompt, carry)
  if (workflowReply) return workflowReply

  const intent = detectIntent(context, prompt)
  const evidence = collectEvidence(intent, context, prompt, carry)
  const plan = buildResponsePlan(intent, evidence, prompt)
  return renderReply(plan)
}

export function buildAssistantDecisionTrace(
  context: AssistantContext,
  prompt: string,
  carry?: AssistantCarryContext,
): AssistantDecisionTrace {
  const workflowReply = maybeBuildWorkflowReply(context, prompt, carry)
  if (workflowReply) {
    return {
      intentId: "workflow_sequence",
      confidence: 0.94,
      pageKind: context.pageKind,
      responseMode: "text_only",
      activeEntity: context.procedureName
        ? { label: context.procedureName, kind: "procedure" }
        : undefined,
      matchedProcedureIds: context.procedureId ? [context.procedureId] : [],
      groundingLayers: ["authored_card"],
      rationale: workflowReply.debugSummary,
    }
  }

  const intent = detectIntent(context, prompt)
  const evidence = collectEvidence(intent, context, prompt, carry)
  const plan = buildResponsePlan(intent, evidence, prompt)

  const groundingLayers = new Set<"fixed_data" | "authored_card" | "catalogue" | "heuristic">()

  if (evidence.entityDefinition) {
    if (evidence.entityDefinition.kind === "system" || evidence.entityDefinition.kind === "component") {
      groundingLayers.add("fixed_data")
    } else if (evidence.entityDefinition.kind === "product") {
      groundingLayers.add("catalogue")
    } else {
      groundingLayers.add("heuristic")
    }
  }

  if (evidence.compactCard || evidence.matchedProcedures?.length) {
    groundingLayers.add("authored_card")
  }

  if (evidence.table?.title?.toLowerCase().includes("product") || intent.id === "catalogue" || intent.id === "entity_products") {
    groundingLayers.add("catalogue")
  }

  if (groundingLayers.size === 0) {
    groundingLayers.add("heuristic")
  }

  const responseMode: AssistantDecisionTrace["responseMode"] =
    plan.entityDefinition ? "entity_definition"
      : plan.table ? "table"
      : plan.compactCard ? "compact_card"
      : plan.launcher ? "launcher"
      : plan.actions?.length ? "actions_only"
      : "text_only"

  return {
    intentId: intent.id,
    confidence: intent.confidence,
    pageKind: context.pageKind,
    responseMode,
    activeEntity: plan.entityDefinition
      ? { label: plan.entityDefinition.label, kind: plan.entityDefinition.kind }
      : undefined,
    matchedProcedureIds: (plan.matchedProcedures ?? []).map((procedure) => procedure.id),
    browseLabel: evidence.browseLabel,
    groundingLayers: [...groundingLayers],
  }
}
