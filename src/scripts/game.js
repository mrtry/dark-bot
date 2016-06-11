// Description:
//   遊ぶ
// Commands:
//   attack {user} - attack
//   cure {user} - cure
//   raise {user} - ふっかつ
//

"use strict"

const Cron      = require("cron").CronJob;
const NodeQuest = require("node-quest");
const UserStates  = NodeQuest.UserStates;
const Game      = NodeQuest.Game;
const SpellRepository = require("../game/SpellRepository.js");
const UserRepository  = require("../game/UserRepository.js");
const NegativeWordsRepository = require("../game/NegativeWordsRepository.js");
const MonsterRepository = require("../game/MonsterRepository.js");
const NegativeWords   = require("../game/NegativeWords.js");
const UserLoader = require("../game/UserLoader.js");
const Battle = require("../game/Battle.js");

const negativeWordsRepository = new NegativeWordsRepository("http://yamiga.waka.ru.com/json/darkbot.json");
const negativeWords   = new NegativeWords(negativeWordsRepository, console);
const game      = new Game();
const lang      = require("../game/lang/Ja.js");
const SlackTextMessage = require("hubot-slack").SlackTextMessage;
function isSlackTextMessage(message) {
    return message instanceof SlackTextMessage;
}

new Cron("0 0 * * 1", () => {
    game.users.forEach((u) => {
        u.cured(Infinity);
    });
}, null, true, "Asia/Tokyo");

new Cron("0 0 * * *", () => {
    game.users.forEach((u) => {
        u.magicPoint.change(Infinity);
    });
}, null, true, "Asia/Tokyo");


module.exports = (robot) => {

    const userRepository  = new UserRepository(robot.brain, robot.adapter.client ? robot.adapter.client.users : {});
    const monsterRepository = new MonsterRepository();
    const userLoader = new UserLoader(game, userRepository, monsterRepository, new SpellRepository());
    const battle = new Battle(game, lang);

    robot.brain.once("loaded", (data) => userLoader.loadUsers());

    robot.hear(/^attack (.+)/i, (res) => {
        const actor = game.findUser(res.message.user.name);
        if (!actor) {
            return
        }
        const target = game.findUser(res.match[1]);
        battle.attack(actor, target, (m) => res.send(m));
    });

    robot.hear(/^status (.+)/i, (res) => battle.status(game.findUser(res.match[1]), (m) => res.send(m)));

    robot.hear(/^神父 (.+)/, (res) => {
        const priest = monsterRepository.getByName("神父");
        const target = game.findUser(res.message.user.name);
        battle.cast(priest, target, "レイズ", (m) => res.send(m));
    });

    robot.hear(/.*/, (res) => {
        const shakai = monsterRepository.getByName("社会");
        if ( shakai === null ) {
            return;
        }
        const target = game.findUser(res.message.user.name)
        if ( !target || target.isDead() ) {
            return;
        }

        const tokens  = (res.message.tokenized || []).map((t) => {
            return t.basic_form;
        });
        const count   = negativeWords.countNegativeWords(tokens);
        if(count <= 0) {
            return
        }

        const results           = Array(count).fill(1).map((i) => shakai.attack(target))
        const attackedResults   = results.filter((r) => typeof r !== 'symbol').filter((r) => r.attack.hit);
        const point             = attackedResults.reduce((pre, cur) => pre + cur.attack.value, 0);
        if( attackedResults.length > 0 ) {
            count === 1 ?
                res.send(lang.attack.default(shakai, target, point)):
                res.send(lang.attack.multiple(shakai, target, point, count));
            target.isDead() && res.send(lang.attack.dead(target));
        } else {
            res.send(lang.attack.miss(target));
        }
    });

    robot.hear(/(.+)/, (res) => {
        if(!isSlackTextMessage(res.message)) {
            return;
        }
        const messages = res.message.rawText.split(" ")
        if(messages.length < 2) {
            return;
        }

        const spellName = messages[0];
        const actor     = game.findUser(res.message.user.name);
        const target    = messages.splice(1).map(
            (name) => game.findUser(name)
        ).filter(
            (user) => user !== null
        ).pop();
        battle.cast(actor, target, spellName, (m) => res.send(m));
    });
}
