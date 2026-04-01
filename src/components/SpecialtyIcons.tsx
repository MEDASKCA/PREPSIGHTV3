import type { SVGProps } from "react"

type P = Omit<SVGProps<SVGSVGElement>, "viewBox"> & { size?: number }

function Icon({ size = 48, children, ...props }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export function BrainIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Left hemisphere */}
      <path d="M24 10 C19 10 14 13 12 17 C9 15 6 17 6 21 C6 24 8 26 11 27 C10 29 10 31 11 33 C8 34 6 36 6 39 C6 42 9 44 13 43 C15 46 19 47 24 47" />
      {/* Right hemisphere */}
      <path d="M24 10 C29 10 34 13 36 17 C39 15 42 17 42 21 C42 24 40 26 37 27 C38 29 38 31 37 33 C40 34 42 36 42 39 C42 42 39 44 35 43 C33 46 29 47 24 47" />
      {/* Corpus callosum divider */}
      <line x1="24" y1="10" x2="24" y2="47" />
      {/* Gyri bumps left */}
      <path d="M12 17 C13 19 12 21 11 22" />
      <path d="M10 27 C12 28 12 30 11 32" />
      {/* Gyri bumps right */}
      <path d="M36 17 C35 19 36 21 37 22" />
      <path d="M38 27 C36 28 36 30 37 32" />
    </Icon>
  )
}

export function EyeIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Eyelids */}
      <path d="M4 24 C8 13 16 7 24 7 C32 7 40 13 44 24 C40 35 32 41 24 41 C16 41 8 35 4 24 Z" />
      {/* Iris */}
      <circle cx="24" cy="24" r="9" />
      {/* Pupil */}
      <circle cx="24" cy="24" r="4" />
      {/* Highlight */}
      <circle cx="28" cy="20" r="2" fill="currentColor" stroke="none" />
      {/* Upper lash line */}
      <path d="M4 24 C8 13 16 7 24 7 C32 7 40 13 44 24" strokeWidth="2.2" />
    </Icon>
  )
}

export function HeartLungsIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Left lung */}
      <path d="M20 10 L20 28 C20 34 16 38 12 38 C8 38 6 35 6 31 C6 27 9 24 13 24 L13 18 C13 14 16 10 20 10 Z" />
      {/* Right lung */}
      <path d="M28 10 L28 28 C28 34 32 38 36 38 C40 38 42 35 42 31 C42 27 39 24 35 24 L35 18 C35 14 32 10 28 10 Z" />
      {/* Trachea / carina */}
      <path d="M24 4 L24 10 M24 10 L20 10 M24 10 L28 10" />
      {/* Heart overlay */}
      <path d="M24 20 C22 17 18 17 18 21 C18 25 24 30 24 30 C24 30 30 25 30 21 C30 17 26 17 24 20 Z" strokeWidth="1.4" />
    </Icon>
  )
}

export function ScalpelIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Handle - ribbed grip */}
      <rect x="19" y="3" width="10" height="18" rx="5" />
      <line x1="19" y1="9" x2="29" y2="9" />
      <line x1="19" y1="13" x2="29" y2="13" />
      <line x1="19" y1="17" x2="29" y2="17" />
      {/* Guard */}
      <path d="M17 21 L31 21" strokeWidth="2" />
      {/* Blade */}
      <path d="M21 21 C21 21 18 30 22 44 L24 44 L24 21" />
      <path d="M27 21 C27 21 30 30 26 44 L24 44" />
    </Icon>
  )
}

export function KidneyIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Outer kidney shape - C curve */}
      <path d="M30 6 C38 6 44 12 44 24 C44 36 38 42 30 42 C22 42 18 38 18 32 C18 28 20 26 24 25 C28 24 30 22 30 18 C30 14 28 12 24 11 C20 10 18 8 18 6 C18 3 22 2 26 2 C27.3 2 28.7 2 30 3" />
      {/* Renal pelvis */}
      <path d="M32 18 C34 20 34 24 32 28 C30 32 28 34 26 34" />
      <path d="M32 18 L36 16 M32 24 L38 24 M32 28 L36 30" />
    </Icon>
  )
}

export function NeurosurgeryIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Skull outline */}
      <path d="M24 4 C14 4 6 11 6 20 C6 27 10 33 16 36 L16 42 C16 44 18 46 20 46 L28 46 C30 46 32 44 32 42 L32 36 C38 33 42 27 42 20 C42 11 34 4 24 4 Z" />
      {/* Sagittal suture */}
      <line x1="24" y1="4" x2="24" y2="36" strokeDasharray="2 2" />
      {/* Coronal suture */}
      <path d="M6 20 C12 18 18 22 24 20 C30 18 36 22 42 20" strokeDasharray="2 2" />
      {/* Eye sockets */}
      <ellipse cx="17" cy="25" rx="4" ry="3" />
      <ellipse cx="31" cy="25" rx="4" ry="3" />
      {/* Nasal cavity */}
      <path d="M22 32 C22 34 24 35 26 32" />
    </Icon>
  )
}

export function EarIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Outer ear */}
      <path d="M32 8 C40 12 44 18 44 26 C44 36 38 44 30 44 C26 44 24 42 24 38 C24 34 26 30 26 26 C26 22 22 18 22 14 C22 8 27 4 32 8 Z" />
      {/* Inner helix */}
      <path d="M30 12 C35 14 38 18 38 24 C38 30 35 35 30 36" />
      {/* Tragus / antihelix */}
      <path d="M28 28 C28 32 28 36 26 40" />
      <path d="M24 26 C26 25 28 24 30 26 C32 28 32 32 30 34" />
      {/* Ear canal */}
      <circle cx="27" cy="36" r="3" />
    </Icon>
  )
}

export function ToothIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Crown - the visible tooth part */}
      <path d="M14 4 C11 4 8 7 8 11 C8 15 9 19 10 22 C11 25 12 27 12 30 L14 30 C14 28 15 26 16 23 C17 26 18 28 18 30 L22 30 C22 28 23 26 24 23 C25 26 26 28 26 30 L28 30 C28 28 30 26 32 24 C34 21 36 16 36 11 C36 7 33 4 30 4 C28 4 26 5 25 7 C24 9 23 10 22 10 C21 10 20 9 19 7 C18 5 16 4 14 4 Z" />
      {/* Roots */}
      <path d="M14 30 C14 34 13 38 12 42" />
      <path d="M22 30 L22 38" />
      <path d="M28 30 C28 34 29 38 30 42" />
    </Icon>
  )
}

export function HandIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Palm */}
      <path d="M10 30 C10 26 12 22 14 18 L14 10 C14 8 16 6 18 6 C20 6 22 8 22 10 L22 18 M22 10 L22 8 C22 6 24 4 26 4 C28 4 30 6 30 8 L30 18 M30 8 L30 7 C30 5 32 4 34 4 C36 4 38 6 38 8 L38 20 M38 8 C38 6 39 4 41 4 C43 4 44 6 44 9 L44 24 C44 30 40 36 36 38 L28 40 C22 40 16 36 12 32 L10 30 Z" />
    </Icon>
  )
}

export function BabyIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Head */}
      <circle cx="24" cy="13" r="9" />
      {/* Face */}
      <circle cx="20" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="28" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M20 17 C20 19 28 19 28 17" />
      {/* Body */}
      <path d="M14 28 C14 24 18 22 24 22 C30 22 34 24 34 28 L34 36 C34 40 30 44 24 44 C18 44 14 40 14 36 Z" />
      {/* Arms */}
      <path d="M14 30 C10 28 6 30 6 34 C6 37 9 38 12 36 L14 34" />
      <path d="M34 30 C38 28 42 30 42 34 C42 37 39 38 36 36 L34 34" />
      {/* Legs */}
      <path d="M18 44 C17 46 15 48 14 46" />
      <path d="M30 44 C31 46 33 48 34 46" />
    </Icon>
  )
}

export function FootIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Foot outline from above */}
      <path d="M16 6 C12 6 8 10 8 16 L8 36 C8 42 12 46 18 46 L26 46 C32 46 36 44 38 40 L40 34 C41 31 40 28 38 28 C36 28 34 30 34 32 C34 28 32 26 30 26 C30 22 28 20 26 20 L26 10 C26 8 24 6 22 6 Z" />
      {/* Toes */}
      <path d="M26 10 C26 6 28 4 30 4 C32 4 33 6 32 9" />
      <path d="M30 12 C30 8 32 6 34 7 C36 8 36 11 35 14" />
      <path d="M33 16 C33 12 35 10 37 12 C39 14 38 17 37 20" />
    </Icon>
  )
}

export function HipIcon(p: P) {
  return (
    <Icon {...p} strokeWidth="2.2">
      <path d="M10 10 C14 6 20 5 25 7 C28 8 30 10 31 13" />
      <path d="M11 14 C14 11 18 10 22 11 C25 12 27 14 28 17" />
      <circle cx="29" cy="23" r="5.5" />
      <path d="M25 26 L19 32 C17 34 17 38 18 42" />
      <path d="M21 31 L26 36" />
      <path d="M31 17 L36 12 C38 10 41 10 43 12" />
      <path d="M33 28 L38 33 C40 35 40 39 38 42" />
    </Icon>
  )
}

export function UterusIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Uterus body */}
      <path d="M24 34 C18 34 12 30 12 22 C12 14 17 8 24 8 C31 8 36 14 36 22 C36 30 30 34 24 34 Z" />
      {/* Cervix */}
      <path d="M20 34 L20 40 C20 43 22 46 24 46 C26 46 28 43 28 40 L28 34" />
      {/* Fallopian tubes */}
      <path d="M12 22 C8 20 4 22 4 26" />
      <path d="M36 22 C40 20 44 22 44 26" />
      {/* Ovaries */}
      <ellipse cx="4" cy="28" rx="4" ry="3" />
      <ellipse cx="44" cy="28" rx="4" ry="3" />
    </Icon>
  )
}

export function SyringeIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Barrel */}
      <rect x="14" y="14" width="20" height="12" rx="3" />
      {/* Plunger rod */}
      <line x1="34" y1="18" x2="44" y2="18" />
      <line x1="34" y1="22" x2="44" y2="22" />
      <rect x="42" y="15" width="4" height="10" rx="2" />
      {/* Needle hub */}
      <path d="M14 15 L8 18 L8 22 L14 25" />
      {/* Needle */}
      <line x1="8" y1="20" x2="2" y2="20" />
      {/* Graduation marks */}
      <line x1="20" y1="14" x2="20" y2="26" strokeDasharray="2 3" />
      <line x1="26" y1="14" x2="26" y2="26" strokeDasharray="2 3" />
    </Icon>
  )
}

export function VascularIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Aorta trunk */}
      <path d="M24 2 C22 2 20 4 20 6 L20 16" />
      {/* Aortic arch */}
      <path d="M20 6 C18 4 14 4 12 6 C10 8 10 12 12 14 L20 16" />
      {/* Descending aorta */}
      <path d="M20 16 L20 28" />
      {/* Iliac bifurcation */}
      <path d="M20 28 L12 36 C10 38 10 42 12 44 C14 46 17 46 18 44" />
      <path d="M20 28 L28 36 C30 38 30 42 28 44 C26 46 23 46 22 44" />
      {/* Renal arteries */}
      <path d="M20 20 L10 20 C8 20 6 22 6 24 C6 26 8 26 10 26 L20 24" />
      <path d="M20 20 L30 20 C32 20 34 22 34 24 C34 26 32 26 30 26 L20 24" />
      {/* Celiac axis hint */}
      <path d="M20 17 L14 14 M20 17 L26 14" />
    </Icon>
  )
}

export function JawIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Upper jaw / maxilla */}
      <path d="M8 14 C8 10 14 6 24 6 C34 6 40 10 40 14 L40 18 C40 20 38 22 36 22 L12 22 C10 22 8 20 8 18 Z" />
      {/* Upper teeth */}
      <line x1="14" y1="22" x2="14" y2="28" />
      <line x1="18" y1="22" x2="18" y2="30" />
      <line x1="22" y1="22" x2="22" y2="30" />
      <line x1="26" y1="22" x2="26" y2="30" />
      <line x1="30" y1="22" x2="30" y2="30" />
      <line x1="34" y1="22" x2="34" y2="28" />
      {/* Lower jaw / mandible */}
      <path d="M8 32 L8 38 C8 43 14 46 24 46 C34 46 40 43 40 38 L40 32 C40 30 38 28 36 28 L12 28 C10 28 8 30 8 32 Z" />
    </Icon>
  )
}

export function PlasticsIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Body silhouette outline */}
      <path d="M24 4 C21 4 18 6 18 10 C18 13 20 15 22 16 L20 18 C16 18 12 20 10 24 L8 32 C8 34 10 36 12 36 L12 44 C12 45 13 46 14 46 L20 46 L20 36 L28 36 L28 46 L34 46 C35 46 36 45 36 44 L36 36 C38 36 40 34 40 32 L38 24 C36 20 32 18 28 18 L26 16 C28 15 30 13 30 10 C30 6 27 4 24 4 Z" />
      {/* Arms */}
      <path d="M10 24 L4 28 C2 30 2 34 4 35 C6 36 8 35 9 33 L12 28" />
      <path d="M38 24 L44 28 C46 30 46 34 44 35 C42 36 40 35 39 33 L36 28" />
    </Icon>
  )
}

export function StomachIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Oesophagus inlet */}
      <path d="M20 4 L20 10" />
      {/* Stomach - J shape */}
      <path d="M20 10 C16 10 10 14 10 22 C10 30 14 38 20 40 C26 42 32 40 36 36 C40 32 40 26 36 22 L36 18 C36 14 32 10 28 10 L20 10 Z" />
      {/* Pylorus outlet */}
      <path d="M36 22 L40 22 C42 22 44 24 44 26 L44 28" />
      {/* Rugal folds */}
      <path d="M15 18 C14 22 14 28 16 32" />
      <path d="M19 14 C18 18 18 26 20 34" />
      <path d="M24 12 C23 18 23 28 25 36" />
    </Icon>
  )
}

export function ColonIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Large intestine - frame shape going round the perimeter */}
      {/* Ascending colon */}
      <path d="M16 44 L16 12 C16 8 18 6 22 6 L28 6 C30 6 32 8 32 12" />
      {/* Transverse colon */}
      <path d="M16 12 C16 8 18 6 22 6 L26 6 C30 6 32 8 32 12" />
      {/* Hepatic / splenic flexures + transverse */}
      <path d="M32 12 C32 8 34 6 38 6 C42 6 44 8 44 12 L44 14 C44 18 42 20 38 20 L10 20 C6 20 4 22 4 26 L4 28 C4 32 6 34 10 34" />
      {/* Descending + sigmoid colon */}
      <path d="M10 34 L10 38 C10 42 12 44 16 44 L22 44 C26 44 28 42 28 38 C28 34 26 32 22 32 L20 32" />
      {/* Rectum -->
      <path d="M22 32 C18 32 16 34 16 38 L16 44" />
      {/* Haustra marks on transverse */}
      <line x1="18" y1="20" x2="18" y2="26" />
      <line x1="24" y1="20" x2="24" y2="26" />
      <line x1="30" y1="20" x2="30" y2="26" />
      <line x1="36" y1="20" x2="36" y2="26" />
    </Icon>
  )
}

export function LiverIcon(p: P) {
  return (
    <Icon {...p}>
      {/* Liver - large right lobe, smaller left lobe */}
      <path d="M6 20 C6 12 12 6 22 6 C30 6 38 8 42 14 C46 18 46 24 44 28 C42 34 36 38 28 38 L18 38 C12 38 8 36 6 32 C4 28 4 24 6 20 Z" />
      {/* Falciform ligament divider */}
      <path d="M22 6 C20 12 20 18 22 24 L22 38" strokeDasharray="2 2" />
      {/* Right lobe subdivision */}
      <path d="M30 10 C32 16 32 24 30 34" strokeDasharray="2 2" />
      {/* Gallbladder */}
      <path d="M26 32 C26 36 28 42 30 44 C32 46 36 46 38 44 C40 42 40 38 38 36 C36 34 32 32 28 32 Z" />
      {/* Bile duct */}
      <line x1="28" y1="34" x2="26" y2="30" />
    </Icon>
  )
}

// Mapping from specialty name to icon component
export const SPECIALTY_SVG_ICON: Record<string, React.ComponentType<P>> = {
  "Trauma and Orthopaedics": HipIcon, // overridden by PNG; fallback only
  "General Surgery": ScalpelIcon,
  Urology: KidneyIcon,
  Obstetrics: BabyIcon,
  Gynecology: UterusIcon,
  "Maternity & Obstetrics": BabyIcon,
  "Otolaryngology (Ear, Nose and Throat)": EarIcon,
  "Oral and Maxillofacial": JawIcon,
  "Dental and Oral": ToothIcon,
  "Plastic and Reconstructive": PlasticsIcon,
  Neurosurgery: NeurosurgeryIcon,
  Cardiothoracic: HeartLungsIcon,
  Vascular: VascularIcon,
  Paediatric: BabyIcon,
  Ophthalmology: EyeIcon,
  Podiatric: FootIcon,
  Anaesthesia: SyringeIcon,
  "Upper GI": StomachIcon,
  "Lower GI": ColonIcon,
  Hepatobiliary: LiverIcon,
  "Respiratory": HeartLungsIcon,
}
