import { Procedure } from "../types"

function sk(id: string, name: string, specialty: string, approach?: string, implantSystem?: string, familyId?: string, variantLabel?: string): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Interventional Radiology / Cath Lab",
    specialty,
    approach,
    implantSystem,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "lead-apron", name: "Lead Apron",         sku: "Radiation Protection",   defaultQty: 4 },
        { id: "thyroid",    name: "Thyroid Collar",     sku: "Lead Thyroid Collar",    defaultQty: 4 },
        { id: "gown",       name: "Sterile Gown",       sku: "Proxima OR",             defaultQty: 2 },
        { id: "gloves",     name: "Sterile Gloves",     sku: "Biogel Eclipse",          defaultQty: 2 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "dsa",       name: "DSA / Fluoroscopy",      sku: "Philips Allura Xper",   description: "Digital subtraction angiography", defaultQty: 1 },
        { id: "power-inj", name: "Power Injector",         sku: "Medrad Mark V",          description: "Contrast injection", defaultQty: 1 },
        { id: "ultrasound", name: "Vascular Ultrasound",   sku: "SonoSite M-Turbo",       description: "Access guidance", defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Lead protection mandatory for all staff. Confirm contrast allergy and renal function pre-procedure. Heparinised saline flushes prepared.",
        items: [],
      },
    ],
  }
}

export const cathLab: Procedure[] = [
  sk("coronary-angiogram",    "Coronary Angiogram ± PCI",             "Cardiology",               "Radial / femoral",      undefined,            "coronary-angiography",           "Diagnostic coronary angiogram"),
  sk("pacemaker-insertion",   "Pacemaker Insertion",                   "Cardiology",               "Subclavian / cephalic", "Medtronic Micra",    "pacemaker-insertion",            "Dual-chamber PPM"),
  sk("uterine-fibroid-emb",   "Uterine Fibroid Embolisation (UFE)",   "Interventional Radiology", "Femoral",               undefined,            "uterine-fibroid-embolisation",   "UAE — bilateral"),
  sk("hepatic-angioembolism",  "Hepatic Artery Embolisation",         "Interventional Radiology", "Femoral",               undefined,            "hepatic-embolisation",           "TACE / bland embolisation"),
  sk("neuro-angio",           "Cerebral Angiogram",                    "Neuroradiology",           "Femoral",               undefined,            "neuroangiography",               "Cerebral angiogram"),
]
