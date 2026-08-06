// Static English grammar reference (12 tenses) + a matching practice-question bank.
// Deliberately NOT AI-generated: grammar rules are fixed and objective, so hand-curated
// content avoids any risk of a model hallucinating an incorrect rule or exercise answer.
// This is English-specific regardless of the app-wide language toggle (Vietnamese/Chinese
// learners alike study English tenses here) — see rule.md "Grammar reference (/grammar)".

export type TenseId =
  | "present-simple"
  | "present-continuous"
  | "present-perfect"
  | "present-perfect-continuous"
  | "past-simple"
  | "past-continuous"
  | "past-perfect"
  | "past-perfect-continuous"
  | "future-simple"
  | "future-continuous"
  | "future-perfect"
  | "future-perfect-continuous";

export type Tense = {
  id: TenseId;
  nameVi: string;
  nameEn: string;
  structure: {
    affirmative: string;
    negative: string;
    question: string;
  };
  usage: string[];
  signalWords: string[];
  examples: { en: string; vi: string }[];
  questionAnswer: {
    yesNo: { question: string; shortYes: string; shortNo: string };
    wh: { question: string; answer: string };
  };
};

export const TENSES: Tense[] = [
  {
    id: "present-simple",
    nameVi: "Hiện tại đơn",
    nameEn: "Present Simple",
    structure: {
      affirmative: "S + V(s/es) [với he/she/it] / S + V (nguyên thể)",
      negative: "S + do/does + not + V (nguyên thể)",
      question: "Do/Does + S + V (nguyên thể)?",
    },
    usage: [
      "Thói quen, hành động lặp đi lặp lại (I get up at 6 every day.)",
      "Sự thật hiển nhiên, chân lý (The sun rises in the east.)",
      "Lịch trình cố định, thời gian biểu (The train leaves at 9 a.m.)",
    ],
    signalWords: ["always", "usually", "often", "sometimes", "every day/week/year", "never"],
    examples: [
      { en: "She works at a hospital.", vi: "Cô ấy làm việc ở bệnh viện." },
      { en: "He doesn't drink coffee.", vi: "Anh ấy không uống cà phê." },
      { en: "Do you speak English?", vi: "Bạn có nói tiếng Anh không?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Does she work on weekends?",
        shortYes: "Yes, she does.",
        shortNo: "No, she doesn't.",
      },
      wh: { question: "Where do you live?", answer: "I live in Hanoi." },
    },
  },
  {
    id: "present-continuous",
    nameVi: "Hiện tại tiếp diễn",
    nameEn: "Present Continuous",
    structure: {
      affirmative: "S + am/is/are + V-ing",
      negative: "S + am/is/are + not + V-ing",
      question: "Am/Is/Are + S + V-ing?",
    },
    usage: [
      "Hành động đang xảy ra ngay lúc nói (Look! It's raining.)",
      "Hành động tạm thời, đang diễn ra quanh thời điểm hiện tại (She is studying English this year.)",
      "Kế hoạch đã sắp xếp trong tương lai gần (We are meeting them tomorrow.)",
    ],
    signalWords: ["now", "right now", "at the moment", "Look!", "Listen!", "currently"],
    examples: [
      { en: "They are watching a movie.", vi: "Họ đang xem phim." },
      { en: "I am not working today.", vi: "Hôm nay tôi không làm việc." },
      { en: "Is he coming to the party?", vi: "Anh ấy có đến bữa tiệc không?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Are you listening to me?",
        shortYes: "Yes, I am.",
        shortNo: "No, I'm not.",
      },
      wh: { question: "What are you doing?", answer: "I'm cooking dinner." },
    },
  },
  {
    id: "present-perfect",
    nameVi: "Hiện tại hoàn thành",
    nameEn: "Present Perfect",
    structure: {
      affirmative: "S + have/has + V3/V-ed",
      negative: "S + have/has + not + V3/V-ed",
      question: "Have/Has + S + V3/V-ed?",
    },
    usage: [
      "Hành động xảy ra trong quá khứ nhưng không rõ/không quan trọng thời điểm cụ thể (I have visited Japan.)",
      "Hành động bắt đầu trong quá khứ và còn tiếp diễn/liên quan đến hiện tại (She has lived here for 5 years.)",
      "Hành động vừa mới hoàn thành (I have just finished my homework.)",
    ],
    signalWords: ["already", "just", "yet", "ever", "never", "since", "for", "so far"],
    examples: [
      { en: "I have already eaten lunch.", vi: "Tôi đã ăn trưa rồi." },
      { en: "She hasn't finished her report.", vi: "Cô ấy chưa hoàn thành báo cáo." },
      { en: "Have you ever been to Paris?", vi: "Bạn đã từng đến Paris chưa?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Has he arrived yet?",
        shortYes: "Yes, he has.",
        shortNo: "No, he hasn't.",
      },
      wh: { question: "How long have you studied English?", answer: "I have studied it for 3 years." },
    },
  },
  {
    id: "present-perfect-continuous",
    nameVi: "Hiện tại hoàn thành tiếp diễn",
    nameEn: "Present Perfect Continuous",
    structure: {
      affirmative: "S + have/has + been + V-ing",
      negative: "S + have/has + not + been + V-ing",
      question: "Have/Has + S + been + V-ing?",
    },
    usage: [
      "Hành động bắt đầu trong quá khứ, kéo dài liên tục đến hiện tại, nhấn mạnh tính liên tục (I have been waiting for an hour.)",
      "Nhấn mạnh kết quả/hệ quả nhìn thấy được của một quá trình (Her eyes are red — she has been crying.)",
    ],
    signalWords: ["since", "for", "all day", "recently", "lately"],
    examples: [
      { en: "They have been working on this project for months.", vi: "Họ đã làm dự án này được vài tháng rồi." },
      { en: "I haven't been sleeping well lately.", vi: "Gần đây tôi ngủ không ngon." },
      { en: "Have you been waiting long?", vi: "Bạn đã đợi lâu chưa?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Has it been raining all day?",
        shortYes: "Yes, it has.",
        shortNo: "No, it hasn't.",
      },
      wh: { question: "How long have you been learning English?", answer: "I've been learning it for 2 years." },
    },
  },
  {
    id: "past-simple",
    nameVi: "Quá khứ đơn",
    nameEn: "Past Simple",
    structure: {
      affirmative: "S + V2/V-ed",
      negative: "S + did + not + V (nguyên thể)",
      question: "Did + S + V (nguyên thể)?",
    },
    usage: [
      "Hành động đã xảy ra và kết thúc tại một thời điểm xác định trong quá khứ (I visited my grandma yesterday.)",
      "Chuỗi hành động nối tiếp nhau trong quá khứ (He woke up, brushed his teeth, and left.)",
    ],
    signalWords: ["yesterday", "last night/week/year", "ago", "in 2020", "when I was young"],
    examples: [
      { en: "She called me last night.", vi: "Cô ấy đã gọi cho tôi tối qua." },
      { en: "They didn't go to school yesterday.", vi: "Hôm qua họ đã không đi học." },
      { en: "Did you watch the game?", vi: "Bạn có xem trận đấu không?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Did you finish the exam?",
        shortYes: "Yes, I did.",
        shortNo: "No, I didn't.",
      },
      wh: { question: "Where did you go last summer?", answer: "I went to Da Nang." },
    },
  },
  {
    id: "past-continuous",
    nameVi: "Quá khứ tiếp diễn",
    nameEn: "Past Continuous",
    structure: {
      affirmative: "S + was/were + V-ing",
      negative: "S + was/were + not + V-ing",
      question: "Was/Were + S + V-ing?",
    },
    usage: [
      "Hành động đang xảy ra tại một thời điểm cụ thể trong quá khứ (At 8pm, I was studying.)",
      "Hành động đang xảy ra thì bị hành động khác (quá khứ đơn) xen vào (I was sleeping when the phone rang.)",
      "Hai hành động xảy ra song song trong quá khứ (She was cooking while he was cleaning.)",
    ],
    signalWords: ["at that time", "while", "when", "at 8 o'clock yesterday"],
    examples: [
      { en: "We were watching TV when you called.", vi: "Chúng tôi đang xem TV thì bạn gọi." },
      { en: "I wasn't paying attention.", vi: "Tôi đã không chú ý." },
      { en: "Were they playing football at 5pm?", vi: "Lúc 5 giờ họ có đang chơi bóng đá không?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Was she sleeping at midnight?",
        shortYes: "Yes, she was.",
        shortNo: "No, she wasn't.",
      },
      wh: { question: "What were you doing at 9pm?", answer: "I was reading a book." },
    },
  },
  {
    id: "past-perfect",
    nameVi: "Quá khứ hoàn thành",
    nameEn: "Past Perfect",
    structure: {
      affirmative: "S + had + V3/V-ed",
      negative: "S + had + not + V3/V-ed",
      question: "Had + S + V3/V-ed?",
    },
    usage: [
      "Hành động xảy ra trước một hành động/thời điểm khác trong quá khứ (I had eaten before he arrived.)",
      "Diễn tả kinh nghiệm/sự việc tính đến một mốc quá khứ nhất định (She had never seen snow before that trip.)",
    ],
    signalWords: ["before", "after", "by the time", "already (in the past)"],
    examples: [
      { en: "The train had left before I got to the station.", vi: "Tàu đã rời đi trước khi tôi đến ga." },
      { en: "They hadn't met before that party.", vi: "Trước bữa tiệc đó họ chưa từng gặp nhau." },
      { en: "Had you finished the report before the meeting?", vi: "Bạn đã hoàn thành báo cáo trước cuộc họp chưa?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Had she left when you arrived?",
        shortYes: "Yes, she had.",
        shortNo: "No, she hadn't.",
      },
      wh: { question: "Why had he left early?", answer: "He had left early because he was sick." },
    },
  },
  {
    id: "past-perfect-continuous",
    nameVi: "Quá khứ hoàn thành tiếp diễn",
    nameEn: "Past Perfect Continuous",
    structure: {
      affirmative: "S + had + been + V-ing",
      negative: "S + had + not + been + V-ing",
      question: "Had + S + been + V-ing?",
    },
    usage: [
      "Nhấn mạnh quá trình kéo dài liên tục trước một thời điểm/hành động khác trong quá khứ (I had been working for 2 hours when he called.)",
      "Diễn tả nguyên nhân dẫn đến một kết quả trong quá khứ (He was tired because he had been running.)",
    ],
    signalWords: ["for", "since", "before", "how long...before"],
    examples: [
      { en: "She had been studying for 3 hours before the exam.", vi: "Cô ấy đã học liên tục 3 tiếng trước kỳ thi." },
      { en: "I hadn't been feeling well before I saw the doctor.", vi: "Trước khi khám bác sĩ tôi đã cảm thấy không khoẻ." },
      { en: "Had they been waiting long before the bus came?", vi: "Họ đã đợi lâu trước khi xe buýt đến không?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Had you been working there long before you quit?",
        shortYes: "Yes, I had.",
        shortNo: "No, I hadn't.",
      },
      wh: { question: "How long had she been driving before the accident?", answer: "She had been driving for 4 hours." },
    },
  },
  {
    id: "future-simple",
    nameVi: "Tương lai đơn",
    nameEn: "Future Simple",
    structure: {
      affirmative: "S + will + V (nguyên thể)",
      negative: "S + will + not (won't) + V (nguyên thể)",
      question: "Will + S + V (nguyên thể)?",
    },
    usage: [
      "Dự đoán không có căn cứ chắc chắn (I think it will rain tomorrow.)",
      "Quyết định tức thời tại thời điểm nói (I'll help you with that.)",
      "Lời hứa, đề nghị, cảnh báo (I will call you later. / I promise I will come.)",
    ],
    signalWords: ["tomorrow", "next week/month/year", "soon", "I think/promise/hope"],
    examples: [
      { en: "She will graduate next year.", vi: "Cô ấy sẽ tốt nghiệp vào năm sau." },
      { en: "I won't tell anyone.", vi: "Tôi sẽ không nói cho ai biết." },
      { en: "Will you come to the wedding?", vi: "Bạn có đến đám cưới không?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Will they arrive on time?",
        shortYes: "Yes, they will.",
        shortNo: "No, they won't.",
      },
      wh: { question: "When will you finish the project?", answer: "I will finish it next Friday." },
    },
  },
  {
    id: "future-continuous",
    nameVi: "Tương lai tiếp diễn",
    nameEn: "Future Continuous",
    structure: {
      affirmative: "S + will + be + V-ing",
      negative: "S + will + not + be + V-ing",
      question: "Will + S + be + V-ing?",
    },
    usage: [
      "Hành động đang diễn ra tại một thời điểm cụ thể trong tương lai (At 8pm tomorrow, I will be flying to Tokyo.)",
      "Hành động đã được lên kế hoạch, chắc chắn sẽ xảy ra theo lịch trình (I will be meeting the client next Monday.)",
    ],
    signalWords: ["at this time tomorrow", "at + giờ + in the future", "next week at..."],
    examples: [
      { en: "This time next week, I will be lying on a beach.", vi: "Giờ này tuần sau tôi sẽ đang nằm trên bãi biển." },
      { en: "She won't be working on Sunday.", vi: "Chủ nhật cô ấy sẽ không làm việc." },
      { en: "Will you be using the car tonight?", vi: "Tối nay bạn có dùng xe không?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Will you be attending the meeting?",
        shortYes: "Yes, I will.",
        shortNo: "No, I won't.",
      },
      wh: { question: "What will you be doing at 10pm?", answer: "I will be sleeping." },
    },
  },
  {
    id: "future-perfect",
    nameVi: "Tương lai hoàn thành",
    nameEn: "Future Perfect",
    structure: {
      affirmative: "S + will + have + V3/V-ed",
      negative: "S + will + not + have + V3/V-ed",
      question: "Will + S + have + V3/V-ed?",
    },
    usage: [
      "Hành động sẽ hoàn thành trước một thời điểm/hành động khác trong tương lai (By 2030, I will have graduated.)",
    ],
    signalWords: ["by the time", "by + mốc thời gian tương lai", "before"],
    examples: [
      { en: "By next year, she will have finished her degree.", vi: "Đến năm sau, cô ấy sẽ hoàn thành xong bằng cấp." },
      { en: "We won't have arrived by 9pm.", vi: "Chúng tôi sẽ chưa đến nơi trước 9 giờ tối." },
      { en: "Will you have finished by Friday?", vi: "Bạn sẽ hoàn thành trước thứ Sáu chứ?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Will they have left by then?",
        shortYes: "Yes, they will.",
        shortNo: "No, they won't.",
      },
      wh: { question: "How much will you have saved by December?", answer: "I will have saved 20 million VND." },
    },
  },
  {
    id: "future-perfect-continuous",
    nameVi: "Tương lai hoàn thành tiếp diễn",
    nameEn: "Future Perfect Continuous",
    structure: {
      affirmative: "S + will + have + been + V-ing",
      negative: "S + will + not + have + been + V-ing",
      question: "Will + S + have + been + V-ing?",
    },
    usage: [
      "Nhấn mạnh khoảng thời gian một hành động đã kéo dài liên tục tính đến một mốc trong tương lai (By June, I will have been working here for 5 years.)",
    ],
    signalWords: ["by the time", "for + khoảng thời gian + by then"],
    examples: [
      { en: "By 2026, I will have been living here for a decade.", vi: "Đến năm 2026, tôi sẽ sống ở đây được một thập kỷ." },
      { en: "She won't have been waiting long by the time you arrive.", vi: "Cô ấy sẽ chưa đợi lâu khi bạn đến." },
      { en: "Will you have been studying for 3 hours by 6pm?", vi: "Đến 6 giờ chiều bạn sẽ học liên tục được 3 tiếng chứ?" },
    ],
    questionAnswer: {
      yesNo: {
        question: "Will he have been working here for 10 years by next month?",
        shortYes: "Yes, he will.",
        shortNo: "No, he won't.",
      },
      wh: { question: "How long will you have been driving by the time you arrive?", answer: "I will have been driving for 6 hours." },
    },
  },
];

export type GrammarQuestion = {
  tenseId: TenseId;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const GRAMMAR_QUESTIONS: GrammarQuestion[] = [
  // Present Simple
  {
    tenseId: "present-simple",
    question: "She ___ to work by bus every day.",
    options: ["go", "goes", "is going", "went"],
    correctIndex: 1,
    explanation: "Chủ ngữ số ít (she) + thói quen lặp lại ('every day') → thêm 's': goes.",
  },
  {
    tenseId: "present-simple",
    question: "___ you like coffee?",
    options: ["Do", "Does", "Are", "Did"],
    correctIndex: 0,
    explanation: "Chủ ngữ 'you' dùng trợ động từ 'do' để tạo câu hỏi ở hiện tại đơn.",
  },
  {
    tenseId: "present-simple",
    question: "Water ___ at 100°C.",
    options: ["boil", "boils", "is boiling", "boiled"],
    correctIndex: 1,
    explanation: "Sự thật khoa học/chân lý luôn dùng hiện tại đơn: boils (số ít 'water').",
  },
  {
    tenseId: "present-simple",
    question: "He ___ not eat meat.",
    options: ["do", "does", "is", "did"],
    correctIndex: 1,
    explanation: "Phủ định hiện tại đơn với chủ ngữ số ít dùng 'does not' (doesn't).",
  },
  // Present Continuous
  {
    tenseId: "present-continuous",
    question: "Listen! Someone ___ at the door.",
    options: ["knocks", "knock", "is knocking", "knocked"],
    correctIndex: 2,
    explanation: "'Listen!' báo hiệu hành động đang xảy ra ngay lúc nói → hiện tại tiếp diễn.",
  },
  {
    tenseId: "present-continuous",
    question: "We ___ dinner right now.",
    options: ["have", "are having", "has", "had"],
    correctIndex: 1,
    explanation: "'right now' là dấu hiệu của thì hiện tại tiếp diễn: are having.",
  },
  {
    tenseId: "present-continuous",
    question: "___ she working on the report at the moment?",
    options: ["Do", "Does", "Is", "Are"],
    correctIndex: 2,
    explanation: "Chủ ngữ 'she' dùng 'is' để tạo câu hỏi thì hiện tại tiếp diễn.",
  },
  {
    tenseId: "present-continuous",
    question: "I ___ not watching TV; I'm reading.",
    options: ["am", "is", "are", "do"],
    correctIndex: 0,
    explanation: "Chủ ngữ 'I' dùng 'am' trong thì hiện tại tiếp diễn.",
  },
  // Present Perfect
  {
    tenseId: "present-perfect",
    question: "I ___ never ___ sushi before.",
    options: ["have / eat", "have / eaten", "has / eaten", "did / eat"],
    correctIndex: 1,
    explanation: "'never...before' là dấu hiệu hiện tại hoàn thành: have + V3 (eaten).",
  },
  {
    tenseId: "present-perfect",
    question: "She ___ already ___ her homework.",
    options: ["has / finished", "have / finished", "is / finishing", "did / finish"],
    correctIndex: 0,
    explanation: "Chủ ngữ số ít 'she' + 'already' → has + V3 (finished).",
  },
  {
    tenseId: "present-perfect",
    question: "___ you ever been to London?",
    options: ["Do", "Did", "Have", "Are"],
    correctIndex: 2,
    explanation: "'ever' là dấu hiệu quen thuộc của hiện tại hoàn thành: Have you ever...?",
  },
  {
    tenseId: "present-perfect",
    question: "They ___ lived here since 2015.",
    options: ["have", "has", "are", "did"],
    correctIndex: 0,
    explanation: "'since + mốc thời gian' + chủ ngữ số nhiều 'they' → have lived.",
  },
  // Present Perfect Continuous
  {
    tenseId: "present-perfect-continuous",
    question: "I ___ been waiting for an hour.",
    options: ["am", "have", "has", "was"],
    correctIndex: 1,
    explanation: "'for an hour' + nhấn mạnh tính liên tục → have been waiting.",
  },
  {
    tenseId: "present-perfect-continuous",
    question: "She looks tired. She ___ been studying all night.",
    options: ["has", "have", "is", "was"],
    correctIndex: 0,
    explanation: "Chủ ngữ số ít 'she' dùng 'has been + V-ing' để nhấn mạnh kết quả của một quá trình.",
  },
  {
    tenseId: "present-perfect-continuous",
    question: "How long ___ you been learning English?",
    options: ["do", "are", "have", "did"],
    correctIndex: 2,
    explanation: "'How long...?' hỏi về khoảng thời gian kéo dài → have you been learning.",
  },
  // Past Simple
  {
    tenseId: "past-simple",
    question: "I ___ to the cinema last night.",
    options: ["go", "went", "goes", "have gone"],
    correctIndex: 1,
    explanation: "'last night' là dấu hiệu quá khứ đơn: went (quá khứ của 'go').",
  },
  {
    tenseId: "past-simple",
    question: "They ___ not come to the party yesterday.",
    options: ["do", "did", "does", "were"],
    correctIndex: 1,
    explanation: "Phủ định quá khứ đơn dùng 'did not' (didn't) cho mọi chủ ngữ.",
  },
  {
    tenseId: "past-simple",
    question: "___ you see that movie?",
    options: ["Do", "Did", "Have", "Are"],
    correctIndex: 1,
    explanation: "Câu hỏi quá khứ đơn dùng trợ động từ 'did' + V nguyên thể.",
  },
  {
    tenseId: "past-simple",
    question: "She ___ born in 1995.",
    options: ["is", "was", "were", "has been"],
    correctIndex: 1,
    explanation: "'to be' ở quá khứ đơn với chủ ngữ số ít là 'was'.",
  },
  // Past Continuous
  {
    tenseId: "past-continuous",
    question: "I ___ TV when the power went out.",
    options: ["watch", "watched", "was watching", "have watched"],
    correctIndex: 2,
    explanation: "Hành động đang xảy ra thì bị hành động khác (went out) xen vào → was watching.",
  },
  {
    tenseId: "past-continuous",
    question: "They ___ playing football at 5pm yesterday.",
    options: ["was", "were", "are", "did"],
    correctIndex: 1,
    explanation: "Chủ ngữ số nhiều 'they' dùng 'were' trong quá khứ tiếp diễn.",
  },
  {
    tenseId: "past-continuous",
    question: "What ___ you doing at midnight?",
    options: ["did", "were", "was", "do"],
    correctIndex: 1,
    explanation: "Câu hỏi quá khứ tiếp diễn với 'you' dùng 'were'.",
  },
  // Past Perfect
  {
    tenseId: "past-perfect",
    question: "The movie ___ already ___ when we arrived.",
    options: ["has / started", "had / started", "was / starting", "did / start"],
    correctIndex: 1,
    explanation: "Hành động xảy ra trước một mốc quá khứ khác (we arrived) → had + V3 (started).",
  },
  {
    tenseId: "past-perfect",
    question: "She ___ never ___ snow before that winter.",
    options: ["has / seen", "had / seen", "was / seeing", "did / see"],
    correctIndex: 1,
    explanation: "'before that winter' là mốc quá khứ, sự việc trước đó dùng quá khứ hoàn thành: had seen.",
  },
  {
    tenseId: "past-perfect",
    question: "___ you finished the report before the deadline?",
    options: ["Did", "Have", "Had", "Were"],
    correctIndex: 2,
    explanation: "Câu hỏi quá khứ hoàn thành dùng 'Had' + chủ ngữ + V3.",
  },
  // Past Perfect Continuous
  {
    tenseId: "past-perfect-continuous",
    question: "He was tired because he ___ been running.",
    options: ["has", "have", "had", "was"],
    correctIndex: 2,
    explanation: "Nguyên nhân dẫn đến kết quả trong quá khứ → had been + V-ing (had been running).",
  },
  {
    tenseId: "past-perfect-continuous",
    question: "How long ___ she been waiting before the bus came?",
    options: ["did", "was", "had", "has"],
    correctIndex: 2,
    explanation: "'before the bus came' là mốc quá khứ → had been waiting (quá khứ hoàn thành tiếp diễn).",
  },
  // Future Simple
  {
    tenseId: "future-simple",
    question: "I think it ___ rain tomorrow.",
    options: ["will", "is", "was", "has"],
    correctIndex: 0,
    explanation: "Dự đoán không chắc chắn + 'I think' → will + V nguyên thể.",
  },
  {
    tenseId: "future-simple",
    question: "___ you help me with this box?",
    options: ["Do", "Will", "Are", "Did"],
    correctIndex: 1,
    explanation: "Lời đề nghị/nhờ vả tức thời → Will you...?",
  },
  {
    tenseId: "future-simple",
    question: "She ___ not be at the meeting tomorrow.",
    options: ["will", "is", "does", "did"],
    correctIndex: 0,
    explanation: "Phủ định tương lai đơn: will not (won't) cho mọi chủ ngữ.",
  },
  // Future Continuous
  {
    tenseId: "future-continuous",
    question: "At 8pm tomorrow, I ___ be flying to Tokyo.",
    options: ["will", "am", "was", "have"],
    correctIndex: 0,
    explanation: "'At + giờ cụ thể trong tương lai' → will be + V-ing (will be flying).",
  },
  {
    tenseId: "future-continuous",
    question: "___ you be using the car tonight?",
    options: ["Do", "Are", "Will", "Did"],
    correctIndex: 2,
    explanation: "Câu hỏi tương lai tiếp diễn dùng 'Will you be + V-ing?'.",
  },
  // Future Perfect
  {
    tenseId: "future-perfect",
    question: "By next year, she ___ have graduated.",
    options: ["will", "is", "has", "was"],
    correctIndex: 0,
    explanation: "'By + mốc tương lai' là dấu hiệu tương lai hoàn thành: will have graduated.",
  },
  {
    tenseId: "future-perfect",
    question: "___ you have finished by Friday?",
    options: ["Do", "Are", "Will", "Did"],
    correctIndex: 2,
    explanation: "Câu hỏi tương lai hoàn thành: Will + S + have + V3?",
  },
  // Future Perfect Continuous
  {
    tenseId: "future-perfect-continuous",
    question: "By June, I ___ have been working here for 5 years.",
    options: ["will", "am", "have", "was"],
    correctIndex: 0,
    explanation: "'By + mốc tương lai' + nhấn mạnh khoảng thời gian liên tục → will have been working.",
  },
  {
    tenseId: "future-perfect-continuous",
    question: "___ he have been studying for 3 hours by 6pm?",
    options: ["Did", "Has", "Will", "Was"],
    correctIndex: 2,
    explanation: "Câu hỏi tương lai hoàn thành tiếp diễn: Will + S + have been + V-ing?",
  },
];

// Vietnamese prompts for the "translate to English, then get graded" practice mode
// (`GrammarTranslationPractice.tsx` / `/api/grammar/check`). These are separate from each
// tense's `examples` above so the practice sentence isn't the exact same one already shown
// as the reference example on the same tense's card. `sampleAnswer` is a reference translation
// passed to Gemini as context for grading — the learner's answer isn't string-matched against
// it, since many correct phrasings exist.
export type TranslationPrompt = {
  tenseId: TenseId;
  vi: string;
  sampleAnswer: string;
};

export const TRANSLATION_PROMPTS: TranslationPrompt[] = [
  { tenseId: "present-simple", vi: "Tôi thường đi ngủ lúc 11 giờ.", sampleAnswer: "I usually go to bed at 11 o'clock." },
  { tenseId: "present-simple", vi: "Cô ấy không thích ăn cá.", sampleAnswer: "She doesn't like eating fish." },
  { tenseId: "present-continuous", vi: "Chúng tôi đang chờ xe buýt.", sampleAnswer: "We are waiting for the bus." },
  { tenseId: "present-continuous", vi: "Anh ấy có đang làm bài tập không?", sampleAnswer: "Is he doing his homework?" },
  { tenseId: "present-perfect", vi: "Tôi đã xem bộ phim này ba lần rồi.", sampleAnswer: "I have watched this movie three times." },
  { tenseId: "present-perfect", vi: "Bạn đã bao giờ thử món ăn Việt Nam chưa?", sampleAnswer: "Have you ever tried Vietnamese food?" },
  { tenseId: "present-perfect-continuous", vi: "Cô ấy đã học tiếng Anh được 2 năm rồi.", sampleAnswer: "She has been learning English for 2 years." },
  { tenseId: "present-perfect-continuous", vi: "Trời đã mưa suốt cả buổi sáng.", sampleAnswer: "It has been raining all morning." },
  { tenseId: "past-simple", vi: "Tôi đã gặp anh ấy ở bữa tiệc tuần trước.", sampleAnswer: "I met him at the party last week." },
  { tenseId: "past-simple", vi: "Họ đã không hoàn thành bài tập.", sampleAnswer: "They didn't finish the homework." },
  { tenseId: "past-continuous", vi: "Lúc 8 giờ tối qua, tôi đang nấu ăn.", sampleAnswer: "At 8pm last night, I was cooking." },
  { tenseId: "past-continuous", vi: "Trong khi tôi đang học thì điện thoại reo.", sampleAnswer: "While I was studying, the phone rang." },
  { tenseId: "past-perfect", vi: "Khi tôi đến, bộ phim đã bắt đầu rồi.", sampleAnswer: "When I arrived, the movie had already started." },
  { tenseId: "past-perfect", vi: "Cô ấy chưa từng thấy tuyết trước chuyến đi đó.", sampleAnswer: "She had never seen snow before that trip." },
  { tenseId: "past-perfect-continuous", vi: "Anh ấy mệt vì đã chạy bộ liên tục 1 tiếng.", sampleAnswer: "He was tired because he had been running for an hour." },
  { tenseId: "past-perfect-continuous", vi: "Họ đã đợi bao lâu trước khi xe buýt đến?", sampleAnswer: "How long had they been waiting before the bus arrived?" },
  { tenseId: "future-simple", vi: "Tôi nghĩ ngày mai trời sẽ mưa.", sampleAnswer: "I think it will rain tomorrow." },
  { tenseId: "future-simple", vi: "Bạn có đến dự đám cưới không?", sampleAnswer: "Will you come to the wedding?" },
  { tenseId: "future-continuous", vi: "Giờ này ngày mai, tôi sẽ đang bay đến Tokyo.", sampleAnswer: "At this time tomorrow, I will be flying to Tokyo." },
  { tenseId: "future-continuous", vi: "Tối nay bạn có dùng xe không?", sampleAnswer: "Will you be using the car tonight?" },
  { tenseId: "future-perfect", vi: "Đến năm sau, cô ấy sẽ hoàn thành xong bằng đại học.", sampleAnswer: "By next year, she will have finished her degree." },
  { tenseId: "future-perfect", vi: "Bạn sẽ hoàn thành báo cáo trước thứ Sáu chứ?", sampleAnswer: "Will you have finished the report by Friday?" },
  { tenseId: "future-perfect-continuous", vi: "Đến tháng 6, tôi sẽ làm việc ở đây được 5 năm.", sampleAnswer: "By June, I will have been working here for 5 years." },
  { tenseId: "future-perfect-continuous", vi: "Đến 6 giờ chiều, anh ấy sẽ học liên tục được 3 tiếng.", sampleAnswer: "By 6pm, he will have been studying for 3 hours." },
];
