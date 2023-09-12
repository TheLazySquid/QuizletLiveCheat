<script>
    let visible = true

    let exposes = {
        answerQuestion: undefined,
        onHelpModeChange: undefined,
        onShowAnswerChange: undefined,
        helpMode: 0,
        showAnswer: false
    }

    const helpModes = ['None', 'Auto Answer (instant)', 'Auto Answer (wait)', 'Outline Correct Answer']

    const changeHelpMode = (delta) => {
        exposes.helpMode += delta
        if(exposes.helpMode < 0) exposes.helpMode += helpModes.length
        exposes.helpMode = exposes.helpMode % helpModes.length
        exposes.onHelpModeChange?.(exposes.helpMode)
    }

    window.qlc.addHudInteract(exposes);
</script>

<svelte:window on:keydown={e => {
    if(e.key === '\\') visible = !visible
}} />

{#if visible}
    <div class="hud">
        <button on:click={exposes.answerQuestion?.()} class="answer">Answer Question</button>
        <div class="row">
            <div>
                Show Answer
            </div>
            <input type="checkbox" bind:checked={exposes.showAnswer} on:change={() => exposes.onShowAnswerChange?.(exposes.showAnswer)} />
        </div>
        <div class="help">
            <div>
                Help Mode
            </div>
            <div class="row helpControl">
                <button on:click={() => changeHelpMode(-1)}>&lt;</button>
                <div class="display">{ helpModes[exposes.helpMode] }</div>
                <button on:click={() => changeHelpMode(1)}>&gt;</button>
            </div>
        </div>
    </div>
{/if}

<style>
.hud {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 300px;
    height: 200px;
    z-index: 999999999999;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 0.5em;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    color: black;
}

.hud .row {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
}

.hud .answer {
    width: 70%;
    height: 50px;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    font-size: 1em;
    border-radius: 0.5em;
    background-color: white;
    color: black;
    border: none;
    transition: transform 0.3s ease;
}

.hud .answer:active {
    transform: scale(0.93);
}

.hud input[type=checkbox] {
    width: 20px;
    height: 20px;
    margin-left: 10px;
}

.hud .help {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.hud .helpControl button {
    width: 25px;
    height: 25px;
    border-radius: 0.5em;
    background-color: white;
    border: none;
    transition: transform 0.3s ease;
    margin: 5px;
    color: black;
}
</style>