import Cheat from "../cheat";
import addModifiedScript from "./addModifiedScript";

export default function setup(cheat: Cheat) {
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            // Check if a new script element was added
            if (mutation.type !== 'childList') return
            const addedNodes = Array.from(mutation.addedNodes);

            for (let node of addedNodes) {
                let src: string;

                if(node.nodeName == "LINK") {
                    src = (node as HTMLLinkElement).href;                       
                } else if(node.nodeName == "SCRIPT") {
                    src = (node as HTMLScriptElement).src;
                } else continue;

                if(!src.includes("live_game_student") || !src.endsWith(".js")) continue;

                // get rid of the element so it doesn't get executed
                (node as HTMLElement).remove();

                if(cheat.alreadyIntercepted) { // we have to do it here, because for some reason quizlet loads the script twice
                    observer.disconnect();
                    return;
                }
                cheat.alreadyIntercepted = true;
    
                addModifiedScript(src);
            }
        });
    });
    
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}