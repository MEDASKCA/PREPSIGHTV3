import { Procedure } from "../types"

function sk(id: string, name: string, approach?: string, implantSystem?: string, familyId?: string, variantLabel?: string): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Operating Theatre",
    specialty: "Vascular Surgery",
    approach,
    implantSystem,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",      name: "Surgical Gown",   sku: "Proxima OR",           defaultQty: 3 },
        { id: "gloves",    name: "Surgical Gloves", sku: "Biogel Eclipse",        defaultQty: 2 },
        { id: "lead-apron", name: "Lead Apron",     sku: "Radiation Protection", defaultQty: 4 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "doppler",   name: "Intraoperative Doppler", sku: "Hadeco ES-100V3",  description: "Flow assessment", defaultQty: 1 },
        { id: "ii",        name: "Image Intensifier",      sku: "Ziehm Vision RFD", description: "Angiography / DSA intraop", defaultQty: 1 },
        { id: "diathermy", name: "Diathermy Unit",         sku: "Valleylab FT10",   defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Lead aprons mandatory — II used throughout. Confirm heparin dose with surgeon. Vessel loops and bulldog clamps on table.",
        items: [],
      },
    ],
  }
}

export const theatreVascular: Procedure[] = [
  sk("carotid-endarterectomy",    "Carotid Endarterectomy",            "Longitudinal cervical", undefined,            "carotid-endarterectomy",     "Open — patch angioplasty"),
  sk("evar",                      "Endovascular Aortic Repair (EVAR)", "Endovascular",          "Medtronic Endurant", "aortic-aneurysm-repair",     "Endovascular (EVAR)"),
  sk("fem-pop-bypass",            "Femoro-Popliteal Bypass",           "Open",                  undefined,            "peripheral-bypass",          "Fem-pop — vein graft"),
  sk("varicose-veins-tevlar",     "Varicose Vein Surgery (EVLA)",      "Endovenous laser",      undefined,            "varicose-vein-treatment",    "Thermal ablation (TEVLAR)"),
  sk("below-knee-amputation",     "Below-Knee Amputation",             "Posterior flap",        undefined,            "lower-limb-amputation",      "Below knee (BKA)"),
]
