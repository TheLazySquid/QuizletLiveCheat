(function(){
    const arrows = document.querySelectorAll(".UIButton-wrapper");
    const next = arrows[1];
    const questionAmount = document.querySelector(".CardsList-navControl.progressIndex .UIText").innerHTML.split("/")[1];

    let questions = {}
    let enabled = true;
    
    for(let i = 0; i < questionAmount; i++){
        let question = document.querySelectorAll(".CardsItem.current .FormattedText.notranslate div")
        let answerText = question[0].innerHTML;
        let questionText = question[1].innerHTML;
        questions[questionText] = answerText;
        next.click();
    }

    console.log(questions);
    
    const pageChange = () => {
        if(!enabled) return;
        let question = document.querySelector(".StudentPrompt .FormattedText.notranslate div")?.innerHTML;
        if(!question) return;
    
        let answer = questions[question];
        if(!answer) {
            // attempt to get the answer from a value
            for(let key of Object.keys(questions)) {
                if(questions[key] === question) {
                    answer = key;
                    break;
                }
            }
        }
    
        const buttons = document.querySelectorAll(".UIButton .FormattedText.notranslate div");
    
        for(let i = 0; i < buttons.length; i++){
            if(buttons[i].innerHTML === answer){
                buttons[i].click();
            }
        }
    }

    let observer = new MutationObserver(pageChange);
    observer.observe(document.body, {childList: true, subtree: true})

    pageChange();

    let shiftCount = 0;
    let shiftTimeout = null;
    document.addEventListener("keydown", (e) => {
        if(e.key === "Shift"){
            shiftCount++;
            if(shiftTimeout) clearTimeout(shiftTimeout);
            shiftTimeout = setTimeout(() => {
                shiftCount = 0;
            }, 1000);
            if(shiftCount == 3) {
                enabled = !enabled;
                if(enabled) {
                    console.log("Quizlet Live Cheat Enabled");
                    pageChange();
                }
                else console.log("Quizlet Live Cheat Disabled");
                shiftCount = 0;
            }
        }
    })
})();