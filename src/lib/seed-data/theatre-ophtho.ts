import { Procedure } from "../types"

function sk(id: string, name: string, approach?: string, implantSystem?: string, familyId?: string, variantLabel?: string): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Operating Theatre",
    specialty: "Ophthalmology",
    approach,
    implantSystem,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",   name: "Surgical Gown",   sku: "Proxima OR",    defaultQty: 2 },
        { id: "gloves", name: "Surgical Gloves", sku: "Biogel 6.0",    defaultQty: 2 },
        { id: "mask",   name: "Surgical Mask",   sku: "ASTM Level 3",  defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "phaco",       name: "Phacoemulsification Machine", sku: "Alcon Centurion", description: "Cataract extraction", defaultQty: 1 },
        { id: "microscope",  name: "Operating Microscope",        sku: "Zeiss OPMI Lumera", description: "Co-axial illumination", defaultQty: 1 },
        { id: "viscoelastic", name: "Viscoelastic Syringe",       sku: "Healon",            description: "Anterior chamber maintenance", defaultQty: 2 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm laterality and IOL power at WHO sign-in. No drapes over face — use ophthalmic drape. Pupil dilation drops given on ward pre-op.",
        items: [],
      },
    ],
  }
}

export const theatreOphtho: Procedure[] = [
  sk("phacoemulsification", "Phacoemulsification + IOL",      "Temporal clear cornea", "Alcon AcrySof IOL", "cataract-surgery",   "Phacoemulsification + IOL"),
  sk("trabeculectomy",      "Trabeculectomy",                  "Fornix-based",          undefined,           "trabeculectomy",     "Fornix-based — MMC augmented"),
  sk("vitrectomy-ppv",      "Pars Plana Vitrectomy (PPV)",     "23G / 25G",             undefined,           "vitrectomy",         "Posterior PPV (23G / 25G)"),
  sk("strabismus-repair",   "Strabismus Correction",           "Limbal",                undefined,           "strabismus-repair",  "Recession / Resection"),
]
