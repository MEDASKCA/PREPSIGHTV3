import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const anatomyPath = path.join(root, "data", "anatomy.json")
const mapPath = path.join(root, "data", "service_line_anatomy_map.json")
const specialtiesPath = path.join(root, "data", "specialties.json")
const serviceLinesPath = path.join(root, "data", "service_lines.json")

const anatomyAdd = [
  { id: "ANAT_SPEC_UROLOGY_URINARY_TRACT", name: "Urinary Tract", specialty_id: "SPEC_UROLOGY", parent_id: null, sort_order: 10, tags: ["urinary tract"] },
  { id: "ANAT_SPEC_UROLOGY_UPPER_URINARY_TRACT", name: "Upper Urinary Tract", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_URINARY_TRACT", sort_order: 11, tags: ["upper urinary tract"] },
  { id: "ANAT_SPEC_UROLOGY_KIDNEY", name: "Kidney", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_UPPER_URINARY_TRACT", sort_order: 12, tags: ["kidney"] },
  { id: "ANAT_SPEC_UROLOGY_RENAL_PELVIS", name: "Renal Pelvis", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_UPPER_URINARY_TRACT", sort_order: 13, tags: ["renal pelvis"] },
  { id: "ANAT_SPEC_UROLOGY_URETER", name: "Ureter", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_UPPER_URINARY_TRACT", sort_order: 14, tags: ["ureter"] },
  { id: "ANAT_SPEC_UROLOGY_LOWER_URINARY_TRACT", name: "Lower Urinary Tract", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_URINARY_TRACT", sort_order: 20, tags: ["lower urinary tract"] },
  { id: "ANAT_SPEC_UROLOGY_BLADDER", name: "Bladder", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_LOWER_URINARY_TRACT", sort_order: 21, tags: ["bladder"] },
  { id: "ANAT_SPEC_UROLOGY_URETHRA", name: "Urethra", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_LOWER_URINARY_TRACT", sort_order: 22, tags: ["urethra"] },
  { id: "ANAT_SPEC_UROLOGY_MALE_REPRODUCTIVE_SYSTEM", name: "Male Reproductive System", specialty_id: "SPEC_UROLOGY", parent_id: null, sort_order: 30, tags: ["male reproductive system"] },
  { id: "ANAT_SPEC_UROLOGY_PROSTATE", name: "Prostate", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_MALE_REPRODUCTIVE_SYSTEM", sort_order: 31, tags: ["prostate"] },
  { id: "ANAT_SPEC_UROLOGY_SEMINAL_VESICLES", name: "Seminal Vesicles", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_MALE_REPRODUCTIVE_SYSTEM", sort_order: 32, tags: ["seminal vesicles"] },
  { id: "ANAT_SPEC_UROLOGY_TESTIS", name: "Testis", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_MALE_REPRODUCTIVE_SYSTEM", sort_order: 33, tags: ["testis"] },
  { id: "ANAT_SPEC_UROLOGY_EPIDIDYMIS", name: "Epididymis", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_MALE_REPRODUCTIVE_SYSTEM", sort_order: 34, tags: ["epididymis"] },
  { id: "ANAT_SPEC_UROLOGY_SCROTUM", name: "Scrotum", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_MALE_REPRODUCTIVE_SYSTEM", sort_order: 35, tags: ["scrotum"] },
  { id: "ANAT_SPEC_UROLOGY_PENIS", name: "Penis", specialty_id: "SPEC_UROLOGY", parent_id: "ANAT_SPEC_UROLOGY_MALE_REPRODUCTIVE_SYSTEM", sort_order: 36, tags: ["penis"] },
  { id: "ANAT_SPEC_UROLOGY_PELVIC_FLOOR", name: "Pelvic Floor", specialty_id: "SPEC_UROLOGY", parent_id: null, sort_order: 40, tags: ["pelvic floor"] },

  { id: "ANAT_SPEC_GYNECOLOGY_FEMALE_REPRODUCTIVE_SYSTEM", name: "Female Reproductive System", specialty_id: "SPEC_GYNECOLOGY", parent_id: null, sort_order: 10, tags: ["female reproductive system"] },
  { id: "ANAT_SPEC_GYNECOLOGY_VULVA", name: "Vulva", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_FEMALE_REPRODUCTIVE_SYSTEM", sort_order: 11, tags: ["vulva"] },
  { id: "ANAT_SPEC_GYNECOLOGY_VAGINA", name: "Vagina", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_FEMALE_REPRODUCTIVE_SYSTEM", sort_order: 12, tags: ["vagina"] },
  { id: "ANAT_SPEC_GYNECOLOGY_CERVIX", name: "Cervix", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_FEMALE_REPRODUCTIVE_SYSTEM", sort_order: 13, tags: ["cervix"] },
  { id: "ANAT_SPEC_GYNECOLOGY_UTERUS", name: "Uterus", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_FEMALE_REPRODUCTIVE_SYSTEM", sort_order: 14, tags: ["uterus"] },
  { id: "ANAT_SPEC_GYNECOLOGY_FALLOPIAN_TUBES", name: "Fallopian Tubes", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_FEMALE_REPRODUCTIVE_SYSTEM", sort_order: 15, tags: ["fallopian tubes"] },
  { id: "ANAT_SPEC_GYNECOLOGY_OVARIES", name: "Ovaries", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_FEMALE_REPRODUCTIVE_SYSTEM", sort_order: 16, tags: ["ovaries"] },
  { id: "ANAT_SPEC_GYNECOLOGY_ADNEXA", name: "Adnexa", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_FEMALE_REPRODUCTIVE_SYSTEM", sort_order: 17, tags: ["adnexa"] },
  { id: "ANAT_SPEC_GYNECOLOGY_PELVIS", name: "Pelvis", specialty_id: "SPEC_GYNECOLOGY", parent_id: null, sort_order: 20, tags: ["pelvis"] },
  { id: "ANAT_SPEC_GYNECOLOGY_PELVIC_FLOOR", name: "Pelvic Floor", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_PELVIS", sort_order: 21, tags: ["pelvic floor"] },
  { id: "ANAT_SPEC_GYNECOLOGY_PERITONEUM", name: "Peritoneum", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_PELVIS", sort_order: 22, tags: ["peritoneum"] },
  { id: "ANAT_SPEC_GYNECOLOGY_PELVIC_ORGANS", name: "Pelvic Organs", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_PELVIS", sort_order: 30, tags: ["pelvic organs"] },
  { id: "ANAT_SPEC_GYNECOLOGY_BLADDER", name: "Bladder", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_PELVIC_ORGANS", sort_order: 31, tags: ["bladder"] },
  { id: "ANAT_SPEC_GYNECOLOGY_URETHRA", name: "Urethra", specialty_id: "SPEC_GYNECOLOGY", parent_id: "ANAT_SPEC_GYNECOLOGY_PELVIC_ORGANS", sort_order: 32, tags: ["urethra"] },

  { id: "ANAT_SPEC_OBSTETRICS_PREGNANCY_ANATOMY", name: "Pregnancy Anatomy", specialty_id: "SPEC_OBSTETRICS", parent_id: null, sort_order: 10, tags: ["pregnancy"] },
  { id: "ANAT_SPEC_OBSTETRICS_UTERUS", name: "Uterus", specialty_id: "SPEC_OBSTETRICS", parent_id: "ANAT_SPEC_OBSTETRICS_PREGNANCY_ANATOMY", sort_order: 11, tags: ["uterus"] },
  { id: "ANAT_SPEC_OBSTETRICS_CERVIX", name: "Cervix", specialty_id: "SPEC_OBSTETRICS", parent_id: "ANAT_SPEC_OBSTETRICS_PREGNANCY_ANATOMY", sort_order: 12, tags: ["cervix"] },
  { id: "ANAT_SPEC_OBSTETRICS_PLACENTA", name: "Placenta", specialty_id: "SPEC_OBSTETRICS", parent_id: "ANAT_SPEC_OBSTETRICS_PREGNANCY_ANATOMY", sort_order: 13, tags: ["placenta"] },
  { id: "ANAT_SPEC_OBSTETRICS_LABOUR_AND_DELIVERY", name: "Labour and Delivery", specialty_id: "SPEC_OBSTETRICS", parent_id: null, sort_order: 20, tags: ["labour", "delivery"] },
  { id: "ANAT_SPEC_OBSTETRICS_BIRTH_CANAL", name: "Birth Canal", specialty_id: "SPEC_OBSTETRICS", parent_id: "ANAT_SPEC_OBSTETRICS_LABOUR_AND_DELIVERY", sort_order: 21, tags: ["birth canal"] },
  { id: "ANAT_SPEC_OBSTETRICS_PERINEUM", name: "Perineum", specialty_id: "SPEC_OBSTETRICS", parent_id: "ANAT_SPEC_OBSTETRICS_LABOUR_AND_DELIVERY", sort_order: 22, tags: ["perineum"] },
  { id: "ANAT_SPEC_OBSTETRICS_MATERNAL_PELVIS", name: "Maternal Pelvis", specialty_id: "SPEC_OBSTETRICS", parent_id: "ANAT_SPEC_OBSTETRICS_LABOUR_AND_DELIVERY", sort_order: 23, tags: ["maternal pelvis"] },
  { id: "ANAT_SPEC_OBSTETRICS_ABDOMINAL_ACCESS", name: "Abdominal Access", specialty_id: "SPEC_OBSTETRICS", parent_id: null, sort_order: 30, tags: ["abdominal access"] },
  { id: "ANAT_SPEC_OBSTETRICS_ABDOMINAL_WALL", name: "Abdominal Wall", specialty_id: "SPEC_OBSTETRICS", parent_id: "ANAT_SPEC_OBSTETRICS_ABDOMINAL_ACCESS", sort_order: 31, tags: ["abdominal wall"] }
]

const mapAdd = [
  { id: "SLAMAP_ENDOUROLOGY_KIDNEY", service_line_id: "SL_ENDOUROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_KIDNEY", sort_order: 10 },
  { id: "SLAMAP_ENDOUROLOGY_RENAL_PELVIS", service_line_id: "SL_ENDOUROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_RENAL_PELVIS", sort_order: 20 },
  { id: "SLAMAP_ENDOUROLOGY_URETER", service_line_id: "SL_ENDOUROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_URETER", sort_order: 30 },
  { id: "SLAMAP_ENDOUROLOGY_BLADDER", service_line_id: "SL_ENDOUROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_BLADDER", sort_order: 40 },
  { id: "SLAMAP_UROLOGIC_ONCOLOGY_KIDNEY", service_line_id: "SL_UROLOGIC_ONCOLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_KIDNEY", sort_order: 10 },
  { id: "SLAMAP_UROLOGIC_ONCOLOGY_URETER", service_line_id: "SL_UROLOGIC_ONCOLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_URETER", sort_order: 20 },
  { id: "SLAMAP_UROLOGIC_ONCOLOGY_BLADDER", service_line_id: "SL_UROLOGIC_ONCOLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_BLADDER", sort_order: 30 },
  { id: "SLAMAP_UROLOGIC_ONCOLOGY_PROSTATE", service_line_id: "SL_UROLOGIC_ONCOLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_PROSTATE", sort_order: 40 },
  { id: "SLAMAP_UROLOGIC_ONCOLOGY_TESTIS", service_line_id: "SL_UROLOGIC_ONCOLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_TESTIS", sort_order: 50 },
  { id: "SLAMAP_UROLOGIC_ONCOLOGY_PENIS", service_line_id: "SL_UROLOGIC_ONCOLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_PENIS", sort_order: 60 },
  { id: "SLAMAP_FUNCTIONAL_UROLOGY_AND_INCONTINENCE_BLADDER", service_line_id: "SL_FUNCTIONAL_UROLOGY_AND_INCONTINENCE", anatomy_id: "ANAT_SPEC_UROLOGY_BLADDER", sort_order: 10 },
  { id: "SLAMAP_FUNCTIONAL_UROLOGY_AND_INCONTINENCE_URETHRA", service_line_id: "SL_FUNCTIONAL_UROLOGY_AND_INCONTINENCE", anatomy_id: "ANAT_SPEC_UROLOGY_URETHRA", sort_order: 20 },
  { id: "SLAMAP_FUNCTIONAL_UROLOGY_AND_INCONTINENCE_PELVIC_FLOOR", service_line_id: "SL_FUNCTIONAL_UROLOGY_AND_INCONTINENCE", anatomy_id: "ANAT_SPEC_UROLOGY_PELVIC_FLOOR", sort_order: 30 },
  { id: "SLAMAP_ANDROLOGY_PENIS", service_line_id: "SL_ANDROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_PENIS", sort_order: 10 },
  { id: "SLAMAP_ANDROLOGY_TESTIS", service_line_id: "SL_ANDROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_TESTIS", sort_order: 20 },
  { id: "SLAMAP_ANDROLOGY_EPIDIDYMIS", service_line_id: "SL_ANDROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_EPIDIDYMIS", sort_order: 30 },
  { id: "SLAMAP_ANDROLOGY_SCROTUM", service_line_id: "SL_ANDROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_SCROTUM", sort_order: 40 },
  { id: "SLAMAP_RECONSTRUCTIVE_UROLOGY_URETHRA", service_line_id: "SL_RECONSTRUCTIVE_UROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_URETHRA", sort_order: 10 },
  { id: "SLAMAP_RECONSTRUCTIVE_UROLOGY_BLADDER", service_line_id: "SL_RECONSTRUCTIVE_UROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_BLADDER", sort_order: 20 },
  { id: "SLAMAP_RECONSTRUCTIVE_UROLOGY_PENIS", service_line_id: "SL_RECONSTRUCTIVE_UROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_PENIS", sort_order: 30 },
  { id: "SLAMAP_PAEDIATRIC_UROLOGY_KIDNEY", service_line_id: "SL_PAEDIATRIC_UROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_KIDNEY", sort_order: 10 },
  { id: "SLAMAP_PAEDIATRIC_UROLOGY_URETER", service_line_id: "SL_PAEDIATRIC_UROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_URETER", sort_order: 20 },
  { id: "SLAMAP_PAEDIATRIC_UROLOGY_BLADDER", service_line_id: "SL_PAEDIATRIC_UROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_BLADDER", sort_order: 30 },
  { id: "SLAMAP_PAEDIATRIC_UROLOGY_URETHRA", service_line_id: "SL_PAEDIATRIC_UROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_URETHRA", sort_order: 40 },
  { id: "SLAMAP_PAEDIATRIC_UROLOGY_PENIS", service_line_id: "SL_PAEDIATRIC_UROLOGY", anatomy_id: "ANAT_SPEC_UROLOGY_PENIS", sort_order: 50 },
  { id: "SLAMAP_BENIGN_GYNECOLOGY_VULVA", service_line_id: "SL_BENIGN_GYNECOLOGY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_VULVA", sort_order: 10 },
  { id: "SLAMAP_BENIGN_GYNECOLOGY_VAGINA", service_line_id: "SL_BENIGN_GYNECOLOGY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_VAGINA", sort_order: 20 },
  { id: "SLAMAP_BENIGN_GYNECOLOGY_CERVIX", service_line_id: "SL_BENIGN_GYNECOLOGY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_CERVIX", sort_order: 30 },
  { id: "SLAMAP_BENIGN_GYNECOLOGY_UTERUS", service_line_id: "SL_BENIGN_GYNECOLOGY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_UTERUS", sort_order: 40 },
  { id: "SLAMAP_BENIGN_GYNECOLOGY_FALLOPIAN_TUBES", service_line_id: "SL_BENIGN_GYNECOLOGY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_FALLOPIAN_TUBES", sort_order: 50 },
  { id: "SLAMAP_BENIGN_GYNECOLOGY_OVARIES", service_line_id: "SL_BENIGN_GYNECOLOGY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_OVARIES", sort_order: 60 },
  { id: "SLAMAP_GYNECOLOGIC_ONCOLOGY_UTERUS", service_line_id: "SL_GYNECOLOGIC_ONCOLOGY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_UTERUS", sort_order: 10 },
  { id: "SLAMAP_GYNECOLOGIC_ONCOLOGY_CERVIX", service_line_id: "SL_GYNECOLOGIC_ONCOLOGY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_CERVIX", sort_order: 20 },
  { id: "SLAMAP_GYNECOLOGIC_ONCOLOGY_OVARIES", service_line_id: "SL_GYNECOLOGIC_ONCOLOGY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_OVARIES", sort_order: 30 },
  { id: "SLAMAP_GYNECOLOGIC_ONCOLOGY_FALLOPIAN_TUBES", service_line_id: "SL_GYNECOLOGIC_ONCOLOGY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_FALLOPIAN_TUBES", sort_order: 40 },
  { id: "SLAMAP_GYNECOLOGIC_ONCOLOGY_PERITONEUM", service_line_id: "SL_GYNECOLOGIC_ONCOLOGY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_PERITONEUM", sort_order: 50 },
  { id: "SLAMAP_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY_PELVIC_FLOOR", service_line_id: "SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_PELVIC_FLOOR", sort_order: 10 },
  { id: "SLAMAP_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY_VAGINA", service_line_id: "SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_VAGINA", sort_order: 20 },
  { id: "SLAMAP_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY_BLADDER", service_line_id: "SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_BLADDER", sort_order: 30 },
  { id: "SLAMAP_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY_URETHRA", service_line_id: "SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_URETHRA", sort_order: 40 },
  { id: "SLAMAP_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY_UTERUS", service_line_id: "SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_UTERUS", sort_order: 50 },
  { id: "SLAMAP_REPRODUCTIVE_SURGERY_UTERUS", service_line_id: "SL_REPRODUCTIVE_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_UTERUS", sort_order: 10 },
  { id: "SLAMAP_REPRODUCTIVE_SURGERY_FALLOPIAN_TUBES", service_line_id: "SL_REPRODUCTIVE_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_FALLOPIAN_TUBES", sort_order: 20 },
  { id: "SLAMAP_REPRODUCTIVE_SURGERY_OVARIES", service_line_id: "SL_REPRODUCTIVE_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_OVARIES", sort_order: 30 },
  { id: "SLAMAP_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY_PELVIS", service_line_id: "SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_PELVIS", sort_order: 10 },
  { id: "SLAMAP_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY_UTERUS", service_line_id: "SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_UTERUS", sort_order: 20 },
  { id: "SLAMAP_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY_ADNEXA", service_line_id: "SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_ADNEXA", sort_order: 30 },
  { id: "SLAMAP_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY_PERITONEUM", service_line_id: "SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY", anatomy_id: "ANAT_SPEC_GYNECOLOGY_PERITONEUM", sort_order: 40 },
  { id: "SLAMAP_OPERATIVE_DELIVERY_BIRTH_CANAL", service_line_id: "SL_OPERATIVE_DELIVERY", anatomy_id: "ANAT_SPEC_OBSTETRICS_BIRTH_CANAL", sort_order: 10 },
  { id: "SLAMAP_OPERATIVE_DELIVERY_PERINEUM", service_line_id: "SL_OPERATIVE_DELIVERY", anatomy_id: "ANAT_SPEC_OBSTETRICS_PERINEUM", sort_order: 20 },
  { id: "SLAMAP_OPERATIVE_DELIVERY_MATERNAL_PELVIS", service_line_id: "SL_OPERATIVE_DELIVERY", anatomy_id: "ANAT_SPEC_OBSTETRICS_MATERNAL_PELVIS", sort_order: 30 },
  { id: "SLAMAP_CAESAREAN_BIRTH_UTERUS", service_line_id: "SL_CAESAREAN_BIRTH", anatomy_id: "ANAT_SPEC_OBSTETRICS_UTERUS", sort_order: 10 },
  { id: "SLAMAP_CAESAREAN_BIRTH_ABDOMINAL_WALL", service_line_id: "SL_CAESAREAN_BIRTH", anatomy_id: "ANAT_SPEC_OBSTETRICS_ABDOMINAL_WALL", sort_order: 20 },
  { id: "SLAMAP_HIGH_RISK_OBSTETRICS_UTERUS", service_line_id: "SL_HIGH_RISK_OBSTETRICS", anatomy_id: "ANAT_SPEC_OBSTETRICS_UTERUS", sort_order: 10 },
  { id: "SLAMAP_HIGH_RISK_OBSTETRICS_PLACENTA", service_line_id: "SL_HIGH_RISK_OBSTETRICS", anatomy_id: "ANAT_SPEC_OBSTETRICS_PLACENTA", sort_order: 20 }
]

const anatomy = JSON.parse(fs.readFileSync(anatomyPath, "utf8"))
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"))
const specialties = JSON.parse(fs.readFileSync(specialtiesPath, "utf8"))
const serviceLines = JSON.parse(fs.readFileSync(serviceLinesPath, "utf8"))

const specialtyIds = new Set(specialties.map((s) => s.id))
const serviceLineIds = new Set(serviceLines.map((s) => s.id))
const anatomyById = new Map(anatomy.map((a) => [a.id, a]))
const mapById = new Map(map.map((m) => [m.id, m]))

let anatomyAdded = 0
for (const item of anatomyAdd) {
  if (anatomyById.has(item.id)) continue
  anatomy.push(item)
  anatomyById.set(item.id, item)
  anatomyAdded += 1
}

let mapAdded = 0
for (const item of mapAdd) {
  if (mapById.has(item.id)) continue
  map.push(item)
  mapById.set(item.id, item)
  mapAdded += 1
}

fs.writeFileSync(anatomyPath, `${JSON.stringify(anatomy, null, 2)}\n`, "utf8")
fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`, "utf8")

const anatomyIds = new Set(anatomy.map((a) => a.id))
const invalidAnatomySpecialties = anatomy.filter((a) => !specialtyIds.has(a.specialty_id))
const invalidMappingServiceLines = map.filter((m) => !serviceLineIds.has(m.service_line_id))
const invalidMappingAnatomy = map.filter((m) => !anatomyIds.has(m.anatomy_id))

console.log(
  JSON.stringify({
    anatomyTotal: anatomy.length,
    mapTotal: map.length,
    anatomyAdded,
    mapAdded,
    invalidAnatomySpecialties: invalidAnatomySpecialties.length,
    invalidMappingServiceLines: invalidMappingServiceLines.length,
    invalidMappingAnatomy: invalidMappingAnatomy.length,
  })
)
