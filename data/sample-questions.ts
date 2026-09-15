/**
 * Sample vetted questions proving the M2 pipeline (P4).
 * Real bank volume is content-team work; these 6 physics items exercise:
 * MCQ + True/False, explanations, distractor rationales, concept tags.
 */

export type SampleQuestion = {
  topicKey: string;
  type: "mcq_single" | "true_false";
  stemMD: string;
  options: Array<{ key: string; text: string; rationale: string | null }>;
  correctKeys: string[];
  explanationMD: string;
  difficulty: "easy" | "medium" | "hard";
  conceptTags: string[];
};

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    topicKey: "phy-sec3/u1/t1",
    type: "mcq_single",
    stemMD:
      "يتحرك جسم من السكون بعجلة منتظمة مقدارها 2 m/s² لمدة 5 ثوانٍ. ما السرعة النهائية للجسم بوحدة m/s؟",
    options: [
      { key: "a", text: "5", rationale: "نسي ضرب العجلة في الزمن (استخدم الزمن فقط)" },
      { key: "b", text: "10", rationale: "الإجابة الصحيحة: v = v₀ + at = 0 + 2×5" },
      { key: "c", text: "20", rationale: "ضرب العجلة في مربع الزمن بدل الزمن" },
      { key: "d", text: "25", rationale: "خلط بين معادلة السرعة ومعادلة الإزاحة" },
    ],
    correctKeys: ["b"],
    explanationMD:
      "الخطوات: (1) المعطيات: v₀ = 0 (من السكون)، a = 2، t = 5. (2) القانون: v = v₀ + at. (3) التعويض: v = 0 + 2×5 = 10 m/s. تذكر: العجلة المنتظمة تعني تغير السرعة بمقدار ثابت كل ثانية.",
    difficulty: "easy",
    conceptTags: ["motion-kinematics"],
  },
  {
    topicKey: "phy-sec3/u1/t1",
    type: "mcq_single",
    stemMD:
      "منحنى (السرعة – الزمن) لجسم ما خط مستقيم أفقي لا يمر بنقطة الأصل. هذا يعني أن الجسم:",
    options: [
      { key: "a", text: "ساكن", rationale: "الخط الأفقي فوق الصفر يعني سرعة ثابتة غير صفرية" },
      { key: "b", text: "يتحرك بسرعة منتظمة", rationale: "الإجابة الصحيحة: ميل صفري = عجلة صفرية" },
      { key: "c", text: "يتحرك بعجلة منتظمة موجبة", rationale: "هذا يمثله خط مائل لأعلى لا أفقي" },
      { key: "d", text: "يتحرك بعجلة غير منتظمة", rationale: "هذا يمثله منحنى لا خط مستقيم" },
    ],
    correctKeys: ["b"],
    explanationMD:
      "في منحنى (v–t): الميل = العجلة. خط أفقي ⟸ الميل = 0 ⟸ العجلة = 0 ⟸ سرعة ثابتة (منتظمة). كونه لا يمر بالأصل يعني السرعة الابتدائية ≠ 0 فقط.",
    difficulty: "medium",
    conceptTags: ["motion-kinematics"],
  },
  {
    topicKey: "phy-sec3/u1/t2",
    type: "mcq_single",
    stemMD:
      "تؤثر قوة مقدارها 20 N على جسم كتلته 4 kg على سطح أفقي أملس. ما عجلة الجسم؟",
    options: [
      { key: "a", text: "80 m/s²", rationale: "ضرب الكتلة في القوة بدل القسمة" },
      { key: "b", text: "0.2 m/s²", rationale: "قسم الكتلة على القوة (قلب القانون)" },
      { key: "c", text: "5 m/s²", rationale: "الإجابة الصحيحة: a = F/m = 20/4" },
      { key: "d", text: "24 m/s²", rationale: "جمع القوة والكتلة بدل تطبيق القانون الثاني" },
    ],
    correctKeys: ["c"],
    explanationMD:
      "القانون الثاني لنيوتن: F = ma ومنه a = F/m = 20/4 = 5 m/s². السطح أملس ⟸ لا احتكاك. احذر أشهر غلطة: ضرب F×m بدل القسمة.",
    difficulty: "easy",
    conceptTags: ["newtons-laws"],
  },
  {
    topicKey: "phy-sec3/u1/t2",
    type: "mcq_single",
    stemMD:
      "جسم كتلته 2 kg موضوع على مستوى مائل أملس يميل بزاوية 30° على الأفقي (g = 10 m/s²). مركبة الوزن على امتداد المستوى تساوي:",
    options: [
      { key: "a", text: "10 N", rationale: "الإجابة الصحيحة: mg·sin30 = 20×0.5" },
      { key: "b", text: "17.3 N", rationale: "استخدم cos بدل sin (هذه المركبة العمودية)" },
      { key: "c", text: "20 N", rationale: "أخذ الوزن كاملًا دون تحليل المركبات" },
      { key: "d", text: "5 N", rationale: "قسم على 2 مرتين (خطأ حسابي)" },
    ],
    correctKeys: ["a"],
    explanationMD:
      "الخطوات: (1) الوزن W = mg = 2×10 = 20 N رأسيًا لأسفل. (2) على المستوى المائل: المركبة على الامتداد = W·sinθ = 20×sin30° = 20×0.5 = 10 N. قاعدة: sin للامتداد، cos للعمودي.",
    difficulty: "hard",
    conceptTags: ["friction-incline", "newtons-laws"],
  },
  {
    topicKey: "phy-sec3/u1/t3",
    type: "mcq_single",
    stemMD:
      "سيارة تتحرك بسرعة ثابتة على طريق أفقي. قوة محركها تساوي قوة مقاومة الهواء والاحتكاك. هذا المثال يوضح:",
    options: [
      { key: "a", text: "القانون الأول لنيوتن (القصور الذاتي)", rationale: "الإجابة الصحيحة: محصلة القوى = 0 والسرعة ثابتة" },
      { key: "b", text: "القانون الثاني لنيوتن", rationale: "القانون الثاني يصف حالة وجود محصلة (عجلة)" },
      { key: "c", text: "القانون الثالث لنيوتن", rationale: "الثالث عن الفعل ورد الفعل بين جسمين" },
      { key: "d", text: "قانون الجذب العام", rationale: "لا علاقة له باتزان القوى الأفقية" },
    ],
    correctKeys: ["a"],
    explanationMD:
      "محصلة القوى = قوة المحرك − المقاومة = 0، والسرعة ثابتة ⟸ اتزان ⟸ القانون الأول (الجسم يحافظ على حالته الحركية ما دامت المحصلة صفرًا).",
    difficulty: "medium",
    conceptTags: ["newtons-laws"],
  },
  {
    topicKey: "phy-sec3/u1/t2",
    type: "true_false",
    stemMD: "إذا انعدمت محصلة القوى المؤثرة على جسم متحرك فإنه يتوقف فورًا.",
    options: [
      { key: "a", text: "صح", rationale: "الخلط بين انعدام القوة وانعدام الحركة" },
      { key: "b", text: "خطأ", rationale: "الإجابة الصحيحة: يستمر بسرعته (قصور ذاتي)" },
    ],
    correctKeys: ["b"],
    explanationMD:
      "خطأ. حسب القانون الأول: انعدام المحصلة يعني انعدام العجلة، فيستمر الجسم في حركته بسرعة منتظمة (القصور الذاتي) ولا يتوقف.",
    difficulty: "easy",
    conceptTags: ["newtons-laws"],
  },
];
