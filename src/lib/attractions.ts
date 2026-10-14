export type Attraction = {
  id: string;
  name: string;
  en: string;
  kind: string;
  kindEn: string;
  outdoor: boolean;
  important?: boolean;
  price: number | null;
  duration: string;
  durationEn: string;
  color: string;
  icon: string;
  address: string;
  map: string;
  source: string;
  ticket: string;
  priceNote: string;
  priceNoteEn: string;
  guide: string[];
  guideEn: string[];
  tip: string;
  tipEn: string;
  image?: string;
  imageCredit?: string;
  imageSource?: string;
};

// Prices and addresses checked against the linked official sources on 2026-10-11.
// Durations and walking sequences are suggested itineraries, not operator schedules.
export const attractions: Attraction[] = [
  {
    id: "bridge",
    name: "金门大桥",
    en: "Golden Gate Bridge",
    kind: "海湾地标",
    kindEn: "Bay landmark",
    outdoor: true,
    price: 0,
    duration: "1.5–2 小时",
    durationEn: "1.5–2 hours",
    color: "#da7958",
    icon: "bridge",
    address:
      "Golden Gate Bridge Welcome Center, Golden Gate Bridge Plaza, San Francisco, CA 94129",
    map: "Golden Gate Bridge Welcome Center, San Francisco",
    source:
      "https://presidio.gov/explore/attractions/golden-gate-bridge-welcome-center",
    ticket: "https://www.goldengate.org/bridge/visiting-the-bridge/",
    priceNote: "步行参观免费；交通另计",
    priceNoteEn: "Free to walk; transport costs extra.",
    guide: [
      "从南端 Welcome Center 开始，了解大桥结构与历史。",
      "沿东侧人行道走到南塔，按体力决定是否继续。",
      "返回 Battery East 看海湾全景。往返全桥约 5.6 公里。",
    ],
    guideEn: [
      "Start at the Welcome Center on the south side.",
      "Walk along the east sidewalk to the south tower, then choose how far to continue.",
      "Return via Battery East for bay views. A full bridge return walk is about 5.6 km.",
    ],
    tip: "步道有风。带防风外套；出发前核对开放时间与官方警报。",
    tipEn:
      "Bring a windproof jacket. Check sidewalk hours and official alerts before you go.",
    image: "/places/bridge.webp",
    imageCredit: "San Francisco Travel",
    imageSource:
      "https://www.sftravel.com/things-to-do/attractions/iconic-sf/golden-gate-bridge",
  },
  {
    id: "alcatraz",
    name: "恶魔岛",
    en: "Alcatraz Island",
    kind: "历史与海湾",
    kindEn: "History and bay views",
    outdoor: true,
    price: 47.95,
    duration: "3–4 小时",
    durationEn: "3–4 hours",
    color: "#7696a0",
    icon: "island",
    address:
      "Alcatraz Landing, Pier 33, The Embarcadero at Bay Street, San Francisco, CA 94133",
    map: "Alcatraz Landing Pier 33, San Francisco",
    source: "https://www.nps.gov/alca/planyourvisit/fees.htm",
    ticket:
      "https://www.cityexperiences.com/san-francisco/city-cruises/alcatraz/",
    priceNote: "成人日间参考价，含往返船票与监舍语音导览；以选定日期为准",
    priceNoteEn:
      "Adult day tour reference price, including ferry and cellhouse audio tour. Confirm your date before booking.",
    guide: [
      "复制的是 Pier 33 登船地址，不能打车直达岛上。",
      "按船票要求提前到场，乘官方渡轮上岛。",
      "查看开放区域后前往监舍，使用票内语音导览。",
      "按当天返程船班离岛，给下坡和候船留出时间。",
    ],
    guideEn: [
      "The copied address is Pier 33, your ferry departure point. Cars cannot reach the island.",
      "Arrive as directed on your ticket and take the official ferry.",
      "Check open areas, then use the included cellhouse audio tour.",
      "Allow time to walk downhill and queue for your return ferry.",
    ],
    tip: "需提前预约。风雨可能影响船班；参考天气不能代替航运公告。",
    tipEn:
      "Book ahead. Check ferry notices: a weather forecast does not confirm that boats will operate.",
    image: "/places/alcatraz.webp",
    imageCredit: "Kirke Wrench / NPS photo",
    imageSource: "https://www.nps.gov/alca/index.htm",
  },
  {
    id: "pier",
    name: "39 号码头",
    en: "PIER 39",
    kind: "海边散步",
    kindEn: "Waterfront walk",
    outdoor: true,
    price: 0,
    duration: "1–2 小时",
    durationEn: "1–2 hours",
    color: "#bd9d64",
    icon: "pier",
    address: "PIER 39, The Embarcadero & Beach Street, San Francisco, CA 94133",
    map: "PIER 39, San Francisco",
    source: "https://www.pier39.com/sealions/",
    ticket: "https://www.pier39.com/",
    priceNote: "公共区域与海狮观赏免费；商业项目另收费",
    priceNoteEn:
      "Public areas and sea lion viewing are free. Paid attractions cost extra.",
    guide: [
      "沿 Embarcadero 步行进入码头。",
      "先去西侧 K-Dock 观赏海狮，现场数量随季节变化。",
      "沿码头外围看海湾，之后返回餐饮与商店区。",
    ],
    guideEn: [
      "Enter from the Embarcadero.",
      "Visit K-Dock on the west side to see the sea lions. Numbers vary by season.",
      "Walk around the waterfront, then explore the shops and restaurants.",
    ],
    tip: "风大或下雨时缩短海边停留。不要喂食或接近海狮。",
    tipEn:
      "Keep waterfront stops short in wind or rain. Do not feed or approach sea lions.",
    image: "/places/pier.webp",
    imageCredit: "GetYourGuide",
    imageSource:
      "https://www.getyourguide.com/explorer/san-francisco-ttd61/first-time-in-san-francisco/",
  },
  {
    id: "sfmoma",
    name: "旧金山现代艺术博物馆",
    en: "SFMOMA",
    kind: "室内艺术",
    kindEn: "Modern art museum",
    outdoor: false,
    price: 30,
    duration: "2–3 小时",
    durationEn: "2–3 hours",
    color: "#86907d",
    icon: "museum",
    address: "SFMOMA, 151 Third Street, San Francisco, CA 94103",
    map: "SFMOMA, 151 Third Street, San Francisco",
    source: "https://www.sfmoma.org/visit/",
    ticket: "https://tickets.sfmoma.org/",
    priceNote: "成人普通票 $30；Moscone 参会者可持胸牌在售票处咨询 $4 优惠",
    priceNoteEn:
      "Adult general admission: $30. Moscone attendees can ask at the ticket desk about a $4 badge discount.",
    guide: [
      "从 Third Street 主入口进入，查看当天展览地图。",
      "按兴趣选择摄影、绘画或当代艺术展厅。",
      "给重点展览预留时间，再参观公共空间。",
    ],
    guideEn: [
      "Use the main Third Street entrance and check the exhibition map.",
      "Choose photography, painting or contemporary art galleries.",
      "Allow extra time for a featured exhibition and the public spaces.",
    ],
    tip: "通常周三闭馆。适合会场附近的雨天安排，出发前核对开放时间。",
    tipEn:
      "Usually closed on Wednesdays. A useful rainy-day option near Moscone; confirm opening hours.",
    image: "/places/sfmoma.webp",
    imageCredit: "Jon McNeal © Snøhetta / SFMOMA",
    imageSource: "https://www.sfmoma.org/visit/getting-here/",
  },
  {
    id: "explore",
    name: "探索馆",
    en: "Exploratorium",
    kind: "室内科学",
    kindEn: "Hands-on science",
    outdoor: false,
    price: 39.95,
    duration: "2–3 小时",
    durationEn: "2–3 hours",
    color: "#a88eae",
    icon: "science",
    address:
      "Exploratorium, Pier 15, The Embarcadero at Green Street, San Francisco, CA 94111",
    map: "Exploratorium Pier 15, San Francisco",
    source: "https://www.exploratorium.edu/visit",
    ticket: "https://www.exploratorium.edu/visit",
    priceNote: "18–64 岁成人日间参考价 $39.95；夜场与 Tactile Dome 另有票种",
    priceNoteEn:
      "Adult daytime reference price (18–64): $39.95. After Dark and the Tactile Dome use separate ticket options.",
    guide: [
      "从 Pier 15 主入口进入，领取展区地图。",
      "先体验光线、感知与互动实验展品。",
      "按兴趣继续参观；天气允许时去海湾露台。",
    ],
    guideEn: [
      "Enter at Pier 15 and pick up a museum map.",
      "Try light, perception and hands-on experiments.",
      "Continue through the galleries; visit the bay terrace if weather permits.",
    ],
    tip: "通常周一闭馆。周四夜场限 18 岁以上，请核对日期和票种。",
    tipEn:
      "Usually closed on Mondays. Thursday After Dark is for ages 18+; check your date and ticket type.",
    image: "/places/explore.webp",
    imageCredit: "Exploratorium",
    imageSource: "https://www.exploratorium.edu/support/explore-our-reach",
  },
  {
    id: "ferry",
    name: "渡轮大厦",
    en: "Ferry Building",
    kind: "美食与市场",
    kindEn: "Food and market",
    outdoor: false,
    price: 0,
    duration: "1–1.5 小时",
    durationEn: "1–1.5 hours",
    color: "#b7a37d",
    icon: "pier",
    address: "One Ferry Building, San Francisco, CA 94111",
    map: "One Ferry Building, San Francisco",
    source: "https://www.ferrybuildingmarketplace.com/visit/",
    ticket: "https://www.ferrybuildingmarketplace.com/visit/",
    priceNote: "公共市场免费进入；餐饮、购物与渡轮另付费",
    priceNoteEn: "Free market entry; food, shopping and ferries cost extra.",
    guide: [
      "从 Market Street 尽头进入大厦，先逛中央市场。",
      "挑选咖啡或小吃，再到海湾一侧散步。",
      "若遇农夫市场，可留出额外时间。",
    ],
    guideEn: [
      "Enter at the foot of Market Street and browse the central marketplace.",
      "Pick up coffee or a snack, then walk along the bay side.",
      "Allow more time if the farmers market is open.",
    ],
    tip: "各店营业时间不同；户外农夫市场通常在周二、周四和周六。",
    tipEn:
      "Shop hours vary. The outdoor farmers market usually runs on Tuesdays, Thursdays and Saturdays.",
    image: "/places/ferry.webp",
    imageCredit: "Ferry Building Marketplace",
    imageSource: "https://www.ferrybuildingmarketplace.com/",
  },
  {
    id: "palace",
    name: "艺术宫",
    en: "Palace of Fine Arts",
    kind: "建筑与湖景",
    kindEn: "Architecture and lagoon",
    outdoor: true,
    price: 0,
    duration: "45–90 分钟",
    durationEn: "45–90 minutes",
    color: "#c7a782",
    icon: "museum",
    address: "Palace of Fine Arts, 3601 Lyon Street, San Francisco, CA 94123",
    map: "Palace of Fine Arts, 3601 Lyon Street, San Francisco",
    source:
      "https://sfrecpark.org/Facilities/Facility/Details/Palace-of-Fine-Arts-423",
    ticket: "https://palaceoffinearts.com/info/",
    priceNote: "公园与建筑外观免费；剧院或场馆活动可能另收费",
    priceNoteEn:
      "The park and exterior are free. Theatre and venue events may require tickets.",
    guide: [
      "在 Lyon Street 一侧下车，步行至圆顶建筑。",
      "沿湖边步道慢行，寻找圆顶与水面倒影的视角。",
      "绕回柱廊，按时间决定是否继续去 Marina 海边。",
    ],
    guideEn: [
      "Arrive on Lyon Street and walk to the rotunda.",
      "Follow the lagoon path for views of the dome and its reflection.",
      "Return through the colonnade, with an optional walk toward the Marina waterfront.",
    ],
    tip: "主要为户外行程，雨天路面可能湿滑。请勿将其与 SFMOMA 混淆。",
    tipEn:
      "This is mainly an outdoor visit. Paths can be slippery in rain. This is a different site from SFMOMA.",
    image: "/places/palace.webp",
    imageCredit: "San Francisco Travel",
    imageSource:
      "https://www.sftravel.com/article/guide-to-san-franciscos-palace-fine-arts",
  },
  {
    id: "ggpark",
    name: "金门公园",
    en: "Golden Gate Park",
    kind: "公园与步道",
    kindEn: "Park and walking paths",
    outdoor: true,
    price: 0,
    duration: "2–4 小时",
    durationEn: "2–4 hours",
    color: "#78977e",
    icon: "island",
    address: "McLaren Lodge, 501 Stanyan Street, San Francisco, CA 94117",
    map: "McLaren Lodge, Golden Gate Park, 501 Stanyan Street",
    source: "https://sfrecpark.org/770/Golden-Gate-Park",
    ticket: "https://sfrecpark.org/770/Golden-Gate-Park",
    priceNote: "公园公共区域免费；园内博物馆、花园等另有门票",
    priceNoteEn:
      "Public park areas are free; museums and some gardens charge admission.",
    guide: [
      "复制地址是公园东侧 McLaren Lodge；园区很大，出发前选好区域。",
      "沿 JFK Promenade 选择适合体力的步行路段。",
      "按兴趣增加湖边散步或单独购票参观园内场馆。",
    ],
    guideEn: [
      "The copied address is McLaren Lodge near the east end. Choose an area before travelling.",
      "Select a manageable section of JFK Promenade.",
      "Add a lakeside walk or a separately ticketed museum or garden.",
    ],
    tip: "金门公园与金门大桥并不在同一个地方。避免安排一次走完整座公园。",
    tipEn:
      "Golden Gate Park is separate from the Golden Gate Bridge. Plan one area rather than the whole park.",
    image: "/places/ggpark.webp",
    imageCredit: "San Francisco Travel",
    imageSource:
      "https://www.sftravel.com/article/visitors-guide-to-golden-gate-park",
  },
  {
    id: "chinatown",
    name: "唐人街",
    en: "Chinatown",
    kind: "街区与美食",
    kindEn: "Neighborhood and food",
    outdoor: true,
    price: 0,
    duration: "1–2 小时",
    durationEn: "1–2 hours",
    color: "#b97458",
    icon: "museum",
    address: "Dragon Gate, Grant Avenue & Bush Street, San Francisco, CA 94108",
    map: "Dragon Gate, Grant Avenue and Bush Street, San Francisco",
    source: "https://www.sftravel.com/neighborhoods/visit-chinatown",
    ticket: "https://www.sftravel.com/neighborhoods/visit-chinatown",
    priceNote: "街区免费游览；餐饮、购物和付费导览另计",
    priceNoteEn:
      "Free to walk around; food, shopping and paid tours cost extra.",
    guide: [
      "从 Grant Avenue 与 Bush Street 的龙门开始。",
      "沿 Grant Avenue 看灯笼和建筑，再转入 Waverly Place。",
      "按兴趣逛 Stockton Street 市场或安排点心用餐。",
    ],
    guideEn: [
      "Start at Dragon Gate at Grant Avenue and Bush Street.",
      "Walk along Grant Avenue, then explore Waverly Place.",
      "Browse Stockton Street markets or stop for dim sum.",
    ],
    tip: "白天更适合逛市场和商店。街道有坡度，穿舒适的鞋。",
    tipEn:
      "Visit during the day for markets and shops. Wear comfortable shoes for the hills.",
    image: "/places/chinatown.webp",
    imageCredit: "San Francisco Travel",
    imageSource: "https://www.sftravel.com/neighborhoods/chinatown",
  },
  {
    id: "coit",
    name: "科伊特塔",
    en: "Coit Tower",
    kind: "观景与壁画",
    kindEn: "Views and murals",
    outdoor: true,
    price: null,
    duration: "1–1.5 小时",
    durationEn: "1–1.5 hours",
    color: "#9da88b",
    icon: "museum",
    address: "Coit Tower, 1 Telegraph Hill Boulevard, San Francisco, CA 94133",
    map: "Coit Tower, 1 Telegraph Hill Boulevard, San Francisco",
    source: "https://recpark.sf.gov/Facilities/Facility/Details/Coit-Tower-290",
    ticket: "https://recpark.sf.gov/Facilities/Facility/Details/Coit-Tower-290",
    priceNote: "周边公园免费；登塔电梯收费，请以现场或官方当日价格为准",
    priceNoteEn:
      "The surrounding park is free. The tower elevator requires a ticket; check the current official price.",
    guide: [
      "到 Telegraph Hill 山顶，从 Pioneer Park 欣赏城市景色。",
      "开放时参观塔底壁画。",
      "如登塔，先确认电梯开放和购票情况。",
    ],
    guideEn: [
      "Start in Pioneer Park on Telegraph Hill for city views.",
      "See the murals in the tower base when open.",
      "If you want the observation deck, check elevator access and tickets first.",
    ],
    tip: "步行上山有陡坡和台阶。天气差时，远景能见度可能较低。",
    tipEn:
      "Walking routes can include steep slopes and stairs. Poor weather can reduce visibility.",
    image: "/places/coit.webp",
    imageCredit: "San Francisco Travel",
    imageSource:
      "https://www.sftravel.com/things-to-do/attractions/iconic-sf/coit-tower",
  },
  {
    id: "salesforce",
    name: "Salesforce 空中花园",
    en: "Salesforce Park",
    kind: "城市绿地",
    kindEn: "Rooftop public park",
    outdoor: true,
    price: 0,
    duration: "45–90 分钟",
    durationEn: "45–90 minutes",
    color: "#819d86",
    icon: "island",
    address:
      "Salesforce Transit Center, 425 Mission Street, San Francisco, CA 94105",
    map: "Salesforce Park, 425 Mission Street, San Francisco",
    source: "https://www.tjpa.org/salesforce-transit-center/salesforce-park",
    ticket: "https://www.tjpa.org/salesforce-transit-center/salesforce-park",
    priceNote: "公共屋顶公园免费；餐饮与个别活动另计",
    priceNoteEn: "Free public rooftop park; food and some events cost extra.",
    guide: [
      "从 Transit Center 的电梯或扶梯前往屋顶公园。",
      "沿环形步道看不同植物区与喷泉。",
      "在草坪或座椅区休息，再返回地面。",
    ],
    guideEn: [
      "Take an elevator or escalator from the Transit Center to the park.",
      "Follow the loop past the planted areas and fountains.",
      "Pause by the lawn or seating areas before returning to street level.",
    ],
    tip: "11 月至 4 月通常 20:00 关闭；开放时间可能调整。",
    tipEn:
      "Usually closes at 8 p.m. from November through April. Check for schedule changes.",
    image: "/places/salesforce.webp",
    imageCredit: "Transbay Joint Powers Authority",
    imageSource:
      "https://www.tjpa.org/salesforce-transit-center/salesforce-park",
  },
  {
    id: "ghirardelli",
    name: "吉拉德利广场",
    en: "Ghirardelli Square",
    kind: "巧克力与海湾",
    kindEn: "Chocolate and bay views",
    outdoor: true,
    price: 0,
    duration: "45–90 分钟",
    durationEn: "45–90 minutes",
    color: "#9d806b",
    icon: "pier",
    address:
      "Ghirardelli Square, 900 North Point Street, San Francisco, CA 94109",
    map: "Ghirardelli Square, 900 North Point Street, San Francisco",
    source: "https://www.ghirardellisq.com/visit",
    ticket: "https://www.ghirardellisq.com/visit",
    priceNote: "广场免费进入；餐饮、购物与停车另计",
    priceNoteEn:
      "Free entry to the square; food, shopping and parking cost extra.",
    guide: [
      "从 North Point Street 或海湾方向进入广场。",
      "在历史建筑间散步，按兴趣购买巧克力或冰淇淋。",
      "天气好时可继续走到 Aquatic Park 海边。",
    ],
    guideEn: [
      "Enter from North Point Street or the waterfront side.",
      "Explore the historic buildings and stop for chocolate or ice cream.",
      "Continue to the Aquatic Park waterfront if the weather is good.",
    ],
    tip: "适合与渔人码头安排在同一段行程。各商户营业时间不同。",
    tipEn: "Combine this with Fisherman's Wharf. Individual shop hours vary.",
    image: "/places/ghirardelli.webp",
    imageCredit: "Ghirardelli Square",
    imageSource: "https://www.ghirardellisq.com/visit",
  },
  {
    id: "hyatt",
    name: "Hyatt Centric 渔人码头酒店",
    en: "Hyatt Centric Fisherman's Wharf",
    kind: "重要 · 酒店",
    kindEn: "Essential · Hotel",
    outdoor: false,
    important: true,
    price: null,
    duration: "按住宿安排",
    durationEn: "As booked",
    color: "#849d91",
    icon: "museum",
    address:
      "Hyatt Centric Fisherman’s Wharf, 555 North Point Street, San Francisco, CA 94133",
    map: "Hyatt Centric Fishermans Wharf, 555 North Point Street, San Francisco",
    source:
      "https://www.hyatt.com/hyatt-centric/en-US/sfofw-hyatt-centric-fishermans-wharf/hotel-info",
    ticket:
      "https://www.hyatt.com/hyatt-centric/en-US/sfofw-hyatt-centric-fishermans-wharf",
    priceNote: "酒店不是售票景点；房价和费用以你的预订为准",
    priceNoteEn:
      "Hotel, not a ticketed attraction. Room charges and fees follow your reservation.",
    guide: [
      "复制地址到打车软件，确认是 North Point Street 的 Hyatt Centric。",
      "抵达后前往前台办理入住或咨询行李寄存。",
      "出发前往会场时，按实时交通安排出门时间。",
    ],
    guideEn: [
      "Copy the address into your ride app and confirm the Hyatt Centric on North Point Street.",
      "Ask reception about check-in or luggage storage.",
      "Check current travel times before leaving for the conference.",
    ],
    tip: "旧金山有多家 Hyatt。打车时核对完整酒店名称与门牌号。",
    tipEn:
      "San Francisco has several Hyatt hotels. Confirm the full name and street number.",
    image: "/places/hyatt.webp",
    imageCredit: "aRes Travel / Expedia",
    imageSource: "https://arestravel.com/hotel/single/77/3395",
  },
  {
    id: "moscone",
    name: "Moscone Center 会议中心",
    en: "Moscone Center",
    kind: "重要 · 会议",
    kindEn: "Essential · Conference",
    outdoor: false,
    important: true,
    price: null,
    duration: "按会议日程",
    durationEn: "Follow your agenda",
    color: "#82969e",
    icon: "museum",
    address: "Moscone Center, 747 Howard Street, San Francisco, CA 94103",
    map: "Moscone Center, 747 Howard Street, San Francisco",
    source: "https://www.moscone.com/directions-and-parking-moscone-center",
    ticket: "https://ignite.microsoft.com/",
    priceNote: "按会议注册与胸牌规则入场；不适用普通景点门票",
    priceNoteEn:
      "Access follows event registration and badge rules; there is no standard sightseeing ticket.",
    guide: [
      "先查看 Ignite 的报到与入口通知。",
      "此地址是 Howard Street 的 Moscone Center；West 馆为 800 Howard Street。",
      "按会议地图找到 North、South 或 West 馆，再查具体会议室。",
    ],
    guideEn: [
      "Check Ignite registration and entrance instructions first.",
      "This address points to Moscone Center on Howard Street. Moscone West is at 800 Howard Street.",
      "Use the event map to choose North, South or West, then find your room.",
    ],
    tip: "会议可能使用不同楼馆；不要仅按总地址判断具体入口。",
    tipEn:
      "Sessions may use different buildings. Check your specific entrance rather than relying only on the main address.",
    image: "/places/moscone.webp",
    imageCredit: "Moscone Center",
    imageSource:
      "https://www.moscone.com/directions-and-parking-moscone-center",
  },
  {
    id: "sfo",
    name: "SFO 旧金山国际机场",
    en: "San Francisco International Airport (SFO)",
    kind: "重要 · 机场",
    kindEn: "Essential · Airport",
    outdoor: false,
    important: true,
    price: null,
    duration: "按航班安排",
    durationEn: "Follow your flight schedule",
    color: "#8ca6b1",
    icon: "science",
    address:
      "San Francisco International Airport (SFO), San Francisco, CA 94128",
    map: "San Francisco International Airport SFO",
    source: "https://www.flysfo.com/passengers/ground-transportation",
    ticket: "https://www.flysfo.com/maps/static-maps",
    priceNote: "机场不是售票景点；机票、交通和停车另计",
    priceNoteEn:
      "Airport, not a ticketed attraction. Flights, transport and parking are separate.",
    guide: [
      "复制机场地址后，在打车软件中选择航空公司对应的航站楼。",
      "出发前确认航班状态、值机柜台与航站楼。",
      "到达后按现场标识前往指定打车上客区、BART 或 AirTrain。",
    ],
    guideEn: [
      "After entering SFO in your ride app, choose the terminal for your airline.",
      "Check flight status, check-in location and terminal before departure.",
      "On arrival, follow signs to the assigned rideshare pickup area, BART or AirTrain.",
    ],
    tip: "上客区随航站楼和车型而异；请以打车软件与机场现场指示为准。",
    tipEn:
      "Pickup areas depend on the terminal and ride type. Follow your ride app and airport signs.",
    image: "/places/sfo.webp",
    imageCredit: "San Francisco International Airport",
    imageSource: "https://www.flysfo.com/",
  },
];
