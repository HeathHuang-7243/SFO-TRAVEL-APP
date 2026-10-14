import type { Language } from "./i18n";

export const heroMessages: { zh: [string, string]; en: [string, string] }[] = [
  {
    zh: ["认真赴会，", "也从容逛逛海湾。"],
    en: ["Meet new ideas.", "Explore the bay."],
  },
  {
    zh: ["带着好奇，", "走进会议与城市。"],
    en: ["Stay curious.", "Meet the city."],
  },
  {
    zh: ["会场有新知，", "街角也有新发现。"],
    en: ["Ideas at the event.", "Finds on the street."],
  },
  {
    zh: ["把工作做好，", "把风景慢慢看完。"],
    en: ["Do good work.", "Take in the view."],
  },
  {
    zh: ["日程安排好，", "也给散步留点空。"],
    en: ["Plan your day.", "Leave time to walk."],
  },
  {
    zh: ["从一场分享，", "走向一段新旅程。"],
    en: ["Share an idea.", "Start a new journey."],
  },
  {
    zh: ["灵感在会场，", "海风在下一条街。"],
    en: ["Find inspiration.", "Follow the sea breeze."],
  },
  {
    zh: ["见面聊想法，", "转身看看这座城。"],
    en: ["Exchange ideas.", "Discover the city."],
  },
  {
    zh: ["把收获记下，", "把沿途风景留下。"],
    en: ["Keep your notes.", "Keep the memories."],
  },
  {
    zh: ["忙碌有节奏，", "闲暇也有好去处。"],
    en: ["Find your rhythm.", "Make room to explore."],
  },
  {
    zh: ["走进新会场，", "也走进城市日常。"],
    en: ["Step into the event.", "Step into city life."],
  },
  {
    zh: ["今天有收获，", "路上也有小惊喜。"],
    en: ["Learn something new.", "Find a little joy."],
  },
  {
    zh: ["与同事同行，", "与这座城市相遇。"],
    en: ["Travel together.", "Meet San Francisco."],
  },
  {
    zh: ["把行程理顺，", "让每一天都从容。"],
    en: ["Set your plans.", "Enjoy each day."],
  },
  {
    zh: ["带回新想法，", "也带回一城回忆。"],
    en: ["Bring back ideas.", "Take home memories."],
  },
];

const greetings = [
  {
    from: 0,
    zh: ["夜深了，放慢脚步。", "夜深了，休息一下。", "今晚，给自己留点空。"],
    en: [
      "A quiet moment tonight.",
      "Time for a little rest.",
      "Take it easy tonight.",
    ],
  },
  {
    from: 5,
    zh: ["早上好，新的一天。", "早上好，从容出发。", "早上好，今天见。"],
    en: ["Good morning.", "A fresh start today.", "Ready for a new day?"],
  },
  {
    from: 11,
    zh: ["中午好，歇一会儿。", "中午好，给自己充电。", "午间好，慢慢来。"],
    en: ["Good afternoon.", "Time for a lunch break.", "Take a midday pause."],
  },
  {
    from: 14,
    zh: [
      "下午好，继续探索。",
      "下午好，留点时间走走。",
      "下午好，发现点新鲜。",
    ],
    en: [
      "Good afternoon.",
      "An afternoon to explore.",
      "Find something new today.",
    ],
  },
  {
    from: 18,
    zh: [
      "晚上好，慢下来吧。",
      "晚上好，今天辛苦了。",
      "晚上好，留点时间给自己。",
    ],
    en: ["Good evening.", "Time to unwind.", "Enjoy your evening."],
  },
  {
    from: 23,
    zh: ["夜深了，放慢脚步。", "夜深了，休息一下。", "今晚，给自己留点空。"],
    en: [
      "A quiet moment tonight.",
      "Time for a little rest.",
      "Take it easy tonight.",
    ],
  },
];

export function homeGreeting(
  now: Date | null,
  lang: Language,
  variant: number,
) {
  if (!now)
    return lang === "en" ? "Welcome to your trip." : "欢迎开启这段旅程。";
  const hour = now.getHours();
  const period = greetings.findLast((item) => hour >= item.from)!;
  return period[lang][variant % period[lang].length];
}

export function nextHeroIndex(current: number, random = Math.random()) {
  return (
    (current + 1 + Math.floor(random * (heroMessages.length - 1))) %
    heroMessages.length
  );
}
