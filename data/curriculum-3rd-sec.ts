/**
 * 3rd-secondary curriculum skeleton (seed, P3).
 * Source-of-truth intent: Egyptian Ministry stream structure.
 * ASSUMPTION — content lead must sign off unit/topic titles per subject
 * before this seed is treated as final (README §20, M2 gate).
 * Second foreign language assumed French (most common); German/Italian = V1.1.
 */

export type SeedTopic = {
  title: string;
  tags: string[];
  objectives?: string[];
};

export type SeedUnit = { title: string; topics: SeedTopic[] };

export type SeedSubject = {
  code: string;
  nameAr: string;
  nameEn: string;
  tracks: Array<"science" | "math" | "literary">;
  examWeight: number;
  units: SeedUnit[];
};

const AR = "ar-sec3";
const EN = "en-sec3";
const FR = "fr-sec3";

export const CURRICULUM: SeedSubject[] = [
  {
    code: AR,
    nameAr: "اللغة العربية",
    nameEn: "Arabic",
    tracks: ["science", "math", "literary"],
    examWeight: 20,
    units: [
      {
        title: "النحو",
        topics: [
          { title: "الجملة الاسمية والنواسخ", tags: ["grammar-nawasekh"] },
          { title: "الجملة الفعلية وإعراب الفعل", tags: ["grammar-verb"] },
          { title: "المشتقات والمصادر", tags: ["grammar-derivatives"] },
        ],
      },
      {
        title: "البلاغة",
        topics: [
          { title: "علم البيان: التشبيه والاستعارة", tags: ["rhetoric-bayan"] },
          { title: "علم البديع والمحسنات", tags: ["rhetoric-badie"] },
        ],
      },
      {
        title: "النصوص والقراءة",
        topics: [
          { title: "النصوص الأدبية: تحليل وتذوق", tags: ["texts-analysis"] },
          { title: "القراءة: المقال والقصة", tags: ["reading-essay"] },
        ],
      },
    ],
  },
  {
    code: EN,
    nameAr: "اللغة الإنجليزية",
    nameEn: "English",
    tracks: ["science", "math", "literary"],
    examWeight: 15,
    units: [
      {
        title: "Grammar",
        topics: [
          { title: "Tenses: Perfect & Continuous", tags: ["en-tenses"] },
          { title: "Passive & Reported Speech", tags: ["en-passive"] },
          { title: "Conditionals & Wishes", tags: ["en-conditionals"] },
        ],
      },
      {
        title: "Vocabulary & Skills",
        topics: [
          { title: "Synonyms, Antonyms & Collocations", tags: ["en-vocab"] },
          { title: "Reading Comprehension Strategies", tags: ["en-reading"] },
          { title: "Essay Writing", tags: ["en-writing"] },
        ],
      },
    ],
  },
  {
    code: FR,
    nameAr: "اللغة الفرنسية",
    nameEn: "French",
    tracks: ["science", "math", "literary"],
    examWeight: 8,
    units: [
      {
        title: "Grammaire",
        topics: [
          { title: "Les temps du passé", tags: ["fr-passe"] },
          { title: "Le subjonctif et le conditionnel", tags: ["fr-modes"] },
        ],
      },
      {
        title: "Situations et vocabulaire",
        topics: [
          { title: "La vie quotidienne et les voyages", tags: ["fr-vie"] },
          { title: "Compréhension écrite", tags: ["fr-comprehension"] },
        ],
      },
    ],
  },
  {
    code: "phy-sec3",
    nameAr: "الفيزياء",
    nameEn: "Physics",
    tracks: ["science", "math"],
    examWeight: 18,
    units: [
      {
        title: "الحركة وقوانين نيوتن",
        topics: [
          {
            title: "الحركة في خط مستقيم",
            tags: ["motion-kinematics"],
            objectives: ["حساب الإزاحة والسرعة والعجلة من المعادلات والمنحنيات"],
          },
          {
            title: "قوانين نيوتن الثلاثة",
            tags: ["newtons-laws"],
            objectives: ["تطبيق القانون الثاني على أجسام متعددة"],
          },
          { title: "الاحتكاك والقوى في مستوى مائل", tags: ["friction-incline"] },
        ],
      },
      {
        title: "الكهربية",
        topics: [
          { title: "التيار الكهربي وقانون أوم", tags: ["current-ohm"] },
          { title: "الدوائر الكهربية وقوانين كيرشوف", tags: ["circuits-kirchhoff"] },
        ],
      },
      {
        title: "المغناطيسية والفيزياء الحديثة",
        topics: [
          { title: "التأثير المغناطيسي للتيار", tags: ["magnetism-current"] },
          { title: "الظاهرة الكهروضوئية وأشباه الموصلات", tags: ["photoelectric"] },
        ],
      },
    ],
  },
  {
    code: "chem-sec3",
    nameAr: "الكيمياء",
    nameEn: "Chemistry",
    tracks: ["science", "math"],
    examWeight: 18,
    units: [
      {
        title: "الكيمياء العضوية",
        topics: [
          { title: "الهيدروكربونات: الألكانات والألكينات", tags: ["org-hydrocarbons"] },
          { title: "الكحولات والأحماض العضوية", tags: ["org-oxygenated"] },
        ],
      },
      {
        title: "الاتزان والكهربية",
        topics: [
          { title: "الاتزان الكيميائي وقاعدة لوشاتليه", tags: ["equilibrium"] },
          { title: "الخلايا الكهروكيميائية", tags: ["electrochem"] },
        ],
      },
      {
        title: "العناصر الانتقالية",
        topics: [{ title: "الحديد وخواصه وسبائكه", tags: ["iron"] }],
      },
    ],
  },
  {
    code: "bio-sec3",
    nameAr: "الأحياء",
    nameEn: "Biology",
    tracks: ["science"],
    examWeight: 15,
    units: [
      {
        title: "الوراثة",
        topics: [
          { title: "قوانين مندل والصفات المرتبطة", tags: ["mendelian"] },
          { title: "الوراثة الجزيئية: DNA وتخليق البروتين", tags: ["dna-protein"] },
        ],
      },
      {
        title: "المناعة والهرمونات",
        topics: [
          { title: "جهاز المناعة واللقاحات", tags: ["immunity"] },
          { title: "التنظيم الهرموني", tags: ["hormones"] },
        ],
      },
      {
        title: "التكاثر",
        topics: [{ title: "التكاثر في النبات والإنسان", tags: ["reproduction"] }],
      },
    ],
  },
  {
    code: "geo-sec3",
    nameAr: "الجيولوجيا",
    nameEn: "Geology",
    tracks: ["science"],
    examWeight: 10,
    units: [
      {
        title: "الصخور والمعادن",
        topics: [
          { title: "أنواع الصخور ودورة الصخور", tags: ["rocks-cycle"] },
          { title: "المعادن وخواصها", tags: ["minerals"] },
        ],
      },
      {
        title: "الظواهر الجيولوجية",
        topics: [
          { title: "الزلازل والبراكين", tags: ["quakes-volcanoes"] },
          { title: "المياه الجوفية", tags: ["groundwater"] },
        ],
      },
    ],
  },
  {
    code: "pure-sec3",
    nameAr: "الرياضيات البحتة",
    nameEn: "Pure Mathematics",
    tracks: ["math"],
    examWeight: 20,
    units: [
      {
        title: "التفاضل",
        topics: [
          { title: "النهايات والاتصال", tags: ["limits-continuity"] },
          { title: "قواعد الاشتقاق وتطبيقاته", tags: ["derivatives"] },
        ],
      },
      {
        title: "التكامل",
        topics: [
          { title: "التكامل غير المحدود وطرقه", tags: ["integration"] },
          { title: "تطبيقات التكامل: المساحات والحجوم", tags: ["integration-apps"] },
        ],
      },
      {
        title: "الجبر والهندسة الفراغية",
        topics: [
          { title: "المصفوفات والمحددات", tags: ["matrices"] },
          { title: "المتجهات في الفراغ", tags: ["vectors-3d"] },
        ],
      },
    ],
  },
  {
    code: "applied-sec3",
    nameAr: "الرياضيات التطبيقية",
    nameEn: "Applied Mathematics",
    tracks: ["math"],
    examWeight: 15,
    units: [
      {
        title: "الاستاتيكا",
        topics: [
          { title: "اتزان جسم تحت تأثير قوى", tags: ["statics-equilibrium"] },
          { title: "العزوم والازدواجات", tags: ["moments"] },
        ],
      },
      {
        title: "الديناميكا",
        topics: [
          { title: "الحركة المستقيمة بتسارع منتظم", tags: ["dynamics-linear"] },
          { title: "الشغل والطاقة والقدرة", tags: ["work-energy"] },
        ],
      },
    ],
  },
  {
    code: "hist-sec3",
    nameAr: "التاريخ",
    nameEn: "History",
    tracks: ["literary"],
    examWeight: 18,
    units: [
      {
        title: "مصر الحديثة",
        topics: [
          { title: "الحملة الفرنسية وآثارها", tags: ["french-campaign"] },
          { title: "عصر محمد علي وبناء الدولة", tags: ["muhammad-ali"] },
        ],
      },
      {
        title: "مصر المعاصرة",
        topics: [
          { title: "ثورة 1919 ودستور 1923", tags: ["revolution-1919"] },
          { title: "ثورة يوليو 1952", tags: ["july-1952"] },
        ],
      },
    ],
  },
  {
    code: "geog-sec3",
    nameAr: "الجغرافيا",
    nameEn: "Geography",
    tracks: ["literary"],
    examWeight: 15,
    units: [
      {
        title: "جغرافية مصر",
        topics: [
          { title: "نهر النيل والموارد المائية", tags: ["nile"] },
          { title: "السكان والعمران", tags: ["population"] },
        ],
      },
      {
        title: "الجغرافيا الاقتصادية",
        topics: [
          { title: "الزراعة والصناعة", tags: ["agri-industry"] },
          { title: "التجارة والنقل", tags: ["trade-transport"] },
        ],
      },
    ],
  },
  {
    code: "psych-sec3",
    nameAr: "علم النفس والاجتماع",
    nameEn: "Psychology & Sociology",
    tracks: ["literary"],
    examWeight: 12,
    units: [
      {
        title: "علم النفس",
        topics: [
          { title: "الذكاء والقدرات العقلية", tags: ["intelligence"] },
          { title: "التعلم ونظرياته", tags: ["learning-theories"] },
        ],
      },
      {
        title: "علم الاجتماع",
        topics: [{ title: "الظواهر الاجتماعية والتنشئة", tags: ["socialization"] }],
      },
    ],
  },
  {
    code: "phil-sec3",
    nameAr: "الفلسفة والمنطق",
    nameEn: "Philosophy & Logic",
    tracks: ["literary"],
    examWeight: 12,
    units: [
      {
        title: "الفلسفة",
        topics: [
          { title: "التفكير الفلسفي ونشأته", tags: ["philo-origins"] },
          { title: "الأخلاق وفلسفة القيم", tags: ["ethics"] },
        ],
      },
      {
        title: "المنطق",
        topics: [
          { title: "الاستدلال والاستنباط", tags: ["deduction"] },
          { title: "المغالطات المنطقية", tags: ["fallacies"] },
        ],
      },
    ],
  },
];

/** Stable seed key for a topic: `${subjectCode}/u${unitIdx}/t${topicIdx}` (1-based). */
export function topicSeedKey(
  subjectCode: string,
  unitIdx: number,
  topicIdx: number,
): string {
  return `${subjectCode}/u${unitIdx}/t${topicIdx}`;
}
