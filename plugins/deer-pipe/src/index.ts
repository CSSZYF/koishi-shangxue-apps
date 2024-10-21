import { Context, Schema, h, Tables } from 'koishi';
import { } from 'koishi-plugin-puppeteer';
import { } from 'koishi-plugin-monetary'
export const name = 'deer-pipe';

export interface Config {
  enable_use_key_to_help: boolean;
  cost: any;
  maximum_times_per_day: any;
  enable_blue_tip: any;
  enable_allchannel: any;
  enable_deerpipe: boolean;
  leaderboard_people_number: number;
  loggerinfo: boolean;
}

export const usage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Deer Pipe 插件使用指南</title>
</head>
<body>

<h1>Deer Pipe 插件使用指南</h1>

<h3>签到</h3>
<ul>
<li><strong>指令</strong>: <code>🦌 [艾特用户]</code> 或 <code>鹿管 [艾特用户]</code></li>
<li><strong>作用</strong>: 签到当天，可重复签到，默认上限五次。</li>
<li><strong>示例</strong>: <code>🦌</code>（自己签到） / <code>🦌 @猫猫</code>（帮他鹿）</li>
</ul>


<h3>允许/禁止被鹿</h3>
<ul>
<li><strong>指令</strong>: <code>戴锁</code> 或 <code>脱锁</code></li>
<li><strong>作用</strong>: 允许/禁止别人帮你鹿</li>
<li><strong>示例</strong>: <code>戴锁</code> / <code>脱锁</code></li>
</ul>

<h3>查看签到日历</h3>
<ul>
<li><strong>指令</strong>: <code>看看日历 [艾特用户]</code> 或 <code>查看日历 [艾特用户]</code></li>
<li><strong>作用</strong>: 查看自己或指定用户的签到日历。</li>
<li><strong>示例</strong>: <code>看看日历</code>（查看自己的日历） / <code>看看日历 @猫猫</code>（查看猫猫的日历）</li>
</ul>

<h3>查看排行榜</h3>
<ul>
<li><strong>指令</strong>: <code>鹿管排行榜</code> 或 <code>🦌榜</code></li>
<li><strong>作用</strong>: 查看谁签到最多。</li>
<li><strong>示例</strong>: <code>鹿管排行榜</code></li>
</ul>

<h3>补签</h3>
<ul>
<li><strong>指令</strong>: <code>补🦌 [日期]</code></li>
<li><strong>作用</strong>: 补签到指定日期。例如补签当月的15号。</li>
<li><strong>示例</strong>: <code>补🦌 15</code></li>
</ul>

<h3>取消签到</h3>
<ul>
<li><strong>指令</strong>: <code>戒🦌 [日期]</code></li>
<li><strong>作用</strong>: 取消某天的签到。例如取消签到当月的10号。</li>
<li><strong>示例</strong>: <code>戒🦌 10</code> （若省略<code>10</code>，会取消签到今天的）</li>
</ul>

---

本插件理想的艾特元素内容是<code>< at id="114514" name="这是名字"/></code>

如果你的适配器的艾特元素是<code>< at id="114514"/></code> 那么排行榜功能就会出现用户ID的内容。

这个时候只需要让用户自己签到一次即可恢复，并且在不同的群签到，会存为对应的用户名称。

---

不支持QQ官方机器人是因为无法收到<code>< at id="ABCDEFG"/></code> 的消息元素
</body>
</html>
`;

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    enable_deerpipe: Schema.boolean().description('开启后，允许重复签到<br>关闭后就没有重复签到的玩法').default(true),
    maximum_times_per_day: Schema.number().description('每日签到次数上限`小鹿怡..什么伤身来着`').default(5).min(2),
    enable_blue_tip: Schema.boolean().description('开启后，签到后会返回补签玩法提示').default(false),
    enable_use_key_to_help: Schema.boolean().description('开启后，允许使用【钥匙】强制开锁').default(false),
  }).description('签到设置'),
  Schema.object({
    leaderboard_people_number: Schema.number().description('签到次数·排行榜显示人数').default(15).min(3),
    enable_allchannel: Schema.boolean().description('开启后，排行榜将展示全部用户排名`关闭则仅展示当前频道的用户排名`').default(false),
  }).description('签到次数·排行榜设置'),
  Schema.object({
    currency: Schema.string().default('deerpipe').disabled().description('monetary 的 currency 字段'),
    cost: Schema.object({

      checkin_reward: Schema.array(Schema.object({
        command: Schema.union(['戴锁', '鹿', '补鹿', '戒鹿', '帮鹿']).description("交互指令"),
        cost: Schema.number().description("货币变动"),
      })).role('table').description('【获取硬币】本插件指令的货币变动').default([{ "command": "鹿", "cost": 100 }, { "command": "帮鹿", "cost": 200 }, { "command": "戴锁", "cost": 0 }, { "command": "补鹿", "cost": -100 }, { "command": "戒鹿", "cost": -100 }]),

      store_item: Schema.array(Schema.object({
        item: Schema.string().description("物品名称"),
        cost: Schema.number().description("货币变动"),
      })).role('table').default([{ "item": "锁", "cost": -50 }, { "item": "钥匙", "cost": -500 }]).description('【购买】商店道具货价表'),

    }).collapse().description('货币平衡设置<br>涉及游戏平衡，谨慎修改'),
  }).description('monetary·通用货币设置'),
  Schema.object({
    loggerinfo: Schema.boolean().description('debug日志输出模式').default(false),
  }).description('调试设置'),
]);
interface DeerPipeTable {
  userid: string;
  username: string;
  channelId: string;
  recordtime: string;
  checkindate: string[];
  totaltimes: number;
  //resigntimes: number;
  allowHelp: boolean;
  itemInventory: string[];
}

declare module 'koishi' {
  interface Tables {
    deerpipe: DeerPipeTable;
  }
}

export const inject = ['database', 'puppeteer', 'monetary'];

export function apply(ctx: Context, config: Config) {
  ctx.model.extend('deerpipe', {
    userid: 'string', // 用户ID
    username: 'string', // 名字。用于排行榜
    channelId: 'string', // 频道ID，用于排行榜
    recordtime: 'string', // 最新签到的年月，用于记录更新
    allowHelp: 'boolean', // 是否允许被别人帮助签到，默认为 true
    checkindate: 'list', // 当前月份的签到的日期号
    // resigntimes: 'integer', // 剩余的补签次数，限制用户补签  // 不需要了，改为使用点数。
    totaltimes: 'integer', // 鹿管签到总次数。用于排行榜
    itemInventory: 'list',    // 道具清单，记录该玩家拥有的道具
  }, {
    primary: ['userid'],
  });

  const zh_CN_default = {
    commands: {
      "戴锁": {
        description: "允许/禁止别人帮你鹿",
        messages: {
          "tip": "你已经{0}别人帮助你签到。",
          "notfound": "用户未找到，请先进行签到。",
          "no_item": "你没有道具【锁】，无法执行此操作。\n请使用指令：购买 锁",
          "no_balance": "余额不足，无法执行此操作。当前余额为 {0}。",
          "successtip": "操作成功！{0}别人帮你鹿，消耗道具【锁】，当前余额为 {1}。",
        }
      },
      "鹿": {
        description: "鹿管签到",
        messages: {
          "Already_signed_in": "今天已经签过到了，请明天再来签到吧~",
          "Help_sign_in": "你成功帮助 {0} 签到！获得 {1} 点货币。",
          "invalid_input_user": "请艾特指定用户。\n示例： 🦌  @用户",
          "invalid_userid": "不可用的用户，请换一个用户帮他签到吧~",
          "enable_blue_tip": "还可以帮助未签到的人签到，以获取补签次数哦！\n使用示例： 鹿  @用户",
          "Sign_in_success": "你已经签到{0}次啦~ 继续加油咪~\n本次签到获得 {1} 点货币。",
          "not_allowHelp": "该用户已禁止他人帮助签到。",
          "use_key_to_help": "你使用了一个【钥匙】打开了{0}的锁！"
        }
      },
      "看鹿": {
        description: "查看用户签到日历",
        messages: {
          "invalid_input_user": "请艾特指定用户。\n示例： 🦌  @用户",
          "invalid_userid": "不可用的用户，请换一个用户帮他签到吧~",
          "notfound": "未找到该用户的签到记录。",
          "balance": "你当前的货币点数余额为：{0}"
        }
      },
      "鹿管排行榜": {
        description: "查看签到排行榜",
        messages: {
          //"Leaderboard_title": "{0}月鹿管排行榜"
        }
      },
      "补鹿": {
        description: "补签某日",
        messages: {
          "No_record": "暂无你的签到记录哦，快去签到吧~",
          "invalid_day": "日期不正确，请输入有效的日期。\n示例： 补🦌  1",
          "Already_resigned": "你已经补签过{0}号了。",
          "Resign_success": "你已成功补签{0}号。点数变化：{1}",
          "Insufficient_balance": "货币点数不足。快去帮别人签到获取点数吧",
          "maximum_times_per_day": "{0}号的签到次数已经达到上限 {1} 次，请换别的日期补签吧\~"
        }
      },
      "戒鹿": {
        description: "取消某日签到",
        messages: {
          //"Cancel_sign_in_confirm": "你确定要取消{0}号的签到吗？请再次输入命令确认。",
          "invalid_day": "日期不正确，请输入有效的日期。\n示例： 戒🦌  1",
          "Cancel_sign_in_success": "你已成功取消{0}号的签到。点数变化：{1}",
          "No_sign_in": "你没有在{0}号签到。"
        }
      }
    }
  };

  ctx.i18n.define("zh-CN", zh_CN_default);

  ctx.command('deerpipe', '鹿管签到')

  ctx.command('deerpipe/购买 [item]', '购买签到道具', { authority: 1 })
    .userFields(["id"])
    .action(async ({ session }, item) => {
      const userId = session.userId;
      const storeItems = config.cost.store_item; // 从配置中获取商店商品列表
      const targetItem = storeItems.find(i => i.item === item);

      if (!targetItem) {
        const availableItems = storeItems.map(i => `${i.item}（${i.cost}点）`).join('\n');
        await session.send(`未找到商品：${item}，你可以购买以下商品：\n${availableItems}`);
        return;
      }

      const { cost } = targetItem;

      // 获取用户余额
      const balance = await getUserCurrency(ctx, session.user.id);
      if (balance < Math.abs(cost)) {
        await session.send(`余额不足，无法购买 ${item}，当前余额为 ${balance}。`);
        return;
      }

      try {
        // 执行货币扣除
        await updateUserCurrency(ctx, session.user.id, cost);

        // 检查用户记录是否存在
        let [userRecord] = await ctx.database.get('deerpipe', { userid: userId });
        if (!userRecord) {
          // 初始化用户记录
          userRecord = {
            userid: userId,
            username: session.username,
            channelId: session.channelId,
            recordtime: '',
            checkindate: [],
            totaltimes: 0,
            allowHelp: true,
            itemInventory: [item], // 添加购买的物品
          };
          await ctx.database.create('deerpipe', userRecord);
        } else {
          // 如果用户记录存在，更新道具清单
          if (!userRecord.itemInventory) {
            userRecord.itemInventory = []; // 避免 itemInventory 为 null
          }
          userRecord.itemInventory.push(item);
          await ctx.database.set('deerpipe', { userid: userId }, { itemInventory: userRecord.itemInventory });
        }

        // 返回购买成功的提示和余额信息
        const newBalance = balance - Math.abs(cost);
        await session.send(`购买成功！已购买 ${item}，剩余点数为 ${newBalance}。`);

      } catch (error) {
        ctx.logger.error(`用户 ${userId} 购买 ${item} 时出错: ${error}`);
        await session.send(`购买 ${item} 时出现问题，请稍后再试。`);
      }
    });

  ctx.command('deerpipe/戴锁', '允许/禁止别人帮你鹿', { authority: 1 })
    .alias('脱锁')
    .alias('带锁')
    .userFields(["id"])
    .action(async ({ session }) => {
      const userId = session.userId;
      const [user] = await ctx.database.get('deerpipe', { userid: userId });

      if (!user) {
        await session.send(session.text(`.notfound`));
        return;
      }


      if (!user.itemInventory || !user.itemInventory.includes('锁')) {
        await session.send(session.text('.no_item'));
        return;
      }

      const cost = config.cost.checkin_reward.find(c => c.command === '戴锁').cost;

      const balance = await getUserCurrency(ctx, session.user.id);
      if (balance + cost < 0) {
        await session.send(session.text(`.no_balance`, [balance]));
        return;
      }

      user.allowHelp = !user.allowHelp;
      await ctx.database.set('deerpipe', { userid: userId }, { allowHelp: user.allowHelp });
      const status = user.allowHelp ? '允许' : '禁止';

      const index = user.itemInventory.indexOf('锁');
      if (index !== -1) {
        user.itemInventory.splice(index, 1);
      }
      await ctx.database.set('deerpipe', { userid: userId }, { itemInventory: user.itemInventory });

      await updateUserCurrency(ctx, session.user.id, cost);

      await session.send(session.text(`.successtip`, [status, balance + cost]));
    });

  //看看日历
  ctx.command('deerpipe/看鹿 [user]', '查看用户签到日历', { authority: 1 })
    .alias('看🦌')
    .alias('看看日历')
    .userFields(["id"])
    .example('看鹿  @用户')
    .action(async ({ session }, user) => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      let targetUserId = session.userId;
      let targetUsername = session.username;
      if (user) {
        const parsedUser = h.parse(user)[0];
        if (parsedUser?.type === 'at') {
          const { id, name } = parsedUser.attrs;
          if (!id) {
            await session.send(session.text('.invalid_userid'));
            return;
          }

          targetUserId = id;
          targetUsername = name || targetUserId;
        } else {
          await session.send(session.text('.invalid_input_user'));
          return;
        }
      }

      const [targetRecord] = await ctx.database.get('deerpipe', { userid: targetUserId });
      if (!targetRecord) {
        await session.send('未找到该用户的签到记录。');
        return;
      }
      // 获取用户余额
      const balance = await getUserCurrency(ctx, session.user.id);
      const imgBuf = await renderSignInCalendar(ctx, targetUserId, targetUsername, currentYear, currentMonth);
      const calendarImage = h.image(imgBuf, 'image/png');
      await session.send(h.text(session.text(`.balance`, [balance])));
      await session.send(calendarImage);
    });

  ctx.command('deerpipe/鹿 [user]', '鹿管签到', { authority: 1 })
    .alias('🦌')
    .userFields(["id"])
    .example('鹿  @用户')
    .action(async ({ session }, user) => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();
      const recordtime = `${currentYear}-${currentMonth}`;
      const cost = config.cost.checkin_reward.find(c => c.command === '鹿').cost;
      let targetUserId = session.userId;
      let targetUsername = session.username;

      if (user) {
        const parsedUser = h.parse(user)[0];
        if (parsedUser?.type === 'at') {
          const { id, name } = parsedUser.attrs;
          if (!id) {
            await session.send(session.text('.invalid_userid'));
            return;
          }

          targetUserId = id;
          targetUsername = name || id; // 有些情况收到的at消息是 <at id="114514"/> 没有name字段
          loggerinfo('h.parse(user)[0]?.attrs?.name 为 ' + name);
          loggerinfo('帮助别人签到：获取到 targetUsername 为 ' + targetUsername);
        } else {
          await session.send(session.text('.invalid_input_user'));
          return;
        }
      }

      // 获取目标用户的签到记录
      let [targetRecord] = await ctx.database.get('deerpipe', { userid: targetUserId });
      if (!targetRecord) {
        targetRecord = {
          userid: targetUserId,
          username: targetUsername,
          channelId: session.channelId,
          recordtime,
          checkindate: [`${currentDay}=1`],
          totaltimes: 1,
          //resigntimes: 0,
          allowHelp: true, // 默认允许帮助
          itemInventory: [],
        };
        await ctx.database.create('deerpipe', targetRecord);
      } else {
        // 在user有记录的情况下，如果输入的user没有name字段，那不改用户名称
        const has_user_name = user && h.parse(user)[0]?.attrs?.name
        if (has_user_name) {
          targetRecord.username = targetUsername;
        }


        if (targetRecord.recordtime !== recordtime) {
          targetRecord.recordtime = recordtime;
          targetRecord.checkindate = [];
        }

        const dayRecordIndex = targetRecord.checkindate.findIndex(date => date.startsWith(`${currentDay}`));
        let dayRecord = dayRecordIndex !== -1 ? targetRecord.checkindate[dayRecordIndex] : `${currentDay}=0`;
        const [day, count] = dayRecord.includes('=') ? dayRecord.split('=') : [dayRecord, '1'];

        const currentSignInCount = parseInt(count) || 0;

        if (currentSignInCount >= config.maximum_times_per_day) {
          await session.send(`今天的签到次数已经达到上限 ${config.maximum_times_per_day} 次，请明天再来签到吧\~`);
          return;
        }
        const newCount = currentSignInCount + 1;

        if (config.enable_deerpipe || newCount === 1) {
          if (dayRecordIndex !== -1) {
            targetRecord.checkindate[dayRecordIndex] = `${day}=${newCount}`;
          } else {
            targetRecord.checkindate.push(`${day}=${newCount}`);
          }
          targetRecord.totaltimes += 1;
        }
        if (has_user_name) {
          await ctx.database.set('deerpipe', { userid: targetUserId }, {
            username: targetUsername,
            checkindate: targetRecord.checkindate,
            totaltimes: targetRecord.totaltimes,
            recordtime: targetRecord.recordtime,
          });
        } else {
          await ctx.database.set('deerpipe', { userid: targetUserId }, {
            username: targetUsername,
            checkindate: targetRecord.checkindate,
            totaltimes: targetRecord.totaltimes,
            recordtime: targetRecord.recordtime,
          });
        }


        if (!config.enable_deerpipe && newCount > 1) {
          const imgBuf = await renderSignInCalendar(ctx, targetUserId, targetUsername, currentYear, currentMonth);
          const calendarImage = h.image(imgBuf, 'image/png');
          await session.send(calendarImage);

          await session.send(session.text('.Already_signed_in'));
          if (config.enable_blue_tip) {
            await session.send(session.text('.enable_blue_tip'));
          }
          return;
        }
      }

      // 检查目标用户是否允许别人帮助签到
      if (targetUserId !== session.userId) {
        let [helperRecord] = await ctx.database.get('deerpipe', { userid: session.userId });

        if (!helperRecord) {
          helperRecord = {
            userid: session.userId,
            username: session.username,
            channelId: session.channelId,
            recordtime,
            checkindate: [],
            totaltimes: 0,
            allowHelp: true, // 默认允许帮助
            itemInventory: [],
          };
          await ctx.database.create('deerpipe', helperRecord);
        }

        // 检查是否允许帮助签到
        if (!targetRecord.allowHelp) {
          const hasKey = helperRecord.itemInventory.includes('钥匙');
          if (hasKey && config.enable_use_key_to_help) {
            // 消耗一个钥匙
            const keyIndex = helperRecord.itemInventory.indexOf('钥匙');
            if (keyIndex !== -1) {
              helperRecord.itemInventory.splice(keyIndex, 1);
              await ctx.database.set('deerpipe', { userid: session.userId }, {
                itemInventory: helperRecord.itemInventory,
              });
              await session.send(session.text('.use_key_to_help', [targetUserId]));
            }
          } else {
            await session.send(session.text('.not_allowHelp'));
            return;
          }
        }

        // 增加帮助者的货币
        const reward = cost * 1.5;
        await updateUserCurrency(ctx, session.user.id, reward);
        await session.send(`${h.at(session.userId)} ${session.text('.Help_sign_in', [targetUserId, reward])}`);
      }


      const imgBuf = await renderSignInCalendar(ctx, targetUserId, targetUsername, currentYear, currentMonth);
      const calendarImage = h.image(imgBuf, 'image/png');
      await session.send(calendarImage);
      // 增加帮助者的货币
      await updateUserCurrency(ctx, session.user.id, cost);
      await session.send(`${h.at(targetUserId)} ${session.text('.Sign_in_success', [targetRecord.totaltimes, cost])}`);
      if (config.enable_blue_tip) {
        await session.send(session.text('.enable_blue_tip'));
      }
      return;
    });

  ctx.command('deerpipe/鹿管排行榜', '查看签到排行榜', { authority: 1 })
    .alias('🦌榜')
    .alias('鹿榜')
    .action(async ({ session }) => {
      const enableAllChannel = config.enable_allchannel;
      const query = enableAllChannel ? {} : { channelId: session.channelId };
      const records = await ctx.database.get('deerpipe', query);

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const currentRecordtime = `${currentYear}-${currentMonth}`;

      records.forEach(record => {
        if (record.recordtime !== currentRecordtime) {
          record.recordtime = currentRecordtime;
          record.checkindate = [];
        }
      });

      const sortedRecords = records.sort((a, b) => b.totaltimes - a.totaltimes);
      const topRecords = sortedRecords.slice(0, config.leaderboard_people_number);

      const rankData = topRecords.map((record, index) => ({
        order: index + 1,
        card: record.username,
        sum: record.totaltimes,
      }));

      const leaderboardHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>鹿管排行榜</title>
<style>
body {
font-family: 'Microsoft YaHei', Arial, sans-serif;
background-color: #f0f4f8;
margin: 0;
padding: 20px;
display: flex;
justify-content: center;
align-items: flex-start;
}
.container {
background-color: white;
border-radius: 10px;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
padding: 30px;
width: 100%;
max-width: 500px;
}
h1 {
text-align: center;
color: #2c3e50;
margin-bottom: 30px;
font-size: 28px;
}
.ranking-list {
list-style-type: none;
padding: 0;
margin: 0;
}
.ranking-item {
display: flex;
align-items: center;
padding: 15px 10px;
border-bottom: 1px solid #ecf0f1;
transition: background-color 0.3s;
}
.ranking-item:hover {
background-color: #f8f9fa;
}
.ranking-number {
font-size: 18px;
font-weight: bold;
margin-right: 15px;
min-width: 30px;
color: #7f8c8d;
}
.medal {
font-size: 24px;
margin-right: 15px;
}
.name {
flex-grow: 1;
font-size: 18px;
}
.count {
font-weight: bold;
color: #e74c3c;
font-size: 18px;
}
.count::after {
content: ' 次';
font-size: 14px;
color: #95a5a6;
}
</style>
</head>
<body>
<div class="container">
<h1>🦌 ${currentMonth}月鹿管排行榜 🦌</h1>
<ol class="ranking-list">
${rankData.map(deer => `
<li class="ranking-item">
<span class="ranking-number">${deer.order}</span>
${deer.order === 1 ? '<span class="medal">🥇</span>' : ''}
${deer.order === 2 ? '<span class="medal">🥈</span>' : ''}
${deer.order === 3 ? '<span class="medal">🥉</span>' : ''}
<span class="name">${deer.card}</span>
<span class="count">${deer.sum}</span>
</li>
`).join('')}
</ol>
</div>
</body>
</html>
`;

      const page = await ctx.puppeteer.page();
      await page.setContent(leaderboardHTML, { waitUntil: 'networkidle2' });
      const leaderboardElement = await page.$('.container');


      const boundingBox = await leaderboardElement.boundingBox();
      await page.setViewport({
        width: Math.ceil(boundingBox.width),
        height: Math.ceil(boundingBox.height),
      });

      const imgBuf = await leaderboardElement.screenshot({ captureBeyondViewport: false });
      const leaderboardImage = h.image(imgBuf, 'image/png');

      await page.close();

      await session.send(leaderboardImage);
      return;
    });

  ctx.command('deerpipe/补鹿 <day>', '补签某日', { authority: 1 })
    .alias('补🦌')
    .userFields(["id"])
    .example('补🦌  1')
    .action(async ({ session }, day: string) => {
      const dayNum = parseInt(day, 10);
      const cost = config.cost.checkin_reward.find(c => c.command === '补鹿').cost;
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();
      const recordtime = `${currentYear}-${currentMonth}`;

      // 校验输入日期
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || dayNum > currentDay) {
        await session.send(session.text('.invalid_day'));
        return;
      }

      // 获取用户记录
      let [record] = await ctx.database.get('deerpipe', { userid: session.userId });
      if (!record) {
        await session.send(session.text('.No_record'));
        return;
      }

      // 获取用户余额
      const balance = await getUserCurrency(ctx, session.user.id);
      if (balance < Math.abs(cost)) {
        await session.send(session.text('.Insufficient_balance'));
        return;
      }

      // 更新用户名
      const username = session.username;
      if (record.username !== username) {
        record.username = username;
      }

      // 更严格的日期匹配逻辑，确保找到确切的 dayNum
      const dayRecordIndex = record.checkindate.findIndex(date => {
        const [dayStr] = date.split('=');
        return parseInt(dayStr, 10) === dayNum;
      });

      let dayRecord = dayRecordIndex !== -1 ? record.checkindate[dayRecordIndex] : `${dayNum}=0`;
      const [dayStr, count] = dayRecord.includes('=') ? dayRecord.split('=') : [dayRecord, '0'];
      const currentSignInCount = parseInt(count) || 0; // 当前当天签到次数

      // 检查是否超过签到次数上限
      if (currentSignInCount >= config.maximum_times_per_day) {
        await session.send(session.text('.maximum_times_per_day', [dayStr, config.maximum_times_per_day]));
        return;
      }

      // 更新签到次数
      let newCount = currentSignInCount + 1;
      if (dayRecordIndex !== -1 && !config.enable_deerpipe && currentSignInCount > 0) {
        await session.send(`${h.at(session.userId)} ${session.text('.Already_resigned', [dayNum])}`);
        return;
      }

      // 更新或插入签到记录
      if (dayRecordIndex !== -1) {
        record.checkindate[dayRecordIndex] = `${dayStr}=${newCount}`;
      } else {
        record.checkindate.push(`${dayNum}=1`);
      }

      // 更新总签到次数
      record.totaltimes += 1;

      // 执行货币扣除
      await updateUserCurrency(ctx, session.user.id, cost);

      // 更新数据库
      await ctx.database.set('deerpipe', { userid: session.userId }, {
        username: record.username,
        checkindate: record.checkindate,
        totaltimes: record.totaltimes,
      });

      // 渲染签到日历
      const imgBuf = await renderSignInCalendar(ctx, session.userId, username, currentYear, currentMonth);
      const calendarImage = h.image(imgBuf, 'image/png');

      // 发送签到成功信息
      await session.send(calendarImage);
      await session.send(`${h.at(session.userId)} ${session.text('.Resign_success', [dayNum, cost])}`);
    });

  ctx.command('deerpipe/戒鹿 [day]', '取消某日签到', { authority: 1 })
    .alias('戒🦌')
    .alias('寸止')
    .userFields(["id"])
    .example('戒🦌  1')
    .action(async ({ session }, day?: string) => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();
      const recordtime = `${currentYear}-${currentMonth}`;

      const dayNum = day ? parseInt(day, 10) : currentDay;
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || dayNum > currentDay) {
        await session.send(session.text('.invalid_day'));
        return;
      }

      let [record] = await ctx.database.get('deerpipe', { userid: session.userId });

      if (record) {
        // 更新用户名
        const username = session.username;
        if (record.username !== username) {
          record.username = username;
        }

        // 查找并更新签到记录
        const dayRecordIndex = record.checkindate.findIndex(date => date.startsWith(`${dayNum}`));
        if (dayRecordIndex !== -1) {
          const [dayStr, count] = record.checkindate[dayRecordIndex].split('=');
          let newCount = (parseInt(count) || 0) - 1;

          if (newCount > 0) {
            record.checkindate[dayRecordIndex] = `${dayStr}=${newCount}`;
          } else {
            record.checkindate.splice(dayRecordIndex, 1);
          }

          record.totaltimes -= 1;

          // 从配置中获取取消签到的奖励或费用
          const cost = config.cost.checkin_reward.find(c => c.command === '戒鹿').cost;

          // 更新用户货币
          await updateUserCurrency(ctx, session.user.id, cost);

          await ctx.database.set('deerpipe', { userid: session.userId }, {
            username: record.username,
            checkindate: record.checkindate,
            totaltimes: record.totaltimes,
            recordtime: record.recordtime,
          });

          const imgBuf = await renderSignInCalendar(ctx, session.userId, username, currentYear, currentMonth);
          const calendarImage = h.image(imgBuf, 'image/png');

          await session.send(calendarImage);
          await session.send(`${h.at(session.userId)} ${session.text('.Cancel_sign_in_success', [dayNum, cost])}`);

        } else {
          await session.send(`${h.at(session.userId)} ${session.text('.No_sign_in', [dayNum])}`);
        }
      } else {
        await session.send(`${h.at(session.userId)} ${session.text('.No_sign_in', [dayNum])}`);
      }
    });


  function loggerinfo(message) {
    if (config.loggerinfo) {
      ctx.logger.info(message);
    }
  }

  async function updateUserCurrency(ctx: Context, uid, amount: number, currency: string = 'deerpipe') {
    try {
      const numericUserId = Number(uid); // 将 userId 转换为数字类型

      //  通过 ctx.monetary.gain 为用户增加货币，
      //  或者使用相应的 ctx.monetary.cost 来减少货币
      if (amount > 0) {
        await ctx.monetary.gain(numericUserId, amount, currency);
        loggerinfo(`为用户 ${uid} 增加了 ${amount} ${currency}`);
      } else if (amount < 0) {
        await ctx.monetary.cost(numericUserId, -amount, currency);
        loggerinfo(`为用户 ${uid} 减少了 ${-amount} ${currency}`);
      }

      return `用户 ${uid} 成功更新了 ${Math.abs(amount)} ${currency}`;
    } catch (error) {
      ctx.logger.error(`更新用户 ${uid} 的货币时出错: ${error}`);
      return `更新用户 ${uid} 的货币时出现问题。`;
    }
  }
  async function getUserCurrency(ctx, uid, currency = 'deerpipe') {
    try {
      const numericUserId = Number(uid);
      const [data] = await ctx.database.get('monetary', {
        uid: numericUserId,
        currency,
      }, ['value']);

      return data ? data.value : 0;
    } catch (error) {
      ctx.logger.error(`获取用户 ${uid} 的货币时出错: ${error}`);
      return 0; // Return 0 
    }
  }

}

async function renderSignInCalendar(ctx: Context, userId: string, username: string, year: number, month: number): Promise<Buffer> {
  const [record] = await ctx.database.get('deerpipe', { userid: userId });
  const checkinDates = record?.checkindate || [];

  const calendarDayData = generateCalendarHTML(checkinDates, year, month, username);
  // ../assets/MiSans-Regular.ttf 这个字体，emmm怎么说呢，无所谓了，不要了
  const fullHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>签到日历</title>
<style>
@font-face {
font-family: 'MiSans';
src: url('../assets/MiSans-Regular.ttf') format('truetype');
}
body {
font-family: 'MiSans', sans-serif;
}
.calendar {
width: 320px;
margin: 20px;
border: 1px solid #ccc;
padding: 10px;
box-sizing: border-box;
}
.calendar-header {
font-weight: bold;
font-size: 18px;
margin-bottom: 5px;
text-align: left;
}
.calendar-subheader {
text-align: left;
margin-bottom: 10px;
}
.weekdays {
display: grid;
grid-template-columns: repeat(7, 1fr);
text-align: center;
font-size: 12px;
margin-bottom: 5px;
}
.calendar-grid {
display: grid;
grid-template-columns: repeat(7, 1fr);
gap: 5px;
}
.calendar-day {
position: relative;
text-align: center;
}
.deer-image {
width: 100%;
height: auto;
}
.check-image {
position: absolute;
top: 0;
left: 0;
width: 100%;
height: auto;
}
.day-number {
position: absolute;
bottom: 2px;
left: 2px;
font-size: 14px;
color: black;
}
.multiple-sign {
position: absolute;
bottom: -2px;
right: 0px;
font-size: 12px;
color: red;
font-weight: bold;
}
</style>
</head>
<body>
${calendarDayData}
</body>
</html>
`;

  const page = await ctx.puppeteer.page();
  await page.setContent(fullHTML, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.deer-image');

  const calendarElement = await page.$('.calendar');
  const imgBuf = await calendarElement.screenshot({ captureBeyondViewport: false });

  await page.close();
  return imgBuf;
}

function generateCalendarHTML(checkinDates, year, month, username) {
  const daysInMonth = new Date(year, month, 0).getDate();

  let calendarHTML = `
<div class="calendar">
<div class="calendar-header">${year}-${month.toString().padStart(2, '0')} 签到</div>
<div class="calendar-subheader">${username}</div>
<div class="weekdays">
<div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
</div>
<div class="calendar-grid">
`;

  const startDay = new Date(year, month - 1, 1).getDay();
  for (let i = 0; i < startDay; i++) {
    calendarHTML += `<div></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayRecord = checkinDates.find(date => date.startsWith(`${day}=`) || date === `${day}`);
    const [dayStr, countStr] = dayRecord ? dayRecord.split('=') : [null, null];
    const count = countStr ? parseInt(countStr) : 1;
    const checkedIn = dayRecord !== undefined;

    calendarHTML += `
<div class="calendar-day">
<img src="https://i0.hdslb.com/bfs/article/bfb250ffe0c43f74533331451a5e0a32312276085.png" class="deer-image" alt="Deer">
${checkedIn ? `<img src="https://i0.hdslb.com/bfs/article/7b55912ee718a78993f6365a6d970e98312276085.png" class="check-image" alt="Check">` : ''}
<div class="day-number">${day}</div>
${checkedIn && count > 1 ? `<div class="multiple-sign">×${count}</div>` : ''}
</div>
`;
  }

  calendarHTML += `
</div>
</div>
`;

  return calendarHTML;
}
