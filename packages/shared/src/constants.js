/**
 * SaveRaks Shared Domain Constants & Metadata
 * 
 * DESIGN PRINCIPLE:
 * - Client metadata (display labels, icons, bin colors) is exposed for UI presentation.
 * - Server specifications (points, carbon offset factors) define authoritative rules.
 * - Unverified values are explicitly flagged as PROVISIONAL pending school administration sign-off.
 * 
 * @module @saveraks/shared/constants
 */

// ---------------------------------------------------------------------------
// 1. Roles & System Statuses
// ---------------------------------------------------------------------------

export const ROLES = Object.freeze({
  STUDENT: 'STUDENT',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
});

export const ACTION_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

export const TRANSACTION_TYPES = Object.freeze({
  ACTION_REWARD: 'ACTION_REWARD',
  REDEMPTION: 'REDEMPTION',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
  BADGE_BONUS: 'BADGE_BONUS',
});

export const REDEMPTION_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  CLAIMED: 'CLAIMED',
  CANCELLED: 'CANCELLED',
});

export const PIN_TYPES = Object.freeze({
  FULL_BIN: 'FULL_BIN',
  HAZARD: 'HAZARD',
  RECYCLING_STATION: 'RECYCLING_STATION',
  COMPOST_SITE: 'COMPOST_SITE',
  MAINTENANCE: 'MAINTENANCE',
});

export const PIN_STATUSES = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
});

// ---------------------------------------------------------------------------
// 2. Action Types Enum
// ---------------------------------------------------------------------------

export const ACTION_TYPES = Object.freeze({
  RECYCLE_PET: 'RECYCLE_PET',
  RECYCLE_CAN: 'RECYCLE_CAN',
  RECYCLE_PAPER: 'RECYCLE_PAPER',
  REUSE_CONTAINER: 'REUSE_CONTAINER',
  PLANT_TREE: 'PLANT_TREE',
  COMMUTE_PUBLIC: 'COMMUTE_PUBLIC',
  COMMUTE_WALK: 'COMMUTE_WALK',
  COMMUTE_BICYCLE: 'COMMUTE_BICYCLE',
});

// ---------------------------------------------------------------------------
// 3. Client-Side Display Metadata (Presentation Layer)
// ---------------------------------------------------------------------------

export const ACTION_METADATA = Object.freeze({
  [ACTION_TYPES.RECYCLE_PET]: {
    id: ACTION_TYPES.RECYCLE_PET,
    nameThai: 'แยกขยะขวดพลาสติก PET',
    nameEnglish: 'Recycle PET Plastic Bottle',
    icon: '🍾',
    binColor: 'YELLOW',
    category: 'RECYCLING',
    description: 'ทิ้งขวดพลาสติกใสลงในถังขยะรีไซเคิลสีเหลือง เทน้ำออกและบีบขวดให้แบน',
  },
  [ACTION_TYPES.RECYCLE_CAN]: {
    id: ACTION_TYPES.RECYCLE_CAN,
    nameThai: 'แยกกระป๋องอลูมิเนียม',
    nameEnglish: 'Recycle Aluminum Can',
    icon: '🥫',
    binColor: 'YELLOW',
    category: 'RECYCLING',
    description: 'ทิ้งกระป๋องน้ำอัดลมอลูมิเนียมลงในถังรีไซเคิลเพื่อนำกลับมาหลอมใหม่',
  },
  [ACTION_TYPES.RECYCLE_PAPER]: {
    id: ACTION_TYPES.RECYCLE_PAPER,
    nameThai: 'แยกกระดาษ / ลังกระดาษ',
    nameEnglish: 'Recycle Paper & Cardboard',
    icon: '📦',
    binColor: 'YELLOW',
    category: 'RECYCLING',
    description: 'รวบรวมกระดาษแห้งหรือกล่องพัสดุที่ไม่เปื้อนสารเคมีเพื่อรีไซเคิล',
  },
  [ACTION_TYPES.REUSE_CONTAINER]: {
    id: ACTION_TYPES.REUSE_CONTAINER,
    nameThai: 'พกแก้วน้ำ / กล่องข้าว / ถุงผ้า',
    nameEnglish: 'Use Reusable Tumbler / Box',
    icon: '🥤',
    binColor: null,
    category: 'ZERO_WASTE',
    description: 'ใช้ภาชนะส่วนตัวในโรงอาหารเพื่อลดการสร้างขยะพลาสติกแบบใช้ครั้งเดียว',
  },
  [ACTION_TYPES.PLANT_TREE]: {
    id: ACTION_TYPES.PLANT_TREE,
    nameThai: 'ปลูกต้นไม้ / บำรุงพื้นที่สีเขียว',
    nameEnglish: 'Plant a Tree / Green Campus',
    icon: '🌱',
    binColor: null,
    category: 'GREEN_CAMPUS',
    description: 'ปลูกต้นไม้ใหม่หรือช่วยดูแลแปลงผักเกษตรและพื้นที่สีเขียวของโรงเรียน',
  },
  [ACTION_TYPES.COMMUTE_PUBLIC]: {
    id: ACTION_TYPES.COMMUTE_PUBLIC,
    nameThai: 'เดินทางด้วยรถเมล์ / รถไฟฟ้า',
    nameEnglish: 'Public Transit Commute',
    icon: '🚌',
    binColor: null,
    category: 'SUSTAINABLE_COMMUTE',
    description: 'เดินทางมาโรงเรียนด้วยระบบขนส่งสาธารณะเพื่อลดการปล่อยคาร์บอนจากการใช้รถส่วนตัว',
  },
  [ACTION_TYPES.COMMUTE_WALK]: {
    id: ACTION_TYPES.COMMUTE_WALK,
    nameThai: 'เดินมาโรงเรียน',
    nameEnglish: 'Walk to School',
    icon: '🚶',
    binColor: null,
    category: 'SUSTAINABLE_COMMUTE',
    description: 'เดินเท้ามาโรงเรียนเพื่อสุขภาพและการเดินทางที่ปลอดมลพิษ 100%',
  },
  [ACTION_TYPES.COMMUTE_BICYCLE]: {
    id: ACTION_TYPES.COMMUTE_BICYCLE,
    nameThai: 'ปั่นจักรยานมาโรงเรียน',
    nameEnglish: 'Bicycle to School',
    icon: '🚲',
    binColor: null,
    category: 'SUSTAINABLE_COMMUTE',
    description: 'ปั่นจักรยานมาโรงเรียน ลดการปล่อยก๊าซเรือนกระจก',
  },
});

// ---------------------------------------------------------------------------
// 4. Server-Side Authoritative Action Specifications
// ---------------------------------------------------------------------------
// NOTE: Points are PROVISIONAL pending Surasakmontree School administrative confirmation.
// CO2 factors are referenced from Thailand Greenhouse Gas Management Organization (TGO) standards.

export const SERVER_ACTION_SPECIFICATION = Object.freeze({
  [ACTION_TYPES.RECYCLE_PET]: {
    points: 10, // [PROVISIONAL]
    co2SavedKg: 0.045, // Unit: kgCO2e per 500-600ml bottle (TGO emission factor for avoided landfill)
    unit: 'bottle',
    source: 'TGO Emission Factor for Waste Material Recovery (2024)',
    requiresImage: true,
  },
  [ACTION_TYPES.RECYCLE_CAN]: {
    points: 15, // [PROVISIONAL]
    co2SavedKg: 0.170, // Unit: kgCO2e per 330ml aluminum can (~95% energy saved vs virgin bauxite)
    unit: 'can',
    source: 'TGO Secondary Aluminum Recycling Baseline (2024)',
    requiresImage: true,
  },
  [ACTION_TYPES.RECYCLE_PAPER]: {
    points: 8, // [PROVISIONAL]
    co2SavedKg: 0.030, // Unit: kgCO2e per 50g paper/cardboard
    unit: 'item',
    source: 'TGO Pulp and Paper Material Recovery Factor',
    requiresImage: true,
  },
  [ACTION_TYPES.REUSE_CONTAINER]: {
    points: 12, // [PROVISIONAL]
    co2SavedKg: 0.050, // Unit: kgCO2e per single-use cup/container avoided
    unit: 'use',
    source: 'Avoided Single-Use PP/PET Food Container Incineration Factor',
    requiresImage: true,
  },
  [ACTION_TYPES.PLANT_TREE]: {
    points: 50, // [PROVISIONAL]
    co2SavedKg: 1.200, // Unit: kgCO2e initial credited annual sequestration per surviving sapling
    unit: 'tree',
    source: 'TGO Urban Forestry Sequestration Average (allocated per sapling)',
    requiresImage: true,
  },
  [ACTION_TYPES.COMMUTE_PUBLIC]: {
    points: 20, // [PROVISIONAL]
    co2SavedKg: 0.350, // Unit: kgCO2e avoided per average 5km urban transit trip vs private car
    unit: 'trip',
    source: 'BMTA & BTS Urban Commute Displacement Factor (Bangkok Region)',
    requiresImage: true,
  },
  [ACTION_TYPES.COMMUTE_WALK]: {
    points: 25, // [PROVISIONAL]
    co2SavedKg: 0.500, // Unit: kgCO2e avoided per 2-3km active walking school trip vs motorized vehicle
    unit: 'trip',
    source: 'Active Transport Zero-Emission Baseline vs Motorbike/Car',
    requiresImage: false,
  },
  [ACTION_TYPES.COMMUTE_BICYCLE]: {
    points: 25, // [PROVISIONAL]
    co2SavedKg: 0.500, // Unit: kgCO2e avoided per 3-5km active bicycle school trip vs motorized vehicle
    unit: 'trip',
    source: 'Active Transport Zero-Emission Baseline vs Motorbike/Car',
    requiresImage: true,
  },
});

// ---------------------------------------------------------------------------
// 5. Thai Standard 4-Color Waste Sorting Bins
// ---------------------------------------------------------------------------

export const BIN_CATEGORIES = Object.freeze({
  YELLOW: {
    code: 'YELLOW',
    nameThai: 'ถังขยะรีไซเคิล',
    nameEnglish: 'Recyclables',
    hexColor: '#F59E0B',
    acceptedItems: [
      'ขวดพลาสติก PET ใส',
      'กระป๋องอลูมิเนียม',
      'กระดาษ สมุด กล่องลัง',
      'ขวดแก้ว',
      'พลาสติกแข็งสะอาด (HDPE/PP)',
    ],
    instructionsThai: 'เทของเหลวออกให้หมด ล้างให้สะอาด และบีบอัดให้แบนก่อนทิ้ง',
  },
  GREEN: {
    code: 'GREEN',
    nameThai: 'ถังขยะเปียก / ขยะอินทรีย์',
    nameEnglish: 'Organic / Compostable',
    hexColor: '#10B981',
    acceptedItems: [
      'เศษอาหาร ข้าว เศษเนื้อสัตว์',
      'เปลือกผลไม้ กากกาแฟ',
      'เศษผัก ใบไม้ เศษพืช',
    ],
    instructionsThai: 'แยกถุงพลาสติกและช้อนส้อมออก ทิ้งเฉพาะเศษอาหารเพื่อนำไปทำปุ๋ยหมักหรือไบโอแก๊ส',
  },
  BLUE: {
    code: 'BLUE',
    nameThai: 'ถังขยะทั่วไป',
    nameEnglish: 'General Waste',
    hexColor: '#3B82F6',
    acceptedItems: [
      'ซองขนม ซองบะหมี่สำเร็จรูป',
      'กล่องโฟม',
      'หลอดดูดน้ำ ฟิล์มห่ออาหาร',
      'ทิชชู่เปื้อนไขมันหรือสารคัดหลั่ง',
    ],
    instructionsThai: 'สำหรับขยะย่อยสลายยากและไม่คุ้มค่าต่อการรีไซเคิล',
  },
  ORANGE_RED: {
    code: 'ORANGE_RED',
    nameThai: 'ถังขยะอันตราย',
    nameEnglish: 'Hazardous Waste',
    hexColor: '#EF4444',
    acceptedItems: [
      'ถ่านไฟฉาย แบตเตอรี่เก่า',
      'หลอดไฟฟลูออเรสเซนต์',
      'กระป๋องสเปรย์',
      'ขวดยาฆ่าแมลง น้ำยาล้างห้องน้ำ',
      'ขยะอิเล็กทรอนิกส์ (E-Waste)',
    ],
    instructionsThai: 'ทิ้งอย่างระมัดระวัง ห้ามทุบหรือเจาะกระป๋อง เพื่อความปลอดภัยของเจ้าหน้าที่',
  },
});

// ---------------------------------------------------------------------------
// 6. Commute Time Window Rules & Bangkok Time Helpers
// ---------------------------------------------------------------------------

export const COMMUTE_RULES = Object.freeze({
  TIMEZONE: 'Asia/Bangkok',
  ALLOWED_WEEKDAYS: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  MORNING: {
    startMinutes: 5 * 60, // 05:00 (300 mins)
    endMinutes: 8 * 60 + 30, // 08:30 (510 mins)
    keySuffix: 'MORNING',
  },
  AFTERNOON: {
    startMinutes: 14 * 60 + 50, // 14:50 (890 mins)
    endMinutes: 19 * 60, // 19:00 (1140 mins)
    keySuffix: 'AFTERNOON',
  },
  ELIGIBLE_ACTION_TYPES: [
    ACTION_TYPES.COMMUTE_PUBLIC,
    ACTION_TYPES.COMMUTE_WALK,
    ACTION_TYPES.COMMUTE_BICYCLE,
  ],
});

/**
 * Returns Bangkok date/time parts using standard Intl.DateTimeFormat
 * @param {Date} [date=new Date()]
 * @returns {{ year: string, month: string, day: string, hour: string, minute: string, second: string, weekday: string }}
 */
export function getBangkokDateTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: COMMUTE_RULES.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  return Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
}

/**
 * Validates whether a given timestamp falls within an official school commute window.
 * @param {Date} [date=new Date()]
 * @returns {{ isValid: boolean, windowType: 'MORNING' | 'AFTERNOON' | null, reason?: string, commuteWindowKey?: string }}
 */
export function evaluateCommuteWindow(date = new Date()) {
  const parts = getBangkokDateTimeParts(date);
  
  if (!COMMUTE_RULES.ALLOWED_WEEKDAYS.includes(parts.weekday)) {
    return {
      isValid: false,
      windowType: null,
      reason: 'Commute actions are only accepted Monday through Friday',
    };
  }

  const minutesOfDay = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);

  if (
    minutesOfDay >= COMMUTE_RULES.MORNING.startMinutes &&
    minutesOfDay <= COMMUTE_RULES.MORNING.endMinutes
  ) {
    const commuteWindowKey = `${parts.year}-${parts.month}-${parts.day}:${COMMUTE_RULES.MORNING.keySuffix}`;
    return { isValid: true, windowType: 'MORNING', commuteWindowKey };
  }

  if (
    minutesOfDay >= COMMUTE_RULES.AFTERNOON.startMinutes &&
    minutesOfDay <= COMMUTE_RULES.AFTERNOON.endMinutes
  ) {
    const commuteWindowKey = `${parts.year}-${parts.month}-${parts.day}:${COMMUTE_RULES.AFTERNOON.keySuffix}`;
    return { isValid: true, windowType: 'AFTERNOON', commuteWindowKey };
  }

  return {
    isValid: false,
    windowType: null,
    reason: 'Current time is outside allowed school commute windows (05:00-08:30 or 14:50-19:00 Bangkok time)',
  };
}

// ---------------------------------------------------------------------------
// 7. Security, Image & Upload Limits
// ---------------------------------------------------------------------------

export const SECURITY_LIMITS = Object.freeze({
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  ALLOWED_MIME_TYPES: Object.freeze(['image/jpeg', 'image/png', 'image/webp']),
  MIN_IMAGE_DIMENSION_PX: 256,
  MAX_IMAGE_DIMENSION_PX: 4096,
  ACTION_COOLDOWN_SECONDS: 60,
  MAX_ACTIONS_PER_HOUR: 10,
  HAMMING_DUPLICATE_THRESHOLD: 5, // <= 5 bits out of 64 triggers automatic duplicate rejection
  HAMMING_SUSPICIOUS_THRESHOLD: 10, // <= 10 bits flags for staff review
  HISTOGRAM_COSINE_SIMILARITY_THRESHOLD: 0.96,
});

// ---------------------------------------------------------------------------
// 8. Gamification Level Thresholds & Calculator
// ---------------------------------------------------------------------------

export const LEVEL_THRESHOLDS = Object.freeze([
  0,      // Level 1: Eco Initiate
  100,    // Level 2: Green Apprentice
  300,    // Level 3: Earth Guardian
  600,    // Level 4: Sustainability Hero
  1000,   // Level 5: Eco Champion
  2000,   // Level 6: Climate Master
  5000,   // Level 7: Gaia Warden
  10000,  // Level 8: Planet Protector
]);

/**
 * Calculates user gamification level from total points
 * @param {number} points
 * @returns {{ level: number, currentThreshold: number, nextThreshold: number | null, progressPercent: number }}
 */
export function calculateLevel(points = 0) {
  const safePoints = Math.max(0, Math.floor(points));
  let level = 1;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (safePoints >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : null;

  let progressPercent = 100;
  if (nextThreshold !== null) {
    const range = nextThreshold - currentThreshold;
    const earned = safePoints - currentThreshold;
    progressPercent = Math.min(100, Math.max(0, Math.round((earned / range) * 100)));
  }

  return {
    level,
    currentThreshold,
    nextThreshold,
    progressPercent,
  };
}

// ---------------------------------------------------------------------------
// 9. Official Badges Specification
// ---------------------------------------------------------------------------
// NOTE: Badge triggers are PROVISIONAL pending teacher advisory board review.

export const BADGE_DEFINITIONS = Object.freeze({
  FIRST_ACTION: {
    code: 'FIRST_ACTION',
    name: 'Eco Initiate',
    nameThai: 'ก้าวแรกพิทักษ์โลก',
    description: 'ทำกิจกรรมอนุรักษ์สิ่งแวดล้อมสำเร็จเป็นครั้งแรก',
    icon: '🌱',
    triggerType: 'TOTAL_ACTIONS_COUNT',
    triggerThreshold: 1,
  },
  STREAK_7: {
    code: 'STREAK_7',
    name: 'Consistency Hero',
    nameThai: 'ฮีโร่สายสม่ำเสมอ',
    description: 'บันทึกกิจกรรมสิ่งแวดล้อมต่อเนื่องครบ 7 วัน',
    icon: '🔥',
    triggerType: 'CONSECUTIVE_DAYS',
    triggerThreshold: 7,
  },
  MASTER_SORTER: {
    code: 'MASTER_SORTER',
    name: 'Master Sorter',
    nameThai: 'เซียนแยกขยะ',
    description: 'แยกขยะถูกต้องครบ 50 ครั้ง',
    icon: '♻️',
    triggerType: 'RECYCLE_COUNT',
    triggerThreshold: 50,
  },
  TREE_GUARDIAN: {
    code: 'TREE_GUARDIAN',
    name: 'Green Guardian',
    nameThai: 'ผู้พิทักษ์ผืนป่า',
    description: 'ปลูกต้นไม้หรือดูแลต้นไม้ครบ 5 ต้น',
    icon: '🌳',
    triggerType: 'TREE_COUNT',
    triggerThreshold: 5,
  },
  CLEAN_COMMUTER: {
    code: 'CLEAN_COMMUTER',
    name: 'Clean Commuter',
    nameThai: 'นักเดินทางสายกรีน',
    description: 'เดินทางด้วยระบบขนส่งสาธารณะหรือเดิน/ปั่นจักรยานครบ 20 ครั้ง',
    icon: '🚲',
    triggerType: 'COMMUTE_COUNT',
    triggerThreshold: 20,
  },
});
