"""
Generate procedure variants + systems + mappings for:
Part 1: General Surgery, Urology, Gynaecology
"""
import json, os

BASE = "C:/Users/forda/orthopod/data"

def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {len(data)} records -> {path}")

def merge_by_id(existing, new_items):
    idx = {x["id"]: x for x in existing}
    added = 0
    for item in new_items:
        if item["id"] not in idx:
            idx[item["id"]] = item
            added += 1
    print(f"  Merged: {added} new / {len(existing)} existing")
    return list(idx.values())

# ── helpers ──────────────────────────────────────────────────────────────────
def v(id, proc_id, spec_id, sl_id, anat_id, name, vtype, vval, desc, sort):
    return {"id": id, "procedure_id": proc_id, "setting": "operating_theatre",
            "specialty_id": spec_id, "service_line_id": sl_id, "anatomy_id": anat_id,
            "name": name, "variant_type": vtype, "variant_value": vval,
            "description": desc, "sort_order": sort, "status": "active"}

def sys_(id, name, sup_id, category, desc):
    return {"id": id, "name": name, "supplier_id": sup_id,
            "category": category, "description": desc, "status": "active"}

def vmap(vid, sid, is_default=False):
    return {"procedure_variant_id": vid, "system_id": sid, "is_default": is_default}

# ═══════════════════════════════════════════════════════════════════════════
# GENERAL SURGERY VARIANTS
# ═══════════════════════════════════════════════════════════════════════════
GS = "SPEC_GENERAL_SURGERY"
A = lambda x: f"ANAT_SPEC_GENERAL_SURGERY_{x}"

gs_variants = [
  # Emergency
  v("PV_APPENDICECTOMY_LAP","PROC_APPENDICECTOMY",GS,"SL_EMERGENCY_GENERAL_SURGERY",A("APPENDIX"),"Laparoscopic","technique","Laparoscopic","Three-port laparoscopic appendicectomy.",10),
  v("PV_APPENDICECTOMY_OPEN","PROC_APPENDICECTOMY",GS,"SL_EMERGENCY_GENERAL_SURGERY",A("APPENDIX"),"Open","technique","Open","Open appendicectomy via right iliac fossa incision.",20),
  v("PV_APPENDICECTOMY_SINGLE_PORT","PROC_APPENDICECTOMY",GS,"SL_EMERGENCY_GENERAL_SURGERY",A("APPENDIX"),"Single-port Laparoscopic","technique","Single-port","Single-port laparoscopic appendicectomy.",30),

  v("PV_ADHESIOLYSIS_LAP","PROC_ADHESIOLYSIS_FOR_BOWEL_OBSTRUCTION",GS,"SL_EMERGENCY_GENERAL_SURGERY",A("SMALL_INTESTINE"),"Laparoscopic","technique","Laparoscopic","Laparoscopic adhesiolysis for small bowel obstruction.",10),
  v("PV_ADHESIOLYSIS_OPEN","PROC_ADHESIOLYSIS_FOR_BOWEL_OBSTRUCTION",GS,"SL_EMERGENCY_GENERAL_SURGERY",A("SMALL_INTESTINE"),"Open","technique","Open","Open adhesiolysis via midline laparotomy.",20),

  v("PV_SMALL_BOWEL_RESECTION_LAP","PROC_SMALL_BOWEL_RESECTION",GS,"SL_EMERGENCY_GENERAL_SURGERY",A("SMALL_INTESTINE"),"Laparoscopic","technique","Laparoscopic","Laparoscopic small bowel resection and anastomosis.",10),
  v("PV_SMALL_BOWEL_RESECTION_OPEN","PROC_SMALL_BOWEL_RESECTION",GS,"SL_EMERGENCY_GENERAL_SURGERY",A("SMALL_INTESTINE"),"Open","technique","Open","Open small bowel resection.",20),

  v("PV_PERFDUODENAL_LAP","PROC_CLOSURE_OF_PERFORATED_DUODENAL_ULCER",GS,"SL_EMERGENCY_GENERAL_SURGERY",A("DUODENUM"),"Laparoscopic","technique","Laparoscopic","Laparoscopic omental patch repair.",10),
  v("PV_PERFDUODENAL_OPEN","PROC_CLOSURE_OF_PERFORATED_DUODENAL_ULCER",GS,"SL_EMERGENCY_GENERAL_SURGERY",A("DUODENUM"),"Open","technique","Open","Open omental patch repair.",20),

  v("PV_EMERG_LAP_EXPLORATORY","PROC_EMERGENCY_LAPAROTOMY",GS,"SL_EMERGENCY_GENERAL_SURGERY",A("ABDOMEN"),"Exploratory","indication","Exploratory","Emergency laparotomy for diagnostic purposes.",10),
  v("PV_EMERG_LAP_DAMAGE_CONTROL","PROC_EMERGENCY_LAPAROTOMY",GS,"SL_EMERGENCY_GENERAL_SURGERY",A("ABDOMEN"),"Damage Control","indication","Damage Control","Emergency laparotomy with damage control strategy.",20),

  v("PV_DCL_INITIAL","PROC_DAMAGE_CONTROL_LAPAROTOMY",GS,"SL_ACUTE_CARE_SURGERY",A("ABDOMEN"),"Initial DCL","phase","Initial","Initial damage control laparotomy with packing.",10),
  v("PV_DCL_RELOOK","PROC_DAMAGE_CONTROL_LAPAROTOMY",GS,"SL_ACUTE_CARE_SURGERY",A("ABDOMEN"),"Planned Relook","phase","Relook","Planned relook and definitive repair.",20),

  v("PV_RELOOK_LAP_STANDARD","PROC_RELOOK_LAPAROTOMY",GS,"SL_ACUTE_CARE_SURGERY",A("ABDOMEN"),"Standard Relook","type","Standard","Relook laparotomy with washout.",10),
  v("PV_RELOOK_LAP_ANASTOMOSIS","PROC_RELOOK_LAPAROTOMY",GS,"SL_ACUTE_CARE_SURGERY",A("ABDOMEN"),"With Bowel Anastomosis","type","With Anastomosis","Relook with definitive bowel anastomosis.",20),

  v("PV_NPT_STANDARD","PROC_NEGATIVE_PRESSURE_THERAPY_FOR_OPEN_ABDOMEN",GS,"SL_ACUTE_CARE_SURGERY",A("ABDOMEN"),"Standard NPT","type","Standard","Standard negative pressure wound therapy for open abdomen.",10),
  v("PV_NPT_MESH","PROC_NEGATIVE_PRESSURE_THERAPY_FOR_OPEN_ABDOMEN",GS,"SL_ACUTE_CARE_SURGERY",A("ABDOMEN"),"With Mesh Reinforcement","type","With Mesh","NPT with absorbable mesh reinforcement.",20),

  # Breast
  v("PV_WLE_BREAST_STANDARD","PROC_WIDE_LOCAL_EXCISION_OF_BREAST_LESION",GS,"SL_BREAST_SURGERY",A("BREAST"),"Standard WLE","technique","Standard","Standard wide local excision.",10),
  v("PV_WLE_BREAST_ONCOPLASTIC","PROC_WIDE_LOCAL_EXCISION_OF_BREAST_LESION",GS,"SL_BREAST_SURGERY",A("BREAST"),"Oncoplastic WLE","technique","Oncoplastic","Oncoplastic wide local excision with volume displacement.",20),

  v("PV_MASTECTOMY_SIMPLE","PROC_MASTECTOMY",GS,"SL_BREAST_SURGERY",A("BREAST"),"Simple Mastectomy","technique","Simple","Simple (total) mastectomy.",10),
  v("PV_MASTECTOMY_SKIN_SPARING","PROC_MASTECTOMY",GS,"SL_BREAST_SURGERY",A("BREAST"),"Skin-sparing Mastectomy","technique","Skin-sparing","Skin-sparing mastectomy for immediate reconstruction.",20),
  v("PV_MASTECTOMY_NIPPLE_SPARING","PROC_MASTECTOMY",GS,"SL_BREAST_SURGERY",A("BREAST"),"Nipple-sparing Mastectomy","technique","Nipple-sparing","Nipple-sparing mastectomy.",30),

  v("PV_SLNB_BLUE_DYE","PROC_SENTINEL_LYMPH_NODE_BIOPSY_OF_BREAST",GS,"SL_BREAST_SURGERY",A("AXILLA"),"Blue Dye","technique","Blue Dye","Sentinel node biopsy using blue dye only.",10),
  v("PV_SLNB_RADIOISOTOPE","PROC_SENTINEL_LYMPH_NODE_BIOPSY_OF_BREAST",GS,"SL_BREAST_SURGERY",A("AXILLA"),"Radioisotope","technique","Radioisotope","Sentinel node biopsy using radioisotope.",20),
  v("PV_SLNB_COMBINED","PROC_SENTINEL_LYMPH_NODE_BIOPSY_OF_BREAST",GS,"SL_BREAST_SURGERY",A("AXILLA"),"Combined Blue Dye + Isotope","technique","Combined","Sentinel node biopsy using combined technique.",30),

  v("PV_ANC_STANDARD","PROC_AXILLARY_NODE_CLEARANCE",GS,"SL_BREAST_SURGERY",A("AXILLA"),"Standard ANC","technique","Standard","Standard axillary node clearance levels I-III.",10),
  v("PV_ANC_ARM","PROC_AXILLARY_NODE_CLEARANCE",GS,"SL_BREAST_SURGERY",A("AXILLA"),"With Axillary Reverse Mapping","technique","ARM","ANC with axillary reverse mapping to preserve lymphatics.",20),

  # Colorectal
  v("PV_RIGHT_HEMI_LAP","PROC_RIGHT_HEMICOLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Laparoscopic","technique","Laparoscopic","Laparoscopic right hemicolectomy with intracorporeal anastomosis.",10),
  v("PV_RIGHT_HEMI_OPEN","PROC_RIGHT_HEMICOLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Open","technique","Open","Open right hemicolectomy.",20),
  v("PV_RIGHT_HEMI_ROBOTIC","PROC_RIGHT_HEMICOLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Robotic","technique","Robotic","Robotic-assisted right hemicolectomy.",30),

  v("PV_LEFT_HEMI_LAP","PROC_LEFT_HEMICOLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Laparoscopic","technique","Laparoscopic","Laparoscopic left hemicolectomy.",10),
  v("PV_LEFT_HEMI_OPEN","PROC_LEFT_HEMICOLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Open","technique","Open","Open left hemicolectomy.",20),
  v("PV_LEFT_HEMI_ROBOTIC","PROC_LEFT_HEMICOLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Robotic","technique","Robotic","Robotic left hemicolectomy.",30),

  v("PV_SIGMOID_LAP","PROC_SIGMOID_COLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Laparoscopic","technique","Laparoscopic","Laparoscopic sigmoid colectomy.",10),
  v("PV_SIGMOID_OPEN","PROC_SIGMOID_COLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Open","technique","Open","Open sigmoid colectomy.",20),

  v("PV_ANTERIOR_RES_LAP","PROC_ANTERIOR_RESECTION",GS,"SL_COLORECTAL_SURGERY",A("RECTUM"),"Laparoscopic","technique","Laparoscopic","Laparoscopic anterior resection.",10),
  v("PV_ANTERIOR_RES_OPEN","PROC_ANTERIOR_RESECTION",GS,"SL_COLORECTAL_SURGERY",A("RECTUM"),"Open","technique","Open","Open anterior resection.",20),
  v("PV_ANTERIOR_RES_ROBOTIC","PROC_ANTERIOR_RESECTION",GS,"SL_COLORECTAL_SURGERY",A("RECTUM"),"Robotic","technique","Robotic","Robotic anterior resection.",30),

  v("PV_LAR_LAP_TME","PROC_LOW_ANTERIOR_RESECTION",GS,"SL_COLORECTAL_SURGERY",A("RECTUM"),"Laparoscopic TME","technique","Laparoscopic TME","Laparoscopic low anterior resection with total mesorectal excision.",10),
  v("PV_LAR_OPEN_TME","PROC_LOW_ANTERIOR_RESECTION",GS,"SL_COLORECTAL_SURGERY",A("RECTUM"),"Open TME","technique","Open TME","Open low anterior resection with total mesorectal excision.",20),
  v("PV_LAR_ROBOTIC_TME","PROC_LOW_ANTERIOR_RESECTION",GS,"SL_COLORECTAL_SURGERY",A("RECTUM"),"Robotic TME","technique","Robotic TME","Robotic low anterior resection with TME.",30),

  v("PV_APR_STANDARD","PROC_ABDOMINOPERINEAL_RESECTION",GS,"SL_COLORECTAL_SURGERY",A("RECTUM"),"Standard APR","technique","Standard APR","Standard abdominoperineal resection.",10),
  v("PV_APR_ELAPE","PROC_ABDOMINOPERINEAL_RESECTION",GS,"SL_COLORECTAL_SURGERY",A("RECTUM"),"Extralevator APR (ELAPE)","technique","ELAPE","Extralevator abdominoperineal excision.",20),

  v("PV_HARTMANN_LAP","PROC_HARTMANNS_PROCEDURE",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Laparoscopic","technique","Laparoscopic","Laparoscopic Hartmann's procedure.",10),
  v("PV_HARTMANN_OPEN","PROC_HARTMANNS_PROCEDURE",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Open","technique","Open","Open Hartmann's procedure.",20),

  v("PV_SUBTOTAL_COLECTOMY_LAP","PROC_SUBTOTAL_COLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Laparoscopic","technique","Laparoscopic","Laparoscopic subtotal colectomy.",10),
  v("PV_SUBTOTAL_COLECTOMY_OPEN","PROC_SUBTOTAL_COLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Open","technique","Open","Open subtotal colectomy.",20),

  v("PV_TOTAL_COLECTOMY_LAP","PROC_TOTAL_COLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Laparoscopic","technique","Laparoscopic","Laparoscopic total colectomy.",10),
  v("PV_TOTAL_COLECTOMY_OPEN","PROC_TOTAL_COLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Open","technique","Open","Open total colectomy.",20),
  v("PV_TOTAL_COLECTOMY_ROBOTIC","PROC_TOTAL_COLECTOMY",GS,"SL_COLORECTAL_SURGERY",A("COLON"),"Robotic","technique","Robotic","Robotic total colectomy.",30),

  v("PV_LOOP_ILEO_LAP","PROC_FORMATION_OF_LOOP_ILEOSTOMY",GS,"SL_COLORECTAL_SURGERY",A("SMALL_INTESTINE"),"Laparoscopic","technique","Laparoscopic","Laparoscopic loop ileostomy formation.",10),
  v("PV_LOOP_ILEO_OPEN","PROC_FORMATION_OF_LOOP_ILEOSTOMY",GS,"SL_COLORECTAL_SURGERY",A("SMALL_INTESTINE"),"Open","technique","Open","Open loop ileostomy.",20),

  v("PV_REVERSAL_ILEO_STANDARD","PROC_REVERSAL_OF_ILEOSTOMY",GS,"SL_COLORECTAL_SURGERY",A("SMALL_INTESTINE"),"Standard Reversal","technique","Standard","Ileostomy reversal via small local incision.",10),
  v("PV_REVERSAL_ILEO_LAP","PROC_REVERSAL_OF_ILEOSTOMY",GS,"SL_COLORECTAL_SURGERY",A("SMALL_INTESTINE"),"Laparoscopic-assisted","technique","Laparoscopic","Laparoscopic-assisted ileostomy reversal.",20),

  v("PV_HAEMORRHOIDECTOMY_MILLIGAN","PROC_HAEMORRHOIDECTOMY",GS,"SL_COLORECTAL_SURGERY",A("ANUS"),"Milligan-Morgan (Open)","technique","Milligan-Morgan","Open excisional haemorrhoidectomy.",10),
  v("PV_HAEMORRHOIDECTOMY_FERGUSON","PROC_HAEMORRHOIDECTOMY",GS,"SL_COLORECTAL_SURGERY",A("ANUS"),"Ferguson (Closed)","technique","Ferguson","Closed excisional haemorrhoidectomy.",20),
  v("PV_HAEMORRHOIDECTOMY_STAPLED","PROC_HAEMORRHOIDECTOMY",GS,"SL_COLORECTAL_SURGERY",A("ANUS"),"Stapled (PPH)","technique","Stapled PPH","Stapled haemorrhoidopexy using circular stapler.",30),
  v("PV_HAEMORRHOIDECTOMY_LIGASURE","PROC_HAEMORRHOIDECTOMY",GS,"SL_COLORECTAL_SURGERY",A("ANUS"),"LigaSure Haemorrhoidectomy","technique","LigaSure","Haemorrhoidectomy using vessel sealing device.",40),

  v("PV_LIS_OPEN","PROC_LATERAL_INTERNAL_SPHINCTEROTOMY",GS,"SL_COLORECTAL_SURGERY",A("ANUS"),"Open","technique","Open","Open lateral internal sphincterotomy.",10),
  v("PV_LIS_CLOSED","PROC_LATERAL_INTERNAL_SPHINCTEROTOMY",GS,"SL_COLORECTAL_SURGERY",A("ANUS"),"Closed","technique","Closed","Closed lateral internal sphincterotomy.",20),

  v("PV_FISTULOTOMY_SIMPLE","PROC_FISTULOTOMY",GS,"SL_COLORECTAL_SURGERY",A("ANUS"),"Simple Fistulotomy","complexity","Simple","Lay-open of simple inter/subsphincteric fistula.",10),
  v("PV_FISTULOTOMY_COMPLEX","PROC_FISTULOTOMY",GS,"SL_COLORECTAL_SURGERY",A("ANUS"),"Complex Fistulotomy","complexity","Complex","Complex fistulotomy with staged approach.",20),

  v("PV_SETON_CUTTING","PROC_SETON_INSERTION",GS,"SL_COLORECTAL_SURGERY",A("ANUS"),"Cutting Seton","type","Cutting","Cutting seton for high fistula-in-ano.",10),
  v("PV_SETON_DRAINING","PROC_SETON_INSERTION",GS,"SL_COLORECTAL_SURGERY",A("ANUS"),"Draining Seton","type","Draining","Draining (loose) seton for symptom control.",20),

  # Upper GI
  v("PV_OESOPHAGECTOMY_IVOR_LEWIS","PROC_OESOPHAGECTOMY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("OESOPHAGUS"),"Ivor Lewis (Two-stage)","technique","Ivor Lewis","Right thoracotomy and laparotomy with intrathoracic anastomosis.",10),
  v("PV_OESOPHAGECTOMY_MCKEOWN","PROC_OESOPHAGECTOMY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("OESOPHAGUS"),"McKeown (Three-stage)","technique","McKeown","Three-stage oesophagectomy with cervical anastomosis.",20),
  v("PV_OESOPHAGECTOMY_TRANSHIATAL","PROC_OESOPHAGECTOMY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("OESOPHAGUS"),"Transhiatal","technique","Transhiatal","Transhiatal oesophagectomy without thoracotomy.",30),
  v("PV_OESOPHAGECTOMY_MIO","PROC_OESOPHAGECTOMY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("OESOPHAGUS"),"Minimally Invasive (MIO)","technique","Minimally Invasive","Minimally invasive oesophagectomy (VATS + laparoscopy).",40),

  v("PV_TOTAL_GASTRECTOMY_OPEN","PROC_TOTAL_GASTRECTOMY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("STOMACH"),"Open","technique","Open","Open total gastrectomy.",10),
  v("PV_TOTAL_GASTRECTOMY_LAP","PROC_TOTAL_GASTRECTOMY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("STOMACH"),"Laparoscopic","technique","Laparoscopic","Laparoscopic total gastrectomy.",20),
  v("PV_TOTAL_GASTRECTOMY_ROBOTIC","PROC_TOTAL_GASTRECTOMY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("STOMACH"),"Robotic","technique","Robotic","Robotic total gastrectomy.",30),

  v("PV_SUBTOTAL_GASTRECTOMY_OPEN","PROC_SUBTOTAL_GASTRECTOMY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("STOMACH"),"Open","technique","Open","Open subtotal gastrectomy.",10),
  v("PV_SUBTOTAL_GASTRECTOMY_LAP","PROC_SUBTOTAL_GASTRECTOMY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("STOMACH"),"Laparoscopic","technique","Laparoscopic","Laparoscopic subtotal gastrectomy.",20),

  v("PV_ANTIREFLUX_NISSEN","PROC_ANTI_REFLUX_SURGERY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("GASTROOESOPHAGEAL_JUNCTION"),"Laparoscopic Nissen Fundoplication","technique","Nissen","360-degree laparoscopic fundoplication.",10),
  v("PV_ANTIREFLUX_TOUPET","PROC_ANTI_REFLUX_SURGERY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("GASTROOESOPHAGEAL_JUNCTION"),"Laparoscopic Toupet Fundoplication","technique","Toupet","270-degree posterior laparoscopic fundoplication.",20),
  v("PV_ANTIREFLUX_OPEN","PROC_ANTI_REFLUX_SURGERY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("GASTROOESOPHAGEAL_JUNCTION"),"Open Fundoplication","technique","Open","Open anti-reflux surgery.",30),

  v("PV_HIATUS_LAP","PROC_HIATUS_HERNIA_REPAIR",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("DIAPHRAGM"),"Laparoscopic","technique","Laparoscopic","Laparoscopic hiatus hernia repair with fundoplication.",10),
  v("PV_HIATUS_OPEN","PROC_HIATUS_HERNIA_REPAIR",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("DIAPHRAGM"),"Open","technique","Open","Open hiatus hernia repair.",20),

  v("PV_GASTROJEJUNOSTOMY_LAP","PROC_GASTROJEJUNOSTOMY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("STOMACH"),"Laparoscopic","technique","Laparoscopic","Laparoscopic gastrojejunostomy.",10),
  v("PV_GASTROJEJUNOSTOMY_OPEN","PROC_GASTROJEJUNOSTOMY",GS,"SL_UPPER_GASTROINTESTINAL_SURGERY",A("STOMACH"),"Open","technique","Open","Open gastrojejunostomy.",20),

  # HPB
  v("PV_WEDGE_LIVER_OPEN","PROC_WEDGE_RESECTION_OF_LIVER",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("LIVER"),"Open","technique","Open","Open hepatic wedge resection.",10),
  v("PV_WEDGE_LIVER_LAP","PROC_WEDGE_RESECTION_OF_LIVER",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("LIVER"),"Laparoscopic","technique","Laparoscopic","Laparoscopic hepatic wedge resection.",20),

  v("PV_SEGMENTECTOMY_LIVER_OPEN","PROC_SEGMENTECTOMY_OF_LIVER",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("LIVER"),"Open","technique","Open","Open hepatic segmentectomy.",10),
  v("PV_SEGMENTECTOMY_LIVER_LAP","PROC_SEGMENTECTOMY_OF_LIVER",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("LIVER"),"Laparoscopic","technique","Laparoscopic","Laparoscopic hepatic segmentectomy.",20),

  v("PV_RIGHT_HEPATECTOMY_OPEN","PROC_RIGHT_HEPATECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("LIVER"),"Open","technique","Open","Open right hepatectomy.",10),
  v("PV_RIGHT_HEPATECTOMY_LAP","PROC_RIGHT_HEPATECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("LIVER"),"Laparoscopic","technique","Laparoscopic","Laparoscopic right hepatectomy.",20),

  v("PV_LEFT_HEPATECTOMY_OPEN","PROC_LEFT_HEPATECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("LIVER"),"Open","technique","Open","Open left hepatectomy.",10),
  v("PV_LEFT_HEPATECTOMY_LAP","PROC_LEFT_HEPATECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("LIVER"),"Laparoscopic","technique","Laparoscopic","Laparoscopic left hepatectomy.",20),

  v("PV_CHOLECYSTECTOMY_LAP","PROC_CHOLECYSTECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("GALLBLADDER"),"Laparoscopic","technique","Laparoscopic","Four-port laparoscopic cholecystectomy.",10),
  v("PV_CHOLECYSTECTOMY_OPEN","PROC_CHOLECYSTECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("GALLBLADDER"),"Open","technique","Open","Open cholecystectomy via subcostal incision.",20),
  v("PV_CHOLECYSTECTOMY_SINGLE_PORT","PROC_CHOLECYSTECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("GALLBLADDER"),"Single-port (SILS)","technique","Single-port","Single-incision laparoscopic cholecystectomy.",30),

  v("PV_CBD_EXPLORATION_LAP","PROC_COMMON_BILE_DUCT_EXPLORATION",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("BILE_DUCTS"),"Laparoscopic","technique","Laparoscopic","Laparoscopic common bile duct exploration.",10),
  v("PV_CBD_EXPLORATION_OPEN","PROC_COMMON_BILE_DUCT_EXPLORATION",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("BILE_DUCTS"),"Open","technique","Open","Open common bile duct exploration.",20),

  v("PV_WHIPPLE_CLASSIC","PROC_PANCREATICODUODENECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("PANCREAS"),"Classic Whipple","technique","Classic","Classic pancreaticoduodenectomy.",10),
  v("PV_WHIPPLE_PPPD","PROC_PANCREATICODUODENECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("PANCREAS"),"Pylorus-preserving (PPPD)","technique","Pylorus-preserving","Pylorus-preserving pancreaticoduodenectomy.",20),
  v("PV_WHIPPLE_MIS","PROC_PANCREATICODUODENECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("PANCREAS"),"Minimally Invasive","technique","Minimally Invasive","Laparoscopic or robotic pancreaticoduodenectomy.",30),

  v("PV_DISTAL_PANC_OPEN","PROC_DISTAL_PANCREATECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("PANCREAS"),"Open","technique","Open","Open distal pancreatectomy.",10),
  v("PV_DISTAL_PANC_LAP","PROC_DISTAL_PANCREATECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("PANCREAS"),"Laparoscopic","technique","Laparoscopic","Laparoscopic distal pancreatectomy.",20),
  v("PV_DISTAL_PANC_SPLEEN","PROC_DISTAL_PANCREATECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("PANCREAS"),"With Splenectomy","variant","With Splenectomy","Distal pancreatectomy with splenectomy.",30),
  v("PV_DISTAL_PANC_SPLEEN_PRESERVING","PROC_DISTAL_PANCREATECTOMY",GS,"SL_HEPATOPANCREATOBILIARY_SURGERY",A("PANCREAS"),"Spleen-preserving","variant","Spleen-preserving","Spleen-preserving distal pancreatectomy.",40),

  v("PV_LIVER_TX_DECEASED","PROC_LIVER_TRANSPLANTATION",GS,"SL_TRANSPLANT_SURGERY",A("LIVER"),"Deceased Donor","donor","Deceased Donor","Orthotopic liver transplantation from deceased donor.",10),
  v("PV_LIVER_TX_LIVING_RIGHT","PROC_LIVER_TRANSPLANTATION",GS,"SL_TRANSPLANT_SURGERY",A("LIVER"),"Living Donor Right Lobe","donor","Living Donor Right Lobe","Living donor liver transplantation using right lobe.",20),
  v("PV_LIVER_TX_LIVING_LEFT","PROC_LIVER_TRANSPLANTATION",GS,"SL_TRANSPLANT_SURGERY",A("LIVER"),"Living Donor Left Lobe","donor","Living Donor Left Lobe","Living donor liver transplantation using left lobe.",30),

  v("PV_PANCREAS_TX_SPK","PROC_PANCREAS_TRANSPLANTATION",GS,"SL_TRANSPLANT_SURGERY",A("PANCREAS"),"Simultaneous Pancreas-Kidney (SPK)","type","SPK","Simultaneous pancreas and kidney transplantation.",10),
  v("PV_PANCREAS_TX_PAK","PROC_PANCREAS_TRANSPLANTATION",GS,"SL_TRANSPLANT_SURGERY",A("PANCREAS"),"Pancreas After Kidney (PAK)","type","PAK","Pancreas transplantation after prior kidney transplant.",20),

  v("PV_SBT_ISOLATED","PROC_SMALL_BOWEL_TRANSPLANTATION",GS,"SL_TRANSPLANT_SURGERY",A("SMALL_INTESTINE"),"Isolated","type","Isolated","Isolated small bowel transplantation.",10),
  v("PV_SBT_COMBINED_LIVER","PROC_SMALL_BOWEL_TRANSPLANTATION",GS,"SL_TRANSPLANT_SURGERY",A("SMALL_INTESTINE"),"Combined Liver-Small Bowel","type","Combined","Combined liver and small bowel transplantation.",20),

  # Bariatric
  v("PV_SLEEVE_STANDARD","PROC_SLEEVE_GASTRECTOMY",GS,"SL_BARIATRIC_SURGERY",A("STOMACH"),"Standard Laparoscopic","technique","Standard","Standard laparoscopic sleeve gastrectomy.",10),
  v("PV_SLEEVE_ROBOTIC","PROC_SLEEVE_GASTRECTOMY",GS,"SL_BARIATRIC_SURGERY",A("STOMACH"),"Robotic","technique","Robotic","Robotic sleeve gastrectomy.",20),
  v("PV_SLEEVE_REVISIONAL","PROC_SLEEVE_GASTRECTOMY",GS,"SL_BARIATRIC_SURGERY",A("STOMACH"),"Revisional","type","Revisional","Revisional sleeve gastrectomy.",30),

  v("PV_RYGB_LAP","PROC_ROUX_EN_Y_GASTRIC_BYPASS",GS,"SL_BARIATRIC_SURGERY",A("STOMACH"),"Laparoscopic RYGB","technique","Laparoscopic","Standard laparoscopic Roux-en-Y gastric bypass.",10),
  v("PV_RYGB_ROBOTIC","PROC_ROUX_EN_Y_GASTRIC_BYPASS",GS,"SL_BARIATRIC_SURGERY",A("STOMACH"),"Robotic RYGB","technique","Robotic","Robotic Roux-en-Y gastric bypass.",20),

  v("PV_OAGB_LAP","PROC_ONE_ANASTOMOSIS_GASTRIC_BYPASS",GS,"SL_BARIATRIC_SURGERY",A("STOMACH"),"Laparoscopic OAGB","technique","Laparoscopic","Laparoscopic one-anastomosis gastric bypass (mini-bypass).",10),
  v("PV_OAGB_ROBOTIC","PROC_ONE_ANASTOMOSIS_GASTRIC_BYPASS",GS,"SL_BARIATRIC_SURGERY",A("STOMACH"),"Robotic OAGB","technique","Robotic","Robotic one-anastomosis gastric bypass.",20),

  v("PV_BARIATRIC_REV_TO_RYGB","PROC_BARIATRIC_REVISION_SURGERY",GS,"SL_BARIATRIC_SURGERY",A("STOMACH"),"Conversion to RYGB","revision_type","To RYGB","Revision bariatric surgery converting to RYGB.",10),
  v("PV_BARIATRIC_REV_TO_SLEEVE","PROC_BARIATRIC_REVISION_SURGERY",GS,"SL_BARIATRIC_SURGERY",A("STOMACH"),"Conversion to Sleeve","revision_type","To Sleeve","Revision converting to sleeve gastrectomy.",20),

  # Endocrine
  v("PV_THYROIDECTOMY_TOTAL","PROC_THYROIDECTOMY",GS,"SL_ENDOCRINE_SURGERY",A("THYROID_GLAND"),"Total Thyroidectomy","extent","Total","Total thyroidectomy via open cervical incision.",10),
  v("PV_THYROIDECTOMY_NEAR_TOTAL","PROC_THYROIDECTOMY",GS,"SL_ENDOCRINE_SURGERY",A("THYROID_GLAND"),"Near-total Thyroidectomy","extent","Near-total","Near-total thyroidectomy leaving small remnant.",20),
  v("PV_THYROIDECTOMY_MIVAT","PROC_THYROIDECTOMY",GS,"SL_ENDOCRINE_SURGERY",A("THYROID_GLAND"),"Minimally Invasive (MIVAT)","technique","MIVAT","Minimally invasive video-assisted thyroidectomy.",30),

  v("PV_HEMITHYROID_OPEN","PROC_HEMITHYROIDECTOMY",GS,"SL_ENDOCRINE_SURGERY",A("THYROID_GLAND"),"Open","technique","Open","Open hemithyroidectomy.",10),
  v("PV_HEMITHYROID_ENDOSCOPIC","PROC_HEMITHYROIDECTOMY",GS,"SL_ENDOCRINE_SURGERY",A("THYROID_GLAND"),"Endoscopic","technique","Endoscopic","Endoscopic hemithyroidectomy.",20),

  v("PV_PARATHYROID_FOCUSED","PROC_PARATHYROIDECTOMY",GS,"SL_ENDOCRINE_SURGERY",A("PARATHYROID_GLANDS"),"Focused (Single Gland)","technique","Focused","Focused parathyroidectomy using gamma probe.",10),
  v("PV_PARATHYROID_FOUR_GLAND","PROC_PARATHYROIDECTOMY",GS,"SL_ENDOCRINE_SURGERY",A("PARATHYROID_GLANDS"),"Four-gland Exploration","technique","Four-gland","Bilateral four-gland exploration.",20),
  v("PV_PARATHYROID_ENDOSCOPIC","PROC_PARATHYROIDECTOMY",GS,"SL_ENDOCRINE_SURGERY",A("PARATHYROID_GLANDS"),"Endoscopic","technique","Endoscopic","Endoscopic parathyroidectomy.",30),

  v("PV_ADRENALECTOMY_LAP","PROC_ADRENALECTOMY",GS,"SL_ENDOCRINE_SURGERY",A("ADRENAL_GLANDS"),"Laparoscopic Transperitoneal","technique","Laparoscopic","Laparoscopic transperitoneal adrenalectomy.",10),
  v("PV_ADRENALECTOMY_POSTERIOR","PROC_ADRENALECTOMY",GS,"SL_ENDOCRINE_SURGERY",A("ADRENAL_GLANDS"),"Posterior Retroperitoneoscopic","technique","Posterior Retro","Posterior retroperitoneoscopic adrenalectomy.",20),
  v("PV_ADRENALECTOMY_OPEN","PROC_ADRENALECTOMY",GS,"SL_ENDOCRINE_SURGERY",A("ADRENAL_GLANDS"),"Open","technique","Open","Open adrenalectomy.",30),

  # Surgical Oncology
  v("PV_CRS_HIPEC","PROC_CYTOREDUCTIVE_SURGERY",GS,"SL_SURGICAL_ONCOLOGY",A("PERITONEUM"),"With HIPEC","technique","CRS + HIPEC","Cytoreductive surgery with hyperthermic intraperitoneal chemotherapy.",10),
  v("PV_CRS_NO_HIPEC","PROC_CYTOREDUCTIVE_SURGERY",GS,"SL_SURGICAL_ONCOLOGY",A("PERITONEUM"),"Without HIPEC","technique","CRS only","Cytoreductive surgery without HIPEC.",20),

  v("PV_PERITONEAL_DEBULK_HIPEC","PROC_PERITONEAL_TUMOUR_DEBULKING",GS,"SL_SURGICAL_ONCOLOGY",A("PERITONEUM"),"With HIPEC","technique","With HIPEC","Peritoneal debulking with HIPEC.",10),
  v("PV_PERITONEAL_DEBULK_STANDARD","PROC_PERITONEAL_TUMOUR_DEBULKING",GS,"SL_SURGICAL_ONCOLOGY",A("PERITONEUM"),"Standard Debulking","technique","Standard","Standard peritoneal tumour debulking.",20),

  v("PV_ONCO_LIVER_OPEN","PROC_ONCOLOGICAL_LIVER_RESECTION",GS,"SL_SURGICAL_ONCOLOGY",A("LIVER"),"Open","technique","Open","Open hepatic resection for malignancy.",10),
  v("PV_ONCO_LIVER_LAP","PROC_ONCOLOGICAL_LIVER_RESECTION",GS,"SL_SURGICAL_ONCOLOGY",A("LIVER"),"Laparoscopic","technique","Laparoscopic","Laparoscopic hepatic resection for malignancy.",20),

  v("PV_ONCO_GASTRECTOMY_D1","PROC_ONCOLOGICAL_GASTRECTOMY",GS,"SL_SURGICAL_ONCOLOGY",A("STOMACH"),"D1 Gastrectomy","lymphadenectomy","D1","Gastrectomy with D1 lymph node dissection.",10),
  v("PV_ONCO_GASTRECTOMY_D2","PROC_ONCOLOGICAL_GASTRECTOMY",GS,"SL_SURGICAL_ONCOLOGY",A("STOMACH"),"D2 Gastrectomy","lymphadenectomy","D2","Gastrectomy with D2 lymph node dissection (standard).",20),

  v("PV_ONCO_PANCREATECTOMY_OPEN","PROC_ONCOLOGICAL_PANCREATECTOMY",GS,"SL_SURGICAL_ONCOLOGY",A("PANCREAS"),"Open Whipple","technique","Open","Open pancreaticoduodenectomy for malignancy.",10),
  v("PV_ONCO_PANCREATECTOMY_MIS","PROC_ONCOLOGICAL_PANCREATECTOMY",GS,"SL_SURGICAL_ONCOLOGY",A("PANCREAS"),"Minimally Invasive Whipple","technique","MIS","Minimally invasive pancreaticoduodenectomy.",20),

  v("PV_ONCO_COLECTOMY_RIGHT","PROC_ONCOLOGICAL_COLECTOMY",GS,"SL_SURGICAL_ONCOLOGY",A("COLON"),"Right Hemicolectomy","type","Right","Right hemicolectomy for colonic malignancy.",10),
  v("PV_ONCO_COLECTOMY_LEFT","PROC_ONCOLOGICAL_COLECTOMY",GS,"SL_SURGICAL_ONCOLOGY",A("COLON"),"Left Hemicolectomy","type","Left","Left hemicolectomy for colonic malignancy.",20),

  # Hernia
  v("PV_IHR_TEP","PROC_INGUINAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("GROIN"),"TEP (Totally Extraperitoneal)","technique","TEP","Laparoscopic totally extraperitoneal inguinal hernia repair.",10),
  v("PV_IHR_TAPP","PROC_INGUINAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("GROIN"),"TAPP (Transabdominal Preperitoneal)","technique","TAPP","Laparoscopic transabdominal preperitoneal inguinal hernia repair.",20),
  v("PV_IHR_LICHTENSTEIN","PROC_INGUINAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("GROIN"),"Open Lichtenstein (Mesh)","technique","Lichtenstein","Open tension-free mesh inguinal hernia repair.",30),
  v("PV_IHR_OPEN_TISSUE","PROC_INGUINAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("GROIN"),"Open Tissue (Shouldice)","technique","Shouldice","Open tissue repair - Shouldice technique.",40),

  v("PV_FHR_OPEN","PROC_FEMORAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("GROIN"),"Open","technique","Open","Open femoral hernia repair.",10),
  v("PV_FHR_LAP","PROC_FEMORAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("GROIN"),"Laparoscopic (TEP/TAPP)","technique","Laparoscopic","Laparoscopic femoral hernia repair.",20),

  v("PV_UHR_OPEN_MESH","PROC_UMBILICAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("UMBILICUS"),"Open with Mesh","technique","Open Mesh","Open umbilical hernia repair with mesh reinforcement.",10),
  v("PV_UHR_OPEN_SUTURE","PROC_UMBILICAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("UMBILICUS"),"Open Suture Repair","technique","Open Suture","Open primary suture repair for small umbilical hernia.",20),
  v("PV_UHR_LAP","PROC_UMBILICAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("UMBILICUS"),"Laparoscopic","technique","Laparoscopic","Laparoscopic umbilical hernia repair.",30),

  v("PV_INCISIONAL_ONLAY","PROC_INCISIONAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("ABDOMINAL_WALL"),"Open Onlay Mesh","technique","Onlay","Open incisional hernia repair with onlay mesh.",10),
  v("PV_INCISIONAL_SUBLAY","PROC_INCISIONAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("ABDOMINAL_WALL"),"Open Sublay (Retromuscular) Mesh","technique","Sublay","Open incisional hernia repair with retromuscular mesh.",20),
  v("PV_INCISIONAL_LAP_IPOM","PROC_INCISIONAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("ABDOMINAL_WALL"),"Laparoscopic IPOM","technique","IPOM","Laparoscopic intraperitoneal onlay mesh repair.",30),
  v("PV_INCISIONAL_ROBOTIC","PROC_INCISIONAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("ABDOMINAL_WALL"),"Robotic Retromuscular","technique","Robotic","Robotic retromuscular incisional hernia repair.",40),

  v("PV_VENTRAL_ONLAY","PROC_VENTRAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("ABDOMINAL_WALL"),"Open Onlay","technique","Onlay","Open ventral hernia repair with onlay mesh.",10),
  v("PV_VENTRAL_SUBLAY","PROC_VENTRAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("ABDOMINAL_WALL"),"Open Sublay","technique","Sublay","Open ventral hernia repair with sublay mesh.",20),
  v("PV_VENTRAL_IPOM","PROC_VENTRAL_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("ABDOMINAL_WALL"),"Laparoscopic IPOM","technique","IPOM","Laparoscopic IPOM ventral hernia repair.",30),

  v("PV_DIAPHRAGMATIC_LAP","PROC_DIAPHRAGMATIC_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("DIAPHRAGM"),"Laparoscopic","technique","Laparoscopic","Laparoscopic diaphragmatic hernia repair.",10),
  v("PV_DIAPHRAGMATIC_OPEN","PROC_DIAPHRAGMATIC_HERNIA_REPAIR",GS,"SL_HERNIA_SURGERY",A("DIAPHRAGM"),"Open","technique","Open","Open diaphragmatic hernia repair.",20),
]

# ═══════════════════════════════════════════════════════════════════════════
# UROLOGY VARIANTS
# ═══════════════════════════════════════════════════════════════════════════
UR = "SPEC_UROLOGY"
UA = lambda x: f"ANAT_SPEC_UROLOGY_{x}"

ur_variants = [
  v("PV_URETEROSCOPY_STONE_RIGID","PROC_URETEROSCOPY_AND_STONE_EXTRACTION",UR,"SL_ENDOUROLOGY",UA("URETER"),"Rigid Ureteroscopy","technique","Rigid","Rigid ureteroscopy with basket extraction.",10),
  v("PV_URETEROSCOPY_STONE_SEMI","PROC_URETEROSCOPY_AND_STONE_EXTRACTION",UR,"SL_ENDOUROLOGY",UA("URETER"),"Semi-rigid Ureteroscopy","technique","Semi-rigid","Semi-rigid ureteroscopy with stone extraction.",20),

  v("PV_URETEROSCOPY_LASER_HOLMIUM","PROC_URETEROSCOPY_AND_LASER_LITHOTRIPSY",UR,"SL_ENDOUROLOGY",UA("URETER"),"Holmium Laser Lithotripsy","energy","Holmium","Holmium:YAG laser lithotripsy via ureteroscopy.",10),
  v("PV_URETEROSCOPY_LASER_THULIUM","PROC_URETEROSCOPY_AND_LASER_LITHOTRIPSY",UR,"SL_ENDOUROLOGY",UA("URETER"),"Thulium Fibre Laser","energy","Thulium Fibre","Thulium fibre laser lithotripsy.",20),

  v("PV_FURS_STANDARD","PROC_FLEXIBLE_URETERORENOSCOPY",UR,"SL_ENDOUROLOGY",UA("KIDNEY"),"Standard FURS","technique","Standard","Flexible ureterorenoscopy with laser dusting.",10),
  v("PV_FURS_SINGLE_USE","PROC_FLEXIBLE_URETERORENOSCOPY",UR,"SL_ENDOUROLOGY",UA("KIDNEY"),"Single-use Scope FURS","technique","Single-use","FURS using single-use flexible ureteroscope.",20),

  v("PV_PCNL_STANDARD","PROC_PERCUTANEOUS_NEPHROLITHOTOMY",UR,"SL_ENDOUROLOGY",UA("KIDNEY"),"Standard PCNL","size","Standard (30Fr)","Standard percutaneous nephrolithotomy.",10),
  v("PV_PCNL_MINI","PROC_PERCUTANEOUS_NEPHROLITHOTOMY",UR,"SL_ENDOUROLOGY",UA("KIDNEY"),"Mini-PCNL","size","Mini (14-20Fr)","Mini percutaneous nephrolithotomy.",20),
  v("PV_PCNL_ULTRA_MINI","PROC_PERCUTANEOUS_NEPHROLITHOTOMY",UR,"SL_ENDOUROLOGY",UA("KIDNEY"),"Ultra-mini PCNL","size","Ultra-mini (<14Fr)","Ultra-mini PCNL with reduced tract size.",30),

  v("PV_JJ_STENT_CYSTO","PROC_INSERTION_OF_URETERIC_STENT",UR,"SL_ENDOUROLOGY",UA("URETER"),"Cystoscopic Insertion","technique","Cystoscopic","JJ ureteric stent insertion under cystoscopic guidance.",10),
  v("PV_JJ_STENT_FLUORO","PROC_INSERTION_OF_URETERIC_STENT",UR,"SL_ENDOUROLOGY",UA("URETER"),"Fluoroscopic Insertion","technique","Fluoroscopic","JJ stent insertion under fluoroscopic guidance.",20),

  v("PV_JJ_EXCHANGE_CYSTO","PROC_EXCHANGE_OF_URETERIC_STENT",UR,"SL_ENDOUROLOGY",UA("URETER"),"Cystoscopic","technique","Cystoscopic","JJ stent exchange under cystoscopy.",10),
  v("PV_JJ_EXCHANGE_FLUORO","PROC_EXCHANGE_OF_URETERIC_STENT",UR,"SL_ENDOUROLOGY",UA("URETER"),"Fluoroscopic","technique","Fluoroscopic","JJ stent exchange under fluoroscopy.",20),

  v("PV_TURBT_STANDARD","PROC_TRANSURETHRAL_RESECTION_OF_BLADDER_TUMOUR",UR,"SL_UROLOGIC_ONCOLOGY",UA("BLADDER"),"Standard TURBT","technique","Standard","Standard transurethral resection of bladder tumour.",10),
  v("PV_TURBT_EN_BLOC","PROC_TRANSURETHRAL_RESECTION_OF_BLADDER_TUMOUR",UR,"SL_UROLOGIC_ONCOLOGY",UA("BLADDER"),"En Bloc Resection","technique","En Bloc","En bloc TURBT with laser.",20),
  v("PV_TURBT_BLUE_LIGHT","PROC_TRANSURETHRAL_RESECTION_OF_BLADDER_TUMOUR",UR,"SL_UROLOGIC_ONCOLOGY",UA("BLADDER"),"Blue Light Cystoscopy (HAL)","technique","Blue Light","TURBT with photodynamic blue light cystoscopy.",30),

  v("PV_RADICAL_CYSTECTOMY_OPEN","PROC_RADICAL_CYSTECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("BLADDER"),"Open","technique","Open","Open radical cystectomy.",10),
  v("PV_RADICAL_CYSTECTOMY_ROBOTIC","PROC_RADICAL_CYSTECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("BLADDER"),"Robotic","technique","Robotic","Robot-assisted laparoscopic radical cystectomy.",20),
  v("PV_RADICAL_CYSTECTOMY_LAP","PROC_RADICAL_CYSTECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("BLADDER"),"Laparoscopic","technique","Laparoscopic","Laparoscopic radical cystectomy.",30),

  v("PV_RADICAL_PROSTATECTOMY_ROBOTIC","PROC_RADICAL_PROSTATECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("PROSTATE"),"Robotic (RARP)","technique","Robotic","Robot-assisted radical prostatectomy.",10),
  v("PV_RADICAL_PROSTATECTOMY_OPEN","PROC_RADICAL_PROSTATECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("PROSTATE"),"Open Retropubic","technique","Open","Open retropubic radical prostatectomy.",20),
  v("PV_RADICAL_PROSTATECTOMY_LAP","PROC_RADICAL_PROSTATECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("PROSTATE"),"Laparoscopic","technique","Laparoscopic","Laparoscopic radical prostatectomy.",30),

  v("PV_RADICAL_NEPHRECTOMY_LAP","PROC_RADICAL_NEPHRECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("KIDNEY"),"Laparoscopic","technique","Laparoscopic","Laparoscopic radical nephrectomy.",10),
  v("PV_RADICAL_NEPHRECTOMY_ROBOTIC","PROC_RADICAL_NEPHRECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("KIDNEY"),"Robotic","technique","Robotic","Robotic radical nephrectomy.",20),
  v("PV_RADICAL_NEPHRECTOMY_OPEN","PROC_RADICAL_NEPHRECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("KIDNEY"),"Open","technique","Open","Open radical nephrectomy.",30),

  v("PV_PARTIAL_NEPHRECTOMY_ROBOTIC","PROC_PARTIAL_NEPHRECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("KIDNEY"),"Robotic","technique","Robotic","Robot-assisted partial nephrectomy.",10),
  v("PV_PARTIAL_NEPHRECTOMY_LAP","PROC_PARTIAL_NEPHRECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("KIDNEY"),"Laparoscopic","technique","Laparoscopic","Laparoscopic partial nephrectomy.",20),
  v("PV_PARTIAL_NEPHRECTOMY_OPEN","PROC_PARTIAL_NEPHRECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("KIDNEY"),"Open","technique","Open","Open partial nephrectomy.",30),

  v("PV_NEPHROURETERECTOMY_LAP","PROC_NEPHROURETERECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("URETER"),"Laparoscopic","technique","Laparoscopic","Laparoscopic nephroureterectomy.",10),
  v("PV_NEPHROURETERECTOMY_ROBOTIC","PROC_NEPHROURETERECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("URETER"),"Robotic","technique","Robotic","Robotic nephroureterectomy.",20),
  v("PV_NEPHROURETERECTOMY_OPEN","PROC_NEPHROURETERECTOMY",UR,"SL_UROLOGIC_ONCOLOGY",UA("URETER"),"Open","technique","Open","Open nephroureterectomy.",30),

  v("PV_TURP_MONOPOLAR","PROC_TRANSURETHRAL_RESECTION_OF_PROSTATE",UR,"SL_FUNCTIONAL_UROLOGY_AND_INCONTINENCE",UA("PROSTATE"),"Monopolar TURP","energy","Monopolar","Monopolar transurethral resection of prostate.",10),
  v("PV_TURP_BIPOLAR","PROC_TRANSURETHRAL_RESECTION_OF_PROSTATE",UR,"SL_FUNCTIONAL_UROLOGY_AND_INCONTINENCE",UA("PROSTATE"),"Bipolar TURP","energy","Bipolar","Bipolar transurethral resection of prostate in saline.",20),

  v("PV_HOLEP_STANDARD","PROC_HOLMIUM_LASER_ENUCLEATION_OF_PROSTATE",UR,"SL_FUNCTIONAL_UROLOGY_AND_INCONTINENCE",UA("PROSTATE"),"Standard HoLEP","technique","Standard","Holmium laser enucleation of prostate.",10),
  v("PV_HOLEP_THULIUM","PROC_HOLMIUM_LASER_ENUCLEATION_OF_PROSTATE",UR,"SL_FUNCTIONAL_UROLOGY_AND_INCONTINENCE",UA("PROSTATE"),"Thulium Laser Enucleation (ThuLEP)","technique","ThuLEP","Thulium laser enucleation of prostate.",20),

  v("PV_INTERSTIM_UNILATERAL","PROC_SACRAL_NEUROMODULATION",UR,"SL_FUNCTIONAL_UROLOGY_AND_INCONTINENCE",UA("PELVIC_FLOOR"),"Unilateral Lead","laterality","Unilateral","Sacral neuromodulation with unilateral lead.",10),
  v("PV_INTERSTIM_BILATERAL","PROC_SACRAL_NEUROMODULATION",UR,"SL_FUNCTIONAL_UROLOGY_AND_INCONTINENCE",UA("PELVIC_FLOOR"),"Bilateral Leads","laterality","Bilateral","Sacral neuromodulation with bilateral leads.",20),

  v("PV_PENILE_PROSTHESIS_IPP","PROC_PENILE_PROSTHESIS_INSERTION",UR,"SL_ANDROLOGY",UA("PENIS"),"Inflatable Penile Prosthesis (IPP)","type","Inflatable","Three-piece inflatable penile prosthesis insertion.",10),
  v("PV_PENILE_PROSTHESIS_SEMI","PROC_PENILE_PROSTHESIS_INSERTION",UR,"SL_ANDROLOGY",UA("PENIS"),"Semi-rigid Prosthesis","type","Semi-rigid","Semi-rigid (malleable) penile prosthesis insertion.",20),

  v("PV_URETHROPLASTY_ANASTOMOTIC","PROC_URETHROPLASTY",UR,"SL_RECONSTRUCTIVE_UROLOGY",UA("URETHRA"),"Anastomotic Urethroplasty","technique","Anastomotic","Excision and primary anastomosis urethroplasty.",10),
  v("PV_URETHROPLASTY_BUCCAL","PROC_URETHROPLASTY",UR,"SL_RECONSTRUCTIVE_UROLOGY",UA("URETHRA"),"Buccal Mucosal Graft","technique","Buccal Graft","Urethroplasty using buccal mucosal graft.",20),

  v("PV_URINARY_DIVERSION_ILEAL_CONDUIT","PROC_URINARY_DIVERSION",UR,"SL_RECONSTRUCTIVE_UROLOGY",UA("BLADDER"),"Ileal Conduit","type","Ileal Conduit","Urinary diversion via ileal conduit.",10),
  v("PV_URINARY_DIVERSION_NEOBLADDER","PROC_URINARY_DIVERSION",UR,"SL_RECONSTRUCTIVE_UROLOGY",UA("BLADDER"),"Orthotopic Neobladder","type","Neobladder","Orthotopic ileal neobladder reconstruction.",20),
  v("PV_URINARY_DIVERSION_CONTINENT_POUCH","PROC_URINARY_DIVERSION",UR,"SL_RECONSTRUCTIVE_UROLOGY",UA("BLADDER"),"Continent Cutaneous Pouch","type","Continent Pouch","Indiana pouch or similar continent diversion.",30),

  v("PV_PYELOPLASTY_LAP","PROC_PYELOPLASTY",UR,"SL_PAEDIATRIC_UROLOGY",UA("RENAL_PELVIS"),"Laparoscopic (Anderson-Hynes)","technique","Laparoscopic","Laparoscopic dismembered pyeloplasty.",10),
  v("PV_PYELOPLASTY_OPEN","PROC_PYELOPLASTY",UR,"SL_PAEDIATRIC_UROLOGY",UA("RENAL_PELVIS"),"Open","technique","Open","Open pyeloplasty.",20),
  v("PV_PYELOPLASTY_ROBOTIC","PROC_PYELOPLASTY",UR,"SL_PAEDIATRIC_UROLOGY",UA("RENAL_PELVIS"),"Robotic","technique","Robotic","Robot-assisted pyeloplasty.",30),

  v("PV_HYPOSPADIAS_DISTAL","PROC_HYPOSPADIAS_REPAIR",UR,"SL_PAEDIATRIC_UROLOGY",UA("PENIS"),"Distal Repair (MAGPI/Snodgrass)","location","Distal","Distal hypospadias repair.",10),
  v("PV_HYPOSPADIAS_PROXIMAL","PROC_HYPOSPADIAS_REPAIR",UR,"SL_PAEDIATRIC_UROLOGY",UA("PENIS"),"Proximal Repair (Two-stage)","location","Proximal","Proximal hypospadias repair, two-stage approach.",20),

  v("PV_ORCHIDOPEXY_STANDARD","PROC_ORCHIDOPEXY",UR,"SL_PAEDIATRIC_UROLOGY",UA("TESTIS"),"Standard Orchidopexy","technique","Standard","Standard inguinal/scrotal orchidopexy.",10),
  v("PV_ORCHIDOPEXY_LAP","PROC_ORCHIDOPEXY",UR,"SL_PAEDIATRIC_UROLOGY",UA("TESTIS"),"Laparoscopic","technique","Laparoscopic","Laparoscopic orchidopexy for intra-abdominal testis.",20),
]

# ═══════════════════════════════════════════════════════════════════════════
# GYNAECOLOGY VARIANTS
# ═══════════════════════════════════════════════════════════════════════════
GY = "SPEC_GYNECOLOGY"
GA = lambda x: f"ANAT_SPEC_GYNECOLOGY_{x}"

gy_variants = [
  v("PV_HYSTEROSCOPY_RIGID","PROC_DIAGNOSTIC_HYSTEROSCOPY",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Rigid Hysteroscopy","technique","Rigid","Diagnostic rigid hysteroscopy in theatre.",10),
  v("PV_HYSTEROSCOPY_FLEXIBLE","PROC_DIAGNOSTIC_HYSTEROSCOPY",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Flexible Hysteroscopy","technique","Flexible","Flexible outpatient hysteroscopy.",20),

  v("PV_HYSTEROSCOPIC_POLYPECTOMY_RESECTOSCOPE","PROC_HYSTEROSCOPIC_POLYPECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Resectoscope","technique","Resectoscope","Hysteroscopic polypectomy using resectoscope.",10),
  v("PV_HYSTEROSCOPIC_POLYPECTOMY_MORCELLATOR","PROC_HYSTEROSCOPIC_POLYPECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Intrauterine Morcellator","technique","Morcellator","Hysteroscopic polypectomy using tissue morcellator.",20),

  v("PV_FIBROID_RESECTION_TYPE_0","PROC_HYSTEROSCOPIC_RESECTION_OF_FIBROID",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Type 0 (Pedunculated)","fibroid_type","Type 0","Hysteroscopic resection of pedunculated intracavitary fibroid.",10),
  v("PV_FIBROID_RESECTION_TYPE_1","PROC_HYSTEROSCOPIC_RESECTION_OF_FIBROID",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Type I (>50% intracavitary)","fibroid_type","Type I","Hysteroscopic resection of type I submucous fibroid.",20),
  v("PV_FIBROID_RESECTION_TYPE_2","PROC_HYSTEROSCOPIC_RESECTION_OF_FIBROID",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Type II (<50% intracavitary)","fibroid_type","Type II","Hysteroscopic resection of type II submucous fibroid.",30),

  v("PV_ENDOMETRIAL_ABLATION_NOVASURE","PROC_ENDOMETRIAL_ABLATION",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"NovaSure (Impedance)","device","NovaSure","Endometrial ablation using NovaSure impedance-controlled system.",10),
  v("PV_ENDOMETRIAL_ABLATION_MICROWAVE","PROC_ENDOMETRIAL_ABLATION",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Microwave Ablation (MEA)","device","MEA","Endometrial ablation using microwave energy.",20),
  v("PV_ENDOMETRIAL_ABLATION_RESECTION","PROC_ENDOMETRIAL_ABLATION",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Transcervical Resection (TCRE)","device","TCRE","Transcervical resection of endometrium using resectoscope.",30),

  v("PV_TAH_STANDARD","PROC_TOTAL_ABDOMINAL_HYSTERECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Standard TAH","technique","Standard","Total abdominal hysterectomy via Pfannenstiel incision.",10),
  v("PV_TAH_MIDLINE","PROC_TOTAL_ABDOMINAL_HYSTERECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Midline TAH","technique","Midline","Total abdominal hysterectomy via midline laparotomy.",20),

  v("PV_TLH_STANDARD","PROC_TOTAL_LAPAROSCOPIC_HYSTERECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Standard TLH","technique","Standard","Total laparoscopic hysterectomy.",10),
  v("PV_TLH_ROBOTIC","PROC_TOTAL_LAPAROSCOPIC_HYSTERECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Robotic TLH","technique","Robotic","Robot-assisted total laparoscopic hysterectomy.",20),

  v("PV_MYOMECTOMY_OPEN","PROC_MYOMECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Open","technique","Open","Open myomectomy via laparotomy.",10),
  v("PV_MYOMECTOMY_LAP","PROC_MYOMECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Laparoscopic","technique","Laparoscopic","Laparoscopic myomectomy.",20),
  v("PV_MYOMECTOMY_ROBOTIC","PROC_MYOMECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("UTERUS"),"Robotic","technique","Robotic","Robotic myomectomy.",30),

  v("PV_OVARIAN_CYST_LAP","PROC_OVARIAN_CYSTECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("OVARIES"),"Laparoscopic","technique","Laparoscopic","Laparoscopic ovarian cystectomy.",10),
  v("PV_OVARIAN_CYST_OPEN","PROC_OVARIAN_CYSTECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("OVARIES"),"Open","technique","Open","Open ovarian cystectomy.",20),

  v("PV_OOPHORECTOMY_LAP","PROC_OOPHORECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("OVARIES"),"Laparoscopic","technique","Laparoscopic","Laparoscopic oophorectomy.",10),
  v("PV_OOPHORECTOMY_OPEN","PROC_OOPHORECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("OVARIES"),"Open","technique","Open","Open oophorectomy.",20),

  v("PV_SALPINGECTOMY_LAP","PROC_SALPINGECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("FALLOPIAN_TUBES"),"Laparoscopic","technique","Laparoscopic","Laparoscopic salpingectomy.",10),
  v("PV_SALPINGECTOMY_OPEN","PROC_SALPINGECTOMY",GY,"SL_BENIGN_GYNECOLOGY",GA("FALLOPIAN_TUBES"),"Open","technique","Open","Open salpingectomy.",20),

  v("PV_RADICAL_HYST_OPEN","PROC_RADICAL_HYSTERECTOMY",GY,"SL_GYNECOLOGIC_ONCOLOGY",GA("UTERUS"),"Open Wertheim","technique","Open Wertheim","Open radical (Wertheim) hysterectomy.",10),
  v("PV_RADICAL_HYST_LAP","PROC_RADICAL_HYSTERECTOMY",GY,"SL_GYNECOLOGIC_ONCOLOGY",GA("UTERUS"),"Laparoscopic","technique","Laparoscopic","Laparoscopic radical hysterectomy.",20),
  v("PV_RADICAL_HYST_ROBOTIC","PROC_RADICAL_HYSTERECTOMY",GY,"SL_GYNECOLOGIC_ONCOLOGY",GA("UTERUS"),"Robotic","technique","Robotic","Robotic radical hysterectomy.",30),

  v("PV_TAHBSO_OPEN","PROC_TOTAL_ABDOMINAL_HYSTERECTOMY_AND_BILATERAL_SALPINGO_OOPHORECTOMY",GY,"SL_GYNECOLOGIC_ONCOLOGY",GA("ADNEXA"),"Open","technique","Open","Open TAH + bilateral salpingo-oophorectomy.",10),
  v("PV_TAHBSO_LAP","PROC_TOTAL_ABDOMINAL_HYSTERECTOMY_AND_BILATERAL_SALPINGO_OOPHORECTOMY",GY,"SL_GYNECOLOGIC_ONCOLOGY",GA("ADNEXA"),"Laparoscopic","technique","Laparoscopic","Laparoscopic TAH + BSO.",20),

  v("PV_DEBULKING_PRIMARY","PROC_DEBULKING_SURGERY_FOR_OVARIAN_CANCER",GY,"SL_GYNECOLOGIC_ONCOLOGY",GA("OVARIES"),"Primary Debulking","timing","Primary","Primary cytoreductive debulking surgery.",10),
  v("PV_DEBULKING_INTERVAL","PROC_DEBULKING_SURGERY_FOR_OVARIAN_CANCER",GY,"SL_GYNECOLOGIC_ONCOLOGY",GA("OVARIES"),"Interval Debulking","timing","Interval","Interval debulking after neoadjuvant chemotherapy.",20),

  v("PV_ANTERIOR_REPAIR_STANDARD","PROC_ANTERIOR_COLPORRHAPHY",GY,"SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY",GA("VAGINA"),"Standard","technique","Standard","Standard anterior colporrhaphy for cystocoele.",10),
  v("PV_ANTERIOR_REPAIR_MESH","PROC_ANTERIOR_COLPORRHAPHY",GY,"SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY",GA("VAGINA"),"With Mesh Augmentation","technique","With Mesh","Anterior colporrhaphy with synthetic mesh augmentation.",20),

  v("PV_SACROCOLPOPEXY_OPEN","PROC_SACROCOLPOPEXY",GY,"SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY",GA("PELVIC_FLOOR"),"Open","technique","Open","Open abdominal sacrocolpopexy.",10),
  v("PV_SACROCOLPOPEXY_LAP","PROC_SACROCOLPOPEXY",GY,"SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY",GA("PELVIC_FLOOR"),"Laparoscopic","technique","Laparoscopic","Laparoscopic sacrocolpopexy.",20),
  v("PV_SACROCOLPOPEXY_ROBOTIC","PROC_SACROCOLPOPEXY",GY,"SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY",GA("PELVIC_FLOOR"),"Robotic","technique","Robotic","Robotic sacrocolpopexy.",30),

  v("PV_SLING_TVT","PROC_MIDURETHRAL_SLING_PROCEDURE",GY,"SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY",GA("URETHRA"),"Retropubic (TVT)","approach","Retropubic","Retropubic tension-free vaginal tape.",10),
  v("PV_SLING_TOT","PROC_MIDURETHRAL_SLING_PROCEDURE",GY,"SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY",GA("URETHRA"),"Transobturator (TOT/TVT-O)","approach","Transobturator","Transobturator mid-urethral sling.",20),
  v("PV_SLING_SINGLE_INCISION","PROC_MIDURETHRAL_SLING_PROCEDURE",GY,"SL_UROGYNECOLOGY_AND_PELVIC_FLOOR_SURGERY",GA("URETHRA"),"Single-incision Mini-sling","approach","Single-incision","Single-incision mini-sling procedure.",30),

  v("PV_ENDO_TREATMENT_ABLATION","PROC_LAPAROSCOPIC_TREATMENT_OF_ENDOMETRIOSIS",GY,"SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY",GA("PERITONEUM"),"Ablation","technique","Ablation","Laparoscopic ablation of endometriotic deposits.",10),
  v("PV_ENDO_TREATMENT_EXCISION","PROC_LAPAROSCOPIC_TREATMENT_OF_ENDOMETRIOSIS",GY,"SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY",GA("PERITONEUM"),"Excision","technique","Excision","Laparoscopic excision of endometriosis.",20),
  v("PV_ENDO_TREATMENT_DEEP","PROC_LAPAROSCOPIC_TREATMENT_OF_ENDOMETRIOSIS",GY,"SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY",GA("PERITONEUM"),"Deep Infiltrating Endometriosis (DIE)","depth","DIE","Laparoscopic excision of deep infiltrating endometriosis.",30),

  v("PV_LAP_HYST_STANDARD","PROC_LAPAROSCOPIC_HYSTERECTOMY",GY,"SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY",GA("UTERUS"),"Laparoscopic","technique","Laparoscopic","Standard total laparoscopic hysterectomy.",10),
  v("PV_LAP_HYST_ROBOTIC","PROC_LAPAROSCOPIC_HYSTERECTOMY",GY,"SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY",GA("UTERUS"),"Robotic","technique","Robotic","Robotic laparoscopic hysterectomy.",20),

  v("PV_LAP_MYOMECTOMY_STANDARD","PROC_LAPAROSCOPIC_MYOMECTOMY",GY,"SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY",GA("UTERUS"),"Laparoscopic","technique","Laparoscopic","Laparoscopic myomectomy.",10),
  v("PV_LAP_MYOMECTOMY_ROBOTIC","PROC_LAPAROSCOPIC_MYOMECTOMY",GY,"SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY",GA("UTERUS"),"Robotic","technique","Robotic","Robotic myomectomy.",20),

  v("PV_LAP_OVARIAN_CYST_STANDARD","PROC_LAPAROSCOPIC_OVARIAN_CYSTECTOMY",GY,"SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY",GA("OVARIES"),"Laparoscopic","technique","Laparoscopic","Laparoscopic ovarian cystectomy.",10),
  v("PV_LAP_OVARIAN_CYST_ROBOTIC","PROC_LAPAROSCOPIC_OVARIAN_CYSTECTOMY",GY,"SL_MINIMALLY_INVASIVE_GYNECOLOGIC_SURGERY",GA("OVARIES"),"Robotic","technique","Robotic","Robotic ovarian cystectomy.",20),
]

# ═══════════════════════════════════════════════════════════════════════════
# NEW SUPPLIERS
# ═══════════════════════════════════════════════════════════════════════════
new_suppliers = [
  {"id":"SUP_INTUITIVE_SURGICAL","name":"Intuitive Surgical","status":"active"},
  {"id":"SUP_EDWARDS_LIFESCIENCES","name":"Edwards Lifesciences","status":"active"},
  {"id":"SUP_ATRICURE","name":"AtriCure","status":"active"},
  {"id":"SUP_COCHLEAR_LTD","name":"Cochlear Ltd","status":"active"},
  {"id":"SUP_ADVANCED_BIONICS","name":"Advanced Bionics","status":"active"},
  {"id":"SUP_MEDEL","name":"MED-EL","status":"active"},
  {"id":"SUP_INTERSECT_ENT","name":"Intersect ENT (Medtronic)","status":"active"},
  {"id":"SUP_ELEKTA","name":"Elekta","status":"active"},
  {"id":"SUP_BRAINLAB","name":"Brainlab","status":"active"},
  {"id":"SUP_TMJ_CONCEPTS","name":"TMJ Concepts","status":"active"},
  {"id":"SUP_ALLERGAN","name":"Allergan (AbbVie)","status":"active"},
  {"id":"SUP_MENTOR","name":"Mentor Worldwide (J&J)","status":"active"},
  {"id":"SUP_PROCEPT","name":"PROCEPT BioRobotics","status":"active"},
  {"id":"SUP_COLOPLAST","name":"Coloplast","status":"active"},
  {"id":"SUP_ABBOTT_MED","name":"Abbott Medical Devices","status":"active"},
  {"id":"SUP_BOSTON_SCI","name":"Boston Scientific","status":"active"},
  {"id":"SUP_JOTEC","name":"JOTEC (CryoLife)","status":"active"},
  {"id":"SUP_LOMBARD_MEDICAL","name":"Lombard Medical","status":"active"},
  {"id":"SUP_INTEGRA_NEURO","name":"Integra LifeSciences (Neuro)","status":"active"},
  {"id":"SUP_MOLNLYCKE_BURNS","name":"Molnlycke Health Care","status":"active"},
  {"id":"SUP_MEDSKIN","name":"MedSkin Solutions","status":"active"},
  {"id":"SUP_SIENTRA","name":"Sientra","status":"active"},
]

# ═══════════════════════════════════════════════════════════════════════════
# NEW SYSTEMS (General Surgery + Urology + Gynaecology relevant)
# ═══════════════════════════════════════════════════════════════════════════
new_systems = [
  # Staplers / Energy (General Surgery)
  sys_("SYS_ECHELON_FLEX_STAPLER","Echelon Flex Endopath Stapler","SUP_ETHICON","endoscopic_linear_stapler","Ethicon Echelon Flex articulating endoscopic linear cutter stapler."),
  sys_("SYS_ENDO_GIA_STAPLER","Endo GIA Stapler","SUP_MEDTRONIC","endoscopic_linear_stapler","Medtronic Endo GIA reinforced reload endoscopic linear stapler."),
  sys_("SYS_EEA_CIRCULAR_STAPLER","EEA Circular Stapler","SUP_MEDTRONIC","circular_stapler","Medtronic EEA end-to-end anastomosis circular stapler."),
  sys_("SYS_CDH_CIRCULAR_STAPLER","Circular Contour Stapler (CDH)","SUP_ETHICON","circular_stapler","Ethicon CDH curved intraluminal stapler for colorectal anastomosis."),
  sys_("SYS_PPH_STAPLER","PPH Stapler (Procedure for Prolapse and Haemorrhoids)","SUP_ETHICON","circular_stapler","Ethicon PPH stapler for stapled haemorrhoidopexy."),
  sys_("SYS_PROCEED_MESH","Proceed Surgical Mesh","SUP_ETHICON","hernia_mesh","Ethicon Proceed absorbable barrier composite mesh for laparoscopic hernia repair."),
  sys_("SYS_PARIETEX_MESH","Parietex Composite Mesh","SUP_MEDTRONIC","hernia_mesh","Medtronic Parietex 3D composite mesh for laparoscopic hernia repair."),
  sys_("SYS_PHYSIOMESH","Physiomesh Flexible Composite Mesh","SUP_ETHICON","hernia_mesh","Ethicon Physiomesh laparoscopic composite mesh."),
  sys_("SYS_LICHTENSTEIN_MESH","Prolene Polypropylene Mesh","SUP_ETHICON","hernia_mesh","Ethicon Prolene flat polypropylene mesh for open Lichtenstein repair."),
  sys_("SYS_HARMONIC_SCALPEL","Harmonic Scalpel (ACE+7)","SUP_ETHICON","ultrasonic_energy","Ethicon Harmonic ultrasonic energy device for vessel sealing and cutting."),
  sys_("SYS_THUNDERBEAT","Thunderbeat Energy Device","SUP_OLYMPUS","bipolar_energy","Olympus Thunderbeat bipolar + ultrasonic combined energy device."),
  sys_("SYS_DAVINCI_XI","da Vinci Xi Surgical System","SUP_INTUITIVE_SURGICAL","robotic_system","Intuitive Surgical da Vinci Xi 4-arm robotic surgical system."),
  sys_("SYS_DAVINCI_SP","da Vinci SP Surgical System","SUP_INTUITIVE_SURGICAL","robotic_system","Intuitive Surgical da Vinci SP single-port robotic system."),
  sys_("SYS_VERSIUS_ROBOTIC","Versius Robotic Surgical System","SUP_MEDTRONIC","robotic_system","CMR Surgical Versius modular robotic surgical system."),
  sys_("SYS_NPWT_PREVENA","Prevena Incision Management System","SUP_KCI","npwt","KCI Prevena negative pressure wound therapy system for open abdomen."),

  # Urology
  sys_("SYS_HOLMIUM_LASER_SYSTEM","Lumenis VersaPulse Holmium Laser","SUP_MEDTRONIC","laser_system","Holmium:YAG laser system for ureteroscopy and HoLEP."),
  sys_("SYS_THULIUM_FIBRE_LASER","Quanta CYBER TM Thulium Fibre Laser","SUP_MEDTRONIC","laser_system","Thulium fibre laser for lithotripsy and enucleation."),
  sys_("SYS_BOSTON_SCI_SUREFIRE","LithoVue Single-use Ureteroscope","SUP_BOSTON_SCIENTIFIC","flexible_ureteroscope","Boston Scientific LithoVue single-use flexible ureteroscope."),
  sys_("SYS_OLYMPUS_FURS","URF-V2 Flexible Ureteroscope","SUP_OLYMPUS","flexible_ureteroscope","Olympus URF-V2 flexible ureterorenoscope."),
  sys_("SYS_STORZ_FLEX_SCOPE","Flex-X2 Flexible Ureteroscope","SUP_KARL_STORZ","flexible_ureteroscope","Karl Storz Flex-X2 flexible ureteroscope."),
  sys_("SYS_COOK_JJ_STENT","Cook Contour Ureteral Stent","SUP_COOK_MEDICAL","ureteral_stent","Cook Medical Contour JJ ureteric stent."),
  sys_("SYS_BOSTON_SCI_IGNITION","Ignition Ureteral Access Sheath","SUP_BOSTON_SCIENTIFIC","access_sheath","Boston Scientific Ignition ureteral access sheath."),
  sys_("SYS_AMS_800","AMS 800 Artificial Urinary Sphincter","SUP_BOSTON_SCIENTIFIC","urinary_sphincter","Boston Scientific AMS 800 artificial urinary sphincter."),
  sys_("SYS_AMS_700_PENILE","AMS 700 Inflatable Penile Prosthesis","SUP_BOSTON_SCIENTIFIC","penile_prosthesis","Boston Scientific AMS 700 three-piece inflatable penile prosthesis."),
  sys_("SYS_COLOPLAST_TITAN_IPP","Coloplast Titan One-Touch Release IPP","SUP_COLOPLAST","penile_prosthesis","Coloplast Titan OTR inflatable penile prosthesis."),
  sys_("SYS_INTERSTIM_II","InterStim II Sacral Neuromodulation","SUP_MEDTRONIC","neuromodulation","Medtronic InterStim II rechargeable sacral neuromodulation system."),
  sys_("SYS_AXONICS_SNM","Axonics Sacral Neuromodulation","SUP_BOSTON_SCIENTIFIC","neuromodulation","Axonics r-SNM rechargeable sacral neuromodulation."),
  sys_("SYS_AQUABLATION","Aquablation System (AQUABEAM)","SUP_PROCEPT","waterjet_ablation","PROCEPT BioRobotics AQUABEAM robotic waterjet ablation for BPH."),
  sys_("SYS_REZUM_SYSTEM","Rezum Water Vapor Therapy","SUP_BOSTON_SCIENTIFIC","water_vapor","Boston Scientific Rezum water vapor thermal therapy for BPH."),
  sys_("SYS_GREENLIGHT_LASER","GreenLight XPS Laser System","SUP_BOSTON_SCIENTIFIC","laser_system","Boston Scientific GreenLight XPS 180W photoselective vaporisation."),
  sys_("SYS_PCNL_AMPLATZ","Amplatz Dilator Set + Nephroscope","SUP_COOK_MEDICAL","percutaneous_kit","Cook Medical Amplatz percutaneous nephrostomy dilator and Storz nephroscope set."),

  # Gynaecology
  sys_("SYS_NOVASURE","NovaSure Impedance Controlled Endometrial Ablation","SUP_HOLOGIC","endometrial_ablation","Hologic NovaSure global endometrial ablation system."),
  sys_("SYS_MINERVA_ABLATION","Minerva Endometrial Ablation System","SUP_HOLOGIC","endometrial_ablation","Hologic Minerva endometrial ablation with plasma energy."),
  sys_("SYS_HYSTEROSCOPIC_MORCELLATOR","MyoSure Hysteroscopic Tissue Removal","SUP_HOLOGIC","tissue_morcellator","Hologic MyoSure hysteroscopic tissue removal device."),
  sys_("SYS_TVT_EXACT","TVT Exact Midurethral Sling","SUP_ETHICON","midurethral_sling","Ethicon TVT Exact retropubic midurethral sling system."),
  sys_("SYS_MONARC_SLING","Monarc Subfascial Hammock","SUP_BOSTON_SCIENTIFIC","midurethral_sling","AMS/Boston Scientific Monarc transobturator sling."),
  sys_("SYS_GYNEMESH_SACROCOLPOPEXY","Gynemesh PS Mesh","SUP_ETHICON","pelvic_floor_mesh","Ethicon Gynemesh PS non-absorbable polypropylene mesh for sacrocolpopexy."),
  sys_("SYS_ULTRAPRO_MESH","UltraPro Mesh","SUP_ETHICON","hernia_mesh","Ethicon UltraPro lightweight composite mesh for hernia repair."),
]

# ═══════════════════════════════════════════════════════════════════════════
# VARIANT-SYSTEM MAPPINGS (selected high-value associations)
# ═══════════════════════════════════════════════════════════════════════════
new_mappings = [
  # General Surgery
  vmap("PV_APPENDICECTOMY_LAP","SYS_HARMONIC_SCALPEL",True),
  vmap("PV_APPENDICECTOMY_LAP","SYS_LIGASURE"),
  vmap("PV_HAEMORRHOIDECTOMY_STAPLED","SYS_PPH_STAPLER",True),
  vmap("PV_HAEMORRHOIDECTOMY_LIGASURE","SYS_LIGASURE",True),
  vmap("PV_HAEMORRHOIDECTOMY_LIGASURE","SYS_HARMONIC_SCALPEL"),
  vmap("PV_RIGHT_HEMI_LAP","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_RIGHT_HEMI_LAP","SYS_ENDO_GIA_STAPLER"),
  vmap("PV_RIGHT_HEMI_LAP","SYS_HARMONIC_SCALPEL"),
  vmap("PV_RIGHT_HEMI_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_RIGHT_HEMI_ROBOTIC","SYS_ECHELON_FLEX_STAPLER"),
  vmap("PV_LEFT_HEMI_LAP","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_LEFT_HEMI_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_LAR_LAP_TME","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_LAR_LAP_TME","SYS_EEA_CIRCULAR_STAPLER"),
  vmap("PV_LAR_LAP_TME","SYS_CDH_CIRCULAR_STAPLER"),
  vmap("PV_LAR_ROBOTIC_TME","SYS_DAVINCI_XI",True),
  vmap("PV_LAR_ROBOTIC_TME","SYS_EEA_CIRCULAR_STAPLER"),
  vmap("PV_ANTERIOR_RES_LAP","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_ANTERIOR_RES_LAP","SYS_EEA_CIRCULAR_STAPLER"),
  vmap("PV_ANTERIOR_RES_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_APR_ELAPE","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_OESOPHAGECTOMY_IVOR_LEWIS","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_OESOPHAGECTOMY_MIO","SYS_DAVINCI_XI"),
  vmap("PV_OESOPHAGECTOMY_MIO","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_TOTAL_GASTRECTOMY_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_SLEEVE_STANDARD","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_SLEEVE_STANDARD","SYS_ENDO_GIA_STAPLER"),
  vmap("PV_SLEEVE_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_RYGB_LAP","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_RYGB_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_OAGB_LAP","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_WHIPPLE_CLASSIC","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_WHIPPLE_MIS","SYS_DAVINCI_XI"),
  vmap("PV_CHOLECYSTECTOMY_LAP","SYS_HARMONIC_SCALPEL",True),
  vmap("PV_CHOLECYSTECTOMY_LAP","SYS_LIGASURE"),
  vmap("PV_DISTAL_PANC_LAP","SYS_ECHELON_FLEX_STAPLER",True),
  vmap("PV_ADRENALECTOMY_LAP","SYS_HARMONIC_SCALPEL",True),
  vmap("PV_ADRENALECTOMY_LAP","SYS_LIGASURE"),
  vmap("PV_IHR_TEP","SYS_PARIETEX_MESH",True),
  vmap("PV_IHR_TEP","SYS_PROCEED_MESH"),
  vmap("PV_IHR_TAPP","SYS_PARIETEX_MESH",True),
  vmap("PV_IHR_TAPP","SYS_PROCEED_MESH"),
  vmap("PV_IHR_LICHTENSTEIN","SYS_LICHTENSTEIN_MESH",True),
  vmap("PV_IHR_LICHTENSTEIN","SYS_ULTRAPRO_MESH"),
  vmap("PV_INCISIONAL_LAP_IPOM","SYS_PARIETEX_MESH",True),
  vmap("PV_INCISIONAL_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_INCISIONAL_ROBOTIC","SYS_PARIETEX_MESH"),
  vmap("PV_NPT_STANDARD","SYS_NPWT_PREVENA",True),
  # Urology
  vmap("PV_URETEROSCOPY_LASER_HOLMIUM","SYS_HOLMIUM_LASER_SYSTEM",True),
  vmap("PV_URETEROSCOPY_LASER_THULIUM","SYS_THULIUM_FIBRE_LASER",True),
  vmap("PV_FURS_STANDARD","SYS_OLYMPUS_FURS",True),
  vmap("PV_FURS_STANDARD","SYS_STORZ_FLEX_SCOPE"),
  vmap("PV_FURS_STANDARD","SYS_HOLMIUM_LASER_SYSTEM"),
  vmap("PV_FURS_SINGLE_USE","SYS_BOSTON_SCI_SUREFIRE",True),
  vmap("PV_FURS_SINGLE_USE","SYS_HOLMIUM_LASER_SYSTEM"),
  vmap("PV_PCNL_STANDARD","SYS_PCNL_AMPLATZ",True),
  vmap("PV_PCNL_MINI","SYS_PCNL_AMPLATZ",True),
  vmap("PV_JJ_STENT_CYSTO","SYS_COOK_JJ_STENT",True),
  vmap("PV_JJ_STENT_FLUORO","SYS_COOK_JJ_STENT",True),
  vmap("PV_RADICAL_PROSTATECTOMY_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_RADICAL_NEPHRECTOMY_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_PARTIAL_NEPHRECTOMY_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_RADICAL_CYSTECTOMY_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_HOLEP_STANDARD","SYS_HOLMIUM_LASER_SYSTEM",True),
  vmap("PV_HOLEP_THULIUM","SYS_THULIUM_FIBRE_LASER",True),
  vmap("PV_INTERSTIM_UNILATERAL","SYS_INTERSTIM_II",True),
  vmap("PV_INTERSTIM_BILATERAL","SYS_INTERSTIM_II",True),
  vmap("PV_INTERSTIM_BILATERAL","SYS_AXONICS_SNM"),
  vmap("PV_PENILE_PROSTHESIS_IPP","SYS_AMS_700_PENILE",True),
  vmap("PV_PENILE_PROSTHESIS_IPP","SYS_COLOPLAST_TITAN_IPP"),
  vmap("PV_TURBT_STANDARD","SYS_LIGASURE"),
  vmap("PV_TURBT_EN_BLOC","SYS_HOLMIUM_LASER_SYSTEM",True),
  # Gynaecology
  vmap("PV_ENDOMETRIAL_ABLATION_NOVASURE","SYS_NOVASURE",True),
  vmap("PV_ENDOMETRIAL_ABLATION_MICROWAVE","SYS_MINERVA_ABLATION",True),
  vmap("PV_HYSTEROSCOPIC_POLYPECTOMY_MORCELLATOR","SYS_HYSTEROSCOPIC_MORCELLATOR",True),
  vmap("PV_FIBROID_RESECTION_TYPE_0","SYS_HYSTEROSCOPIC_MORCELLATOR"),
  vmap("PV_SLING_TVT","SYS_TVT_EXACT",True),
  vmap("PV_SLING_TOT","SYS_MONARC_SLING",True),
  vmap("PV_SACROCOLPOPEXY_LAP","SYS_GYNEMESH_SACROCOLPOPEXY",True),
  vmap("PV_SACROCOLPOPEXY_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_SACROCOLPOPEXY_ROBOTIC","SYS_GYNEMESH_SACROCOLPOPEXY"),
  vmap("PV_TLH_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_LAP_HYST_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_RADICAL_HYST_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_TLH_STANDARD","SYS_HARMONIC_SCALPEL",True),
  vmap("PV_TLH_STANDARD","SYS_LIGASURE"),
  vmap("PV_MYOMECTOMY_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_LAP_MYOMECTOMY_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_LAP_OVARIAN_CYST_ROBOTIC","SYS_DAVINCI_XI",True),
  vmap("PV_ENDO_TREATMENT_EXCISION","SYS_HARMONIC_SCALPEL"),
  vmap("PV_ENDO_TREATMENT_ABLATION","SYS_THUNDERBEAT"),
]

# ═══════════════════════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════════════════════
print("\n=== General Surgery variants ===")
gs_existing = []
gs_path = f"{BASE}/procedure_variants/general_surgery/procedure_variants_general_surgery.json"
try:
    gs_existing = load(gs_path)
except FileNotFoundError:
    pass
save(gs_path, merge_by_id(gs_existing, gs_variants))

print("\n=== Urology variants ===")
ur_existing = []
ur_path = f"{BASE}/procedure_variants/urology/procedure_variants_urology.json"
try:
    ur_existing = load(ur_path)
except FileNotFoundError:
    pass
save(ur_path, merge_by_id(ur_existing, ur_variants))

print("\n=== Gynaecology variants ===")
gy_existing = []
gy_path = f"{BASE}/procedure_variants/gynaecology/procedure_variants_gynaecology.json"
try:
    gy_existing = load(gy_path)
except FileNotFoundError:
    pass
save(gy_path, merge_by_id(gy_existing, gy_variants))

print("\n=== Suppliers ===")
sup_path = f"{BASE}/suppliers/suppliers.json"
existing_sups = load(sup_path)
save(sup_path, merge_by_id(existing_sups, new_suppliers))

print("\n=== Systems ===")
sys_path = f"{BASE}/systems/systems.json"
existing_sys = load(sys_path)
save(sys_path, merge_by_id(existing_sys, new_systems))

print("\n=== Variant-System Mappings ===")
map_path = f"{BASE}/systems/procedure_variant_system_map.json"
existing_maps = load(map_path)
# Mappings deduplicate by (variant_id, system_id) pair
existing_pairs = {(m["procedure_variant_id"], m["system_id"]) for m in existing_maps}
added = 0
for m in new_mappings:
    key = (m["procedure_variant_id"], m["system_id"])
    if key not in existing_pairs:
        existing_maps.append(m)
        existing_pairs.add(key)
        added += 1
print(f"  Merged: {added} new mappings added")
save(map_path, existing_maps)

print("\nPart 1 complete.")
