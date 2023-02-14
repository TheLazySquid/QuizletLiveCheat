(function(){
    const arrows = document.querySelectorAll(".UIButton-wrapper");
    const next = arrows[1];
    const questionAmount = document.querySelector(".CardsList-navControl.progressIndex .UIText").innerHTML.split("/")[1];

    let questions = {}
    
    for(let i = 0; i < questionAmount; i++){
        let question = document.querySelectorAll(".CardsItem.current .FormattedText.notranslate div")
        let answerText = question[0].innerHTML;
        let questionText = question[1].innerHTML;
        questions[questionText] = answerText;
        next.click();
    }

    console.log(questions);
    
    const pageChange = () => {
        let question = document.querySelector(".StudentPrompt .FormattedText.notranslate div")?.innerHTML;
        if(!question) return;
    
        let answer = questions[question];
        if(!answer) return;
        console.log(answer)
    
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
})();