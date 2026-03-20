const LIMIT_INTERVAL_HOURS = 12;
const MAX_PLAYS = 25;
const MAX_BET = 10000000;
const MIN_BET = 1000;

const WHEEL_SEGMENTS = [
  { label: "🏆 JACKPOT", multiplier: 25, probability: 0.015 },
  { label: "💎 DIAMOND", multiplier: 10, probability: 0.025 },
  { label: "🔥 MEGA WIN", multiplier: 7, probability: 0.04 },
  { label: "⭐ GOLD", multiplier: 5, probability: 0.06 },
  { label: "💰 SILVER", multiplier: 3, probability: 0.10 },
  { label: "🔔 BRONZE", multiplier: 2, probability: 0.15 },
  { label: "🍀 LUCKY", multiplier: 1.5, probability: 0.20 },
  { label: "➖ EVEN", multiplier: 1, probability: 0.15 },
  { label: "😢 HALF", multiplier: 0.5, probability: 0.10 },
  { label: "💸 LOSE", multiplier: 0, probability: 0.08 },
  { label: "⚡ BANKRUPT", multiplier: 0, probability: 0.07, fee: 0.15 }
];

module.exports = {
  config: {
    name: "wheel",
    aliases: ["spin"],
    version: "2.0",
    author: "Premium by ChatGPT",
    role: 0,
    countDown: 5,
    shortDescription: "🎡 Premium Wheel",
    longDescription: "Spin with style and win big",
    category: "game",
    guide: "{pn} <bet> | {pn} help | {pn} stats"
  },

  onStart: async function ({ message, event, args, usersData }) {
    const uid = event.senderID;
    const now = Date.now();

    const user = await usersData.get(uid);
    const data = user.data || {};

    const stats = data.wheelStats || {
      totalSpins: 0,
      totalWon: 0,
      totalWagered: 0,
      lastSpins: []
    };

    // ================= HELP =================
    if (!args[0] || args[0] === "help") {
      return message.reply(
`🎡 ━━━ PREMIUM WHEEL ━━━ 🎡

🎮 HOW TO PLAY
• wheel <bet>
• Example: wheel 5000

💎 WIN MULTIPLIERS
🏆 JACKPOT   → x25
💎 DIAMOND   → x10
🔥 MEGA WIN  → x7
⭐ GOLD      → x5
💰 SILVER    → x3
🔔 BRONZE    → x2
🍀 LUCKY     → x1.5
➖ EVEN      → x1
😢 HALF      → x0.5
💸 LOSE      → x0
⚡ BANKRUPT  → penalty

📊 LIMITS
• Min: 1,000
• Max: 10,000,000
• 25 spins / 12 hrs

⚠️ Higher bet = bigger risk 😈`
      );
    }

    // ================= STATS =================
    if (args[0] === "stats") {
      return message.reply(
`📊 YOUR STATS

🎡 Spins: ${stats.totalSpins}
💰 Won: ${stats.totalWon.toLocaleString()}
🎯 Wagered: ${stats.totalWagered.toLocaleString()}`
      );
    }

    // ================= BET =================
    const bet = parseInt(args[0]);
    if (!bet || bet < MIN_BET)
      return message.reply(`❌ Minimum bet is ${MIN_BET}`);

    if (bet > MAX_BET)
      return message.reply(`❌ Max bet is ${MAX_BET}`);

    if ((user.money || 0) < bet)
      return message.reply("❌ Not enough balance!");

    // ================= LIMIT =================
    const validSpins = stats.lastSpins.filter(t =>
      now - t < LIMIT_INTERVAL_HOURS * 3600 * 1000
    );

    if (validSpins.length >= MAX_PLAYS) {
      return message.reply("⏰ Spin limit reached. Try later.");
    }

    // ================= ANIMATION =================
    const spinMsg = await message.reply("🎡 Spinning...");

    const frames = [
      "🎡 ▰▱▱▱▱",
      "🎡 ▰▰▱▱▱",
      "🎡 ▰▰▰▱▱",
      "🎡 ▰▰▰▰▱",
      "🎡 ▰▰▰▰▰"
    ];

    for (let f of frames) {
      await new Promise(r => setTimeout(r, 300));
      await message.edit(f, spinMsg.messageID);
    }

    // ================= RESULT =================
    let rand = Math.random();
    let sum = 0;
    let result;

    for (const seg of WHEEL_SEGMENTS) {
      sum += seg.probability;
      if (rand <= sum) {
        result = seg;
        break;
      }
    }

    let winnings = Math.floor(bet * result.multiplier);

    if (result.label.includes("BANKRUPT")) {
      winnings = -Math.floor(bet * result.fee);
    }

    const finalMoney = Math.max(0, user.money - bet + winnings);

    validSpins.push(now);

    await usersData.set(uid, {
      money: finalMoney,
      data: {
        ...data,
        wheelStats: {
          totalSpins: stats.totalSpins + 1,
          totalWon: stats.totalWon + Math.max(0, winnings),
          totalWagered: stats.totalWagered + bet,
          lastSpins: validSpins.slice(-MAX_PLAYS)
        }
      }
    });

    // ================= FINAL UI =================
    const isBigWin = winnings >= bet * 5;
    const isLose = winnings <= 0;

    let style =
      isBigWin ? "🎉 HUGE WIN!" :
      isLose ? "💀 BAD LUCK..." :
      "✨ NICE!";

    await message.edit(
`🎡 ━━━ RESULT ━━━ 🎡

${style}

🎯 ${result.label}
💰 Bet: ${bet.toLocaleString()}
📈 Multiplier: x${result.multiplier}

━━━━━━━━━━━━━━
💵 ${winnings >= 0 ? "+" : ""}${winnings.toLocaleString()}
💰 Balance: ${finalMoney.toLocaleString()}
🎡 Spins left: ${MAX_PLAYS - validSpins.length}`,
      spinMsg.messageID
    );
  }
};
