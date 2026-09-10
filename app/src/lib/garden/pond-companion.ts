import { assessPond } from "./pond";
import type { PondSave } from "./pond-persistence";

/** Explanations only: companion text never awards objects or evaluates life content. */
export function pondCompanionHint(save: PondSave, activity: "arrange" | "observe" | "life") {
  if (activity === "life") {
    const intention = save.intentions.find((item) => item.status === "active");
    return intention
      ? { en: `You chose “${intention.title}”. You can keep it small, or choose a different step whenever life changes.`, zh: `你選了「${intention.title}」。可以慢慢做，生活有變化時也可以換一小步。` }
      : { en: "What would feel useful today? Choose a step of your own, or take a quiet visit without one.", zh: "今天做哪件小事會對你有幫助？可以自己選，也可以只來安靜地看看。" };
  }
  const opportunity = save.grants.find((item) => !item.consumed_by);
  if (activity === "arrange" && opportunity) {
    const step = save.intentions.find((item) => item.id === opportunity.intention_id);
    return {
      en: step ? `“${step.title}” gave you a building opportunity. Choose a plant, stone or perch, then decide where it belongs.` : "A step you chose gave you a building opportunity. What would you like to add?",
      zh: step ? `「${step.title}」帶來了一次建設機會。想添植物、石頭還是棲息點？位置由你決定。` : "你完成的一小步帶來了建設機會，想在這裡添些甚麼？",
    };
  }
  const habitat = assessPond(save.world.objects, save.world.discoveries);
  if (!save.world.discoveries.includes("dawnfish")) return {
    en: habitat.dawnfish ? "There is room to swim. Pick three water positions with a bend and we can follow the fish together." : "The water is divided. Try moving something into your kit to open a passage for the fish.",
    zh: habitat.dawnfish ? "這裡有游動的空間了。選三個帶轉彎的水面位置，我們一起跟著魚看看。" : "水面被分開了。試試把一件物件收回工具盤，讓魚有路可走。",
  };
  if (!save.world.discoveries.includes("leafsnail")) return {
    en: habitat.leafsnail ? "Something small is resting by the reeds. Open Observe and record what you find." : "Try placing two reeds beside each other, with a little open water along their edge.",
    zh: habitat.leafsnail ? "岸草旁有個小訪客。打開「觀察」，記下你的發現。" : "試試把兩株岸草放在一起，旁邊留一點水面。",
  };
  if (!save.world.discoveries.includes("dragonfly")) return {
    en: habitat.dragonfly ? "The leaf and perch make a good resting place. Look closely for a blue-winged visitor." : "A floating leaf and a quiet perch could welcome a different visitor. Keep some water open too.",
    zh: habitat.dragonfly ? "浮葉和棲息點形成了歇腳的地方，留意一下藍色翅膀的小訪客。" : "浮葉和棲息點也許能迎來另一位訪客，記得保留一些水面。",
  };
  return { en: "We can try a different waterway. Rotate a flow stone and see which route the fish choose; everything you discovered stays with you.", zh: "我們可以試另一條水道。轉動導流石，看看魚會怎樣走；已經發現的生命都會保留。" };
}

export function pondInvitationText(kind: "growth-ready" | "opportunity", zh: boolean) {
  if (kind === "growth-ready") return zh ? "晨光魚準備進入下一個成長階段了。方便時，一起回魚塘看看？" : "Your dawnfish are ready for their next stage of growth. Shall we visit the pond when you have a moment?";
  return zh ? "你選的生活行動帶來了一次建設機會，還未使用。想回魚塘選一株植物或一件小設施嗎？" : "A step you chose left a building opportunity in your kit. Would you like to choose a plant or a little pond feature?";
}
