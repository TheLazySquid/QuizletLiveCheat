// @ts-ignore
import hudCss from './hud.css';
// @ts-ignore
import hudHtml from './hud.html';

export default class Hud extends EventTarget {
    constructor() {
        super();

        this.addStyleSheet();

        let hudElement = document.createElement("div");
        hudElement.id = "qlc-hud";

        hudElement.innerHTML = hudHtml;

        window.addEventListener("load", () => {
            document.body.appendChild(hudElement);
        })

        hudElement.querySelector(".answerOnce")?.addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("answerOnce"));
        })

        let autoAnswerBtn = hudElement.querySelector(".autoAnswer");
        let autoAnswering = false;

        autoAnswerBtn?.addEventListener("click", () => {
            autoAnswering = !autoAnswering;
            // switch the button to active if auto answering is on
            autoAnswerBtn?.classList.toggle("active", autoAnswering);

            this.dispatchEvent(new CustomEvent("toggleAutoAnswer"));
        });

        // toggle the hud with \
        let hudOpen = true;
        window.addEventListener("keydown", (e) => {
            if(e.key != "\\") return;
            hudOpen = !hudOpen;

            if(!hudOpen) hudElement.style.display = "none";
            else hudElement.style.display = "flex";
        })
    }

    addStyleSheet() {
        let style = new CSSStyleSheet();
        style.replaceSync(hudCss);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, style];
    }
}