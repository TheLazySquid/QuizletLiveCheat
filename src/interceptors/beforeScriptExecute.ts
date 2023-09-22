import Cheat from "../cheat";
import addModifiedScript from "./addModifiedScript";

export default function setup(cheat: Cheat) {
    function interceptScript(e: Event) {
        // this is bad bad very bad
        if(!e.srcElement) return;
        let srcEl = e.srcElement as HTMLElement;
    
        let src: string;
        if(srcEl.nodeName == "LINK") {
            src = (srcEl as HTMLLinkElement).href;                       
        } else if(srcEl.nodeName == "SCRIPT") {
            src = (srcEl as HTMLScriptElement).src;
        } else return;
    
        
        if(!src.includes("live_game_student") || !src.endsWith(".js")) return;
        console.log('cancelled', src)
        e.preventDefault();

        addModifiedScript(src);

        window.removeEventListener('beforescriptexecute', interceptScript);
    }

    // @ts-ignore beforescriptexecute is non-standard and only works on firefox. Fortunately, it's just firefox that need to run this script, so we're good.
    window.addEventListener('beforescriptexecute', interceptScript);
}