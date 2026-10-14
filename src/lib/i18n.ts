export type Language = "zh" | "en";
const dictionary: Record<string, string> = Object.fromEntries(
  `
晴朗|Clear
多云|Cloudy
有雾|Fog
降雨|Rain
降雪|Snow
阵雨|Showers
雷暴|Thunderstorms
请求未成功，请重试|Request failed. Please try again.
餐饮|Food
交通|Transport
住宿|Lodging
门票|Tickets
购物|Shopping
其他|Other
全部主题|All topics
全部形式|All formats
手动参考价|Manual reference rate
卖出|Sell
买入|Buy
· 历史快照|· Saved snapshot
暂无该日预报|No forecast for this date
室内行程可考虑|Suitable for an indoor visit
雷暴预报，建议改期|Thunderstorms forecast. Consider another day.
风较大，建议室内|Strong winds. Consider an indoor visit.
降雨概率高，建议室内|Rain likely. Consider an indoor visit.
天气较适合户外|Weather looks suitable for an outdoor visit
请点击右上角“登录”，再保存个人账目。|Sign in at the top right to save your expenses.
账目已保存|Expense saved
请选择照片|Please choose a photo
原始照片请小于 25 MB|Choose a photo smaller than 25 MB
无法读取此照片，请选择 JPG 或 PNG|Cannot read this photo. Choose a JPG or PNG.
照片处理失败|Could not process the photo
删除这笔账目及其照片？|Delete this expense and its photo?
账目已删除|Expense deleted
请先登录，再收藏会议。|Sign in to save sessions.
日期|Date
分类|Category
描述|Description
币种|Currency
原金额|Original amount
小费百分比|Tip percentage
含小费总额|Total including tip
人民币参考金额|Estimated CNY amount
汇率来源|Rate source
出差概览|Overview
汇率与小费|Currency & tips
旅行账本|Expenses
天气与探索|Location
Ignite 会议|Ignite sessions
刷新|Refresh
每一笔，心中有数|Know what you spend.
招商银行牌价|China Merchants Bank rates
当前为历史快照，请刷新后核对。|Showing a saved snapshot. Refresh and check the rate.
消费金额（小费前）|Amount before tip
消费金额|Amount
小费比例|Tip percentage
含小费合计|Total with tip
小费|Tip
人民币|Chinese yuan
欧元|Euro
美元|US dollar
等待汇率|Waiting for rates
参考牌价|Reference rate
现汇卖出价 · 购汇预算参考|Bank sell rate · Buying foreign currency
现汇买入价 · 结汇估值参考|Bank buy rate · Selling foreign currency
手动输入参考汇率|Enter a reference rate
使用你输入的汇率。|Using your entered rate.
正在读取招行牌价…|Loading CMB rates…
同一牌价经人民币交叉换算，仅作估值；实际换汇有买卖价差，银行卡结算价可能不同。小费按输入金额计算。|Cross-rates use CNY as the base. These are estimates; bank spreads and card settlement rates can differ. Tips use the amount entered.
请输入有效金额，小费需在 0–100% 之间。|Enter a valid amount and a tip between 0 and 100%.
将这笔消费记入账本|Save this expense
取消收藏|Remove saved session
收藏会议|Save session
已有部分时间|Some times available
日期时间待公布|Schedule to be announced
查看详情|View details
湾区随行|Bay Companion
个人出差空间|Your travel space
从会议现场，到海湾日落。|From the conference to the bay.
让旅途少一点忙乱。|Make room for the journey.
访客|Guest
个人数据按账户隔离|Personal data is account-specific
登录后使用账本与收藏|Sign in for expenses and saved sessions
我的出差空间|My travel space
旧金山|San Francisco
上海|Shanghai
柏林|Berlin
退出登录|Sign out
登录|Sign in
你好，旧金山。|Hello, San Francisco.
让每一笔，都有记录。|Keep every expense in view.
工作之外，探索海湾。|Explore beyond the conference.
把下一次灵感，排进行程。|Plan your next inspiration.
会议、城市与日常开销，都在这里。|Your sessions, city plans and daily expenses.
三种货币，自由换算；从小费计算到一键记账。|Convert three currencies, calculate tips and save expenses.
保存消费、照片与备注，随时回看出差开销。|Save expenses, photos and notes for your trip.
先看天气，再挑选适合当天的目的地。|Check the weather and choose where to go.
来自 Microsoft Ignite 官方目录的真实会议内容。|Sessions from the official Microsoft Ignite catalogue.
记一笔|Add expense
好好工作，|Work well.
也好好看看世界。|See the world, too.
你的旧金山出差随行手册|Your San Francisco travel companion
探索这座城市|Explore the city
金门大桥插画|Golden Gate Bridge illustration
累计开销 · 人民币参考|Total expenses · CNY estimate
累计开销 · 欧元参考|Total expenses · EUR estimate
笔记录|records
旧金山最近天气（缓存）|Recent SF weather (cached)
旧金山当前天气|San Francisco weather
等待更新|Awaiting update
当地|Local time
实时天气加载中|Loading weather
我的 Ignite 收藏|My saved Ignite sessions
场会议|sessions
为感兴趣的内容留个位置|Keep the sessions that matter to you
官方会议目录|Official session catalogue
面向下一次突破。|Make space for what is next.
探索 Cloud & AI、Copilot 与 Security，|Explore Cloud & AI, Copilot and Security.
收藏你感兴趣的 session。|Save sessions that interest you.
浏览|Browse
全部|All
最近的开销|Recent expenses
旅程从第一笔开始|Start with your first expense
一张照片、一句备注，轻松留下消费记录。|Add a photo and a note to remember your purchase.
添加第一笔|Add your first expense
为你保留每个细节|Keep the details together
账目与照片保存到私人空间，可在登录后跨设备查看。|Sign in to access your own expenses and photos across devices.
看清汇率，再算预算。|Check rates. Plan your budget.
招行原牌价以每 100 单位外币列示。这里已换算为每 1 单位外币，方便估算。|CMB publishes rates per 100 units. Values here are converted to CNY per 1 unit of foreign currency.
现汇买入|Bank buys
现汇卖出|Bank sells
购汇预算|Buying foreign currency
用人民币购买外币，参考银行卖出价。|Use the bank sell rate when buying foreign currency with CNY.
结汇估值|Selling foreign currency
把外币卖给银行，参考银行买入价。|Use the bank buy rate when selling foreign currency for CNY.
记账时保留快照|Save the rate used
保存当时的牌价说明与人民币参考金额。之后汇率变化不会改写旧账。|Each expense keeps its rate note and CNY estimate. Later rate changes do not change saved expenses.
查看招商银行官方牌价|View official CMB rates
数据刷新间隔至少 5 分钟。此处不是交易报价或报销结算凭证。|Rates are cached for 5 minutes. Use Refresh for a new request. These are reference rates, not transaction quotes or reimbursement documents.
账目和照片需要登录后查看，其他访客无法读取你的记录。|Sign in to see your expenses and photos. Other visitors cannot read your records.
使用 ChatGPT 登录 →|Sign in with ChatGPT →
累计人民币参考金额|Total estimated CNY amount
笔开销|expenses
原币合计|original-currency total
搜索描述、分类或日期|Search description, category or date
导出 CSV|Export CSV
没有匹配的记录|No matching expenses
账本还是空白的|No expenses yet
记录消费金额、小费、照片和描述。|Record the amount, tip, photo and description.
新增消费|Add expense
的凭证照片| receipt photo
· 小费|· Tip
未记录汇率|No rate recorded
删除账目|Delete expense
天预报|day forecast
等待天气|Waiting for weather
正在获取|Loading
获取失败|Could not load
请选择日期|Choose a date
正在获取最新天气数据…|Loading the latest weather…
天气数据暂未取得，请点击刷新重试。|Weather is unavailable. Select Refresh to try again.
该日期不在可用预报范围内，请选择预报中的日期。|Choose a date within the available forecast.
计划出行日期 · 旧金山时间|Visit date · San Francisco time
旧金山当地日期 · 从今天起|San Francisco dates · Starting today
预报天数|Forecast range
今天|Today
明天|Tomorrow
后天|In 2 days
% 降雨|% rain
可切换今天起的 3 天或 15 天预报。较远日期的不确定性更高，出行前请再次核对。天气成功获取后缓存 15 分钟。更新：|Choose a 3-day or 15-day forecast. Longer-range forecasts are less certain. Check again before your visit. Weather is cached for 15 minutes. Updated:
（北京时间）。建议基于全市天气：降雨概率 ≥50%、风速 ≥35 km/h 或雷暴时优先室内；不代表景点营业或航船状态。|(Shanghai time). Advice uses city weather: choose indoor options if rain probability is ≥50%, wind is ≥35 km/h or thunderstorms are forecast. Check venue and ferry notices separately.
选一个目的地，出发吧。|Find your next stop.
户外|Outdoors
室内|Indoors
重要|Important
免费|Free
成人参考价|Adult reference price
公共参观|Public access
门票与游览导览|Tickets & visit guide
票价核实于 2026-10-11。建议停留时长与路线为本站建议；票价、开放时间与临时关闭以景点官网为准。|Information checked on 11 Oct 2026. Durations and routes are suggestions. Confirm prices, hours and closures on official websites.
场内容，找到你的方向。|sessions to explore.
已合并重复场次。同一 session 的多个房间或场次可在详情中查看。|Duplicate sessions are grouped. Open a session to see its available instances and rooms.
官方目录|Official catalogue
日期时间只在官方提供完整日期与时区时显示。无日期的时间段、测试房间不会被当作正式安排。收藏仅保存在本站，不代表官方预订。|Schedules appear only when official dates and time zones are available. Undated time slots and test rooms are excluded. Saving a session here does not reserve a place.
当前为保存的官方目录快照。|Showing a saved official catalogue snapshot.
收藏读取失败：|Could not load saved sessions:
搜索英文标题、讲者、关键词或编号|Search titles, speakers, keywords or codes
会议主题|Session topic
会议形式|Session format
我的收藏|My saved sessions
只看收藏|Saved only
场结果|results
更新|Updated
（北京时间） · 缓存 30 分钟|(Shanghai time) · Cached for 30 minutes
正在获取会议内容|Loading sessions
没有匹配的会议|No matching sessions
试试 Azure、Security、Copilot 或清除筛选。|Try Azure, Security or Copilot, or clear the filters.
清除筛选|Clear filters
上一页|Previous
下一页|Next
记录消费|Record expense
记一笔消费|Add an expense
关闭|Close
金额|Amount
小费 %|Tip %
消费日期（设备当地）|Expense date (device time)
例如：Fisherman’s Wharf 晚餐，与同事用餐|Example: Dinner with colleagues at Fisherman's Wharf
待保存的消费照片|Receipt photo to save
移除照片|Remove photo
留下一张消费凭证|Add a receipt photo
照片可选，支持拍照或从相册选择。|Optional: take a photo or choose one from your library.
拍照|Camera
相册|Photo library
未记录汇率，可先保存原币账目|No rate available. You can save the original currency amount.
正在保存…|Saving…
保存账目|Save expense
门票参考|Admission reference
建议游览|Suggested duration
建议游览路线|Suggested visit
官方门票 / 开放信息|Official tickets / opening information
地图导航|Directions
核对信息来源|Information source
核实日期：2026-10-11。先核对所选日期的营业与票务，再购票。|Checked on 11 Oct 2026. Confirm opening hours and tickets for your visit date before booking.
会议详情|Session details
会议内容 · 官方英文简介|Session content · Official description
官方暂未提供简介。|No official description yet.
讲者|Speakers
待公布|To be announced
技术深度|Technical level
未标注|Not specified
参与方式|Delivery
场次安排|Session instances
场次|Instance
（旧金山）|(San Francisco)
日期 / 时间待公布|Date / time to be announced
（北京时间）|(Shanghai time)
正式房间待公布|Room to be announced
已收藏 · 点击取消|Saved · Remove
收藏这场会议|Save this session
打开官方详情|Open official details
本站收藏不代表官方预约。无完整日期的原始时间段不用于日程计算。|Saving here does not reserve an official place. Undated time slots are not used to build a schedule.
关闭提示|Dismiss
地址|Address
复制地址|Copy address
地址已复制|Address copied
无法自动复制，请长按选择地址。|Could not copy automatically. Select the address to copy it.
按官网报价|Check official price
按所选服务计费|Depends on selected service
图片来源|Photo credit
天气源返回的预报数据不完整。|The weather service returned incomplete forecast data.
天气源返回的预报格式不完整。|The weather service returned an incomplete response.
天气源返回的日期已过期，请稍后重试。|The forecast date has expired. Please try again later.
天气源暂时限流，显示最近保存的数据。请留意更新时间。|The weather service is rate-limited. Showing saved data; check the update time.
天气源暂时限流，请约 15 分钟后重试。|The weather service is rate-limited. Try again in about 15 minutes.
天气更新失败，显示最近保存的数据。请留意更新时间。|Weather update failed. Showing saved data; check the update time.
无法连接天气源，请检查网络后点击刷新。|Cannot connect to the weather service. Check your network and refresh.
请登录后读取账目|Sign in to read your expenses.
请登录后保存账目|Sign in to save expenses.
请登录|Please sign in.
未找到记录|Record not found.
请检查金额、日期、小费和描述|Check the amount, date, tip and description.
照片必须为 JPG、PNG 或 WebP，且不超过 10 MB|Use a JPG, PNG or WebP photo up to 10 MB.
照片格式与文件内容不一致|The photo content does not match its format.
保存失败|Could not save.
无效 session|Invalid session.
汇总币种|Display currency
累计欧元参考金额|Total estimated EUR amount
按每笔保存的汇率汇总|Using each expense’s saved rates
笔旧记录缺少历史汇率，未计入当前币种汇总。|older records lack historical rates and are excluded from this total.
缺少历史汇率|Historical rate unavailable
旧记录未保存完整汇率快照|Legacy record: full rate snapshot unavailable
请先获取或手动填写 USD→CNY 和 USD→EUR 汇率|Load or enter both USD → CNY and USD → EUR rates first.
保存后汇率与换算金额固定，不随刷新变化。|Rates and converted amounts are fixed when saved. Refreshing does not change old records.
欧元参考金额|Estimated EUR amount
汇率保存时间|Rate snapshot saved at
刷新参考汇率|Refresh reference rates
最近更新|Last checked
刷新未成功，当前为历史快照。请核对招行牌价或输入手动汇率。|Refresh failed. Showing a saved snapshot. Check CMB rates or enter a manual rate.
已有时间段 · 日期待定|Time slot available · Date pending
日期及所属时区待定|Date and time zone pending
同一会议的多个场次可在详情中查看。|Open details to view each instance.
已公布的时间段和会场会显示在详情中；日期或时区待定时，不换算为当地时间。测试房间不显示，收藏不代表官方预订。|Published time slots and venues appear in details. Times are not converted until the date and time zone are confirmed. Test rooms are hidden; bookmarks are not official reservations.
（北京时间） · 自动缓存 30 分钟，点击刷新获取最新数据|(Shanghai time) · Cached for 30 minutes; refresh to fetch the latest data
`
    .trim()
    .split("\n")
    .map((line) => {
      const i = line.indexOf("|");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
export function translate(
  text: string | undefined | null,
  lang: Language,
): string {
  if (text == null) return "";
  if (lang === "zh") return text;
  if (text === "账目与照片仅保存在本机，请定期导出加密备份。")
    return "Expenses and receipts stay on this device. Export an encrypted backup regularly.";
  if (text === "更新失败，显示已保存的数据；请留意更新时间。")
    return "Update failed. Showing saved data; check the update time.";
  const trimmed = text.trim();
  if (dictionary[trimmed]) return text.replace(trimmed, dictionary[trimmed]);
  if (/^天气源暂不可用/.test(text))
    return "Weather is unavailable. Please try again later.";
  return text
    .replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/g, "$1-$2-$3")
    .replace(/（北京时间）/g, " (Shanghai time)")
    .replace(/招商银行现汇卖出价/g, "CMB bank sell rate")
    .replace(/招商银行现汇买入价/g, "CMB bank buy rate")
    .replace(/历史快照/g, "saved snapshot")
    .replace(/手动参考价/g, "Manual reference rate");
}
