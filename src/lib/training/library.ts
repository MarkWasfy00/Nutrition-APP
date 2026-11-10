import type { Equipment } from "@prisma/client";

const G: Equipment[] = ["GYM"];
const GD: Equipment[] = ["GYM", "DUMBBELLS"];
const ALL: Equipment[] = ["GYM", "DUMBBELLS", "HOME"];

type Row = [
  id: string, nameEn: string, nameAr: string, muscle: string, equipment: Equipment[],
  isCompound: boolean, isLowerBody: boolean, stresses: string[], instructionsEn: string, instructionsAr: string,
];

const ROWS: Row[] = [
  // chest
  ["bench-press", "Barbell Bench Press", "بنش برس بالبار", "chest", G, true, false, ["SHOULDER"], "Shoulder blades pinned, bar to mid-chest, press up and slightly back.", "لزق لوحي الكتف، نزّل البار لنص الصدر وادفع لفوق."],
  ["db-bench-press", "Dumbbell Bench Press", "بنش برس دمبل", "chest", GD, true, false, ["SHOULDER"], "Lower dumbbells to chest level with elbows ~45°, press together.", "نزّل الدمبل لمستوى الصدر والكوع ٤٥ درجة وادفع."],
  ["incline-db-press", "Incline Dumbbell Press", "إنكلاين برس دمبل", "chest", GD, true, false, ["SHOULDER"], "Bench at 30°, control down to upper chest, press up.", "البنش ٣٠ درجة، انزل بالراحة لأعلى الصدر وادفع."],
  ["chest-dips", "Chest Dips", "متوازي صدر", "chest", G, true, false, ["SHOULDER", "ELBOW"], "Lean forward, lower until a deep chest stretch, push up.", "ميّل لقدام وانزل لحد ما تحس بشد في الصدر واطلع."],
  ["push-up", "Push-Up", "ضغط", "chest", ALL, true, false, ["WRIST"], "Body in a straight line, chest to floor, full lockout.", "جسمك مفرود خط واحد، صدرك للأرض واطلع للآخر."],
  ["decline-push-up", "Decline Push-Up", "ضغط مايل", "chest", ALL, true, false, ["WRIST", "SHOULDER"], "Feet on a chair, lower chest to the floor with control.", "رجليك على كرسي ونزّل صدرك للأرض بالراحة."],
  ["cable-fly", "Cable Fly", "تفتيح كابل", "chest", G, false, false, [], "Slight elbow bend, hug the handles together, squeeze the chest.", "كوعك مثني سنة، قفّل الإيدين قدامك واعصر الصدر."],
  ["pec-deck", "Pec Deck", "بيك دك", "chest", G, false, false, ["SHOULDER"], "Bring the pads together, pause, return slowly.", "قفّل الجهاز، اثبت ثانية، وارجع بالراحة."],
  ["db-fly", "Dumbbell Fly", "تفتيح دمبل", "chest", GD, false, false, ["SHOULDER"], "Wide arc down to a stretch, bring dumbbells back over chest.", "افتح دراعك في قوس لحد الشد ورجّعهم فوق صدرك."],
  ["wide-push-up", "Wide Push-Up", "ضغط واسع", "chest", ALL, false, false, ["WRIST", "SHOULDER"], "Hands wider than shoulders, slow 3-second lowering.", "إيديك أوسع من كتفك ونزول بطيء ٣ ثواني."],
  // back
  ["deadlift", "Deadlift", "ديدلفت", "back", G, true, true, ["LOWER_BACK"], "Bar over mid-foot, brace, push the floor away, lock hips.", "البار فوق نص رجلك، شد بطنك، ادفع الأرض وقفّل وسطك."],
  ["pull-up", "Pull-Up", "عقلة", "back", ALL, true, false, ["SHOULDER", "ELBOW"], "Full hang, pull chest toward the bar, control down.", "ابدأ متعلق للآخر، اسحب صدرك للبار وانزل بالراحة."],
  ["barbell-row", "Barbell Row", "سحب بالبار", "back", G, true, false, ["LOWER_BACK"], "Hinge to ~45°, row bar to lower ribs.", "ميّل ٤٥ درجة واسحب البار لآخر ضلوعك."],
  ["lat-pulldown", "Lat Pulldown", "سحب أمامي", "back", G, true, false, [], "Pull the bar to upper chest, elbows down and back.", "اسحب البار لأعلى صدرك والكوع لتحت وورا."],
  ["seated-cable-row", "Seated Cable Row", "سحب أرضي", "back", G, true, false, [], "Chest up, pull handle to stomach, squeeze shoulder blades.", "صدرك لقدام، اسحب للبطن واقفل لوحي الكتف."],
  ["db-row", "One-Arm Dumbbell Row", "سحب دمبل بإيد واحدة", "back", GD, true, false, [], "Support on bench, row dumbbell to the hip.", "اسند على البنش واسحب الدمبل ناحية وسطك."],
  ["inverted-row", "Inverted Row", "سحب مقلوب", "back", ALL, true, false, [], "Under a sturdy table or bar, pull chest up, body straight.", "تحت ترابيزة تقيلة أو بار، اسحب صدرك وجسمك مفرود."],
  ["straight-arm-pulldown", "Straight-Arm Pulldown", "بول أوفر كابل", "back", G, false, false, [], "Arms straight, sweep the bar to your thighs.", "دراعك مفرود، انزل بالبار لحد فخادك."],
  ["db-pullover", "Dumbbell Pullover", "بول أوفر دمبل", "back", GD, false, false, ["SHOULDER"], "Arc dumbbell behind head to a stretch, pull back over chest.", "نزّل الدمبل ورا راسك لحد الشد ورجّعه فوق صدرك."],
  ["superman", "Superman Hold", "سوبرمان", "back", ALL, false, false, [], "Lying face down, lift arms and legs, hold 2 seconds.", "نايم على بطنك، ارفع إيديك ورجليك واثبت ثانيتين."],
  // shoulders
  ["ohp", "Overhead Press", "ضغط كتف بالبار", "shoulders", G, true, false, ["SHOULDER", "LOWER_BACK"], "Glutes tight, press the bar overhead, head through.", "اقفل وسطك وادفع البار فوق راسك."],
  ["db-shoulder-press", "Seated Dumbbell Press", "ضغط كتف دمبل", "shoulders", GD, true, false, ["SHOULDER"], "Press dumbbells overhead without clashing them.", "ادفع الدمبل لفوق من غير ما يخبطوا في بعض."],
  ["pike-push-up", "Pike Push-Up", "ضغط بايك", "shoulders", ALL, true, false, ["SHOULDER", "WRIST"], "Hips high, lower your head between your hands.", "وسطك لفوق ونزّل راسك بين إيديك."],
  ["lateral-raise", "Lateral Raise", "رفرفة جانبي", "shoulders", GD, false, false, [], "Raise to shoulder height leading with elbows.", "ارفع لمستوى الكتف والكوع هو اللي بيقود."],
  ["cable-lateral-raise", "Cable Lateral Raise", "رفرفة جانبي كابل", "shoulders", G, false, false, [], "One arm at a time, constant tension.", "دراع دراع والشد مستمر."],
  ["rear-delt-fly", "Rear Delt Fly", "رفرفة خلفي", "shoulders", GD, false, false, [], "Bent over, raise dumbbells out to the sides.", "ميّل لقدام وافتح الدمبل للجنب."],
  ["face-pull", "Face Pull", "فيس بول", "shoulders", G, false, false, [], "Rope to forehead, elbows high, rotate out.", "اسحب الحبل لجبهتك والكوع عالي."],
  ["prone-y-raise", "Prone Y-Raise", "رفع Y على البطن", "shoulders", ALL, false, false, [], "Face down, raise arms in a Y shape, thumbs up.", "على بطنك، ارفع دراعك على شكل Y والإبهام لفوق."],
  // quads
  ["back-squat", "Back Squat", "سكوات بالبار", "quads", G, true, true, ["KNEE", "LOWER_BACK"], "Brace, sit between your hips to parallel or below, drive up.", "شد بطنك وانزل لحد الموازي أو أوطى واطلع بقوة."],
  ["leg-press", "Leg Press", "ليج برس", "quads", G, true, true, ["KNEE"], "Lower until knees ~90°, don't lock knees at the top.", "انزل لحد ركبتك ٩٠ درجة وماتقفلش الركبة فوق."],
  ["goblet-squat", "Goblet Squat", "جوبلت سكوات", "quads", GD, true, true, ["KNEE"], "Hold dumbbell at chest, squat deep with upright torso.", "امسك الدمبل عند صدرك وانزل عميق وضهرك مفرود."],
  ["bulgarian-split-squat", "Bulgarian Split Squat", "بلغاري سكوات", "quads", ALL, true, true, ["KNEE"], "Rear foot on bench, drop the back knee down.", "رجلك الورانية على بنش ونزّل الركبة لتحت."],
  ["bodyweight-squat", "Tempo Bodyweight Squat", "سكوات بوزن الجسم", "quads", ALL, true, true, ["KNEE"], "3 seconds down, 1 second pause, stand up.", "٣ ثواني نزول، ثانية ثبات، واطلع."],
  ["leg-extension", "Leg Extension", "رفرفة أمامي", "quads", G, false, true, ["KNEE"], "Extend fully, squeeze quads, lower slowly.", "افرد رجلك للآخر واعصر وانزل بالراحة."],
  ["walking-lunge", "Walking Lunge", "طعن بالمشي", "quads", ALL, false, true, ["KNEE"], "Long steps, back knee close to floor.", "خطوات واسعة والركبة الورانية قريبة من الأرض."],
  // hamstrings
  ["romanian-deadlift", "Romanian Deadlift", "ديدلفت روماني", "hamstrings", G, true, true, ["LOWER_BACK"], "Soft knees, hinge back until hamstring stretch.", "ركبة مثنية سنة وارجع بوسطك لحد الشد في الخلفية."],
  ["db-rdl", "Dumbbell Romanian Deadlift", "روماني دمبل", "hamstrings", GD, true, true, ["LOWER_BACK"], "Dumbbells slide down thighs, flat back.", "الدمبل ينزل على فخادك وضهرك مفرود."],
  ["single-leg-rdl", "Single-Leg RDL", "روماني رجل واحدة", "hamstrings", ALL, true, true, [], "Balance on one leg, hinge forward, hips square.", "اتوازن على رجل وميّل لقدام ووسطك مستقيم."],
  ["lying-leg-curl", "Lying Leg Curl", "رفرفة خلفي نايم", "hamstrings", G, false, true, [], "Curl heels to glutes, slow negative.", "اسحب كعبك لورا ونزول بطيء."],
  ["seated-leg-curl", "Seated Leg Curl", "رفرفة خلفي قاعد", "hamstrings", G, false, true, [], "Lean forward slightly, curl fully.", "ميّل لقدام سنة واسحب للآخر."],
  ["nordic-curl", "Nordic Curl", "نوردك كيرل", "hamstrings", ALL, false, true, ["KNEE"], "Anchor feet, lower torso as slowly as possible.", "ثبّت رجليك ونزّل جسمك أبطأ ما تقدر."],
  ["slider-leg-curl", "Towel Slider Leg Curl", "كيرل بالفوطة", "hamstrings", ALL, false, true, [], "Hips up, slide heels in and out on a towel.", "ارفع وسطك واسحب كعبك على الفوطة."],
  // glutes
  ["hip-thrust", "Barbell Hip Thrust", "هيب ثرست بالبار", "glutes", G, true, true, [], "Upper back on bench, drive hips up, pause.", "ضهرك على البنش، ارفع وسطك واثبت."],
  ["db-hip-thrust", "Dumbbell Hip Thrust", "هيب ثرست دمبل", "glutes", GD, true, true, [], "Dumbbell on hips, full hip lockout.", "الدمبل على وسطك وقفّل للآخر."],
  ["glute-bridge", "Single-Leg Glute Bridge", "جلوت بريدج رجل واحدة", "glutes", ALL, true, true, [], "One foot planted, lift hips, squeeze.", "رجل واحدة على الأرض، ارفع وسطك واعصر."],
  ["cable-kickback", "Cable Kickback", "كيك باك كابل", "glutes", G, false, true, [], "Kick back and up, squeeze the glute.", "ارفس لورا ولفوق واعصر."],
  // biceps
  ["barbell-curl", "Barbell Curl", "بايسبس بار", "biceps", G, false, false, ["ELBOW", "WRIST"], "Elbows pinned, curl without swinging.", "الكوع ثابت جنبك ومن غير مرجحة."],
  ["db-curl", "Dumbbell Curl", "بايسبس دمبل", "biceps", GD, false, false, [], "Supinate as you curl, slow down.", "لف كفك وانت طالع وانزل بالراحة."],
  ["hammer-curl", "Hammer Curl", "هامر", "biceps", GD, false, false, [], "Neutral grip, curl to shoulder.", "مسكة محايدة واطلع لحد الكتف."],
  ["cable-curl", "Cable Curl", "بايسبس كابل", "biceps", G, false, false, [], "Constant tension, squeeze at the top.", "شد مستمر واعصر فوق."],
  ["incline-db-curl", "Incline Dumbbell Curl", "بايسبس دمبل على بنش مايل", "biceps", GD, false, false, ["SHOULDER"], "Arms hang behind torso, curl from a stretch.", "دراعك سايب ورا جسمك وابدأ من الشد."],
  ["towel-curl", "Towel Isometric Curl", "بايسبس بالفوطة", "biceps", ALL, false, false, [], "Step on a towel and curl hard against it.", "اقف على فوطة واسحبها بكل قوتك."],
  // triceps
  ["triceps-pushdown", "Cable Pushdown", "تراي بوش داون", "triceps", G, false, false, ["ELBOW"], "Elbows pinned, push down to full lockout.", "الكوع ثابت وادفع لتحت للآخر."],
  ["overhead-triceps-ext", "Overhead Dumbbell Extension", "تراي خلف الراس دمبل", "triceps", GD, false, false, ["ELBOW", "SHOULDER"], "Lower behind head to a stretch, extend.", "نزّل ورا راسك لحد الشد وافرد."],
  ["skull-crusher", "Skull Crusher", "سكل كراشر", "triceps", G, false, false, ["ELBOW"], "Lower bar toward forehead, extend up.", "نزّل البار ناحية جبهتك وافرد."],
  ["close-grip-bench", "Close-Grip Bench Press", "بنش ضيق", "triceps", G, false, false, ["WRIST", "ELBOW"], "Shoulder-width grip, elbows tucked.", "مسكة بعرض الكتف والكوع لازق."],
  ["diamond-push-up", "Diamond Push-Up", "ضغط دايموند", "triceps", ALL, false, false, ["WRIST", "ELBOW"], "Hands together under chest, elbows back.", "إيديك جنب بعض تحت صدرك والكوع لورا."],
  ["bench-dip", "Bench Dip", "متوازي على كرسي", "triceps", ALL, false, false, ["SHOULDER"], "Hands on a chair behind you, dip to 90°.", "إيديك على كرسي وراك وانزل ٩٠ درجة."],
  // calves
  ["standing-calf-raise", "Standing Calf Raise", "سمانة واقف", "calves", ALL, false, true, [], "Full stretch at the bottom, pause at the top.", "شد كامل تحت واثبت فوق."],
  ["seated-calf-raise", "Seated Calf Raise", "سمانة قاعد", "calves", G, false, true, [], "Slow reps, full range.", "عدات بطيئة ومدى كامل."],
];

export const EXERCISES = ROWS.map(
  ([id, nameEn, nameAr, muscle, equipment, isCompound, isLowerBody, stresses, instructionsEn, instructionsAr]) => ({
    id, nameEn, nameAr, muscle, equipment, isCompound, isLowerBody, stresses, instructionsEn, instructionsAr,
  }),
);
