import { theatreOrtho } from "./theatre-ortho"
import { theatreGeneral } from "./theatre-general"
import { theatreUrology } from "./theatre-urology"
import { theatreGynae } from "./theatre-gynae"
import { theatreEnt } from "./theatre-ent"
import { theatreOphtho } from "./theatre-ophtho"
import { theatreVascular } from "./theatre-vascular"
import { theatreCardiothoracic } from "./theatre-cardiothoracic"
import { theatreNeuro } from "./theatre-neuro"
import { theatrePlastics } from "./theatre-plastics"
import { endoscopy } from "./endoscopy"
import { cathLab } from "./cath-lab"
import { icu } from "./icu"
import { emergency } from "./emergency"
import { ward } from "./ward"
import { clinic } from "./clinic"
import { Procedure } from "../types"

export const procedures: Procedure[] = [
  ...theatreOrtho,
  ...theatreGeneral,
  ...theatreUrology,
  ...theatreGynae,
  ...theatreEnt,
  ...theatreOphtho,
  ...theatreVascular,
  ...theatreCardiothoracic,
  ...theatreNeuro,
  ...theatrePlastics,
  ...endoscopy,
  ...cathLab,
  ...icu,
  ...emergency,
  ...ward,
  ...clinic,
]
