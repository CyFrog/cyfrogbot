const Markup = require("telegraf/markup");
const { sessionInit } = require("../sessionInit");
const { transactionInit } = require("../transactionInit");
const { dbLock } = require("../dbLock/dbLock");
const { toggleLock } = require("../dbLock/toggleLock");

module.exports.textHandler = async bot => {
  bot.on("text", async ctx => {
    if (ctx.chat.type == "private") {
      privateChat(ctx);
    } else if (ctx.chat.type == "group" || "supergroup") {
      await groupChat(ctx);
    }
  });
};

// Default answer to unknown messages
const privateChat = ctx => {
  ctx.reply(
    `Hello ${ctx.from.first_name} this is CyFrog tip bot.\nSee /help for more info.`,
    Markup.keyboard([
      ["/balance", "/help"],
      ["/deposit", "/withdraw"]
    ])
      .oneTime()
      .resize()
      .extra()
  );
};

const groupChat = async ctx => {
  /// Listen for Tip Message from Group Chat
  // RegEx "[number] cy";
  // Example: "10 cy" , " 10cy" , "10 CyFrog";

  const re = /[0-9]+ *cyfrog/gi;
  const reComma = /(\d{0,3},)?(\d{3},)?\d{0,3} *cyfrog/i;
  const reDot = /\d*\.?\d* *cyfrog/gi;
  const reClown = /🐸/g;
  const reCircus = /🦎/g;

  if (ctx.message.reply_to_message) {
    let text = ctx.message.text;

    if (parseFloat(text.match(reDot)) || parseFloat(text.match(reComma))) {
      text = text.includes(".") ? text.match(reDot)[0] : text.match(reComma)[0];

      if (text.includes(".")) {
        // With dot "[number].[number] cyfrog"
//        ctx.replyWithMarkdown(
//          `*${ctx.from.first_name}* the lowest amount to give/send/tip is 1 CyFrog. Please check your amount and try again.`
//        );
        let amount = parseFloat(text.replace(/cyfrog/g, "");
      } else if (text.includes(",")) {
        // With comma "[number],[number] cyfrog"
        let amount = text.replace(/,/g, "");

        const tipResult = await tip(ctx, amount);
        ctx.replyWithMarkdown(tipResult);
      } else if (text.match(re)) {
        //"[number] cyfrog"
        let amount = ctx.message.text.match(re)[0].split(" ")[0];

        const tipResult = await tip(ctx, amount);
        ctx.replyWithMarkdown(tipResult);
      }
    } else if (text.match(reClown) || text.match(reCircus)) {
      // reClown && reCircus
      let amount = 0;
      if (text.match(reClown)) {
        const matchArray = text.match(reClown);
        amount += matchArray.length * 1;
      }

      if (text.match(reCircus)) {
        const matchArray = text.match(reCircus);
        amount += matchArray.length * 5;
      }

      const tipResult = await tip(ctx, amount);
      ctx.replyWithMarkdown(tipResult);
    }
  }
};

const tip = async (ctx, amount) => {
  amount = parseInt(amount);
  const fromUser = ctx.from;
  const toUser = ctx.message.reply_to_message.from;

  if (fromUser.id === toUser.id) return `*${fromUser.first_name}*  👏`;
  try {
    await dbLock(ctx, fromUser.id);
    if (fromUser.id !== toUser.id) await dbLock(ctx, toUser.id);
  } catch (err) {
    console.log("testHandler:: 🗝 dbLock error while trying make tip:", err);
    return `*${fromUser.first_name}* sorry, try later.`;
  }
  await sessionInit(ctx);

  // Tip to bot deprecated
  if (toUser.is_bot) {
    if (fromUser.id !== toUser.id) toggleLock(ctx, toUser.id);
    toggleLock(ctx, fromUser.id);
    return `*${fromUser.first_name}* you can't tip to bot`;
  }

  const transactionSuccess = await transactionInit(amount, ctx, toUser);

  if (fromUser.id !== toUser.id) toggleLock(ctx, toUser.id);
  toggleLock(ctx, fromUser.id);

  let msg = "";
  if (transactionSuccess) {
    msg += `*${fromUser.first_name}* tipped ${amount.toLocaleString(
      "en-US"
    )} 🐸*CyFrog*🐸 to *${toUser.first_name}*`;
  } else {
    console.log("Need more CyFrog");
    msg += `*${fromUser.first_name}* you need more 🐸*CyFrog*🐸`;
  }
  return msg;
};
