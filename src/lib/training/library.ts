import type { Equipment, ExerciseMeasure } from "@prisma/client";

/**
 * Athletic strength & conditioning library (no bodybuilding isolation work).
 * `pattern` is stored in Exercise.muscle. `heavy` = main loaded lift (stored in isCompound).
 */
const G: Equipment[] = ["GYM"];
const ALL: Equipment[] = ["GYM", "DUMBBELLS", "HOME"];

export type Pattern =
  | "power" | "squat" | "hinge" | "single-leg" | "push" | "pull" | "jump" | "throw" | "sprint" | "agility"
  | "conditioning" | "core" | "carry" | "prehab" | "neck" | "mobility";

type Row = [
  id: string, nameEn: string, nameAr: string, pattern: Pattern, measure: ExerciseMeasure, equipment: Equipment[],
  heavy: boolean, isLowerBody: boolean, stresses: string[], instructionsEn: string, instructionsAr: string,
];

const ROWS: Row[] = [
  // power (Olympic derivatives)
  ["hang-power-clean", "Hang Power Clean", "هانج باور كلين", "power", "LOAD_REPS", G, true, true, ["WRIST", "LOWER_BACK"], "From mid-thigh, jump and shrug, pull under fast and catch high.", "من نص الفخذ، انطّ وارفع كتافك واستلم البار بسرعة فوق."],
  ["trap-bar-jump", "Trap-Bar Jump", "نط بالتراب بار", "power", "LOAD_REPS", G, true, true, ["KNEE"], "Light trap bar (20–30% of max), dip and jump as high as you can, land soft.", "تراب بار خفيف، انزل سنة وانطّ لأعلى ما تقدر وانزل بهدوء."],
  ["kb-swing", "Kettlebell Swing", "كيتل بيل سوينج", "power", "LOAD_REPS", G, false, true, ["LOWER_BACK"], "Hinge, snap the hips forward, bell floats to chest height.", "ارجع بوسطك واضرب بالوسط لقدام، الكيتل يطلع لمستوى صدرك."],
  // squat
  ["back-squat", "Back Squat", "سكوات بالبار", "squat", "LOAD_REPS", G, true, true, ["KNEE", "LOWER_BACK"], "Brace, sit between your hips to parallel, drive up fast.", "شد بطنك وانزل للموازي واطلع بسرعة."],
  ["front-squat", "Front Squat", "فرونت سكوات", "squat", "LOAD_REPS", G, true, true, ["KNEE", "WRIST"], "Elbows high, chest tall, squat deep and stand up fast.", "الكوع عالي وصدرك مفرود، انزل عميق واطلع بسرعة."],
  ["goblet-squat", "Goblet Squat", "جوبلت سكوات", "squat", "LOAD_REPS", ALL, false, true, ["KNEE"], "Hold a dumbbell at your chest, squat deep, torso upright.", "امسك الدمبل عند صدرك وانزل عميق وضهرك مفرود."],
  // hinge
  ["trap-bar-deadlift", "Trap-Bar Deadlift", "ديدلفت بالتراب بار", "hinge", "LOAD_REPS", G, true, true, ["LOWER_BACK"], "Stand in the bar, brace, push the floor away and lock the hips.", "اقف جوه البار، شد بطنك، ادفع الأرض وقفّل وسطك."],
  ["romanian-deadlift", "Romanian Deadlift", "ديدلفت روماني", "hinge", "LOAD_REPS", G, true, true, ["LOWER_BACK"], "Soft knees, push the hips back until the hamstrings stretch.", "ركبة مثنية سنة وارجع بوسطك لحد الشد في الخلفية."],
  ["hip-thrust", "Barbell Hip Thrust", "هيب ثرست بالبار", "hinge", "LOAD_REPS", G, false, true, [], "Upper back on a bench, drive the hips up and pause.", "ضهرك على البنش، ارفع وسطك واثبت."],
  // single-leg
  ["bulgarian-split-squat", "Bulgarian Split Squat", "بلغاري سكوات", "single-leg", "LOAD_REPS", ALL, false, true, ["KNEE"], "Rear foot on a bench, drop the back knee, drive through the front foot.", "رجلك الورانية على بنش، نزّل الركبة واطلع على الرجل القدامية."],
  ["reverse-lunge", "Reverse Lunge", "لانج لورا", "single-leg", "LOAD_REPS", ALL, false, true, ["KNEE"], "Step back, back knee close to the floor, push back up.", "خطوة لورا والركبة قريبة من الأرض واطلع."],
  ["step-up", "Step-Up", "ستيب أب", "single-leg", "LOAD_REPS", ALL, false, true, [], "Whole foot on a knee-high box, stand up without pushing off the back leg.", "رجلك كلها على صندوق بارتفاع الركبة واطلع من غير ما تزق بالرجل التانية."],
  ["single-leg-rdl", "Single-Leg RDL", "روماني رجل واحدة", "single-leg", "LOAD_REPS", ALL, false, true, [], "Balance on one leg, hinge forward with square hips.", "اتوازن على رجل وميّل لقدام ووسطك مستقيم."],
  ["lateral-lunge", "Lateral Lunge", "لانج جانبي", "single-leg", "LOAD_REPS", ALL, false, true, ["KNEE"], "Big step to the side, sit into the hip, keep the other leg straight.", "خطوة واسعة للجنب، انزل على الوسط والرجل التانية مفرودة."],
  // push
  ["bench-press", "Bench Press", "بنش برس", "push", "LOAD_REPS", G, true, false, ["SHOULDER"], "Shoulder blades pinned, bar to mid-chest, press fast.", "لزق لوحي الكتف، البار لنص الصدر وادفع بسرعة."],
  ["db-bench-press", "Dumbbell Bench Press", "بنش برس دمبل", "push", "LOAD_REPS", ALL, false, false, ["SHOULDER"], "Elbows about 45°, lower to chest level, press up.", "الكوع ٤٥ درجة، انزل لمستوى الصدر وادفع."],
  ["landmine-press", "Half-Kneeling Landmine Press", "لاندماين برس", "push", "LOAD_REPS", G, false, false, [], "Half kneeling, press the bar up and forward, ribs down.", "على ركبة واحدة، ادفع البار لفوق ولقدام وبطنك مشدودة."],
  ["push-up", "Push-Up", "ضغط", "push", "REPS", ALL, false, false, ["WRIST"], "Body in a straight line, chest to the floor, full lockout.", "جسمك مفرود، صدرك للأرض واطلع للآخر."],
  // pull
  ["pull-up", "Pull-Up", "عقلة", "pull", "REPS", ALL, true, false, ["SHOULDER", "ELBOW"], "Full hang, pull your chest to the bar, control down.", "ابدأ متعلق للآخر، اسحب صدرك للبار وانزل بالراحة."],
  ["barbell-row", "Barbell Row", "سحب بالبار", "pull", "LOAD_REPS", G, true, false, ["LOWER_BACK"], "Hinge to about 45°, row the bar to your lower ribs.", "ميّل ٤٥ درجة واسحب البار لآخر ضلوعك."],
  ["db-row", "One-Arm Dumbbell Row", "سحب دمبل بإيد واحدة", "pull", "LOAD_REPS", ALL, false, false, [], "Support on a bench, row the dumbbell to your hip.", "اسند على البنش واسحب الدمبل ناحية وسطك."],
  ["inverted-row", "Inverted Row", "سحب مقلوب", "pull", "REPS", ALL, false, false, [], "Body straight under a bar, pull your chest up to it.", "جسمك مفرود تحت البار، اسحب صدرك ليه."],
  // jump (plyometrics)
  ["box-jump", "Box Jump", "نط على صندوق", "jump", "REPS", ALL, false, true, ["KNEE"], "Jump onto the box, land soft and quiet, step down.", "انطّ على الصندوق، انزل بهدوء وانزل منه ماشي."],
  ["broad-jump", "Broad Jump", "وثب طويل", "jump", "REPS", ALL, false, true, ["KNEE"], "Swing the arms, jump as far as you can, stick the landing.", "مرجح دراعك وانطّ لأبعد مسافة واثبت في النزول."],
  ["depth-jump", "Depth Jump", "ديبث جامب", "jump", "REPS", ALL, false, true, ["KNEE"], "Step off a low box, touch the floor and jump up instantly.", "انزل من صندوق واطي ونط على طول أول ما تلمس الأرض."],
  ["lateral-bound", "Lateral Bound", "وثب جانبي", "jump", "REPS", ALL, false, true, ["KNEE"], "Bound sideways from one leg to the other and hold each landing.", "انطّ للجنب من رجل للتانية واثبت في كل نزلة."],
  ["pogo-hops", "Pogo Hops", "نطات بوجو", "jump", "REPS", ALL, false, true, [], "Stiff ankles, quick small hops off the balls of the feet.", "كاحل ثابت، نطات صغيرة وسريعة على مشط رجلك."],
  // throw
  ["med-ball-rotational-throw", "Med-Ball Rotational Throw", "رمي كرة طبية دوراني", "throw", "REPS", ALL, false, false, ["LOWER_BACK"], "Side-on to a wall, rotate from the hips and throw hard.", "اقف جنب الحيطة، لف من وسطك وارمي بقوة."],
  ["med-ball-chest-pass", "Med-Ball Chest Pass", "رمي كرة طبية من الصدر", "throw", "REPS", ALL, false, false, ["WRIST"], "Step and push the ball explosively from the chest.", "خطوة لقدام وادفع الكرة من صدرك بانفجار."],
  ["med-ball-slam", "Med-Ball Slam", "ضرب كرة طبية في الأرض", "throw", "REPS", ALL, false, false, ["SHOULDER"], "Reach tall, slam the ball into the floor with the whole body.", "اتمد لفوق واضرب الكرة في الأرض بجسمك كله."],
  // sprint (DISTANCE: reps at a set distance)
  ["acceleration-sprint", "Acceleration Sprint", "سبرنت تسارع", "sprint", "DISTANCE", ALL, false, true, [], "From a 2-point start, drive out low and fast. Full rest between reps.", "من وقفة البداية، اطلع واطي وبسرعة. راحة كاملة بين كل مرة."],
  ["flying-sprint", "Flying Sprint", "سبرنت طائر", "sprint", "DISTANCE", ALL, false, true, [], "Build up over 20 m, then sprint the timed zone at top speed.", "زوّد سرعتك على ٢٠ متر وبعدين اجري المسافة بأقصى سرعة."],
  ["sled-push", "Sled Push", "دفع الزلاجة", "sprint", "DISTANCE", G, false, true, [], "Low body angle, drive the sled with powerful steps.", "جسمك مايل لقدام وادفع الزلاجة بخطوات قوية."],
  // agility
  ["pro-agility", "5-10-5 Pro Agility", "رشاقة ٥-١٠-٥", "agility", "REPS", ALL, false, true, ["KNEE"], "Sprint 5 m, cut, sprint 10 m, cut, sprint 5 m. Stay low on each cut.", "اجري ٥ متر، اقلب، ١٠ متر، اقلب، ٥ متر. خليك واطي في كل لفة."],
  ["lateral-shuffle", "Lateral Shuffle Reaction", "تحرك جانبي برد فعل", "agility", "REPS", ALL, false, true, [], "Athletic stance, shuffle and change direction on a partner's signal.", "وقفة الاستعداد، اتحرك للجنب وغيّر الاتجاه على إشارة زميلك."],
  // conditioning
  ["tempo-run", "Tempo Runs", "جري تيمبو", "conditioning", "DISTANCE", ALL, false, true, [], "Run at about 70% speed, walk back, repeat.", "اجري بحوالي ٧٠٪ من سرعتك وارجع ماشي وكرر."],
  ["bike-intervals", "Bike Intervals", "فترات عجلة ثابتة", "conditioning", "TIME", G, false, true, [], "Hard effort on the bike, then easy spinning for the same time.", "مجهود عالي على العجلة وبعدين لف خفيف لنفس الوقت."],
  ["shuttle-runs", "Shuttle Runs", "جري مكوكي", "conditioning", "REPS", ALL, false, true, ["KNEE"], "Run 20 m and back continuously at high intensity.", "اجري ٢٠ متر ورجوع بشدة عالية من غير وقوف."],
  ["rower-intervals", "Rower Intervals", "فترات جهاز تجديف", "conditioning", "TIME", G, false, false, ["LOWER_BACK"], "Legs, body, arms; hard pace, then easy recovery.", "رجلك، جسمك، إيدك؛ سرعة عالية وبعدين راحة خفيفة."],
  // core
  ["pallof-press", "Pallof Press", "بالوف برس", "core", "REPS", G, false, false, [], "Press the band straight out and resist the rotation.", "ادفع الحبل قدامك وماتسيبش جسمك يلف."],
  ["dead-bug", "Dead Bug", "ديد باج", "core", "REPS", ALL, false, false, [], "Lower back pressed down, extend opposite arm and leg slowly.", "ضهرك لازق في الأرض، افرد دراع ورجل عكس بعض بالراحة."],
  ["side-plank", "Side Plank", "بلانك جانبي", "core", "TIME", ALL, false, false, ["SHOULDER"], "Elbow under shoulder, hips high, body in one line.", "الكوع تحت الكتف، وسطك لفوق وجسمك خط واحد."],
  ["farmer-carry", "Farmer Carry", "مشي المزارع", "carry", "DISTANCE", ALL, false, false, [], "Heavy dumbbells, tall posture, short quick steps.", "دمبل تقيل، اقف مفرود وخطوات قصيرة وسريعة."],
  // prehab / injury prevention
  ["nordic-curl", "Nordic Hamstring Curl", "نوردك للخلفية", "prehab", "REPS", ALL, false, true, ["KNEE"], "Anchor your feet and lower your body as slowly as you can.", "ثبّت رجليك ونزّل جسمك أبطأ ما تقدر."],
  ["copenhagen-plank", "Copenhagen Plank", "بلانك كوبنهاجن", "prehab", "TIME", ALL, false, true, [], "Side plank with the top leg on a bench to strengthen the groin.", "بلانك جانبي ورجلك اللي فوق على بنش لتقوية الضامة."],
  ["single-leg-calf-raise", "Single-Leg Calf Raise", "سمانة رجل واحدة", "prehab", "REPS", ALL, false, true, [], "Full stretch at the bottom, pause at the top, slow down.", "شد كامل تحت، اثبت فوق، وانزل بالراحة."],
  ["tibialis-raise", "Tibialis Raise", "رفع مشط القدم", "prehab", "REPS", ALL, false, true, [], "Back against a wall, lift your toes as high as you can.", "ضهرك على الحيطة وارفع صوابع رجلك لأعلى ما تقدر."],
  ["face-pull", "Face Pull", "فيس بول", "prehab", "LOAD_REPS", G, false, false, [], "Rope to the forehead, elbows high, rotate out.", "اسحب الحبل لجبهتك والكوع عالي ولف لبرا."],
  ["band-external-rotation", "Band External Rotation", "لف خارجي بالأستك", "prehab", "REPS", ALL, false, false, [], "Elbow at your side, rotate the forearm out against the band.", "الكوع جنبك ولف الساعد لبرا ضد الأستك."],
  ["neck-isometric", "Neck Isometric Hold", "ثبات الرقبة", "neck", "TIME", ALL, false, false, [], "Hand on head, push gently in each direction and hold. No pain.", "إيدك على راسك وزق بهدوء في كل اتجاه واثبت. من غير ألم."],
  // mobility / recovery
  ["hip-90-90", "90/90 Hip Switch", "تبديل الوسط ٩٠/٩٠", "mobility", "REPS", ALL, false, true, [], "Sit with both knees at 90°, rotate side to side slowly.", "اقعد وركبتك الاتنين ٩٠ درجة ولف يمين وشمال بالراحة."],
  ["worlds-greatest-stretch", "World's Greatest Stretch", "أعظم إطالة", "mobility", "REPS", ALL, false, true, [], "Lunge, elbow to instep, rotate and reach to the sky.", "لانج، الكوع ناحية رجلك، ولف وارفع دراعك لفوق."],
  ["ankle-rocks", "Ankle Rocks", "مرونة الكاحل", "mobility", "REPS", ALL, false, true, [], "Half kneeling, drive the knee over the toes, heel down.", "على ركبة واحدة، زق الركبة فوق الصوابع والكعب على الأرض."],
  ["thoracic-rotation", "Thoracic Rotation", "لف أعلى الضهر", "mobility", "REPS", ALL, false, false, [], "On all fours, hand behind head, rotate the elbow up to the ceiling.", "على إيديك وركبك، إيد ورا راسك ولف الكوع للسقف."],
];

/** Metres per rep for DISTANCE exercises. */
export const DISTANCE_M: Record<string, number> = {
  "acceleration-sprint": 20, "flying-sprint": 20, "sled-push": 20, "tempo-run": 100, "farmer-carry": 30,
};

/** Technical / high-impact work held back for beginners. */
export const ADVANCED_ONLY = new Set(["hang-power-clean", "depth-jump"]);

export const EXERCISES = ROWS.map(
  ([id, nameEn, nameAr, pattern, measure, equipment, heavy, isLowerBody, stresses, instructionsEn, instructionsAr]) => ({
    id, nameEn, nameAr, muscle: pattern, measure, equipment, isCompound: heavy, isLowerBody, stresses, instructionsEn, instructionsAr,
  }),
);
