
export type Status = 'OK' | 'Damage' | 'NA';

export interface ChecklistItem {
  id: string;
  subject: string;
  status: Status;
  comment: string;
}

export interface InspectionSection {
  title: string;
  items: ChecklistItem[];
}

export interface InspectionData {
  tankBicNumber: string;
  carrier: string;
  pickupPlace: string;
  deliveryPlace: string;
  dateOfTransport: string;
  alosOrderNumber: string;
  product: 'LCO2' | 'LIN' | 'LAR' | 'LOX' | '';
  pressure: string;
  level: string;
  sections: InspectionSection[];
  additionalObservations: string;
  driverName: string;
  result: 'OK' | 'NOT OK' | '';
  signature: string; // Base64
  photos: string[]; // Base64
}

export const INITIAL_SECTIONS: InspectionSection[] = [
  {
    title: 'Stickers compliant with announced product',
    items: [
      { id: 's1', subject: 'UN Product number (4 stickers - 1 per face)', status: 'OK', comment: '' },
      { id: 's2', subject: 'Hazard label - class 2.2 (green) (4 stickers)', status: 'OK', comment: '' },
      { id: 's3', subject: 'Hazard label - class 5.1 (yellow) (for LOX only)', status: 'OK', comment: '' },
      { id: 's4', subject: 'Proper shipping name label (ex: LAR) (2 stickers)', status: 'OK', comment: '' },
    ]
  },
  {
    title: 'Documentation on Tank',
    items: [
      { id: 'd1', subject: 'BIC tank Number visible on each face', status: 'OK', comment: '' },
      { id: 'd2', subject: 'PID / document holder / CSC plate in place', status: 'OK', comment: '' },
    ]
  },
  {
    title: 'Cryogenic Cabinet',
    items: [
      { id: 'c1', subject: 'Compartment door opening/closing properly and lockable', status: 'OK', comment: '' },
      { id: 'c2', subject: 'Blindflanges, gaskets and all bolts/fitted and tightened', status: 'OK', comment: '' },
      { id: 'c3', subject: 'Filling valves closed', status: 'OK', comment: '' },
      { id: 'c4', subject: 'Visual check on valves and equipment', status: 'OK', comment: '' },
      { id: 'c5', subject: 'Fire-brake valve(s) closed correctly with their actuator', status: 'OK', comment: '' },
      { id: 'c6', subject: 'Seals on the cabinet in place', status: 'OK', comment: '' },
      { id: 'c7', subject: 'No unusual trace of ice', status: 'OK', comment: '' },
    ]
  },
  {
    title: 'External',
    items: [
      { id: 'e1', subject: 'Framework (impact, paint, strain...), each face inspected', status: 'OK', comment: '' },
      { id: 'e2', subject: 'Tank shell (dent, impact, paint), each face inspected - no ice', status: 'OK', comment: '' },
      { id: 'e3', subject: 'Vaporizer (pressure build line) line', status: 'OK', comment: '' },
      { id: 'e4', subject: 'Outside Cryogenic cabinet (dent or impact)', status: 'OK', comment: '' },
    ]
  },
  {
    title: 'Vehicle / Transport',
    items: [
      { id: 'v1', subject: 'Vehicle and chassis compliant with local regulation (light, brakes, fire extinguisher, orange plate...)', status: 'OK', comment: '' },
      { id: 'v2', subject: 'Container properly installed on the chassis with twist locks at each corner', status: 'OK', comment: '' },
      { id: 'v3', subject: 'Documentation available (Insurance, CMR, DGD, ALOS Emergency procedure)', status: 'OK', comment: '' },
    ]
  }
];
